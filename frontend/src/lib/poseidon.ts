import { buildPoseidon } from "circomlibjs";

let poseidonHashFn: any = null;

export async function initPoseidon() {
  if (!poseidonHashFn) {
    poseidonHashFn = await buildPoseidon();
  }
}

export function poseidonHash(inputs: bigint[]): bigint {
  if (!poseidonHashFn) {
    throw new Error("Poseidon not initialized. Call initPoseidon() first.");
  }
  const hash = poseidonHashFn(inputs);
  return BigInt(poseidonHashFn.F.toString(hash));
}
