import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { ethers } from "ethers";
import * as crypto from "crypto";
import { initPoseidon, poseidonHash } from "./poseidon";
import { MerkleTree } from "./merkle";

export interface WorkerRecord {
  workerId: string;
  workerIdBigInt: bigint;
  wageAmount: bigint;
  secretSalt: bigint;
  leaf: bigint;
  leafIndex: number;
}

export interface PayrollRegistry {
  employerId: string;
  employerIdBigInt: bigint;
  merkleRoot: string;
  workers: WorkerRecord[];
  proofs: Record<
    string,
    { pathElements: string[]; pathIndices: number[]; nullifier: string }
  >;
}

function stringToBigInt(str: string): bigint {
  const bytes = ethers.toUtf8Bytes(str);
  const hash = ethers.keccak256(bytes);
  return BigInt(hash) % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
}

function generateSalt(): bigint {
  const buf = crypto.randomBytes(31);
  return BigInt("0x" + buf.toString("hex"));
}

export async function generateRegistry(
  csvPath: string,
  employerId: string
): Promise<PayrollRegistry> {
  await initPoseidon();

  const fileContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const employerIdBigInt = stringToBigInt(employerId);
  const tree = new MerkleTree(10);
  const workers: WorkerRecord[] = [];

  for (const record of records) {
    const workerId = record.workerId;
    const wageUSDStr = record.wageAmountUSD;
    
    if (!workerId || !wageUSDStr) {
        throw new Error("Invalid CSV format, missing workerId or wageAmountUSD");
    }

    const wageAmountStroops = BigInt(Math.floor(parseFloat(wageUSDStr) * 1e7));
    const workerIdBigInt = stringToBigInt(workerId);
    const secretSalt = generateSalt();

    const leaf = poseidonHash([workerIdBigInt, wageAmountStroops, secretSalt]);
    const leafIndex = tree.insert(leaf);

    workers.push({
      workerId,
      workerIdBigInt,
      wageAmount: wageAmountStroops,
      secretSalt,
      leaf,
      leafIndex,
    });
  }

  const merkleRoot = tree.getRoot().toString();
  const proofs: Record<string, any> = {};

  for (const worker of workers) {
    const proof = tree.getProof(worker.leafIndex);
    const nullifier = poseidonHash([
      worker.secretSalt,
      worker.workerIdBigInt,
      employerIdBigInt,
    ]);

    proofs[worker.workerId] = {
      pathElements: proof.pathElements.map((p) => p.toString()),
      pathIndices: proof.pathIndices,
      nullifier: nullifier.toString(),
    };
  }

  return {
    employerId,
    employerIdBigInt,
    merkleRoot,
    workers: workers.map(w => ({
        ...w,
        workerIdBigInt: w.workerIdBigInt,
        wageAmount: w.wageAmount,
        secretSalt: w.secretSalt,
        leaf: w.leaf
    })),
    proofs,
  };
}
