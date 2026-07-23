#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    Address, BytesN, Env, Symbol, Vec,
};
use soroban_sdk::token;

#[contract]
pub struct AegisPayVerifier;

// ── Error Codes ──────────────────────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized  = 1,
    NotInitialized      = 2,
    Unauthorized        = 3,
    InvalidProof        = 4,
    NullifierSpent      = 5,
    InsufficientFunds   = 6,
    RootNotActive       = 7,  // Was: InvalidRoot — root not in active batch registry
    InvalidEmployer     = 8,
    RootAlreadyActive   = 9,  // NEW: batch root already added
    RootNotFound        = 10, // NEW: tried to disable root that doesn't exist
}

// ── Data Types ───────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proof {
    pub a: BytesN<64>,   // G1 point
    pub b: BytesN<128>,  // G2 point
    pub c: BytesN<64>,   // G1 point
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicInputs {
    pub merkle_root:    BytesN<32>,
    pub employer_id:    BytesN<32>,
    pub nullifier:      BytesN<32>,
    pub claimed_amount: i128,
}

// ── Storage Keys ─────────────────────────────────────────────────────────────
// Used as persistent storage keys for the payroll root map entries.
// Maps BytesN<32> (merkle_root) → bool (is_active)
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Employer,
    EmployerId,
    UsdcToken,
    PayrollRoot(BytesN<32>), // NEW: per-batch root registry
    NullifierSpent(BytesN<32>),
}

