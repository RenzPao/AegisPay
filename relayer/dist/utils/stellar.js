"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSETS = void 0;
exports.proofToXdr = proofToXdr;
exports.publicInputsToXdr = publicInputsToXdr;
exports.waitForTransaction = waitForTransaction;
const stellar_sdk_1 = require("@stellar/stellar-sdk");
exports.ASSETS = {
    testnet: {
        USDC: 'CCW67TSZV3OOMGBO446263TY4J6TY7SGB4D3W54AOFUFWYFTQO2Q2S5L',
        EURC: 'CB26EEXR5PPRXUKT3YV2IIPZYY56XG67KXZRUKH2W4YYZUKQ223OQFXH',
        NGNC: 'CBEF2XZ5U7ZGHW3EHTZY6DOWF5ZMYH3ZJ4LZ377F3HMBZIXM3C6G54B5',
        BRLT: 'CDKIV7YZ26VHQY2H3A2H6OWS5M3I4U2MZHJ4P2K33K4V2LZ4UYYK7W4C',
        PHPC: 'CBUFJ4F4Z4N4F4H4J4H4K4K4N4G4D4H4N4A4N4I4B4I4K4K4N4A4N4G4',
    }
};
function proofToXdr(proof) {
    // Convert snarkjs proof to ScVal
    // Based on the contract expectation. Using standard byte array formatting.
    // In a real implementation this matches the Rust struct `Proof`
    return stellar_sdk_1.xdr.ScVal.scvVec([
        // pi_a
        stellar_sdk_1.xdr.ScVal.scvVec(proof.pi_a.slice(0, 2).map((x) => stellar_sdk_1.xdr.ScVal.scvString(x))),
        // pi_b
        stellar_sdk_1.xdr.ScVal.scvVec(proof.pi_b.slice(0, 2).map((x) => stellar_sdk_1.xdr.ScVal.scvVec(x.slice(0, 2).map((y) => stellar_sdk_1.xdr.ScVal.scvString(y))))),
        // pi_c
        stellar_sdk_1.xdr.ScVal.scvVec(proof.pi_c.slice(0, 2).map((x) => stellar_sdk_1.xdr.ScVal.scvString(x)))
    ]);
}
function publicInputsToXdr(signals) {
    // Convert public inputs to ScVal
    return stellar_sdk_1.xdr.ScVal.scvVec(signals.map(s => stellar_sdk_1.xdr.ScVal.scvString(s)));
}
async function waitForTransaction(hash, server) {
    const maxWait = 30000;
    const pollInterval = 2000;
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        const txResponse = await server.getTransaction(hash);
        if (txResponse.status !== stellar_sdk_1.rpc.Api.GetTransactionStatus.NOT_FOUND) {
            return txResponse;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    throw new Error(`Timeout waiting for transaction ${hash}`);
}
