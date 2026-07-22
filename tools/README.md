# AegisPay Tools

CLI and Library for generating the AegisPay Merkle Tree and managing employer tooling.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build:
   ```bash
   npm run build
   ```

## Usage Workflow

### 1. Create a Workers CSV
Create a `workers.csv` file with columns `workerId` and `wageAmountUSD`. An example is provided at `example/workers.csv`.

### 2. Generate the Registry
Run the generate command with your CSV and Employer ID:
```bash
npm run generate example/workers.csv EMPLOYER_ACME
```
This will generate the Poseidon Merkle tree (depth=10) and save all worker data, proofs, and the Merkle root to `registry.json`.

### 3. Deploy Contract
Get the `merkleRoot` from the generated `registry.json` or the console output, and use it to deploy/update your AegisPay smart contract.

### 4. Serve Proofs to Workers
Run the simple HTTP server to serve proofs so the AegisPay frontend can access them:
```bash
npm run serve registry.json
```
The server will run on `http://localhost:3000`. Workers will request their proof using `GET /proof/:workerId`.

### Verify Proofs Locally (Optional)
You can verify a worker's proof against the root locally:
```bash
npm run cli verify registry.json WORKER_001
```
