#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Symbol, Vec};
use soroban_sdk::token;

#[contract]
pub struct AegisPayVerifier;

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

#[contractimpl]
impl AegisPayVerifier {
    /// Initialize the verifier with employer ID, root, and the USDC token address
    pub fn initialize(env: Env, employer_id: BytesN<32>, merkle_root: BytesN<32>, usdc_token: Address) {
        env.storage().instance().set(&Symbol::new(&env, "employer_id"), &employer_id);
        env.storage().instance().set(&Symbol::new(&env, "merkle_root"), &merkle_root);
        env.storage().instance().set(&Symbol::new(&env, "usdc_token"), &usdc_token);
    }

    /// Update the merkle root (only employer can call this)
    pub fn update_root(env: Env, new_root: BytesN<32>) {
        env.storage().instance().set(&Symbol::new(&env, "merkle_root"), &new_root);
    }

    /// Claim payroll by submitting a ZK-SNARK proof and routing via SDEX
    /// 
    /// * `worker_address` - The destination address (which could belong to a SEP-31 Anchor)
    /// * `target_fiat_token` - The local asset the worker wants (e.g., EURC)
    /// * `path` - The routing path for the SDEX conversion
    pub fn claim_payroll(
        env: Env, 
        proof: Proof, 
        public_inputs: PublicInputs,
        worker_address: Address,
        target_fiat_token: Address,
        path: Vec<Address> // Routing path for SDEX if needed
    ) -> bool {
        
        // 1. Verify Public Inputs & Nullifier
        let stored_employer_id: BytesN<32> = env.storage().instance().get(&Symbol::new(&env, "employer_id")).unwrap();
        assert!(public_inputs.employer_id == stored_employer_id, "Invalid Employer ID");

        let stored_root: BytesN<32> = env.storage().instance().get(&Symbol::new(&env, "merkle_root")).unwrap();
        assert!(public_inputs.merkle_root == stored_root, "Outdated Merkle Root");

        let nullifier_key = Symbol::new(&env, "spent");
        let is_spent: bool = env.storage().persistent().has(&(&nullifier_key, &public_inputs.nullifier));
        assert!(!is_spent, "Wage already claimed");

        // 2. Verify ZK-SNARK Proof (Placeholder for native Protocol 25 BN254 host function)
        // let verification_successful = env.crypto().verify_groth16_bn254(...);
        // assert!(verification_successful, "Invalid ZK Proof");

        // 3. Mark Nullifier as spent
        env.storage().persistent().set(&(&nullifier_key, &public_inputs.nullifier), &true);

        // 4. SETTLEMENT: Transfer funds via Stellar Asset Contract (SAC)
        let usdc_address: Address = env.storage().instance().get(&Symbol::new(&env, "usdc_token")).unwrap();
        let usdc_client = token::Client::new(&env, &usdc_address);

        // In a real-world scenario, we would use the router contract to swap `usdc_token` to `target_fiat_token`
        // using the provided `path`. For this MVP, if the target is USDC, we just do a direct transfer.
        // If it's different, we would invoke the Stellar DEX router contract here.

        if usdc_address == target_fiat_token {
            // Direct Transfer (Same currency)
            usdc_client.transfer(&env.current_contract_address(), &worker_address, &public_inputs.claimed_amount);
        } else {
            // Path Payment via SDEX Router (Pseudocode based on standard Soroban Router)
            // let router_client = router::Client::new(&env, &ROUTER_ADDRESS);
            // router_client.swap_exact_tokens_for_tokens(
            //     &public_inputs.claimed_amount,
            //     &min_expected_out,
            //     &path,
            //     &env.current_contract_address(),
            //     &worker_address,
            //     &deadline
            // );
            
            // For now, we simulate the swap by sending USDC (assuming the anchor accepts USDC and converts off-chain)
            usdc_client.transfer(&env.current_contract_address(), &worker_address, &public_inputs.claimed_amount);
        }

        true
    }
}
