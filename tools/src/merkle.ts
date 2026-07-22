import { poseidonHash } from "./poseidon";

export class MerkleTree {
  public depth: number;
  public leaves: bigint[];
  public zeros: bigint[];
  public nodes: bigint[][]; // nodes[level][index]
  
  constructor(depth: number = 10) {
    this.depth = depth;
    this.leaves = [];
    this.zeros = new Array(depth);
    this.nodes = new Array(depth + 1);
    
    for (let i = 0; i <= depth; i++) {
      this.nodes[i] = [];
    }

    // Initialize zeros
    this.zeros[0] = poseidonHash([0n, 0n]); // Base zero leaf
    for (let i = 1; i < depth; i++) {
      this.zeros[i] = poseidonHash([this.zeros[i - 1], this.zeros[i - 1]]);
    }
  }

  insert(leaf: bigint): number {
    const capacity = Math.pow(2, this.depth);
    if (this.leaves.length >= capacity) {
      throw new Error(`Tree is full (capacity ${capacity})`);
    }

    const index = this.leaves.length;
    this.leaves.push(leaf);
    this.nodes[0][index] = leaf;

    let currentIndex = index;
    for (let level = 0; level < this.depth; level++) {
      const isRight = currentIndex % 2 === 1;
      const pairIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      
      const left = isRight ? this.nodes[level][pairIndex] : this.nodes[level][currentIndex];
      const right = isRight ? this.nodes[level][currentIndex] : (pairIndex < this.nodes[level].length ? this.nodes[level][pairIndex] : this.zeros[level]);
      
      const parentHash = poseidonHash([left, right]);
      currentIndex = Math.floor(currentIndex / 2);
      this.nodes[level + 1][currentIndex] = parentHash;
    }

    return index;
  }

  getRoot(): bigint {
    if (this.leaves.length === 0) {
      let root = this.zeros[0];
      for (let i = 1; i <= this.depth; i++) {
        root = poseidonHash([root, root]);
      }
      return root;
    }
    return this.nodes[this.depth][0];
  }

  getProof(index: number): { pathElements: bigint[]; pathIndices: number[] } {
    if (index >= this.leaves.length) {
      throw new Error("Index out of bounds");
    }

    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];

    let currentIndex = index;
    for (let level = 0; level < this.depth; level++) {
      const isRight = currentIndex % 2 === 1;
      const pairIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      let pairElement: bigint;
      if (pairIndex < this.nodes[level].length) {
        pairElement = this.nodes[level][pairIndex];
      } else {
        pairElement = this.zeros[level];
      }

      pathElements.push(pairElement);
      pathIndices.push(isRight ? 1 : 0);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }

  verify(leaf: bigint, proof: { pathElements: bigint[]; pathIndices: number[] }): boolean {
    let currentHash = leaf;
    for (let i = 0; i < this.depth; i++) {
      const isRight = proof.pathIndices[i] === 1;
      if (isRight) {
        currentHash = poseidonHash([proof.pathElements[i], currentHash]);
      } else {
        currentHash = poseidonHash([currentHash, proof.pathElements[i]]);
      }
    }
    return currentHash === this.getRoot();
  }
}
