"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const relayer_1 = require("../relayer");
const stellar_1 = require("../utils/stellar");
exports.claimRouter = (0, express_1.Router)();
const ClaimSchema = zod_1.z.object({
    proof: zod_1.z.object({
        pi_a: zod_1.z.array(zod_1.z.string()),
        pi_b: zod_1.z.array(zod_1.z.array(zod_1.z.string())),
        pi_c: zod_1.z.array(zod_1.z.string())
    }),
    publicSignals: zod_1.z.array(zod_1.z.string()).length(3),
    workerAddress: zod_1.z.string().startsWith('G').length(56),
    anchorAddress: zod_1.z.string().startsWith('G').length(56),
    targetAsset: zod_1.z.enum(['USDC', 'EURC', 'NGNC', 'BRLT', 'PHPC']),
    employerId: zod_1.z.string().min(1)
});
exports.claimRouter.post('/submit-claim', async (req, res) => {
    try {
        const parsed = ClaimSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(422).json({ error: 'Validation failed', details: parsed.error.issues });
        }
        const { proof, publicSignals, workerAddress, anchorAddress, targetAsset } = parsed.data;
        // Mask worker address for logging
        const maskedWorker = workerAddress.slice(0, 4) + '...' + workerAddress.slice(-4);
        console.log(`[${new Date().toISOString()}] Processing claim for worker: ${maskedWorker}`);
        const targetTokenAddress = stellar_1.ASSETS.testnet[targetAsset];
        if (!targetTokenAddress) {
            return res.status(400).json({ error: 'Invalid target asset' });
        }
        const result = await (0, relayer_1.buildAndSubmitClaim)(proof, publicSignals, workerAddress, targetTokenAddress, anchorAddress);
        if (result.success) {
            return res.status(200).json({ txHash: result.txHash });
        }
        else {
            return res.status(500).json({ error: 'Transaction failed', details: result.errorMessage, txHash: result.txHash });
        }
    }
    catch (error) {
        console.error('Unhandled error in /submit-claim:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
