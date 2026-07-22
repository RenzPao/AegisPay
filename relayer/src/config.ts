import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  RELAYER_SECRET_KEY: z.string().startsWith('S').length(56),
  CONTRACT_ID: z.string().startsWith('C').length(56),
  STELLAR_NETWORK: z.enum(['testnet', 'public', 'futurenet', 'standalone']).default('testnet'),
  STELLAR_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  PORT: z.coerce.number().default(3001),
  ALLOWED_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const config = parsedEnv.data;
