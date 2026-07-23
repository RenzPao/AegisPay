"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAndSubmitClaim = buildAndSubmitClaim;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
const config_1 = require("./config");
const stellar_1 = require("./utils/stellar");
const server = new stellar_sdk_1.rpc.Server(config_1.config.STELLAR_RPC_URL);
const networkPassphrase = config_1.config.STELLAR_NETWORK === 'testnet' ? stellar_sdk_1.Networks.TESTNET : stellar_sdk_1.Networks.PUBLIC;
const relayerKeypair = stellar_sdk_1.Keypair.fromSecret(config_1.config.RELAYER_SECRET_KEY);
function addressToScVal(addr) {
    return new stellar_sdk_1.Address(addr).toScVal();
}
async function buildAndSubmitClaim(proof, publicSignals, workerAddress, targetTokenAddress, anchorAddress, pathAddresses = []) {
    try {
        const relayerAccount = await server.getAccount(relayerKeypair.publicKey());
        const contract = new stellar_sdk_1.Contract(config_1.config.CONTRACT_ID);
        // Build contract call arguments using Address helper (SDK v12 compatible)
        const args = [
            (0, stellar_1.proofToXdr)(proof),
            (0, stellar_1.publicInputsToXdr)(publicSignals),
            addressToScVal(workerAddress),
            addressToScVal(targetTokenAddress),
            addressToScVal(anchorAddress),
            stellar_sdk_1.xdr.ScVal.scvVec(pathAddresses.map(addr => addressToScVal(addr))),
        ];
        // Build inner transaction
        const innerTx = new stellar_sdk_1.TransactionBuilder(relayerAccount, {
            fee: '100',
            networkPassphrase,
        })
            .addOperation(contract.call('claim_payroll', ...args))
            .setTimeout(stellar_sdk_1.TimeoutInfinite)
            .build();
        // Simulate to get footprint and resource fee
        const preflight = await server.simulateTransaction(innerTx);
        if (stellar_sdk_1.rpc.Api.isSimulationError(preflight)) {
            throw new Error(`Simulation failed: ${preflight.error}`);
        }
        // Assemble transaction with Soroban simulation data
        const preparedTx = stellar_sdk_1.rpc.assembleTransaction(innerTx, preflight).build();
        preparedTx.sign(relayerKeypair);
        // Submit the prepared transaction directly (fee-bump is optional for testnet)
        const sendResponse = await server.sendTransaction(preparedTx);
        if (sendResponse.status === 'ERROR') {
            throw new Error(`Submit failed: ${sendResponse.errorResult?.toXDR('base64')}`);
        }
        // Poll for confirmation
        const txHash = sendResponse.hash;
        const txResult = await (0, stellar_1.waitForTransaction)(txHash, server);
        if (txResult.status === stellar_sdk_1.rpc.Api.GetTransactionStatus.SUCCESS) {
            return { success: true, txHash };
        }
        else {
            return { success: false, txHash, errorMessage: `Transaction failed with status: ${txResult.status}` };
        }
    }
    catch (error) {
        console.error('Relayer error:', error);
        return { success: false, errorMessage: error.message || 'Unknown error' };
    }
}
