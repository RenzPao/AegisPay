import { ethers } from "ethers";
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

export function stringToBigInt(str: string): bigint {
  const bytes = ethers.toUtf8Bytes(str);
  const hash = ethers.keccak256(bytes);
  return BigInt(hash) % BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
}

function generateSalt(): bigint {
  const buf = new Uint8Array(31);
  window.crypto.getRandomValues(buf);
  return BigInt("0x" + Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join(''));
}

export async function generateRegistry(
  csvData: { workerId: string; wageAmount: number }[],
  employerId: string
): Promise<PayrollRegistry> {
  await initPoseidon();

  const employerIdBigInt = stringToBigInt(employerId);
  const tree = new MerkleTree(10);
  const workers: WorkerRecord[] = [];

  for (const record of csvData) {
    const workerId = record.workerId;
    const wageAmountStroops = BigInt(Math.floor(record.wageAmount * 1e7));
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

  const merkleRootBigInt = tree.getRoot();
  const merkleRoot = "0x" + merkleRootBigInt.toString(16).padStart(64, '0');
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
