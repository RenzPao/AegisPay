/**
 * AegisPay — Withdraw Page
 * Allows connected workers to withdraw their claimed USDC to an external address
 * or to a local anchor (Stellar → local currency via MoneyGram/Tempo etc.)
 * Design: Neumorphism × Glassmorphism
 */

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownToLine, Send, AlertTriangle, CheckCircle2,
  Loader2, ExternalLink, ChevronRight, Globe, Wallet,
  Info, Copy, RefreshCw,
} from 'lucide-react';
import { Navbar, Footer } from '../components/Layout';
import { useWalletContext } from '../context/WalletContext';
import { formatBalance, shortenAddress } from '../lib/wallet';
import { config } from '../lib/config';

// ── Types ────────────────────────────────────────────────────────────────────
type WithdrawMethod = 'onchain' | 'anchor';
type WithdrawStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

const ANCHOR_OPTIONS = [
  { id: 'usdc',  label: 'USDC On-Chain',      desc: 'Send to any Stellar address', icon: '◎' },
  { id: 'moneygram', label: 'MoneyGram Ramp', desc: 'Cash pickup globally',        icon: '💵' },
  { id: 'tempo', label: 'Tempo Remittance',   desc: 'Bank transfer in EU/Asia',    icon: '🏦' },
  { id: 'tempo', label: 'Local Exchange',     desc: 'Convert to local currency',   icon: '🔄' },
];

function isValidStellarAddress(addr: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(addr);
}

// ── Components ───────────────────────────────────────────────────────────────

function NotConnectedState() {
  const { connect, loading } = useWalletContext();
  return (
    <motion.div
      className="glass-card"
      style={{ maxWidth: 460, margin: '80px auto', textAlign: 'center', padding: '48px 36px' }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div style={{ fontSize: 56, marginBottom: 20 }}>🔐</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', marginBottom: 10 }}>
        Wallet Required
      </h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: 28, lineHeight: 1.6 }}>
        Connect your Freighter wallet to access your claimed wages and initiate withdrawals.
      </p>
      <button
        className="btn btn-primary"
        onClick={connect}
        disabled={loading}
        style={{ width: '100%', justifyContent: 'center', gap: 8 }}
      >
        {loading ? <Loader2 size={16} className="spin" /> : <Wallet size={16} />}
        {loading ? 'Connecting…' : 'Connect Freighter Wallet'}
      </button>
    </motion.div>
  );
}

function SuccessState({ txHash, amount, destination, onReset }: {
  txHash: string; amount: string; destination: string; onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      className="glass-card"
      style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center', padding: '48px 36px' }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        style={{ fontSize: 60, marginBottom: 20 }}
      >
        ✅
      </motion.div>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: 8 }}>
        Withdrawal Submitted
      </h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: 28, lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--color-accent)' }}>{amount} USDC</strong> is on its way to{' '}
        <strong>{shortenAddress(destination)}</strong>
      </p>

      <div className="withdraw-tx-box">
        <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Transaction</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--color-foreground)' }}>
            {txHash}
          </code>
          <button className="wallet-icon-btn" onClick={copy} title="Copy tx hash">
            {copied ? '✓' : <Copy size={13} />}
          </button>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="wallet-icon-btn"
            title="View on explorer"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <button className="btn btn-outline" onClick={onReset} style={{ marginTop: 28, gap: 8 }}>
        <RefreshCw size={14} /> New Withdrawal
      </button>
    </motion.div>
  );
}

