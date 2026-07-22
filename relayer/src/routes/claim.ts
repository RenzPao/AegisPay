import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { buildAndSubmitClaim } from '../relayer';
import { ASSETS } from '../utils/stellar';

export const claimRouter = Router();

const ClaimSchema = z.object({
  proof: z.object({
    pi_a: z.array(z.string()),
    pi_b: z.array(z.array(z.string())),
    pi_c: z.array(z.string())
  }),
  publicSignals: z.array(z.string()).length(3),
  workerAddress: z.string().startsWith('G').length(56),
  anchorAddress: z.string().startsWith('G').length(56),
  targetAsset: z.enum(['USDC', 'EURC', 'NGNC', 'BRLT', 'PHPC']),
  employerId: z.string().min(1)
});

claimRouter.post('/submit-claim', async (req: Request, res: Response) => {
  try {
    const parsed = ClaimSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { proof, publicSignals, workerAddress, anchorAddress, targetAsset } = parsed.data;

    // Mask worker address for logging
    const maskedWorker = workerAddress.slice(0, 4) + '...' + workerAddress.slice(-4);
    console.log(`[${new Date().toISOString()}] Processing claim for worker: ${maskedWorker}`);

    const targetTokenAddress = ASSETS.testnet[targetAsset];
    if (!targetTokenAddress) {
      return res.status(400).json({ error: 'Invalid target asset' });
    }

    const result = await buildAndSubmitClaim(
      proof,
      publicSignals,
      workerAddress,
      targetTokenAddress,
      anchorAddress
    );

    if (result.success) {
      return res.status(200).json({ txHash: result.txHash });
    } else {
      return res.status(500).json({ error: 'Transaction failed', details: result.errorMessage, txHash: result.txHash });
    }
  } catch (error: any) {
    console.error('Unhandled error in /submit-claim:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
