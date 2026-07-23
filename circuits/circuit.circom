pragma circom 2.1.6;

include "node_modules/circomlib/circuits/poseidon.circom";

// A helper template to calculate the Merkle Tree root given a leaf and path
template MerkleTreeInclusionProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    component poseidons[levels];
    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    signal left[levels];
    signal right[levels];

    for (var i = 0; i < levels; i++) {
        // Enforce pathIndices is strictly 0 or 1
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        poseidons[i] = Poseidon(2);

        // Multiplexing: decide left/right based on the path index
        left[i] <== (pathElements[i] - levelHashes[i]) * pathIndices[i] + levelHashes[i];
        right[i] <== (levelHashes[i] - pathElements[i]) * pathIndices[i] + pathElements[i];

        poseidons[i].inputs[0] <== left[i];
        poseidons[i].inputs[1] <== right[i];

        levelHashes[i + 1] <== poseidons[i].out;
    }

    root <== levelHashes[levels];
}

template PayrollClaim(levels) {
    // --- Public Inputs (Checked on-chain by Soroban) ---
    signal input merkleRoot;      // Root of the payroll registry
    signal input employerId;      // To ensure proof is tied to a specific employer

    // --- Private Inputs (Known only to the worker off-chain) ---
    signal input workerId;        // Unique worker identifier
    signal input wageAmount;      // The amount owed
    signal input secretSalt;      // Random salt for privacy
    
    // --- Merkle tree proof inputs (Private) ---
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // --- Outputs (Public) ---
    signal output nullifier;      // Used on-chain to prevent replay attacks
    signal output claimedAmount;  // Publicly verifiable amount for the SC to transfer

    // 1. Verify the leaf matches the private inputs
    // The leaf in the merkle tree is the hash of (workerId, wageAmount, secretSalt)
    component leafHasher = Poseidon(3);
    leafHasher.inputs[0] <== workerId;
    leafHasher.inputs[1] <== wageAmount;
    leafHasher.inputs[2] <== secretSalt;
    
    signal leaf <== leafHasher.out;

    // 2. Verify Merkle Tree Inclusion
    component tree = MerkleTreeInclusionProof(levels);
    tree.leaf <== leaf;
    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    // Constrain the calculated root to match the public root
    tree.root === merkleRoot; 

    // 3. Generate Nullifier to prevent double claims
    component nullifierHasher = Poseidon(3);
    nullifierHasher.inputs[0] <== secretSalt;
    nullifierHasher.inputs[1] <== workerId;
    nullifierHasher.inputs[2] <== employerId;
    
    nullifier <== nullifierHasher.out;
    
    // 4. Output the amount so the Soroban contract knows exactly how much to path-pay via SDEX
    claimedAmount <== wageAmount;
}

// Instantiate the main component. 
// A tree depth of 10 supports up to 1024 workers per employer registry.
component main {public [merkleRoot, employerId]} = PayrollClaim(10);
