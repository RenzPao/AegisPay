/**
 * AegisPay Wallet Integration — Stellar Wallets Kit wrapper
 * Handles: connect, disconnect, address, network, USDC/XLM balances, sign XDR
 */

import {
  StellarWalletsKit,
  Networks,
} from '@creit.tech/stellar-wallets-kit';
import type { ISupportedWallet } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import { Horizon } from '@stellar/stellar-sdk';
import { config } from './config';

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

// ── Kit Initialization ───────────────────────────────────────────────────────

export const kit = new StellarWalletsKit({
  network: config.stellarNetwork === 'public' ? Networks.PUBLIC : Networks.TESTNET,
  selectedWalletId: 'freighter',
  modules: defaultModules(),
});

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

/** Request wallet connection using the Kit's built-in modal */
export async function connectWallet(): Promise<{ address: string; network: NetworkType }> {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option: ISupportedWallet) => {
        try {
          kit.setWallet(option.id);
          const publicKey = await kit.getPublicKey();
          const network = config.stellarNetwork === 'public' ? 'PUBLIC' : 'TESTNET';
          resolve({ address: publicKey, network });
        } catch (error) {
          reject(error);
        }
      },
      onClosed: (err: Error) => {
        if (err) reject(err);
        else reject(new Error('User cancelled wallet connection'));
      }
    });
  });
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

/** Sign an XDR transaction with the active wallet */
export async function signXdr(
  xdr: string,
  network: NetworkType
): Promise<string> {
  const result = await kit.signTransaction(xdr, {
    networkPassphrase:
      network === 'PUBLIC'
        ? 'Public Global Stellar Network ; September 2015'
        : 'Test SDF Network ; September 2015',
  });
  return result.signedTxXdr;
}

/** Check if there's a stored session (active wallet) */
export async function getConnectedAddress(): Promise<string | null> {
  // StellarWalletsKit doesn't have an exact `isAllowed` equivalent that doesn't prompt.
  // The common pattern is to just rely on the user clicking "Connect".
  // However, we can try to fetch the public key if a wallet is already set.
  try {
    const key = await kit.getPublicKey();
    return key || null;
  } catch {
    return null;
  }
}