// ── Main Withdraw Page ───────────────────────────────────────────────────────
export default function WithdrawPage() {
  const { connected, address, usdcBalance, xlmBalance, network } = useWalletContext();

  const [method, setMethod]         = useState<WithdrawMethod>('onchain');
  const [destination, setDest]      = useState('');
  const [amount, setAmount]         = useState('');
  const [memo, setMemo]             = useState('');
  const [status, setStatus]         = useState<WithdrawStatus>('idle');
  const [txHash, setTxHash]         = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const usdcFloat = parseFloat(usdcBalance ?? '0') || 0;
  const amountFloat = parseFloat(amount) || 0;

  const validDest   = destination === '' || isValidStellarAddress(destination);
  const validAmount = amountFloat > 0 && amountFloat <= usdcFloat;
  const canSubmit   = isValidStellarAddress(destination) && validAmount && status === 'idle';

  const handleMaxAmount = () => setAmount(usdcFloat > 0 ? usdcFloat.toFixed(7) : '');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      // POST to relayer — which builds, signs and submits the Stellar transaction
      const res = await fetch(`${config.relayerUrl}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAddress: address,
          toAddress: destination,
          amount,
          memo: memo || undefined,
          assetCode: 'USDC',
          network: network ?? 'TESTNET',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.errorMessage ?? 'Withdrawal failed');
      }

      setTxHash(data.txHash ?? 'unknown');
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Unknown error occurred');
      setStatus('error');
    }
  }, [canSubmit, address, destination, amount, memo, network]);

  const reset = () => {
    setStatus('idle'); setDest(''); setAmount(''); setMemo(''); setTxHash(''); setErrorMsg('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activeSection="" onNav={() => {}} />
      <main
        id="main-content"
        tabIndex={-1}
        style={{ flex: 1, padding: 'var(--space-16) var(--space-4)' }}
      >
        <div className="container" style={{ maxWidth: 600 }}>

          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 36, textAlign: 'center' }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--color-accent-glow)',
              border: '1.5px solid var(--color-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <ArrowDownToLine size={28} color="var(--color-accent)" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', marginBottom: 8 }}>
              Withdraw Wages
            </h1>
            <p style={{ color: 'var(--color-muted)', lineHeight: 1.6 }}>
              Send your claimed USDC on-chain or off-ramp to local currency via an anchor.
            </p>
          </motion.div>

          {/* Not connected */}
          {!connected && <NotConnectedState />}

          {/* Success */}
          {connected && status === 'success' && (
            <SuccessState txHash={txHash} amount={amount} destination={destination} onReset={reset} />
          )}

          {/* Main form */}
          {connected && status !== 'success' && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {/* Balance card */}
              <div className="glass-card" style={{ marginBottom: 24, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 4 }}>
                      Available USDC
                    </div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--color-accent)' }}>
                      {formatBalance(usdcBalance)} <span style={{ fontSize: '1rem', color: 'var(--color-muted)' }}>USDC</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: 4 }}>XLM Balance</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
                      {formatBalance(xlmBalance)} XLM
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.03)',
                  fontSize: '0.78rem',
                  color: 'var(--color-muted)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Wallet size={12} /> {shortenAddress(address)} · {network ?? 'TESTNET'}
                </div>
              </div>

              {/* Method toggle */}
              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Withdrawal Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {(['onchain', 'anchor'] as WithdrawMethod[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`withdraw-method-btn${method === m ? ' active' : ''}`}
                      onClick={() => setMethod(m)}
                    >
                      {m === 'onchain' ? <Send size={16} /> : <Globe size={16} />}
                      <span>{m === 'onchain' ? 'On-Chain' : 'Anchor / Ramp'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* On-chain form */}
              {method === 'onchain' && (
                <div className="glass-card" style={{ padding: '24px', marginBottom: 20 }}>
                  {/* Destination */}
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label" htmlFor="w-dest">Destination Address</label>
                    <input
                      id="w-dest"
                      type="text"
                      className={`form-input${destination && !validDest ? ' error' : ''}`}
                      placeholder="G… (Stellar address)"
                      value={destination}
                      onChange={e => setDest(e.target.value)}
                      spellCheck={false}
                    />
                    {destination && !validDest && (
                      <span className="form-hint error">Invalid Stellar address</span>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label" htmlFor="w-amount">
                      Amount (USDC)
                      <button
                        type="button"
                        className="form-label-action"
                        onClick={handleMaxAmount}
                        style={{ marginLeft: 8 }}
                      >
                        Max
                      </button>
                    </label>
                    <input
                      id="w-amount"
                      type="number"
                      className={`form-input${amount && !validAmount ? ' error' : ''}`}
                      placeholder="0.00"
                      min="0.01"
                      max={usdcFloat}
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                    {amount && !validAmount && (
                      <span className="form-hint error">
                        {amountFloat <= 0 ? 'Amount must be greater than 0' : 'Insufficient USDC balance'}
                      </span>
                    )}
                  </div>

                  {/* Memo (optional) */}
                  <div className="form-group">
                    <label className="form-label" htmlFor="w-memo">
                      Memo <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      id="w-memo"
                      type="text"
                      className="form-input"
                      placeholder="Payment reference…"
                      maxLength={28}
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Anchor options */}
              {method === 'anchor' && (
                <div className="glass-card" style={{ padding: '24px', marginBottom: 20 }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20,
                    padding: '12px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)',
                  }}>
                    <Info size={15} style={{ color: 'var(--color-info)', marginTop: 2, flexShrink: 0 }} />
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-info)', lineHeight: 1.55, margin: 0 }}>
                      Anchor off-ramps convert your USDC to local currency. You'll be redirected to
                      complete identity verification and receive funds via cash pickup or bank transfer.
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ANCHOR_OPTIONS.map((a, i) => (
                      <a
                        key={i}
                        href="#"
                        className="anchor-option"
                        onClick={e => e.preventDefault()}
                      >
                        <span className="anchor-icon">{a.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{a.label}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>{a.desc}</div>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--color-muted)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Error banner */}
              {status === 'error' && errorMsg && (
                <div className="alert alert-error" style={{ marginBottom: 20 }}>
                  <AlertTriangle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Privacy note */}
              <div style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                fontSize: '0.78rem', color: 'var(--color-muted)',
                padding: '10px 0', marginBottom: 20,
              }}>
                <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Your on-chain identity is not linked to your payroll claim — the ZK nullifier
                  ensures your employer cannot correlate which address you withdraw to.
                </span>
              </div>

              {/* Submit */}
              {method === 'onchain' && (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!canSubmit || status === 'submitting'}
                  style={{ width: '100%', justifyContent: 'center', gap: 10, fontSize: '1rem', minHeight: 52 }}
                >
                  {status === 'submitting' ? (
                    <><Loader2 size={18} className="spin" /> Processing…</>
                  ) : (
                    <><Send size={18} /> Send {amountFloat > 0 ? `${amountFloat.toLocaleString()} USDC` : 'USDC'}</>
                  )}
                </button>
              )}
            </motion.form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
