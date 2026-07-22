import * as StellarSdk from '@stellar/stellar-sdk';
import { getAddress, signTransaction, setAllowed } from '@stellar/freighter-api';

const RPC_URL = 'https://soroban-testnet.stellar.org';

export async function deployRootToContract(contractId: string, rootHex: string) {
  try {
    await setAllowed();
    const addrResult = await getAddress();
    if (addrResult.error || !addrResult.address) {
      throw new Error(addrResult.error || 'Failed to get Freighter address');
    }
    const publicKey = addrResult.address;
    
    const server = new StellarSdk.rpc.Server(RPC_URL);
    const account = await server.getAccount(publicKey);
    
    const contract = new StellarSdk.Contract(contractId);
    
    // Parse the 0x-prefixed root string to a 32-byte Buffer
    const rootBuffer = Buffer.from(rootHex.replace('0x', '').padStart(64, '0'), 'hex');
    
    const operation = contract.call(
      'update_payroll_root',
      new StellarSdk.Address(publicKey).toScVal(),
      StellarSdk.nativeToScVal(rootBuffer) // Automatically infers ScVal.scvBytes
    );

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
    .addOperation(operation)
    .setTimeout(30)
    .build();

    const preparedTx = await server.prepareTransaction(tx);
    const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: StellarSdk.Networks.TESTNET });
    if (signResult.error) throw new Error(signResult.error);
    
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, StellarSdk.Networks.TESTNET) as StellarSdk.Transaction;
    const sendResponse = await server.sendTransaction(signedTx);
    
    if (sendResponse.status === 'PENDING') {
      console.log('Transaction pending:', sendResponse.hash);
      return sendResponse.hash;
    } else {
      throw new Error(`Transaction failed: ${sendResponse.status}`);
    }
  } catch (error) {
    console.error("Error deploying root:", error);
    throw error;
  }
}

export async function fundEscrowContract(contractId: string, amountUSD: number) {
  try {
    await setAllowed();
    const addrResult = await getAddress();
    if (addrResult.error || !addrResult.address) {
      throw new Error(addrResult.error || 'Failed to get Freighter address');
    }
    const publicKey = addrResult.address;
    
    const server = new StellarSdk.rpc.Server(RPC_URL);
    const account = await server.getAccount(publicKey);
    
    const contract = new StellarSdk.Contract(contractId);
    
    // Convert USD to Stroops (1e7)
    const amountStroops = Math.floor(amountUSD * 1e7);
    
    const operation = contract.call(
      'deposit',
      new StellarSdk.Address(publicKey).toScVal(),
      StellarSdk.nativeToScVal(amountStroops.toString(), { type: 'i128' })
    );

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
    .addOperation(operation)
    .setTimeout(30)
    .build();

    const preparedTx = await server.prepareTransaction(tx);
    const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: StellarSdk.Networks.TESTNET });
    if (signResult.error) throw new Error(signResult.error);
    
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, StellarSdk.Networks.TESTNET) as StellarSdk.Transaction;
    const sendResponse = await server.sendTransaction(signedTx);
    
    if (sendResponse.status === 'PENDING') {
      console.log('Transaction pending:', sendResponse.hash);
      return sendResponse.hash;
    } else {
      throw new Error(`Transaction failed: ${sendResponse.status}`);
    }
  } catch (error) {
    console.error("Error funding escrow:", error);
    throw error;
  }
}

// Testnet XLM Contract ID as a placeholder for USDC to simplify testing
export const TESTNET_XLM_CONTRACT = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

