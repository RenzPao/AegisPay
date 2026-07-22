import express from "express";
import cors from "cors";
import * as fs from "fs";
import chalk from "chalk";

export function startServer(registryPath: string, port: number = 3000) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  let registry: any;
  try {
    const data = fs.readFileSync(registryPath, "utf-8");
    registry = JSON.parse(data);
    console.log(chalk.green(`Loaded registry from ${registryPath}`));
  } catch (err: any) {
    console.error(chalk.red(`Error loading registry from ${registryPath}:`), err.message);
    process.exit(1);
  }

  app.get("/proof/:workerId", (req, res) => {
    const workerId = req.params.workerId;
    const proof = registry.proofs[workerId];
    
    if (!proof) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const worker = registry.workers.find((w: any) => w.workerId === workerId);
    
    res.json({
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      merkleRoot: registry.merkleRoot,
      nullifier: proof.nullifier,
      workerIdBigInt: worker.workerIdBigInt,
      wageAmount: worker.wageAmount,
      secretSalt: worker.secretSalt,
      leaf: worker.leaf
    });
  });

  app.get("/root", (req, res) => {
    res.json({ merkleRoot: registry.merkleRoot });
  });

  app.listen(port, () => {
    console.log(chalk.blue(`Proof server listening on http://localhost:${port}`));
    console.log(chalk.gray(`Try: GET http://localhost:${port}/root`));
    console.log(chalk.gray(`Try: GET http://localhost:${port}/proof/WORKER_001`));
  });
}
