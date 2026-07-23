export const config = {
  contractId: import.meta.env.VITE_CONTRACT_ID || 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org',
  networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  sponsorSecret: import.meta.env.VITE_SPONSOR_SECRET || 'SDPZKNYWFW7NVMHJ5IFP6U4K633CZYHUIEEM3J4F5Z42PFFC4X24NDO2', // Hardcoded funded sponsor for demo
};
