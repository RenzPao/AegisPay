#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, BytesN, Env, Symbol};

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
    /// Initialize the verifier with the employer's ID and current merkle root
    pub fn initialize(env: Env, employer_id: BytesN<32>, merkle_root: BytesN<32>) {
        env.storage().instance().set(&Symbol::new(&env, "employer_id"), &employer_id);
        env.storage().instance().set(&Symbol::new(&env, "merkle_root"), &merkle_root);
    }

    /// Update the merkle root (only employer can call this in production)
    pub fn update_root(env: Env, new_root: BytesN<32>) {
        // In production, add employer authentication here
        env.storage().instance().set(&Symbol::new(&env, "merkle_root"), &new_root);
    }

    /// Claim payroll by submitting a ZK-SNARK proof
    pub fn claim_payroll(env: Env, proof: Proof, public_inputs: PublicInputs) -> bool {
        // 1. Verify Employer ID matches
        let stored_employer_id: BytesN<32> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "employer_id"))
            .unwrap();
            
        assert!(
            public_inputs.employer_id == stored_employer_id,
            "Invalid Employer ID"
        );

        // 2. Verify Merkle Root matches the current registry
        let stored_root: BytesN<32> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "merkle_root"))
            .unwrap();
            
        assert!(
            public_inputs.merkle_root == stored_root,
            "Outdated or invalid Merkle Root"
        );

        // 3. Check for double-spend using the nullifier
        let nullifier_key = Symbol::new(&env, "spent");
        let is_spent: bool = env
            .storage()
            .persistent()
            .has(&(&nullifier_key, &public_inputs.nullifier));

        assert!(!is_spent, "Wage already claimed");

        // 4. Verify the Groth16 ZK-SNARK proof over BN254
        // In Stellar Protocol 25, native ZK verification functions are available.
        // We will call the env host function for BN254 verification.
        // (Note: The exact host function signature may vary based on final Protocol 25 specs.
        // This is a placeholder for the native verification call.)
        
        // let verification_successful = env.crypto().verify_groth16_bn254(
        //     &proof.a, &proof.b, &proof.c, &public_inputs_bytes
        // );
        // assert!(verification_successful, "Invalid ZK Proof");

        // For this MVP stub, we assume verification passed.
        
        // 5. Mark the nullifier as spent to prevent replay attacks
        env.storage()
            .persistent()
            .set(&(&nullifier_key, &public_inputs.nullifier), &true);

        // 6. Trigger Path Payment / Settlement (Phase 3 integration)
        // This is where we will route the USDC to local fiat via SDEX and SEP-31
        
        true
    }
}