// ── Events ───────────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayrollDepositedEvent {
    pub employer: Address,
    pub amount:   i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayrollRootAddedEvent {
    pub employer:  Address,
    pub new_root:  BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayrollRootDisabledEvent {
    pub employer: Address,
    pub root:     BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WageClaimedEvent {
    pub worker:    Address,
    pub amount:    i128,
    pub nullifier: BytesN<32>,
    pub root_used: BytesN<32>,
}

// ── Contract Implementation ──────────────────────────────────────────────────
#[contractimpl]
impl AegisPayVerifier {
    /// One-time setup. Only called once per contract lifetime.
    /// No merkle_root here — batches are added separately via `add_payroll_root`.
    pub fn initialize(
        env: Env,
        employer:    Address,
        employer_id: BytesN<32>,
        usdc_token:  Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Employer) {
            return Err(Error::AlreadyInitialized);
        }
        employer.require_auth();

        env.storage().instance().set(&DataKey::Employer,    &employer);
        env.storage().instance().set(&DataKey::EmployerId,  &employer_id);
        env.storage().instance().set(&DataKey::UsdcToken,   &usdc_token);

        Ok(())
    }

    /// Add a new payroll batch root to the active registry.
    /// Can be called many times — once per payroll period.
    /// Old roots remain valid (workers can still claim from past batches).
    pub fn add_payroll_root(
        env:      Env,
        employer: Address,
        new_root: BytesN<32>,
    ) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_employer(&env, &employer)?;
        employer.require_auth();

        let key = DataKey::PayrollRoot(new_root.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::RootAlreadyActive);
        }

        env.storage().persistent().set(&key, &true);
        // TTL: extend root to 1 year (~31,536,000 ledgers at ~5s each)
        env.storage().persistent().extend_ttl(&key, 6_307_200, 6_307_200);

        env.events().publish(
            (Symbol::new(&env, "PayrollRootAdded"),),
            PayrollRootAddedEvent { employer, new_root },
        );

        Ok(())
    }

    /// Disable a specific payroll batch, preventing future claims on it.
    /// Old nullifiers for that batch are already spent, so no double-claim risk.
    pub fn disable_payroll_root(
        env:      Env,
        employer: Address,
        root:     BytesN<32>,
    ) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_employer(&env, &employer)?;
        employer.require_auth();

        let key = DataKey::PayrollRoot(root.clone());
        if !env.storage().persistent().has(&key) {
            return Err(Error::RootNotFound);
        }

        env.storage().persistent().set(&key, &false);

        env.events().publish(
            (Symbol::new(&env, "PayrollRootDisabled"),),
            PayrollRootDisabledEvent { employer, root },
        );

        Ok(())
    }

    /// Deposit XLM (or USDC) into the shared escrow.
    /// The escrow is a single pool; all active batches draw from it.
    pub fn deposit(env: Env, employer: Address, amount: i128) -> Result<(), Error> {
        Self::assert_initialized(&env)?;
        Self::assert_employer(&env, &employer)?;
        employer.require_auth();

        let usdc_address: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_address);
        client.transfer(&employer, &env.current_contract_address(), &amount);

        env.events().publish(
            (Symbol::new(&env, "PayrollDeposited"),),
            PayrollDepositedEvent { employer, amount },
        );

        Ok(())
    }

    /// Worker claims their wage using a Groth16 ZK proof.
    /// The contract verifies:
    ///   1. The employer_id matches the registered employer.
    ///   2. The merkle_root from the proof is in the active payroll batch registry.
    ///   3. The nullifier has not been spent before (prevents double claiming).
    ///   4. The ZK proof is valid.
    ///   5. The escrow has sufficient funds.
    pub fn claim_payroll(
        env:               Env,
        proof:             Proof,
        public_inputs:     PublicInputs,
        worker_address:    Address,
        _target_fiat_token: Address,
        _path:             Vec<Address>,
    ) -> Result<bool, Error> {
        Self::assert_initialized(&env)?;

        // 1. Verify employer ID
        let stored_employer_id: BytesN<32> = env.storage().instance()
            .get(&DataKey::EmployerId).unwrap();
        if public_inputs.employer_id != stored_employer_id {
            return Err(Error::InvalidEmployer);
        }

        // 2. Check root is in the active batch registry (multi-batch support)
        let root_key = DataKey::PayrollRoot(public_inputs.merkle_root.clone());
        let root_active: bool = env.storage().persistent()
            .get(&root_key).unwrap_or(false);
        if !root_active {
            return Err(Error::RootNotActive);
        }

        // 3. Check nullifier hasn't been spent
        let nullifier_key = DataKey::NullifierSpent(public_inputs.nullifier.clone());
        if env.storage().persistent().has(&nullifier_key) {
            return Err(Error::NullifierSpent);
        }

        // 4. Verify ZK proof
        if !Self::verify_groth16(&env, &proof, &public_inputs) {
            return Err(Error::InvalidProof);
        }

        // 5. Mark nullifier as spent (persistent storage, survives ledger TTL)
        env.storage().persistent().set(&nullifier_key, &true);
        env.storage().persistent().extend_ttl(&nullifier_key, 6_307_200, 6_307_200);

        // 6. Check escrow balance
        let usdc_address: Address = env.storage().instance()
            .get(&DataKey::UsdcToken).unwrap();
        let usdc_client = token::Client::new(&env, &usdc_address);

        if usdc_client.balance(&env.current_contract_address()) < public_inputs.claimed_amount {
            return Err(Error::InsufficientFunds);
        }

        // 7. Transfer funds to worker (target_fiat_token swap handled off-chain via relayer for now)
        usdc_client.transfer(
            &env.current_contract_address(),
            &worker_address,
            &public_inputs.claimed_amount,
        );

        env.events().publish(
            (Symbol::new(&env, "WageClaimed"),),
            WageClaimedEvent {
                worker:    worker_address.clone(),
                amount:    public_inputs.claimed_amount,
                nullifier: public_inputs.nullifier,
                root_used: public_inputs.merkle_root,
            },
        );

        Ok(true)
    }

    // ── View Functions ───────────────────────────────────────────────────────

    pub fn get_balance(env: Env) -> i128 {
        let usdc_address: Address = env.storage().instance()
            .get(&DataKey::UsdcToken).unwrap();
        let client = token::Client::new(&env, &usdc_address);
        client.balance(&env.current_contract_address())
    }

    pub fn get_employer(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Employer).unwrap()
    }

    pub fn is_root_active(env: Env, root: BytesN<32>) -> bool {
        env.storage().persistent()
            .get(&DataKey::PayrollRoot(root))
            .unwrap_or(false)
    }

    pub fn is_nullifier_spent(env: Env, nullifier: BytesN<32>) -> bool {
        env.storage().persistent()
            .has(&DataKey::NullifierSpent(nullifier))
    }

    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().has(&DataKey::Employer)
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    fn assert_initialized(env: &Env) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Employer) {
            return Err(Error::NotInitialized);
        }
        Ok(())
    }

    fn assert_employer(env: &Env, caller: &Address) -> Result<(), Error> {
        let stored: Address = env.storage().instance().get(&DataKey::Employer).unwrap();
        if *caller != stored {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }

    fn verify_groth16(_env: &Env, _proof: &Proof, _public_inputs: &PublicInputs) -> bool {
        // Stub pending Soroban Protocol 25 BN254 host function:
        // env.crypto().verify_groth16_bn254(vk, proof, public_inputs)
        true
    }
}

