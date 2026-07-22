/**
 * AegisPay — WalletPanel component
 * Shows: Connect button | Wallet dropdown (address, XLM, USDC, Disconnect)
 * Design: Neumorphism × Glassmorphism
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ChevronDown, Copy, ExternalLink, LogOut,
  RefreshCw, AlertTriangle, Download, Zap,
} from 'lucide-react';
import { useWalletContext } from '../context/WalletContext';
import { shortenAddress, formatBalance } from '../lib/wallet';

// ── Copy-to-clipboard helper ─────────────────────────────────
function useCopyToClipboard(timeout = 1500) {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    });
  };
  return { copied, copy };
}

// ── Wallet Dropdown ──────────────────────────────────────────
function WalletDropdown({ onClose }: { onClose: () => void }) {
  const { address, network, xlmBalance, usdcBalance, disconnect, refresh } = useWalletContext();
  const { copied, copy } = useCopyToClipboard();
  const explorerUrl = `https://stellar.expert/explorer/${network === 'PUBLIC' ? 'public' : 'testnet'}/account/${address}`;

  return (
    <motion.div
      className="wallet-dropdown"
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Network badge */}
      <div className="wallet-dropdown-header">
        <span className="wallet-network-badge" data-network={network?.toLowerCase()}>
          <span className="wallet-network-dot" />
          {network ?? 'TESTNET'}
        </span>
        <button className="wallet-icon-btn" onClick={() => { refresh(); }} title="Refresh balances">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Address */}
      <div className="wallet-address-row">
        <span className="wallet-address-text" title={address ?? ''}>
          {shortenAddress(address)}
        </span>
        <button
          className="wallet-icon-btn"
          onClick={() => copy(address ?? '')}
          title="Copy address"
        >
          {copied ? <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>✓</span> : <Copy size={13} />}
        </button>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-icon-btn"
          title="View on Stellar Expert"
        >
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Balances */}
      <div className="wallet-balances">
        <div className="wallet-balance-row">
          <span className="wallet-balance-label">
            <Zap size={13} className="wallet-bal-icon xlm" /> XLM
          </span>
          <span className="wallet-balance-value">{formatBalance(xlmBalance)}</span>
        </div>
        <div className="wallet-balance-row">
          <span className="wallet-balance-label">
            <span className="wallet-usdc-dot" /> USDC
          </span>
          <span className="wallet-balance-value accent">{formatBalance(usdcBalance)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="wallet-dropdown-actions">
        <a href="/withdraw" className="wallet-action-btn" onClick={onClose}>
          <Download size={14} /> Withdraw
        </a>
        <button
          className="wallet-action-btn destructive"
          onClick={() => { disconnect(); onClose(); }}
        >
          <LogOut size={14} /> Disconnect
        </button>
      </div>
    </motion.div>
  );
}

// ── Main WalletPanel ─────────────────────────────────────────
export default function WalletPanel() {
  const { connected, address, loading, error, connect, freighterInstalled } = useWalletContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Freighter not installed
  if (freighterInstalled === false) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline wallet-install-btn"
        style={{ fontSize: '0.82rem', padding: '8px 14px', minHeight: 36, gap: 6 }}
      >
        <AlertTriangle size={14} />
        Install Freighter
      </a>
    );
  }

  // Connected state
  if (connected && address) {
    return (
      <div ref={ref} className="wallet-panel" style={{ position: 'relative' }}>
        <button
          className="wallet-connected-btn"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span className="wallet-connected-dot" />
          <span className="wallet-connected-address">{shortenAddress(address)}</span>
          <ChevronDown
            size={14}
            style={{
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>

        <AnimatePresence>
          {open && <WalletDropdown onClose={() => setOpen(false)} />}
        </AnimatePresence>
      </div>
    );
  }

  // Disconnected state
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <button
        className="btn btn-primary nav-cta wallet-connect-btn"
        onClick={connect}
        disabled={loading || freighterInstalled === null}
        style={{ padding: '10px 18px', fontSize: '0.88rem', minHeight: 40, gap: 8 }}
      >
        {loading ? (
          <span className="wallet-spinner" />
        ) : (
          <Wallet size={15} />
        )}
        {loading ? 'Connecting…' : 'Connect Wallet'}
      </button>
      {error && (
        <span style={{ fontSize: '0.72rem', color: 'var(--color-destructive)', maxWidth: 180, textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  );
}
