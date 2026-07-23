import * as StellarSdk from '@stellar/stellar-sdk';
import { getAddress, signTransaction, setAllowed } from '@stellar/freighter-api';
import { config } from './config';

// Native XLM wrapped contract on testnet (used as the escrow token for testnet)
export const TESTNET_XLM_CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getConnectedAccount() {
  await setAllowed();
  const addrResult = await getAddress();
  if (addrResult.error || !addrResult.address) {
    throw new Error(addrResult.error || 'Freighter wallet not connected. Please open Freighter and try again.');
  }
  return addrResult.address;
}

async function buildSignAndSend(
  publicKey: string,
  operation: StellarSdk.xdr.Operation,
  server: StellarSdk.rpc.Server
): Promise<string> {
  const account = await server.getAccount(publicKey);
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);
  const signResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: StellarSdk.Networks.TESTNET,
  });
  if (signResult.error) throw new Error(signResult.error);

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    StellarSdk.Networks.TESTNET
  ) as StellarSdk.Transaction;

  const sendResponse = await server.sendTransaction(signedTx);
  if (sendResponse.status !== 'PENDING' && sendResponse.status !== 'SUCCESS') {
    throw new Error(`Transaction failed with status: ${sendResponse.status}`);
  }

  // Poll for on-chain confirmation to prevent race conditions in subsequent steps
  let status = 'NOT_FOUND';
  let attempts = 0;
  while (status === 'NOT_FOUND' && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const txResponse = await server.getTransaction(sendResponse.hash);
    status = txResponse.status;
    if (status === 'SUCCESS') return sendResponse.hash;
    if (status === 'FAILED') throw new Error(`Transaction failed on-chain.`);
    attempts++;
  }

  if (status === 'NOT_FOUND') {
    throw new Error('Transaction confirmation timed out.');
  }

  return sendResponse.hash;
}

function hexToBytes32(hex: string): Buffer {
  return Buffer.from(hex.replace(/^0x/, '').padStart(64, '0'), 'hex');
}

// ── Contract Functions ────────────────────────────────────────────────────────

/**
 * One-time contract initialization. Sets the employer and token.
 * Does NOT take a merkle_root — batches are added separately via addPayrollRoot.
 */
export async function initializeContract(contractId: string, employerIdHex: string): Promise<string> {
  const publicKey = await getConnectedAccount();
  const server    = new StellarSdk.rpc.Server(config.rpcUrl);
  const contract  = new StellarSdk.Contract(contractId);

  const employerIdBuffer = hexToBytes32(employerIdHex);

  const operation = contract.call(
    'initialize',
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(employerIdBuffer),
    new StellarSdk.Address(TESTNET_XLM_CONTRACT).toScVal()
  );

  return buildSignAndSend(publicKey, operation, server);
}

/**
 * Add a new payroll batch Merkle root to the contract's active registry.
 * Old roots remain valid — workers can still claim from previous batches.
 */
export async function addPayrollRoot(contractId: string, rootHex: string): Promise<string> {
  const publicKey = await getConnectedAccount();
  const server    = new StellarSdk.rpc.Server(config.rpcUrl);
  const contract  = new StellarSdk.Contract(contractId);

  const rootBuffer = hexToBytes32(rootHex);

  const operation = contract.call(
    'add_payroll_root',
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(rootBuffer)
  );

  return buildSignAndSend(publicKey, operation, server);
}

// Keep old name as alias for backward compatibility during migration
export const deployRootToContract = addPayrollRoot;

/**
 * Disable a payroll batch root (e.g., if a batch was published in error).
 * Workers who already claimed are unaffected. Workers who haven't claimed yet
 * will no longer be able to claim against this root.
 */
export async function disablePayrollRoot(contractId: string, rootHex: string): Promise<string> {
  const publicKey = await getConnectedAccount();
  const server    = new StellarSdk.rpc.Server(config.rpcUrl);
  const contract  = new StellarSdk.Contract(contractId);

  const rootBuffer = hexToBytes32(rootHex);

  const operation = contract.call(
    'disable_payroll_root',
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(rootBuffer)
  );

  return buildSignAndSend(publicKey, operation, server);
}