// ── Tests ────────────────────────────────────────────────────────────────────
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, Vec};
    use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};

    fn setup_env() -> (Env, Address, Address, AegisPayVerifierClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let employer = Address::generate(&env);
        let admin    = Address::generate(&env);
        let usdc     = env.register_stellar_asset_contract(admin.clone());
        let usdc_admin = StellarAssetClient::new(&env, &usdc);
        usdc_admin.mint(&employer, &10_000);

        let contract_id = env.register_contract(None, AegisPayVerifier);
        let client = AegisPayVerifierClient::new(&env, &contract_id);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        client.initialize(&employer, &employer_id, &usdc);

        (env, employer, usdc, client)
    }

    #[test]
    fn test_initialize_once() {
        let (env, employer, usdc, client) = setup_env();
        assert_eq!(client.get_employer(), employer);
        assert!(client.is_initialized());

        // Second initialize should fail
        let employer_id2 = BytesN::from_array(&env, &[2; 32]);
        let result = client.try_initialize(&employer, &employer_id2, &usdc);
        assert!(result.is_err());
    }

    #[test]
    fn test_add_multiple_roots() {
        let (env, employer, _usdc, client) = setup_env();

        let root_a = BytesN::from_array(&env, &[10; 32]);
        let root_b = BytesN::from_array(&env, &[20; 32]);
        let root_c = BytesN::from_array(&env, &[30; 32]);

        client.add_payroll_root(&employer, &root_a);
        client.add_payroll_root(&employer, &root_b);
        client.add_payroll_root(&employer, &root_c);

        assert!(client.is_root_active(&root_a));
        assert!(client.is_root_active(&root_b));
        assert!(client.is_root_active(&root_c));

        // Unknown root should not be active
        let root_unknown = BytesN::from_array(&env, &[99; 32]);
        assert!(!client.is_root_active(&root_unknown));
    }

    #[test]
    fn test_duplicate_root_fails() {
        let (env, employer, _usdc, client) = setup_env();
        let root = BytesN::from_array(&env, &[10; 32]);

        client.add_payroll_root(&employer, &root);
        let result = client.try_add_payroll_root(&employer, &root);
        assert!(result.is_err());
    }

    #[test]
    fn test_disable_root() {
        let (env, employer, _usdc, client) = setup_env();
        let root = BytesN::from_array(&env, &[10; 32]);

        client.add_payroll_root(&employer, &root);
        assert!(client.is_root_active(&root));

        client.disable_payroll_root(&employer, &root);
        assert!(!client.is_root_active(&root));
    }

    #[test]
    fn test_deposit_and_balance() {
        let (env, employer, _usdc, client) = setup_env();

        client.deposit(&employer, &5_000);
        assert_eq!(client.get_balance(), 5_000);
    }

    #[test]
    fn test_claim_payroll_against_active_root() {
        let (env, employer, usdc, client) = setup_env();
        let worker = Address::generate(&env);
        let usdc_client = TokenClient::new(&env, &usdc);

        // Setup
        let root = BytesN::from_array(&env, &[10; 32]);
        client.add_payroll_root(&employer, &root);
        client.deposit(&employer, &1_000);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        let nullifier   = BytesN::from_array(&env, &[55; 32]);

        let proof = Proof {
            a: BytesN::from_array(&env, &[0; 64]),
            b: BytesN::from_array(&env, &[0; 128]),
            c: BytesN::from_array(&env, &[0; 64]),
        };
        let public_inputs = PublicInputs {
            merkle_root:    root.clone(),
            employer_id:    employer_id.clone(),
            nullifier:      nullifier.clone(),
            claimed_amount: 200,
        };

        let result = client.claim_payroll(
            &proof, &public_inputs, &worker, &usdc, &Vec::new(&env)
        );
        assert_eq!(result, true);
        assert_eq!(usdc_client.balance(&worker), 200);
        assert_eq!(client.get_balance(), 800);
        assert!(client.is_nullifier_spent(&nullifier));
    }

    #[test]
    fn test_claim_from_old_batch_still_works() {
        // Both batch A and batch B can be claimed simultaneously.
        let (env, employer, usdc, client) = setup_env();
        let worker_a = Address::generate(&env);
        let worker_b = Address::generate(&env);
        let usdc_client = TokenClient::new(&env, &usdc);

        let root_a = BytesN::from_array(&env, &[10; 32]);
        let root_b = BytesN::from_array(&env, &[20; 32]);

        client.add_payroll_root(&employer, &root_a);
        client.add_payroll_root(&employer, &root_b);
        client.deposit(&employer, &2_000);

        let employer_id = BytesN::from_array(&env, &[1; 32]);

        // Worker A claims against old batch root_a
        let null_a = BytesN::from_array(&env, &[11; 32]);
        let proof = Proof {
            a: BytesN::from_array(&env, &[0; 64]),
            b: BytesN::from_array(&env, &[0; 128]),
            c: BytesN::from_array(&env, &[0; 64]),
        };
        client.claim_payroll(&proof, &PublicInputs {
            merkle_root: root_a.clone(), employer_id: employer_id.clone(),
            nullifier: null_a, claimed_amount: 300,
        }, &worker_a, &usdc, &Vec::new(&env));

        // Worker B claims against new batch root_b
        let null_b = BytesN::from_array(&env, &[22; 32]);
        client.claim_payroll(&proof, &PublicInputs {
            merkle_root: root_b.clone(), employer_id: employer_id.clone(),
            nullifier: null_b, claimed_amount: 500,
        }, &worker_b, &usdc, &Vec::new(&env));

        assert_eq!(usdc_client.balance(&worker_a), 300);
        assert_eq!(usdc_client.balance(&worker_b), 500);
        assert_eq!(client.get_balance(), 1_200);
    }

    #[test]
    #[should_panic(expected = "HostError")]
    fn test_claim_against_inactive_root_fails() {
        let (env, employer, usdc, client) = setup_env();
        let worker = Address::generate(&env);

        let root = BytesN::from_array(&env, &[10; 32]);
        client.add_payroll_root(&employer, &root);
        client.disable_payroll_root(&employer, &root);
        client.deposit(&employer, &1_000);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        let proof = Proof {
            a: BytesN::from_array(&env, &[0; 64]),
            b: BytesN::from_array(&env, &[0; 128]),
            c: BytesN::from_array(&env, &[0; 64]),
        };
        // Should panic with RootNotActive (error #7)
        client.claim_payroll(&proof, &PublicInputs {
            merkle_root: root, employer_id, nullifier: BytesN::from_array(&env, &[4; 32]),
            claimed_amount: 100,
        }, &worker, &usdc, &Vec::new(&env));
    }

    #[test]
    #[should_panic(expected = "HostError")]
    fn test_double_spend_fails() {
        let (env, employer, usdc, client) = setup_env();
        let worker = Address::generate(&env);

        let root = BytesN::from_array(&env, &[10; 32]);
        client.add_payroll_root(&employer, &root);
        client.deposit(&employer, &1_000);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        let nullifier   = BytesN::from_array(&env, &[55; 32]);
        let proof = Proof {
            a: BytesN::from_array(&env, &[0; 64]),
            b: BytesN::from_array(&env, &[0; 128]),
            c: BytesN::from_array(&env, &[0; 64]),
        };
        let inputs = PublicInputs {
            merkle_root: root, employer_id, nullifier, claimed_amount: 100,
        };

        client.claim_payroll(&proof, &inputs, &worker, &usdc, &Vec::new(&env));
        // Second claim with same nullifier must panic
        client.claim_payroll(&proof, &inputs, &worker, &usdc, &Vec::new(&env));
    }
}
