import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar, Footer } from '../components/Layout';
import {
  UploadCloud, ChevronRight, CheckCircle, Download, RefreshCw,
  Users, DollarSign, Shield, Zap, ArrowLeft, FileJson,
} from 'lucide-react';
import { generateRegistry } from '../lib/registry';
import type { PayrollRegistry } from '../lib/registry';
import { deployRootToContract, fundEscrowContract, initializeContract, addPayrollRoot, isNullifierSpent } from '../lib/stellar';
import { supabase } from '../lib/supabase';
import { kit } from '../lib/wallet';
import { History } from 'lucide-react';
import { ErrorModal, useErrorModal } from '../components/ErrorModal';
import { config } from '../lib/config';

// ── Types ─────────────────────────────────────────────────────
interface WorkerRow { workerId: string; wageAmountUsd: number; wageAmountXlm: number; }

type WizardStep = 'upload' | 'review' | 'distribute';
type PublishStatus = 'idle' | 'initializing' | 'deploying' | 'funding' | 'done' | 'error';
type Tab = 'run_payroll' | 'history';

const STEPS = [
  { id: 'upload',     label: 'Upload CSV',        num: 1 },
  { id: 'review',     label: 'Review & Publish',  num: 2 },
  { id: 'distribute', label: 'Distribute Files',  num: 3 },
];

