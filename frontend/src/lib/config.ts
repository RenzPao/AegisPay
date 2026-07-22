export const config = {
  proofServerUrl: import.meta.env.VITE_PROOF_SERVER_URL || 'http://localhost:3002',
  relayerUrl: import.meta.env.VITE_RELAYER_URL || 'http://localhost:3001',
  contractId: import.meta.env.VITE_CONTRACT_ID || 'CANBQLRMKKQHC6XSTY6AWZQQKAAPI35P24GVKUFMTYRH54KLV25VKSCI',
  stellarNetwork: import.meta.env.VITE_STELLAR_NETWORK || 'testnet',
};