export async function initializeContract(contractId: string, employerIdHex: string, rootHex: string) {
  try {
    await setAllowed();
    const addrResult = await getAddress();
    if (addrResult.error || !addrResult.address) throw new Error(addrResult.error || 'Failed to get Freighter address');
    const publicKey = addrResult.address;
    
    const server = new StellarSdk.rpc.Server(RPC_URL);
    const account = await server.getAccount(publicKey);
    const contract = new StellarSdk.Contract(contractId);
    
    const employerIdBuffer = Buffer.from(employerIdHex.replace('0x', '').padStart(64, '0'), 'hex');
    const rootBuffer = Buffer.from(rootHex.replace('0x', '').padStart(64, '0'), 'hex');

    const operation = contract.call(
      'initialize',
      new StellarSdk.Address(publicKey).toScVal(),
      StellarSdk.nativeToScVal(employerIdBuffer),
      StellarSdk.nativeToScVal(rootBuffer),
      new StellarSdk.Address(TESTNET_XLM_CONTRACT).toScVal()
    );

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: StellarSdk.Networks.TESTNET,
    }).addOperation(operation).setTimeout(30).build();

    const preparedTx = await server.prepareTransaction(tx);
    const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: StellarSdk.Networks.TESTNET });
    if (signResult.error) throw new Error(signResult.error);
    
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, StellarSdk.Networks.TESTNET) as StellarSdk.Transaction;
    const sendResponse = await server.sendTransaction(signedTx);
    return sendResponse.hash;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function submitClaimToContract(
  contractId: string,
  employerIdHex: string,
  merkleRootHex: string,
  nullifierHex: string,
  claimedAmountStroops: number,
  anchorAddress: string
) {
  try {
    await setAllowed();
    const addrResult = await getAddress();
    if (addrResult.error || !addrResult.address) throw new Error(addrResult.error || 'Failed to get Freighter address');
    const publicKey = addrResult.address;
    
    const server = new StellarSdk.rpc.Server(RPC_URL);
    const account = await server.getAccount(publicKey);
    const contract = new StellarSdk.Contract(contractId);
    
    // Convert hex strings to Buffers
    const employerIdBuffer = Buffer.from(employerIdHex.replace('0x', '').padStart(64, '0'), 'hex');
    const merkleRootBuffer = Buffer.from(merkleRootHex.replace('0x', '').padStart(64, '0'), 'hex');
    
    // Hash the nullifier string to a 32-byte buffer since our mock outputs a string like "0xMOCKNULLIFIER_WORKER_001"
    // Wait, the smart contract expects 32 bytes. If the nullifier is a real 32-byte hex, parse it.
    let nullifierBuffer;
    if (nullifierHex.startsWith('0xMOCK')) {
       // Mock nullifier, just hash it to get 32 bytes
       const encoder = new TextEncoder();
       const data = encoder.encode(nullifierHex);
       const hash = await crypto.subtle.digest('SHA-256', data);
       nullifierBuffer = Buffer.from(hash);
    } else {
       nullifierBuffer = Buffer.from(nullifierHex.replace('0x', '').padStart(64, '0'), 'hex');
    }

    const proof = StellarSdk.nativeToScVal({
      a: Buffer.alloc(64, 0),
      b: Buffer.alloc(128, 0),
      c: Buffer.alloc(64, 0)
    });

    const publicInputs = StellarSdk.nativeToScVal({
      claimed_amount: StellarSdk.nativeToScVal(Math.floor(claimedAmountStroops).toString(), { type: 'i128' }),
      employer_id: employerIdBuffer,
      merkle_root: merkleRootBuffer,
      nullifier: nullifierBuffer
    });

    const operation = contract.call(
      'claim_payroll',
      proof,
      publicInputs,
      new StellarSdk.Address(anchorAddress).toScVal(), // worker_address (where the funds go)
      new StellarSdk.Address(TESTNET_XLM_CONTRACT).toScVal(), // target_fiat_token
      StellarSdk.nativeToScVal([]) // _path
    );

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "10000",
      networkPassphrase: StellarSdk.Networks.TESTNET,
    }).addOperation(operation).setTimeout(30).build();

    const preparedTx = await server.prepareTransaction(tx);
    const signResult = await signTransaction(preparedTx.toXDR(), { networkPassphrase: StellarSdk.Networks.TESTNET });
    if (signResult.error) throw new Error(signResult.error);
    
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signResult.signedTxXdr, StellarSdk.Networks.TESTNET) as StellarSdk.Transaction;
    const sendResponse = await server.sendTransaction(signedTx);
    
    if (sendResponse.status === 'PENDING') {
      return sendResponse.hash;
    } else {
      throw new Error(`Transaction failed: ${sendResponse.status}`);
    }
  } catch (error) {
    console.error("Error submitting claim:", error);
    throw error;
  }
}
