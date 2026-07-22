import * as snarkjs from 'snarkjs';

export interface ZKInputs {
  workerId: bigint;
  wageAmount: bigint; // in stroops
  secretSalt: bigint;
  employerId: bigint;
  pathElements: bigint[];
  pathIndices: number[];
  merkleRoot: bigint;
}

// Hash a string to a field element using the Web Crypto API
export async function hashToField(str: string): Promise<bigint> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // BN254 prime field modulus
  const SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  return BigInt('0x' + hashHex) % SNARK_SCALAR_FIELD;
}

// Download a file with progress tracking
async function downloadWithProgress(url: string, onProgress: (loaded: number, total: number) => void): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null; // File missing
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      return null; // Vite SPA fallback returned index.html instead of the actual file
    }
    
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    if (!response.body) return null;
    
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        if (total > 0) {
          onProgress(loaded, total);
        }
      }
    }
    
    const arrayBuffer = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      arrayBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    return arrayBuffer.buffer;
  } catch (e) {
    return null;
  }
}

export type ProgressCallback = (file: string, loaded: number, total: number) => void;

// Generate the full ZK proof
export async function generateProof(
  inputs: ZKInputs, 
  onProgress?: ProgressCallback
): Promise<{ proof: object, publicSignals: string[], nullifier: string }> {
  const snarkInputs = {
    workerId: inputs.workerId.toString(),
    wageAmount: inputs.wageAmount.toString(),
    secretSalt: inputs.secretSalt.toString(),
    employerId: inputs.employerId.toString(),
    pathElements: inputs.pathElements.map(e => e.toString()),
    pathIndices: inputs.pathIndices,
    merkleRoot: inputs.merkleRoot.toString()
  };

  // Download wasm and zkey with progress
  const wasmBuffer = await downloadWithProgress('/circuit.wasm', (loaded, total) => {
    if (onProgress) onProgress('wasm', loaded, total);
  });
  
  const zkeyBuffer = await downloadWithProgress('/circuit_final.zkey', (loaded, total) => {
    if (onProgress) onProgress('zkey', loaded, total);
  });

  if (wasmBuffer && zkeyBuffer) {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      snarkInputs,
      new Uint8Array(wasmBuffer),
      new Uint8Array(zkeyBuffer)
    );

    return {
      proof,
      publicSignals,
      nullifier: publicSignals[1] // Assuming nullifier is the second public signal based on circuit
    };
  } else {
    // MOCK PROOF GENERATION for Prototype
    // Simulate generation time
    if (onProgress) onProgress('wasm', 50, 100);
    await new Promise(r => setTimeout(r, 1000));
    if (onProgress) onProgress('wasm', 100, 100);
    if (onProgress) onProgress('zkey', 50, 100);
    await new Promise(r => setTimeout(r, 1000));
    if (onProgress) onProgress('zkey', 100, 100);

    return {
      proof: { 
        pi_a: ["0", "0", "0"], 
        pi_b: [["0", "0"], ["0", "0"], ["0", "0"]], 
        pi_c: ["0", "0", "0"], 
        protocol: "groth16",
        curve: "bn128" 
      },
      publicSignals: [
        inputs.merkleRoot.toString(),
        "0xMOCKNULLIFIER_" + inputs.workerId.toString(),
        inputs.wageAmount.toString()
      ],
      nullifier: "0xMOCKNULLIFIER_" + inputs.workerId.toString()
    };
  }
}
