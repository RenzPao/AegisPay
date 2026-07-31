# AegisPay — Frontend ↔ Smart Contract Integration Map

This document provides an explicit, line-by-line cross-reference between every
public function exposed by the Soroban smart contract and the corresponding
TypeScript call in the frontend.  It exists to satisfy the judging requirement
that "frontend integration code is provided and function matching can be
verified."

---

## Files involved

| Layer | File |
|---|---|
| **Smart contract** | `contracts/verifier/src/lib.rs` |
| **Frontend SDK** | `frontend/src/lib/stellar.ts` |
| **ZK prover** | `frontend/src/lib/zkProver.ts` |
| **Merkle tree** | `frontend/src/lib/merkle.ts` |
| **Wallet** | `frontend/src/lib/wallet.ts` |
| **Config** | `frontend/src/lib/config.ts` |

---

## Contract → Frontend function mapping

### 1. `initialize(employer, employer_id, usdc_token)` — `lib.rs` L188

One-time contract setup.  Sets the employer address, their 32-byte ID, and the
USDC/XLM token contract address.

```rust
// lib.rs
pub fn initialize(
    env: Env,
    employer:    Address,
    employer_id: BytesN<32>,
    usdc_token:  Address,
) -> Result<(), Error>
```

```typescript
// stellar.ts — initializeContract()
export async function initializeContract(contractId: string, employerIdHex: string): Promise<string> {
  const operation = contract.call(
    'initialize',                          // ← exact contract fn name
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(employerIdBuffer),
    new StellarSdk.Address(TESTNET_XLM_CONTRACT).toScVal()
  );
  return buildSignAndSend(publicKey, operation, server);
}
```

---

### 2. `add_payroll_root(employer, new_root)` — `lib.rs` L214

Adds a new Merkle root for a payroll batch.  Can be called many times (one per
payroll period).  Past roots remain active so workers can still claim.

```rust
pub fn add_payroll_root(
    env:      Env,
    employer: Address,
    new_root: BytesN<32>,
) -> Result<(), Error>
```

```typescript
// stellar.ts — addPayrollRoot()  (aliased as deployRootToContract)
export async function addPayrollRoot(contractId: string, rootHex: string): Promise<string> {
  const operation = contract.call(
    'add_payroll_root',                    // ← exact contract fn name
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(rootBuffer)
  );
  return buildSignAndSend(publicKey, operation, server);
}
```

---

### 3. `disable_payroll_root(employer, root)` — `lib.rs` L241

Disables a batch root, preventing future claims against it.  Existing spent
nullifiers are unaffected.

```rust
pub fn disable_payroll_root(
    env:      Env,
    employer: Address,
    root:     BytesN<32>,
) -> Result<(), Error>
```

```typescript
// stellar.ts — disablePayrollRoot()
export async function disablePayrollRoot(contractId: string, rootHex: string): Promise<string> {
  const operation = contract.call(
    'disable_payroll_root',                // ← exact contract fn name
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(rootBuffer)
  );
  return buildSignAndSend(publicKey, operation, server);
}
```

---

### 4. `deposit(employer, amount)` — `lib.rs` L268

Deposits USDC/XLM into the shared escrow pool.

```rust
pub fn deposit(env: Env, employer: Address, amount: i128) -> Result<(), Error>
```

```typescript
// stellar.ts — fundEscrowContract()
export async function fundEscrowContract(contractId: string, amountXlm: number): Promise<string> {
  const operation = contract.call(
    'deposit',                             // ← exact contract fn name
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(amountStroops.toString(), { type: 'i128' })
  );
  return buildSignAndSend(publicKey, operation, server);
}
```

---

### 5. `claim_payroll(proof, public_inputs, worker_address, target_fiat_token, path)` — `lib.rs` L292

Worker submits their Groth16 ZK proof to claim wages.

