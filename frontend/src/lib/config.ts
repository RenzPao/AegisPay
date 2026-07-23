export const config = {
  contractId: import.meta.env.VITE_CONTRACT_ID || 'CC6QLF4DI7C6LKURR2V7XQOZ72BNG5BOKURQ2SYQHPTAZEHO7PLRMR5K',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org',
  networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  sponsorSecret: import.meta.env.VITE_SPONSOR_SECRET || 'SDFT5ASW3YV6ULL27KC7DEF227CEXPRHJECXX5WQZKNS4AV7QRJPMBMZ', // Hardcoded funded sponsor for demo
};
