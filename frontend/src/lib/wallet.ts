/**
 * AegisPay Wallet Integration — Freighter API wrapper
 * Handles: connect, disconnect, address, network, USDC/XLM balances, sign XDR
 */

import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from '@stellar/freighter-api';
import { Horizon } from '@stellar/stellar-sdk';

// ── Constants ────────────────────────────────────────────────────────────────
export const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
export const HORIZON_MAINNET = 'https://horizon.stellar.org';

// Testnet USDC issued by Circle
export const USDC_TESTNET_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const USDC_ASSET_CODE    = 'USDC';

export type NetworkType = 'TESTNET' | 'PUBLIC' | 'FUTURENET';

export interface WalletState {
  connected: boolean;
  address: string | null;
  network: NetworkType | null;
  xlmBalance: string | null;
  usdcBalance: string | null;
  loading: boolean;
  error: string | null;
}

export const INITIAL_WALLET_STATE: WalletState = {
  connected: false,
  address:   null,
  network:   null,
  xlmBalance: null,
  usdcBalance: null,
  loading: false,
  error:   null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the Horizon server URL for a given network */
export function getHorizonUrl(network: NetworkType | null): string {
  return network === 'PUBLIC' ? HORIZON_MAINNET : HORIZON_TESTNET;
}

/** Formats a raw Stellar balance string to 2 decimal places */
export function formatBalance(raw: string | null, decimals = 2): string {
  if (!raw) return '—';
  const n = parseFloat(raw);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Shortens a Stellar address for display: GABC...XYZ */
export function shortenAddress(addr: string | null): string {
  if (!addr || addr.length < 10) return addr ?? '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

// ── Core wallet actions ──────────────────────────────────────────────────────

/** Check if Freighter extension is installed */
export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const res = await isConnected();
    return !res.error && res.isConnected !== undefined;
  } catch {
    return false;
  }
}

/** Request wallet connection. Returns address on success, throws on failure. */
export async function connectWallet(): Promise<{ address: string; network: NetworkType }> {
  // Check extension present
  const installed = await checkFreighterInstalled();
  if (!installed) {
    throw new Error('Freighter wallet is not installed. Please install it from freighter.app');
  }

  // Request access
  const accessResult = await requestAccess();
  if (accessResult.error) {
    throw new Error(accessResult.error);
  }

  // Get address
  const addrResult = await getAddress();
  if (addrResult.error || !addrResult.address) {
    throw new Error(addrResult.error ?? 'Could not retrieve wallet address');
  }

  // Get network
  const netResult = await getNetwork();
  const network: NetworkType = (netResult.network as NetworkType) ?? 'TESTNET';

  return { address: addrResult.address, network };
}

/** Fetch XLM and USDC balances for an address */
export async function fetchBalances(
  address: string,
  network: NetworkType
): Promise<{ xlm: string; usdc: string }> {
  const server = new Horizon.Server(getHorizonUrl(network));
  const account = await server.loadAccount(address);

  let xlm  = '0';
  let usdc = '0';

  for (const bal of account.balances) {
    if (bal.asset_type === 'native') {
      xlm = bal.balance;
    } else if (
      bal.asset_type === 'credit_alphanum4' &&
      (bal as any).asset_code === USDC_ASSET_CODE &&
      (bal as any).asset_issuer === USDC_TESTNET_ISSUER
    ) {
      usdc = bal.balance;
    }
  }

  return { xlm, usdc };
}

/** Sign an XDR transaction with Freighter and return the signed XDR */
export async function signXdr(
  xdr: string,
  network: NetworkType
): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase:
      network === 'PUBLIC'
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015',
  });
  if (result.error) throw new Error(result.error);
  return result.signedTxXdr ?? '';
}

/** Check if the current allowed address matches the connected address */
export async function getConnectedAddress(): Promise<string | null> {
  try {
    const allowed = await isAllowed();
    if (!allowed.isAllowed) return null;
    const addr = await getAddress();
    return addr.address ?? null;
  } catch {
    return null;
  }
}
