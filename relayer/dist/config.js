"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    RELAYER_SECRET_KEY: zod_1.z.string().startsWith('S').length(56),
    CONTRACT_ID: zod_1.z.string().startsWith('C').length(56),
    STELLAR_NETWORK: zod_1.z.enum(['testnet', 'public', 'futurenet', 'standalone']).default('testnet'),
    STELLAR_RPC_URL: zod_1.z.string().url().default('https://soroban-testnet.stellar.org'),
    HORIZON_URL: zod_1.z.string().url().default('https://horizon-testnet.stellar.org'),
    PORT: zod_1.z.coerce.number().default(3001),
    ALLOWED_ORIGIN: zod_1.z.string().default('http://localhost:5173'),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.error('Invalid environment variables:', parsedEnv.error.format());
    process.exit(1);
}
exports.config = parsedEnv.data;