/**
 * Deposit XLM into the shared escrow pool. All active batches draw from this pool.
 */
export async function fundEscrowContract(contractId: string, amountXlm: number): Promise<string> {
  const publicKey = await getConnectedAccount();
  const server    = new StellarSdk.rpc.Server(config.rpcUrl);
  const contract  = new StellarSdk.Contract(contractId);

  const amountStroops = Math.floor(amountXlm * 1e7);

  const operation = contract.call(
    'deposit',
    new StellarSdk.Address(publicKey).toScVal(),
    StellarSdk.nativeToScVal(amountStroops.toString(), { type: 'i128' })
  );

  return buildSignAndSend(publicKey, operation, server);
}

// ── Claim Submission ──────────────────────────────────────────────────────────

function createStructScVal(obj: Record<string, StellarSdk.xdr.ScVal>) {
  const entries = Object.entries(obj).map(([key, val]) =>
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol(key),
      val,
    })
  );
  entries.sort((a, b) =>
    a.key().sym().toString().localeCompare(b.key().sym().toString())
  );
  return StellarSdk.xdr.ScVal.scvMap(entries);
}

/**
 * Worker submits their ZK proof to claim wages.
 * The merkleRootHex in publicInputs must match an active batch root on the contract.
 */
export async function submitClaimToContract(
  contractId:          string,
  employerIdHex:       string,
  merkleRootHex:       string,
  nullifierHex:        string,
  claimedAmountStroops: number,
  anchorAddress:       string
): Promise<string> {
  const publicKey = await getConnectedAccount();
  const server    = new StellarSdk.rpc.Server(config.rpcUrl);
  const account   = await server.getAccount(publicKey);
  const contract  = new StellarSdk.Contract(contractId);

  const employerIdBuffer = hexToBytes32(employerIdHex);
  const merkleRootBuffer = hexToBytes32(merkleRootHex);

  // Normalize the nullifier — if it's a mock string, SHA-256 hash it to 32 bytes
  let nullifierBuffer: Buffer;
  if (nullifierHex.startsWith('0xMOCK')) {
    const data = new TextEncoder().encode(nullifierHex);
    const hash = await crypto.subtle.digest('SHA-256', data);
    nullifierBuffer = Buffer.from(hash);
  } else {
    nullifierBuffer = hexToBytes32(nullifierHex);
  }

  const proof = createStructScVal({
    a: StellarSdk.nativeToScVal(Buffer.alloc(64, 0)),
    b: StellarSdk.nativeToScVal(Buffer.alloc(128, 0)),
    c: StellarSdk.nativeToScVal(Buffer.alloc(64, 0)),
  });

  const publicInputs = createStructScVal({
    claimed_amount: StellarSdk.nativeToScVal(Math.floor(claimedAmountStroops).toString(), { type: 'i128' }),
    employer_id:    StellarSdk.nativeToScVal(employerIdBuffer),
    merkle_root:    StellarSdk.nativeToScVal(merkleRootBuffer),
    nullifier:      StellarSdk.nativeToScVal(nullifierBuffer),
  });

  const operation = contract.call(
    'claim_payroll',
    proof,
    publicInputs,
    new StellarSdk.Address(anchorAddress).toScVal(),
    new StellarSdk.Address(TESTNET_XLM_CONTRACT).toScVal(),
    StellarSdk.nativeToScVal([])
  );

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase: StellarSdk.Networks.TESTNET,
  }).addOperation(operation).setTimeout(30).build();

  const preparedTx = await server.prepareTransaction(tx);
  const signResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: StellarSdk.Networks.TESTNET,
  });
  if (signResult.error) throw new Error(signResult.error);

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    StellarSdk.Networks.TESTNET
  ) as StellarSdk.Transaction;

  const sendResponse = await server.sendTransaction(signedTx);
  if (sendResponse.status === 'PENDING' || sendResponse.status === 'SUCCESS') {
    return sendResponse.hash;
  }
  throw new Error(`Transaction failed: ${sendResponse.status}`);
}
