export const config = {
  proofServerUrl: import.meta.env.VITE_PROOF_SERVER_URL || 'http://localhost:3002',
  relayerUrl: import.meta.env.VITE_RELAYER_URL || 'https://aegispay-28cv.onrender.com',
  contractId: import.meta.env.VITE_CONTRACT_ID || 'CAK5DO7PWHLAKUCNWAEOUO5M2MMJ7R4WGCJVBBTKX3S4LUM6NCEPFRN2',
  stellarNetwork: import.meta.env.VITE_STELLAR_NETWORK || 'testnet',
  rpcUrl: import.meta.env.VITE_RPC_URL || (import.meta.env.VITE_RELAYER_URL || 'https://aegispay-28cv.onrender.com') + '/rpc',
};