// ── Helpers ───────────────────────────────────────────────────
function formatUsd(n: number) { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatXlm(n: number) { return `${n.toFixed(4)} XLM`; }

// ── Step Indicator ────────────────────────────────────────────
function Stepper({ current }: { current: WizardStep }) {
  const idx = STEPS.findIndex(s => s.id === current);
  return (
    <div className="stepper" role="list" aria-label="Payroll batch progress" style={{ marginBottom: 'var(--space-10)' }}>
      {STEPS.map((s, i) => (
        <div
          key={s.id}
          className={`step-item${idx === i ? ' active' : ''}${idx > i ? ' completed' : ''}`}
          role="listitem"
          aria-current={idx === i ? 'step' : undefined}
        >
          <div className="step-circle" aria-hidden="true">
            {idx > i ? <CheckCircle size={18} strokeWidth={2.5} /> : s.num}
          </div>
          <span className="step-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Upload ────────────────────────────────────────────
function UploadStep({
  xlmPrice, workers, onUpload, onNext, isBuilding,
}: {
  xlmPrice: number | null;
  workers: WorkerRow[];
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  isBuilding: boolean;
}) {
  return (
    <motion.div key="upload" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
      <h2 style={{ marginBottom: 8 }}>Upload Your Payroll CSV</h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-8)' }}>
        Provide a CSV with two columns: <code style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>workerId, wageAmountUSD</code>. The system will automatically convert wages to XLM at the current live rate.
      </p>

      {/* Drop zone */}
      <div style={{
        border: `2px dashed ${workers.length > 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-10)',
        textAlign: 'center', background: 'var(--color-bg-raised)',
        position: 'relative', transition: 'border-color 0.2s, background 0.2s',
        marginBottom: workers.length > 0 ? 'var(--space-6)' : 0,
      }}>
        <input type="file" accept=".csv" onChange={onUpload}
          style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
          aria-label="Upload payroll CSV"
        />
        {workers.length > 0 ? (
          <>
            <CheckCircle size={48} color="var(--color-accent)" style={{ margin: '0 auto var(--space-4)' }} />
            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>CSV Loaded — {workers.length} workers</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Drop a new file here to replace it</p>
          </>
        ) : (
          <>
            <UploadCloud size={48} color="var(--color-muted)" style={{ margin: '0 auto var(--space-4)' }} />
            <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Drag & drop your CSV here</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>or click to browse files</p>
          </>
        )}
        {xlmPrice && (
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 99, padding: '4px 14px', fontSize: '0.8rem' }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
            Live rate: 1 XLM = ${xlmPrice.toFixed(4)} USD
          </div>
        )}
      </div>

      {/* Preview table */}
      {workers.length > 0 && (
        <>
          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
            {[
              { icon: <Users size={16} />, label: 'Workers', value: workers.length },
              { icon: <DollarSign size={16} />, label: 'Total USD', value: formatUsd(workers.reduce((a, w) => a + w.wageAmountUsd, 0)) },
              { icon: <Zap size={16} />, label: 'Total XLM', value: formatXlm(workers.reduce((a, w) => a + w.wageAmountXlm, 0)) },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 16px', flex: 1, minWidth: 140 }}>
                <span style={{ color: 'var(--color-accent)' }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="table-responsive-wrapper" style={{ maxHeight: 220 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead style={{ background: 'var(--color-bg-raised)', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>Worker ID</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>Wage (USD)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', borderBottom: '1px solid var(--color-border)', fontWeight: 600 }}>Wage (XLM)</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '9px 14px', color: 'var(--color-muted)' }}>{i + 1}</td>
                    <td style={{ padding: '9px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{row.workerId}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatUsd(row.wageAmountUsd)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: 'var(--color-accent)', fontWeight: 600 }}>{formatXlm(row.wageAmountXlm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '1.05rem', padding: '14px' }}
            onClick={onNext}
            disabled={isBuilding}
            aria-label="Build payroll Merkle tree and proceed to review"
          >
            {isBuilding ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#000', borderRadius: '50%' }} />
                Building Merkle Tree…
              </>
            ) : (
              <>
                <Shield size={18} />
                Build Payroll Batch
                <ChevronRight size={18} />
              </>
            )}
          </button>
          <p style={{ textAlign: 'center', marginTop: 'var(--space-3)', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Cryptographically commits wages into a Merkle tree — runs fully in your browser.
          </p>
        </>
      )}
    </motion.div>
  );
}

// ── Step 2: Review & Publish ─────────────────────────────────
function ReviewStep({
  workers, totalXlm, merkleRoot, publishStatus, onPublish, onBack, txHash,
}: {
  workers: WorkerRow[];
  totalXlm: number;
  merkleRoot: string;
  publishStatus: PublishStatus;
  onPublish: () => void;
  onBack: () => void;
  txHash: string;
}) {
  const statusLabels: Record<PublishStatus, string> = {
    idle:         'Ready to publish',
    initializing: 'Initializing contract…',
    deploying:    'Publishing Merkle root on-chain…',
    funding:      'Funding escrow with XLM…',
    done:         'Published successfully!',
    error:        'Something went wrong. Retry below.',
  };

  const steps = [
    { key: 'initializing', label: 'Initialize Contract', done: ['deploying','funding','done'].includes(publishStatus) },
    { key: 'deploying',    label: 'Publish Merkle Root', done: ['funding','done'].includes(publishStatus) },
    { key: 'funding',      label: 'Fund Escrow',         done: publishStatus === 'done' },
  ];

  return (
    <motion.div key="review" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
      <button onClick={onBack} className="btn btn-glass" style={{ marginBottom: 'var(--space-6)', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: '0.85rem' }} disabled={['initializing','deploying','funding'].includes(publishStatus)}>
        <ArrowLeft size={15} /> Back
      </button>

      <h2 style={{ marginBottom: 8 }}>Review & Publish On-Chain</h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-8)' }}>
        One click will initialize the contract, publish the Merkle root, and deposit the escrow — all in sequence. Make sure your Freighter wallet is connected.
      </p>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Workers',         value: workers.length },
          { label: 'Total Deposit',   value: `${totalXlm.toFixed(4)} XLM` },
          { label: 'Contract',        value: config.contractId.slice(0, 8) + '…' + config.contractId.slice(-6), mono: true },
          { label: 'Merkle Root',     value: merkleRoot === '0x...' ? 'Not generated' : merkleRoot.slice(0, 10) + '…', mono: true },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--color-bg-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontWeight: 700, fontFamily: c.mono ? 'var(--font-mono)' : undefined, fontSize: c.mono ? '0.82rem' : '1rem' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* On-chain transaction steps */}
      <div style={{ background: 'var(--color-bg-raised)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>On-chain steps</p>
        {steps.map((s, i) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < steps.length - 1 ? 'var(--space-3)' : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: s.done ? 'var(--color-accent)' : publishStatus === s.key ? 'rgba(34,197,94,0.15)' : 'var(--color-bg-card)',
              border: `2px solid ${s.done ? 'var(--color-accent)' : publishStatus === s.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
              transition: 'all 0.3s',
            }}>
              {s.done
                ? <CheckCircle size={14} color="#000" />
                : publishStatus === s.key
                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: 12, height: 12, border: '2px solid rgba(34,197,94,0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%' }} />
                  : <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 700 }}>{i + 1}</span>
              }
            </div>
            <span style={{ color: s.done ? 'var(--color-foreground)' : publishStatus === s.key ? 'var(--color-accent)' : 'var(--color-muted)', fontWeight: s.done || publishStatus === s.key ? 600 : 400 }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Status */}
      <div style={{
        marginBottom: 'var(--space-5)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem',
        background: publishStatus === 'done' ? 'rgba(34,197,94,0.08)' : publishStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'var(--color-bg-raised)',
        border: `1px solid ${publishStatus === 'done' ? 'rgba(34,197,94,0.3)' : publishStatus === 'error' ? 'rgba(239,68,68,0.3)' : 'var(--color-border)'}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {publishStatus === 'done' && <CheckCircle size={16} color="var(--color-accent)" />}
        {publishStatus === 'error' && <span style={{ color: 'var(--color-destructive)' }}>✕</span>}
        {['initializing','deploying','funding'].includes(publishStatus) && (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ width: 16, height: 16, border: '2px solid rgba(34,197,94,0.15)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', flexShrink: 0 }} />
        )}
        <span style={{ color: publishStatus === 'done' ? 'var(--color-accent)' : publishStatus === 'error' ? 'var(--color-destructive)' : 'var(--color-foreground)' }}>
          {statusLabels[publishStatus]}
        </span>
        {txHash && publishStatus === 'done' && (
          <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--color-info)', textDecoration: 'underline' }}>View tx ↗</a>
        )}
      </div>

      {publishStatus !== 'done' && (
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1.05rem', padding: '14px' }}
          onClick={onPublish}
          disabled={['initializing', 'deploying', 'funding'].includes(publishStatus)}
          aria-label="Publish payroll batch on-chain"
        >
          <Shield size={18} />
          {publishStatus === 'error' ? 'Retry Publishing' : 'Publish & Fund On-Chain'}
          <ChevronRight size={18} />
        </button>
      )}
    </motion.div>
  );
}

// ── Step 3: Distribute ────────────────────────────────────────
function DistributeStep({
  workers, registry, onDownloadOne, onDownloadAll, onReset,
}: {
  workers: WorkerRow[];
  registry: PayrollRegistry | null;
  onDownloadOne: (id: string) => void;
  onDownloadAll: () => void;
  onReset: () => void;
}) {
  return (
    <motion.div key="distribute" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
      {/* Success banner */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(34,197,94,0.4)', marginBottom: 'var(--space-5)' }}>
          <CheckCircle size={36} color="#000" strokeWidth={2.5} />
        </motion.div>
        <h2 style={{ marginBottom: 8 }}>Payroll Batch Published!</h2>
        <p style={{ color: 'var(--color-muted)', maxWidth: 480 }}>
          The Merkle root is live on-chain and the escrow is funded. Download each worker's claim file and send it to them — they'll use it to claim their wages privately.
        </p>
      </div>

      {/* Download all */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: 'var(--space-4)', fontSize: '1rem', padding: '13px' }}
        onClick={onDownloadAll}
        disabled={!registry}
        aria-label="Download all claim files as zip"
      >
        <Download size={18} />
        Download All Claim Files ({workers.length})
      </button>

      {/* Per-worker table */}
      <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--space-6)' }}>
        <div style={{ background: 'var(--color-bg-raised)', padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileJson size={16} color="var(--color-muted)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Individual Claim Files</span>
        </div>
        <div className="table-responsive-wrapper" style={{ maxHeight: 320 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead style={{ background: 'var(--color-bg-raised)', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Worker ID</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Wage (USD)</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Wage (XLM)</th>
                <th style={{ padding: '10px 16px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Claim File</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{row.workerId}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{formatUsd(row.wageAmountUsd)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--color-accent)', fontWeight: 600 }}>{formatXlm(row.wageAmountXlm)}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button
                      className="btn btn-glass"
                      onClick={() => onDownloadOne(row.workerId)}
                      disabled={!registry}
                      style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Download size={13} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button className="btn btn-glass" style={{ width: '100%' }} onClick={onReset}>
        <RefreshCw size={16} /> Start New Payroll Batch
      </button>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function EmployerDashboard() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [registry, setRegistry] = useState<PayrollRegistry | null>(null);
  const [merkleRoot, setMerkleRoot] = useState('0x...');
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [txHash, setTxHash] = useState('');
  const { modalError, showError, clearError } = useErrorModal();
  const [activeTab, setActiveTab] = useState<Tab>('run_payroll');
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  React.useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { address } = await kit.getAddress();
      if (!address) { showError('Please connect wallet to view history'); return; }
      
      const { data, error } = await supabase
        .from('payroll_history')
        .select('*')
        .eq('employer', address)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setHistory(data || []);
    } catch (e: any) {
      console.error(e);
      showError(e.message || 'Failed to load history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const checkLiveStatus = async (batch: any) => {
    const reg = batch.workers;
    if (!reg) return;
    const updatedWorkers = [...batch.workers.workers];
    
    for (const w of updatedWorkers) {
      const proof = reg.proofs[w.workerId];
      if (proof) {
        const isSpent = await isNullifierSpent(config.contractId, proof.nullifier);
        w.status = isSpent ? 'claimed' : 'pending';
      }
    }
    
    setSelectedHistory({ ...batch, workers: { ...reg, workers: updatedWorkers } });
  };

  const selectedHistoryRef = useRef(selectedHistory);
  useEffect(() => {
    selectedHistoryRef.current = selectedHistory;
  }, [selectedHistory]);

  useEffect(() => {
    if (!selectedHistory) return;
    const interval = setInterval(() => {
      if (selectedHistoryRef.current) {
        checkLiveStatus(selectedHistoryRef.current);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedHistory?.created_at]);

  React.useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd')
      .then(r => r.json())
      .then(d => { if (d.stellar?.usd) setXlmPrice(d.stellar.usd); })
      .catch(() => {});
  }, []);

  // Step 1 — CSV upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!xlmPrice) { showError('xlm price feed not yet available, please try again in a moment.'); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const rows: WorkerRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const [id, usdStr] = lines[i].split(',');
        if (id?.trim() && usdStr?.trim()) {
          const usd = parseFloat(usdStr.trim());
          if (!isNaN(usd)) rows.push({ workerId: id.trim(), wageAmountUsd: usd, wageAmountXlm: usd / xlmPrice! });
        }
      }
      if (rows.length === 0) { showError('invalid csv format: no valid rows found. Make sure your CSV has a header row and columns: workerId, wageAmountUSD'); return; }
      setWorkers(rows);
    };
    reader.readAsText(file);
  };

  // Step 1 → 2: build Merkle tree
  const handleBuildBatch = async () => {
    setIsBuilding(true);
    try {
      const reg = await generateRegistry(
        workers.map(w => ({ workerId: w.workerId, wageAmount: w.wageAmountXlm })),
        'AegisPayEmployer123'
      );
      setRegistry(reg);
      setMerkleRoot(reg.merkleRoot);
      setStep('review');
    } catch (err: any) {
      showError(err?.message || 'Error generating registry from the uploaded CSV.');
    } finally {
      setIsBuilding(false);
    }
  };

  // Step 2: publish on-chain (init once, then add root + fund)
  const handlePublish = async () => {
    const contractId = config.contractId;
    try {
      // Step 1: Initialize the contract (one-time setup — will fail silently if already done)
      setPublishStatus('initializing');
      try {
        await initializeContract(contractId, '0000000000000000000000000000000000000000000000000000000000000123');
      } catch (initErr: any) {
        // If already initialized, that's fine — continue to add the new batch root
        if (!initErr?.message?.toLowerCase().includes('alreadyinitialized') &&
            !initErr?.message?.toLowerCase().includes('#1')) {
          throw initErr;
        }
      }

      // Step 2: Add this payroll batch's Merkle root to the registry
      setPublishStatus('deploying');
      await addPayrollRoot(contractId, merkleRoot);

      // Step 3: Fund the escrow with this batch's total XLM
      setPublishStatus('funding');
      const totalXlm = workers.reduce((a, w) => a + w.wageAmountXlm, 0);
      const hash = await fundEscrowContract(contractId, totalXlm);
      setTxHash(hash || '');

      // Step 4: Record this batch in history
      const { address } = await kit.getAddress();
      if (address && registry) {
        const { error: dbError } = await supabase.from('payroll_history').insert({
          employer: address,
          root: merkleRoot,
          workers: registry
        });
        if (dbError) console.error("Failed to save history", dbError);
      }

      setPublishStatus('done');
      setStep('distribute');
    } catch (err: any) {
      setPublishStatus('error');
      showError(err?.message || 'Failed to publish payroll batch on-chain');
    }
  };

  // Step 3: download single claim file
  const handleDownloadOne = (workerId: string) => {
    if (!registry) return;
    const worker = registry.workers.find(w => w.workerId === workerId);
    if (!worker) return;
    const proof = registry.proofs[workerId];
    const data = {
      employerId: registry.employerId,
      employerIdBigInt: registry.employerIdBigInt.toString(),
      merkleRoot: registry.merkleRoot,
      workerId: worker.workerId,
      workerIdBigInt: worker.workerIdBigInt.toString(),
      wageAmount: worker.wageAmount.toString(),
      wageAmountFloat: (Number(worker.wageAmount) / 1e7).toFixed(2),
      secretSalt: worker.secretSalt.toString(),
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      nullifier: proof.nullifier,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `claim_${workerId}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // Step 3: download all as sequential individual files
  const handleDownloadAll = () => {
    if (!registry) return;
    workers.forEach(w => handleDownloadOne(w.workerId));
  };

  // Reset wizard
  const handleReset = () => {
    setStep('upload');
    setWorkers([]);
    setRegistry(null);
    setMerkleRoot('0x...');
    setPublishStatus('idle');
    setTxHash('');
  };

  const totalXlm = workers.reduce((a, w) => a + w.wageAmountXlm, 0);

  return (
    <>
      <ErrorModal error={modalError} onClose={clearError} />
      <Navbar activeSection="none" onNav={() => {}} />
      <main style={{ paddingTop: '100px', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: 760 }}>
          {/* Page header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
            <span className="badge badge-accent" style={{ marginBottom: 16 }}>Employer Portal</span>
            <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Payroll Management</h1>
            <p style={{ color: 'var(--color-muted)', maxWidth: 500, marginInline: 'auto' }}>
              Three steps to pay your team privately on Stellar.
            </p>
          </div>

                    <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 12, 
            marginBottom: 'var(--space-10)', 
            paddingBottom: 24,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            <button 
              className={`btn ${activeTab === 'run_payroll' ? 'btn-primary' : 'btn-glass'}`}
              onClick={() => setActiveTab('run_payroll')}
              style={{
                borderRadius: 99,
                padding: '10px 24px',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                boxShadow: activeTab === 'run_payroll' ? '0 4px 14px rgba(22, 119, 255, 0.3)' : 'none'
              }}
            >
              <UploadCloud size={18} style={{ marginRight: 6 }}/> Run Payroll
            </button>
            <button 
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-glass'}`}
              onClick={() => setActiveTab('history')}
              style={{
                borderRadius: 99,
                padding: '10px 24px',
                fontSize: '0.95rem',
                fontWeight: 600,
                transition: 'all 0.2s',
                boxShadow: activeTab === 'history' ? '0 4px 14px rgba(22, 119, 255, 0.3)' : 'none'
              }}
            >
              <History size={18} style={{ marginRight: 6 }}/> History & Analytics
            </button>
          </div>

          {activeTab === 'run_payroll' && <Stepper current={step} />}

          <div className="neu-card glass-card" style={{ padding: 'var(--space-8)' }}>
            <AnimatePresence mode="wait">
              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {!selectedHistory && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                      <div className="neu-card glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <h4 style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Total Payrolls</h4>
                        <p style={{ margin: '10px 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{history.length}</p>
                      </div>
                      <div className="neu-card glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <h4 style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Total Workers Paid</h4>
                        <p style={{ margin: '10px 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{history.reduce((acc, h) => acc + (h.workers.workers?.length || 0), 0)}</p>
                      </div>
                      <div className="neu-card glass-card" style={{ padding: '20px', textAlign: 'center' }}>
                        <h4 style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Total Volume (XLM)</h4>
                        <p style={{ margin: '10px 0 0', fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{(history.reduce((acc, h) => acc + (h.workers.workers?.reduce((s: any, w: any) => s + Number(w.wageAmount), 0) || 0), 0) / 1e7).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  )}
                  <h2 style={{ marginBottom: 16 }}>Payroll History</h2>
                  {isLoadingHistory ? <p>Loading...</p> : (
                    selectedHistory ? (
                      <div>
                        <button className="btn btn-glass" style={{ marginBottom: 20 }} onClick={() => setSelectedHistory(null)}><ArrowLeft size={16}/> Back to List</button>
                        <h3 style={{ marginBottom: 16 }}>Batch from {new Date(selectedHistory.created_at).toLocaleString()}</h3>
                        

                        <div className="table-responsive-wrapper" style={{ maxHeight: 400 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead style={{ background: 'var(--color-bg-raised)', position: 'sticky', top: 0 }}>
                              <tr>
                                <th style={{ padding: '10px 16px', textAlign: 'left' }}>Worker ID</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Wage</th>
                                <th style={{ padding: '10px 16px', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Claim File</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedHistory.workers.workers.map((w, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{w.workerId}</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{(w.wageAmount / 1e7).toFixed(4)} XLM</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                    {w.status === 'claimed' ? <span style={{ color: 'var(--color-accent)' }}>Claimed</span> : 
                                     w.status === 'pending' ? <span style={{ color: 'var(--color-muted)' }}>Pending</span> : '-'}
                                  </td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                    <button className="btn btn-glass" style={{ padding: '5px 12px' }} onClick={() => {
                                      const proof = selectedHistory.workers.proofs[w.workerId];
                                      const data = {
                                        employerId: selectedHistory.workers.employerId,
                                        employerIdBigInt: selectedHistory.workers.employerIdBigInt.toString(),
                                        merkleRoot: selectedHistory.workers.merkleRoot,
                                        workerId: w.workerId,
                                        workerIdBigInt: w.workerIdBigInt.toString(),
                                        wageAmount: w.wageAmount.toString(),
                                        wageAmountFloat: (Number(w.wageAmount) / 1e7).toFixed(2),
                                        secretSalt: w.secretSalt.toString(),
                                        pathElements: proof.pathElements,
                                        pathIndices: proof.pathIndices,
                                        nullifier: proof.nullifier,
                                      };
                                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a'); a.href = url; a.download = `claim_${w.workerId}.json`; a.click();
                                      URL.revokeObjectURL(url);
                                    }}>
                                      <Download size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="table-responsive-wrapper">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead style={{ background: 'var(--color-bg-raised)' }}>
                            <tr>
                              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Root</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Workers</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.length === 0 ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>No history found.</td></tr> : history.map((h, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '12px 16px' }}>{new Date(h.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{h.root.slice(0, 10)}...</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{h.workers.workers?.length || 0}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setSelectedHistory(h); checkLiveStatus(h); }}>View</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </motion.div>
              )}
              {activeTab === 'run_payroll' && step === 'upload' && (
                <UploadStep
                  key="upload"
                  xlmPrice={xlmPrice}
                  workers={workers}
                  onUpload={handleUpload}
                  onNext={handleBuildBatch}
                  isBuilding={isBuilding}
                />
              )}
              {activeTab === 'run_payroll' && step === 'review' && (
                <ReviewStep
                  key="review"
                  workers={workers}
                  totalXlm={totalXlm}
                  merkleRoot={merkleRoot}
                  publishStatus={publishStatus}
                  onPublish={handlePublish}
                  onBack={() => setStep('upload')}
                  txHash={txHash}
                />
              )}
              {activeTab === 'run_payroll' && step === 'distribute' && (
                <DistributeStep
                  key="distribute"
                  workers={workers}
                  registry={registry}
                  onDownloadOne={handleDownloadOne}
                  onDownloadAll={handleDownloadAll}
                  onReset={handleReset}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
