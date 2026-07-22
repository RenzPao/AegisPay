# AegisPay Relayer

Production-quality Node.js/TypeScript Express server that acts as a relayer for AegisPay.
It accepts ZK proofs from the frontend, builds a Soroban transaction, and pays the fees via a Stellar FeeBumpTransaction so workers don't need any XLM.

## Setup

1. Copy `.env.example` to `.env` and fill in your relayer secret key and contract ID.
2. Install dependencies: `npm install`
3. Run for development: `npm run dev`
4. Build for production: `npm run build` then `npm run start`

## API Endpoints

- `POST /submit-claim`: Submit a ZK proof for payroll claim.
- `GET /health`: Health check endpoint.
- `GET /status`: Relayer status and configuration info.
