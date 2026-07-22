import { Command } from "commander";
import * as fs from "fs";
import chalk from "chalk";
import ora from "ora";
import { generateRegistry } from "./payroll";
import { startServer } from "./proofServer";
import { initPoseidon, poseidonHash } from "./poseidon";
import { MerkleTree } from "./merkle";
import { ethers } from "ethers";

const program = new Command();

program
  .name("aegispay-tools")
  .description("CLI for AegisPay Employer Tools and Merkle Tree Generation")
  .version("1.0.0");

program
  .command("generate")
  .description("Generate Merkle tree from CSV")
  .argument("<csvPath>", "Path to the workers CSV file")
  .argument("<employerId>", "Employer ID")
  .action(async (csvPath, employerId) => {
    const spinner = ora("Generating payroll registry...").start();
    try {
      const registry = await generateRegistry(csvPath, employerId);
      
      const jsonStr = JSON.stringify(
        registry,
        (key, value) => (typeof value === "bigint" ? value.toString() : value),
        2
      );
      
      fs.writeFileSync("registry.json", jsonStr);
      spinner.succeed(chalk.green(`Registry generated successfully! Saved to registry.json`));
      console.log(chalk.blue(`Merkle Root:`), registry.merkleRoot);
    } catch (err: any) {
      spinner.fail(chalk.red("Generation failed"));
      console.error(err.message);
    }
  });

program
  .command("proof")
  .description("Extract proof for a specific worker")
  .argument("<registryPath>", "Path to registry.json")
  .argument("<workerId>", "Worker ID to extract proof for")
  .action((registryPath, workerId) => {
    try {
      const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
      const proof = registry.proofs[workerId];
      if (!proof) {
        console.error(chalk.red(`Worker ${workerId} not found in registry.`));
        return;
      }
      console.log(chalk.green(`Proof for ${workerId}:`));
      console.log(JSON.stringify(proof, null, 2));
    } catch (err: any) {
      console.error(chalk.red(`Error reading registry:`), err.message);
    }
  });

program
  .command("verify")
  .description("Verify a worker's proof locally")
  .argument("<registryPath>", "Path to registry.json")
  .argument("<workerId>", "Worker ID")
  .action(async (registryPath, workerId) => {
    try {
      await initPoseidon();
      const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
      const worker = registry.workers.find((w: any) => w.workerId === workerId);
      const proofData = registry.proofs[workerId];
      
      if (!worker || !proofData) {
        console.error(chalk.red(`Worker ${workerId} not found in registry.`));
        return;
      }

      const leaf = BigInt(worker.leaf);
      const tree = new MerkleTree(10);
      
      // Reconstruct tree logic slightly just to check against root
      let currentHash = leaf;
      for (let i = 0; i < 10; i++) {
        const isRight = proofData.pathIndices[i] === 1;
        const elem = BigInt(proofData.pathElements[i]);
        if (isRight) {
          currentHash = poseidonHash([elem, currentHash]);
        } else {
          currentHash = poseidonHash([currentHash, elem]);
        }
      }
      
      if (currentHash.toString() === registry.merkleRoot) {
        console.log(chalk.green(`Valid proof for ${workerId}!`));
      } else {
        console.log(chalk.red(`Invalid proof for ${workerId}.`));
      }
      
    } catch (err: any) {
      console.error(chalk.red(`Verification failed:`), err.message);
    }
  });

program
  .command("serve")
  .description("Start a simple HTTP server to serve proofs")
  .argument("<registryPath>", "Path to registry.json")
  .action((registryPath) => {
    try {
      startServer(registryPath);
    } catch (err: any) {
      console.error(chalk.red(`Failed to start server:`), err.message);
    }
  });

program.parse();
