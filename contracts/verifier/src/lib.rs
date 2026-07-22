#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, Symbol, Vec,
};
use soroban_sdk::token;

#[contract]
pub struct AegisPayVerifier;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidProof = 4,
    NullifierSpent = 5,
    InsufficientFunds = 6,
    InvalidRoot = 7,
    InvalidEmployer = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proof {
    pub a: BytesN<64>,       // G1 point
    pub b: BytesN<128>,      // G2 point
    pub c: BytesN<64>,       // G1 point
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicInputs {
    pub merkle_root: BytesN<32>,
    pub employer_id: BytesN<32>,
    pub nullifier: BytesN<32>,
    pub claimed_amount: i128,
}

// Events
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayrollDepositedEvent {
    pub employer: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayrollRootUpdatedEvent {
    pub employer: Address,
    pub new_root: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WageClaimedEvent {
    pub worker: Address,
    pub amount: i128,
    pub nullifier: BytesN<32>,
}

#[contractimpl]
impl AegisPayVerifier {
    pub fn initialize(
        env: Env,
        employer: Address,
        employer_id: BytesN<32>,
        merkle_root: BytesN<32>,
        usdc_token: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&Symbol::new(&env, "employer")) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&Symbol::new(&env, "employer"), &employer);
        env.storage().instance().set(&Symbol::new(&env, "employer_id"), &employer_id);
        env.storage().instance().set(&Symbol::new(&env, "merkle_root"), &merkle_root);
        env.storage().instance().set(&Symbol::new(&env, "usdc_token"), &usdc_token);
        
        Ok(())
    }

    pub fn deposit(env: Env, employer: Address, amount: i128) -> Result<(), Error> {
        let stored_employer: Address = env.storage().instance().get(&Symbol::new(&env, "employer")).unwrap();
        if employer != stored_employer {
            return Err(Error::Unauthorized);
        }
        employer.require_auth();

        let usdc_address: Address = env.storage().instance().get(&Symbol::new(&env, "usdc_token")).unwrap();
        let client = token::Client::new(&env, &usdc_address);
        client.transfer(&employer, &env.current_contract_address(), &amount);

        env.events().publish((Symbol::new(&env, "PayrollDeposited"),), PayrollDepositedEvent { employer, amount });
        
        Ok(())
    }

    pub fn update_payroll_root(env: Env, employer: Address, new_root: BytesN<32>) -> Result<(), Error> {
        let stored_employer: Address = env.storage().instance().get(&Symbol::new(&env, "employer")).unwrap();
        if employer != stored_employer {
            return Err(Error::Unauthorized);
        }
        employer.require_auth();

        env.storage().instance().set(&Symbol::new(&env, "merkle_root"), &new_root);

        env.events().publish((Symbol::new(&env, "PayrollRootUpdated"),), PayrollRootUpdatedEvent { employer, new_root });

        Ok(())
    }

    pub fn claim_payroll(
        env: Env,
        proof: Proof,
        public_inputs: PublicInputs,
        worker_address: Address,
        target_fiat_token: Address,
        _path: Vec<Address>,
    ) -> Result<bool, Error> {
        let stored_employer_id: BytesN<32> = env.storage().instance().get(&Symbol::new(&env, "employer_id")).unwrap();
        if public_inputs.employer_id != stored_employer_id {
            return Err(Error::InvalidEmployer);
        }

        let stored_root: BytesN<32> = env.storage().instance().get(&Symbol::new(&env, "merkle_root")).unwrap();
        if public_inputs.merkle_root != stored_root {
            return Err(Error::InvalidRoot);
        }

        let nullifier_key = Symbol::new(&env, "spent");
        let is_spent: bool = env.storage().persistent().has(&(nullifier_key.clone(), public_inputs.nullifier.clone()));
        if is_spent {
            return Err(Error::NullifierSpent);
        }

        if !Self::verify_groth16(&env, &proof, &public_inputs) {
            return Err(Error::InvalidProof);
        }

        env.storage().persistent().set(&(nullifier_key, public_inputs.nullifier.clone()), &true);

        let usdc_address: Address = env.storage().instance().get(&Symbol::new(&env, "usdc_token")).unwrap();
        let usdc_client = token::Client::new(&env, &usdc_address);
        
        if usdc_client.balance(&env.current_contract_address()) < public_inputs.claimed_amount {
             return Err(Error::InsufficientFunds);
        }

        if usdc_address == target_fiat_token {
            usdc_client.transfer(&env.current_contract_address(), &worker_address, &public_inputs.claimed_amount);
        } else {
            usdc_client.transfer(&env.current_contract_address(), &worker_address, &public_inputs.claimed_amount);
        }

        env.events().publish((Symbol::new(&env, "WageClaimed"),), WageClaimedEvent {
            worker: worker_address.clone(),
            amount: public_inputs.claimed_amount,
            nullifier: public_inputs.nullifier,
        });

        Ok(true)
    }

    pub fn get_balance(env: Env) -> i128 {
        let usdc_address: Address = env.storage().instance().get(&Symbol::new(&env, "usdc_token")).unwrap();
        let client = token::Client::new(&env, &usdc_address);
        client.balance(&env.current_contract_address())
    }

    pub fn get_root(env: Env) -> BytesN<32> {
        env.storage().instance().get(&Symbol::new(&env, "merkle_root")).unwrap()
    }

    pub fn get_employer(env: Env) -> Address {
        env.storage().instance().get(&Symbol::new(&env, "employer")).unwrap()
    }

    fn verify_groth16(_env: &Env, _proof: &Proof, _public_inputs: &PublicInputs) -> bool {
        // Stub for Protocol 25 BN254 host function.
        // E.g. env.crypto().verify_groth16_bn254(proof, public_inputs)
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Events}, Address, BytesN, Env, Vec};
    use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};

    #[test]
    fn test_initialize_and_deposit() {
        let env = Env::default();
        env.mock_all_auths();

        let employer = Address::generate(&env);
        let admin = Address::generate(&env);

        let usdc = env.register_stellar_asset_contract(admin.clone());
        let usdc_client = TokenClient::new(&env, &usdc);
        let usdc_admin_client = StellarAssetClient::new(&env, &usdc);

        usdc_admin_client.mint(&employer, &1000);

        let contract_id = env.register_contract(None, AegisPayVerifier);
        let client = AegisPayVerifierClient::new(&env, &contract_id);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        let merkle_root = BytesN::from_array(&env, &[2; 32]);

        client.initialize(&employer, &employer_id, &merkle_root, &usdc);
        
        assert_eq!(client.get_employer(), employer);
        assert_eq!(client.get_root(), merkle_root);

        client.deposit(&employer, &500);
        
        assert_eq!(client.get_balance(), 500);
        assert_eq!(usdc_client.balance(&employer), 500);
        assert_eq!(usdc_client.balance(&contract_id), 500);
    }

    #[test]
    fn test_update_root() {
        let env = Env::default();
        env.mock_all_auths();
        let employer = Address::generate(&env);
        let admin = Address::generate(&env);
        let usdc = env.register_stellar_asset_contract(admin.clone());

        let contract_id = env.register_contract(None, AegisPayVerifier);
        let client = AegisPayVerifierClient::new(&env, &contract_id);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        let old_root = BytesN::from_array(&env, &[2; 32]);
        let new_root = BytesN::from_array(&env, &[3; 32]);

        client.initialize(&employer, &employer_id, &old_root, &usdc);
        client.update_payroll_root(&employer, &new_root);

        assert_eq!(client.get_root(), new_root);
    }

    #[test]
    fn test_claim_flow() {
        let env = Env::default();
        env.mock_all_auths();
        let employer = Address::generate(&env);
        let admin = Address::generate(&env);
        let worker = Address::generate(&env);
        let usdc = env.register_stellar_asset_contract(admin.clone());
        let usdc_client = TokenClient::new(&env, &usdc);
        let usdc_admin_client = StellarAssetClient::new(&env, &usdc);

        usdc_admin_client.mint(&employer, &1000);

        let contract_id = env.register_contract(None, AegisPayVerifier);
        let client = AegisPayVerifierClient::new(&env, &contract_id);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        let merkle_root = BytesN::from_array(&env, &[2; 32]);

        client.initialize(&employer, &employer_id, &merkle_root, &usdc);
        client.deposit(&employer, &500);

        let nullifier = BytesN::from_array(&env, &[4; 32]);

        let proof = Proof {
            a: BytesN::from_array(&env, &[0; 64]),
            b: BytesN::from_array(&env, &[0; 128]),
            c: BytesN::from_array(&env, &[0; 64]),
        };

        let public_inputs = PublicInputs {
            merkle_root: merkle_root.clone(),
            employer_id: employer_id.clone(),
            nullifier: nullifier.clone(),
            claimed_amount: 100,
        };

        let path = Vec::new(&env);

        let result = client.claim_payroll(&proof, &public_inputs, &worker, &usdc, &path);
        assert_eq!(result, true);
        assert_eq!(usdc_client.balance(&worker), 100);
        assert_eq!(client.get_balance(), 400);
    }

    #[test]
    #[should_panic(expected = "HostError")]
    fn test_double_spend() {
        let env = Env::default();
        env.mock_all_auths();
        let employer = Address::generate(&env);
        let admin = Address::generate(&env);
        let worker = Address::generate(&env);
        let usdc = env.register_stellar_asset_contract(admin.clone());
        let usdc_admin_client = StellarAssetClient::new(&env, &usdc);
        usdc_admin_client.mint(&employer, &1000);

        let contract_id = env.register_contract(None, AegisPayVerifier);
        let client = AegisPayVerifierClient::new(&env, &contract_id);

        let employer_id = BytesN::from_array(&env, &[1; 32]);
        let merkle_root = BytesN::from_array(&env, &[2; 32]);
        client.initialize(&employer, &employer_id, &merkle_root, &usdc);
        client.deposit(&employer, &500);

        let nullifier = BytesN::from_array(&env, &[4; 32]);

        let proof = Proof {
            a: BytesN::from_array(&env, &[0; 64]),
            b: BytesN::from_array(&env, &[0; 128]),
            c: BytesN::from_array(&env, &[0; 64]),
        };

        let public_inputs = PublicInputs {
            merkle_root: merkle_root.clone(),
            employer_id: employer_id.clone(),
            nullifier: nullifier.clone(),
            claimed_amount: 100,
        };
        let path = Vec::new(&env);
        client.claim_payroll(&proof, &public_inputs, &worker, &usdc, &path);
        
        client.claim_payroll(&proof, &public_inputs, &worker, &usdc, &path);
    }
}
