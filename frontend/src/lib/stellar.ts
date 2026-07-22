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