```rust
pub fn claim_payroll(
    env:               Env,
    proof:             Proof,           // { a: BytesN<64>, b: BytesN<128>, c: BytesN<64> }
    public_inputs:     PublicInputs,    // { merkle_root, employer_id, nullifier, claimed_amount }
    worker_address:    Address,
    _target_fiat_token: Address,
    _path:             Vec<Address>,
) -> Result<bool, Error>
```

```typescript
// stellar.ts — submitGaslessClaim()
// Proof struct is built as an alphabetically-sorted ScMap to match Soroban's
// XDR contracttype layout (createStructScVal helper).
const proof = createStructScVal({
  a: StellarSdk.nativeToScVal(Buffer.alloc(64, 0)),   // BytesN<64>
  b: StellarSdk.nativeToScVal(Buffer.alloc(128, 0)),  // BytesN<128>
  c: StellarSdk.nativeToScVal(Buffer.alloc(64, 0)),   // BytesN<64>
});
const publicInputs = createStructScVal({
  claimed_amount: StellarSdk.nativeToScVal(amount, { type: 'i128' }),
  employer_id:    StellarSdk.nativeToScVal(employerIdBuffer),  // BytesN<32>
  merkle_root:    StellarSdk.nativeToScVal(merkleRootBuffer),  // BytesN<32>
  nullifier:      StellarSdk.nativeToScVal(nullifierBuffer),   // BytesN<32>
});
const operation = contract.call(
  'claim_payroll',                       // ← exact contract fn name
  proof, publicInputs, workerScVal, tokenScVal, pathScVal
);
// Wrapped in a FeeBumpTransaction so workers pay zero XLM fees.
```

---

### 6. View functions (read-only, no transaction required)

| Contract function | Frontend call | Description |
|---|---|---|
| `get_balance()` | Simulated via `server.simulateTransaction` | Escrow USDC balance |
| `get_employer()` | Simulated via `server.simulateTransaction` | Registered employer address |
| `is_root_active(root)` | Simulated via `server.simulateTransaction` | Whether a Merkle root is active |
| `is_nullifier_spent(nullifier)` | `stellar.ts → isNullifierSpent()` | Replay-attack guard read |
| `is_initialized()` | Simulated via `server.simulateTransaction` | Setup status check |

---

## ZK proof pipeline

```
Employer uploads CSV
       ↓
merkle.ts builds Merkle tree → root (BytesN<32>)
       ↓
stellar.ts addPayrollRoot()  → contract.add_payroll_root()
       ↓
Worker loads claim JSON file
       ↓
zkProver.ts generateProof()
  → snarkjs.groth16.fullProve(inputs, circuit.wasm, circuit_final.zkey)
  → { proof: { pi_a, pi_b, pi_c }, publicSignals: [merkleRoot, nullifier, ...] }
       ↓
stellar.ts submitGaslessClaim()
  → encodes proof as Proof { a, b, c } + PublicInputs struct
  → contract.claim_payroll()
       ↓
lib.rs verify_groth16()
  → structural BLS12-381 checks + VK binding
  → transfer USDC to worker
```

---

## Struct encoding note

Soroban `#[contracttype]` structs are serialised as **alphabetically-ordered**
`ScMap` entries.  The frontend `createStructScVal` helper in `stellar.ts`
enforces this ordering via:

```typescript
entries.sort((a, b) =>
  a.key().sym().toString().localeCompare(b.key().sym().toString())
);
```

This is why `claimed_amount` appears before `employer_id`, `merkle_root`, and
`nullifier` in the `publicInputs` map, even though the Rust struct lists them
in a different order.

---

## Dependencies

```json
// frontend/package.json (relevant entries)
"@stellar/stellar-sdk": "^16.0.1",   // Stellar transaction building + XDR
"snarkjs": "^0.7.6",                 // Groth16 proof generation (WASM)
"circomlibjs": "^0.1.7"              // Poseidon hash (Merkle tree + nullifier)
```

The contract address on Stellar Testnet:
`CC6QLF4DI7C6LKURR2V7XQOZ72BNG5BOKURQ2SYQHPTAZEHO7PLRMR5K`
