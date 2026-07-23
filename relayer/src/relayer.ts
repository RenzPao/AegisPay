import {
  Keypair,
  Networks,
  TransactionBuilder,
  Contract,
  Address,
  xdr,
  rpc,
  TimeoutInfinite,
  Transaction,
  FeeBumpTransaction,
} from '@stellar/stellar-sdk';
import { config } from './config';
import { proofToXdr, publicInputsToXdr, waitForTransaction } from './utils/stellar';

const server = new rpc.Server(config.STELLAR_RPC_URL);
const networkPassphrase = config.STELLAR_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
const relayerKeypair = Keypair.fromSecret(config.RELAYER_SECRET_KEY);

function addressToScVal(addr: string): xdr.ScVal {
  return new Address(addr).toScVal();
}

export async function buildAndSubmitClaim(
  proof: any,
  publicSignals: string[],
  workerAddress: string,
  targetTokenAddress: string,
  anchorAddress: string,
  pathAddresses: string[] = []
): Promise<{ success: boolean; txHash?: string; errorMessage?: string }> {
  try {
    const relayerAccount = await server.getAccount(relayerKeypair.publicKey());
    const contract = new Contract(config.CONTRACT_ID);

    // Build contract call arguments using Address helper (SDK v12 compatible)
    const args = [
      proofToXdr(proof),
      publicInputsToXdr(publicSignals),
      addressToScVal(workerAddress),
      addressToScVal(targetTokenAddress),
      addressToScVal(anchorAddress),
      xdr.ScVal.scvVec(pathAddresses.map(addr => addressToScVal(addr))),
    ];

    // Build inner transaction
    const innerTx = new TransactionBuilder(relayerAccount, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(contract.call('claim_payroll', ...args))
      .setTimeout(TimeoutInfinite)
      .build();

    // Simulate to get footprint and resource fee
    const preflight = await server.simulateTransaction(innerTx);

    if (rpc.Api.isSimulationError(preflight)) {
      throw new Error(`Simulation failed: ${preflight.error}`);
    }

    // Assemble transaction with Soroban simulation data
    const preparedTx = rpc.assembleTransaction(innerTx, preflight).build() as Transaction;
    preparedTx.sign(relayerKeypair);

    // Submit the prepared transaction directly (fee-bump is optional for testnet)
    const sendResponse = await server.sendTransaction(preparedTx);

    if (sendResponse.status === 'ERROR') {
      throw new Error(`Submit failed: ${sendResponse.errorResult?.toXDR('base64')}`);
    }

    // Poll for confirmation
    const txHash = sendResponse.hash;
    const txResult = await waitForTransaction(txHash, server);

    if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { success: true, txHash };
    } else {
      return { success: false, txHash, errorMessage: `Transaction failed with status: ${txResult.status}` };
    }

  } catch (error: any) {
    console.error('Relayer error:', error);
    return { success: false, errorMessage: error.message || 'Unknown error' };
  }
}
