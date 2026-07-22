/**
 * AegisPay — useWallet React hook
 * Manages Freighter wallet state: connect, disconnect, auto-reconnect, balances
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WalletState,
  INITIAL_WALLET_STATE,
  connectWallet,
  fetchBalances,
  getConnectedAddress,
  NetworkType,
  checkFreighterInstalled,
} from '../lib/wallet';

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL_WALLET_STATE);
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-detect Freighter on mount ──────────────────────────
  useEffect(() => {
    checkFreighterInstalled().then(setFreighterInstalled);
  }, []);

  // ── Auto-reconnect if previously connected ───────────────────
  useEffect(() => {
    (async () => {
      const addr = await getConnectedAddress();
      if (addr) {
        setState(s => ({ ...s, loading: true }));
        try {
          const { address, network } = await connectWallet();
          const { xlm, usdc } = await fetchBalances(address, network);
          setState({
            connected: true, address, network,
            xlmBalance: xlm, usdcBalance: usdc,
            loading: false, error: null,
          });
        } catch {
          setState(s => ({ ...s, loading: false }));
        }
      }
    })();
  }, []);

  // ── Balance polling every 30s while connected ────────────────
  const refreshBalances = useCallback(async (address: string, network: NetworkType) => {
    try {
      const { xlm, usdc } = await fetchBalances(address, network);
      setState(s => ({ ...s, xlmBalance: xlm, usdcBalance: usdc }));
    } catch {
      // silent — don't disrupt UX on network hiccup
    }
  }, []);

  useEffect(() => {
    if (state.connected && state.address && state.network) {
      refreshTimerRef.current = setInterval(
        () => refreshBalances(state.address!, state.network!),
        30_000
      );
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [state.connected, state.address, state.network, refreshBalances]);

  // ── Actions ──────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const { address, network } = await connectWallet();
      const { xlm, usdc } = await fetchBalances(address, network);
      setState({
        connected: true, address, network,
        xlmBalance: xlm, usdcBalance: usdc,
        loading: false, error: null,
      });
    } catch (err: any) {
      setState(s => ({
        ...s, loading: false,
        error: err?.message ?? 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    setState(INITIAL_WALLET_STATE);
  }, []);

  const refresh = useCallback(() => {
    if (state.address && state.network) {
      refreshBalances(state.address, state.network);
    }
  }, [state.address, state.network, refreshBalances]);

  return { ...state, freighterInstalled, connect, disconnect, refresh };
}
