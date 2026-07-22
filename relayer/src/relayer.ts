import { Keypair, Networks, TransactionBuilder, Contract, xdr, rpc, FeeBumpTransaction, TimeoutInfinite } from '@stellar/stellar-sdk';
import { config } from './config';
import { proofToXdr, publicInputsToXdr, waitForTransaction } from './utils/stellar';

const server = new rpc.Server(config.STELLAR_RPC_URL);
const networkPassphrase = config.STELLAR_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
const relayerKeypair = Keypair.fromSecret(config.RELAYER_SECRET_KEY);

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

    // Prepare arguments
    const args = [
      proofToXdr(proof),
      publicInputsToXdr(publicSignals),
      new xdr.ScAddress.scAddressTypeAccountId(Keypair.fromPublicKey(workerAddress).xdrAccountId()).toScVal(),
      new xdr.ScAddress.scAddressTypeAccountId(Keypair.fromPublicKey(targetTokenAddress).xdrAccountId()).toScVal(),
      new xdr.ScAddress.scAddressTypeAccountId(Keypair.fromPublicKey(anchorAddress).xdrAccountId()).toScVal(),
      xdr.ScVal.scvVec(pathAddresses.map(addr => new xdr.ScAddress.scAddressTypeAccountId(Keypair.fromPublicKey(addr).xdrAccountId()).toScVal()))
    ];

    // Build inner transaction
    const innerTx = new TransactionBuilder(relayerAccount, {
      fee: '100', // Preflight will determine actual fee
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

    // Prepare the transaction for submission
    const tx = rpc.assembleTransaction(innerTx, networkPassphrase, preflight).build();
    
    // Create fee bump transaction
    const feeBumpTx = new FeeBumpTransaction(tx, preflight.minResourceFee || '100000');
    feeBumpTx.sign(relayerKeypair);

    // Submit the transaction
    const sendResponse = await server.sendTransaction(feeBumpTx);
    
    if (sendResponse.status === rpc.Api.SendTransactionStatus.ERROR) {
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
