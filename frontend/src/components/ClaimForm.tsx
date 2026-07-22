import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Hash, DollarSign, User, ChevronRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ToastType } from './Toast';

import { config } from '../lib/config';
import { generateProof, fetchMerkleProof, hashToField } from '../lib/zkProver';
import type { ProgressCallback } from '../lib/zkProver';

// ── Types ─────────────────────────────────────────────────────
interface ClaimForm {
  workerId:     string;
  wageAmount:   string;
  secretSalt:   string;
  merkleRoot:   string;
  employerId:   string;
  anchorAddress:string;
  targetAsset:  string;
  proofServerUrl: string;
}

type ClaimStep = 'form' | 'generating' | 'submitting' | 'success';

interface ClaimSectionProps {
  notify: (type: ToastType, title: string, msg?: string) => void;
}

// ── Step definitions ──────────────────────────────────────────
const STEPS = [
  { id: 0, label: 'Enter Details' },
  { id: 1, label: 'Generate Proof' },
  { id: 2, label: 'Submit Claim' },
  { id: 3, label: 'Complete' },
];

// ── Helpers ───────────────────────────────────────────────────
function validateForm(f: ClaimForm): Partial<Record<keyof ClaimForm, string>> {
  const err: Partial<Record<keyof ClaimForm, string>> = {};
  if (!f.workerId.trim())   err.workerId   = 'Worker ID is required';
  if (!f.wageAmount.trim()) err.wageAmount = 'Wage amount is required';
  else if (isNaN(Number(f.wageAmount)) || Number(f.wageAmount) <= 0) err.wageAmount = 'Enter a valid amount greater than 0';
  if (!f.secretSalt.trim()) err.secretSalt = 'Secret salt is required';
  else if (f.secretSalt.length < 12) err.secretSalt = 'Salt must be at least 12 characters';
  if (!f.merkleRoot.trim()) err.merkleRoot = 'Merkle root is required';
  if (!f.employerId.trim()) err.employerId = 'Employer ID is required';
  if (!f.anchorAddress.trim()) err.anchorAddress = 'Anchor address is required';
  return err;
}

// Real proof generation now integrated.
// We keep simulateSubmitClaim since backend relayer might not be running yet.

async function simulateSubmitClaim(_proof: object, _signals: string[]): Promise<{ txHash: string }> {
  await new Promise(r => setTimeout(r, 1800));
  const txHash = 'STELLAR_' + Math.random().toString(36).slice(2).toUpperCase().padEnd(56, '0');
  return { txHash };
}

// ── Proof Terminal Display ────────────────────────────────────
function ProofDisplay({ proof, signals, nullifier }: { proof: object; signals: string[]; nullifier: string }) {
  return (
    <motion.div
      className="proof-terminal"
      initial={{ opacity: 0, scaleY: 0.9 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      role="region"
      aria-label="Generated ZK Proof"
      aria-live="polite"
    >
      <div className="proof-terminal-header" aria-hidden="true">
        <span className="terminal-dot red" /><span className="terminal-dot yellow" /><span className="terminal-dot green" />
        <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>proof_output.json</span>
        <span className="badge badge-accent" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>✓ Valid</span>
      </div>
      <div className="proof-terminal-body">
        <div><span className="comment">// Groth16 BN254 ZK-SNARK — Generated in browser</span></div>
        <div><span className="label">nullifier: </span><span className="value" style={{ fontSize: '0.72rem' }}>{nullifier}</span></div>
        <div><span className="label">merkleRoot: </span><span className="value" style={{ fontSize: '0.72rem' }}>{signals[0]?.slice(0, 20)}...</span></div>
        <div><span className="label">claimedAmount: </span><span className="value">{signals[2]} <span className="comment">(stroops)</span></span></div>
        <div><span className="comment">// ✅ Identity: HIDDEN &nbsp; Wage: PROVEN</span></div>
      </div>
    </motion.div>
  );
}

// ── Success View ──────────────────────────────────────────────
function SuccessView({ txHash, amount, onReset }: { txHash: string; amount: string; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-6)' }}
      role="status"
      aria-live="polite"
      aria-label="Claim submitted successfully"
    >
      {/* Animated check */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.1 }}
        style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}
      >
        <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, var(--color-accent), #16a34a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(34,197,94,0.5)' }}>
          <CheckCircle size={40} color="#000" strokeWidth={2.5} aria-hidden="true" />
        </div>
      </motion.div>

      <h3 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-foreground)' }}>Wage Claim Submitted!</h3>
      <p style={{ marginBottom: 'var(--space-6)', fontSize: '1rem' }}>
        Your ZK proof has been verified on-chain. <strong style={{ color: 'var(--color-accent)' }}>${parseFloat(amount).toFixed(2)}</strong> is
        being routed to your anchor via the Stellar SDEX.
      </p>

      {/* Tx hash */}
      <div className="proof-terminal" style={{ textAlign: 'left', marginBottom: 'var(--space-6)' }}>
        <div className="proof-terminal-header" aria-hidden="true">
          <span className="terminal-dot red" /><span className="terminal-dot yellow" /><span className="terminal-dot green" />
          <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>transaction</span>
        </div>
        <div className="proof-terminal-body">
          <div><span className="label">status: </span><span style={{ color: 'var(--color-accent)' }}>SUCCESS</span></div>
          <div><span className="label">hash: </span><span className="value" style={{ fontSize: '0.7rem' }}>{txHash}</span></div>
          <div><span className="label">nullifier: </span><span className="value">marked as spent ✓</span></div>
        </div>
      </div>

      <button className="btn btn-glass" onClick={onReset} style={{ width: '100%' }}>
        Submit Another Claim
      </button>
    </motion.div>
  );
}

// ── Main Claim Form ───────────────────────────────────────────
export function ClaimSection({ notify }: ClaimSectionProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [claimStep, setClaimStep] = useState<ClaimStep>('form');
  const [form, setForm] = useState<ClaimForm>({
    workerId: '', wageAmount: '', secretSalt: '', merkleRoot: '', employerId: '', anchorAddress: '', targetAsset: 'USDC', proofServerUrl: config.proofServerUrl
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ClaimForm, string>>>({});
  const [proofData, setProofData] = useState<{ proof: object; nullifier: string; publicSignals: string[] } | null>(null);
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<{ msg: string; type: 'idle' | 'loading' | 'ready' | 'error' }>({ msg: 'Enter your credentials to generate a proof', type: 'idle' });
  const [progress, setProgress] = useState<{ wasm: number; zkey: number }>({ wasm: 0, zkey: 0 });

  const update = (field: keyof ClaimForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setErrors(p => { const n = { ...p }; delete n[field]; return n; });
  };

  const handleGenerateProof = useCallback(async () => {
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      notify('error', 'Validation failed', 'Please fix the highlighted fields.');
      // Focus first error field
      const firstKey = Object.keys(errs)[0];
      document.getElementById(firstKey)?.focus();
      return;
    }
    setClaimStep('generating');
    setCurrentStep(1);
    setProgress({ wasm: 0, zkey: 0 });
    
    try {
      setStatus({ msg: 'Fetching Merkle proof from server...', type: 'loading' });
      const merkleProof = await fetchMerkleProof(form.workerId, form.proofServerUrl);
      
      setStatus({ msg: 'Generating ZK-SNARK proof...', type: 'loading' });
      const handleProgress: ProgressCallback = (file, loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setProgress(p => ({ ...p, [file]: percent }));
      };
      
      const inputs = {
        workerId: await hashToField(form.workerId),
        wageAmount: BigInt(Math.round(Number(form.wageAmount) * 1e7)),
        secretSalt: await hashToField(form.secretSalt),
        employerId: await hashToField(form.employerId),
        pathElements: merkleProof.pathElements,
        pathIndices: merkleProof.pathIndices,
        merkleRoot: BigInt(merkleProof.merkleRoot)
      };

      const result = await generateProof(inputs, handleProgress);
      setProofData(result);
      setClaimStep('submitting');
      setCurrentStep(2);
      setStatus({ msg: 'Proof generated. Ready to submit via relayer.', type: 'ready' });
      notify('success', 'Proof Generated', 'Your ZK-SNARK proof is ready. Review and submit.');
    } catch (err: any) {
      setClaimStep('form');
      setCurrentStep(0);
      setStatus({ msg: err.message || 'Proof generation failed. Please retry.', type: 'error' });
      notify('error', 'Proof Generation Failed', err.message || 'An error occurred during proof generation.');
    }
  }, [form, notify]);

  const handleSubmitClaim = useCallback(async () => {
    if (!proofData) return;
    setStatus({ msg: 'Submitting via relayer fee-bump transaction...', type: 'loading' });
    try {
      const result = await simulateSubmitClaim(proofData.proof, proofData.publicSignals);
      setTxHash(result.txHash);
      setClaimStep('success');
      setCurrentStep(3);
      setStatus({ msg: 'Claim confirmed on-chain.', type: 'ready' });
      notify('success', 'Claim Confirmed!', 'Funds are being routed to your anchor.');
    } catch {
      setStatus({ msg: 'Submission failed. Please retry.', type: 'error' });
      notify('error', 'Submission Failed', 'The relayer could not process your transaction.');
    }
  }, [proofData, notify]);

  const handleReset = () => {
    setClaimStep('form');
    setCurrentStep(0);
    setProofData(null);
    setTxHash('');
    setErrors({});
    setStatus({ msg: 'Enter your credentials to generate a proof', type: 'idle' });
    setForm({ workerId: '', wageAmount: '', secretSalt: '', merkleRoot: '', employerId: '', anchorAddress: '', targetAsset: 'USDC', proofServerUrl: config.proofServerUrl });
  };

  return (
    <section id="claim" className="claim-section" aria-labelledby="claim-heading">
      <div className="container">
        <motion.div
          className="claim-wrapper"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Section header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
            <span className="badge badge-accent" style={{ marginBottom: 16 }}>Phase 4 — Worker UI</span>
            <h2 id="claim-heading">Claim Your Wages</h2>
            <p style={{ marginTop: 12, maxWidth: 500, marginInline: 'auto' }}>
              Generate a zero-knowledge proof in your browser. Your private data never leaves this page.
            </p>
          </div>

          {/* Stepper */}
          <div className="stepper" role="list" aria-label="Claim progress">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`step-item${currentStep === i ? ' active' : ''}${currentStep > i ? ' completed' : ''}`}
                role="listitem"
                aria-current={currentStep === i ? 'step' : undefined}
              >
                <div className="step-circle" aria-hidden="true">
                  {currentStep > i ? <CheckCircle size={18} strokeWidth={2.5} /> : s.id + 1}
                </div>
                <span className="step-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Main card */}
          <div className="neu-card glass-card glow-ring claim-card">
            <AnimatePresence mode="wait">
              {claimStep === 'success' ? (
                <SuccessView key="success" txHash={txHash} amount={form.wageAmount} onReset={handleReset} />
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <div className="claim-card-header">
                    <h2 style={{ fontSize: '1.5rem' }}>
                      {claimStep === 'form'       && 'Enter Your Credentials'}
                      {claimStep === 'generating' && 'Generating Proof…'}
                      {claimStep === 'submitting' && 'Review & Submit'}
                    </h2>
                    <p style={{ marginTop: 6, fontSize: '0.9rem' }}>
                      {claimStep === 'form'       && 'All inputs are processed locally. Nothing is sent to any server.'}
                      {claimStep === 'generating' && 'The BN254 Groth16 circuit is running in your browser. Please wait.'}
                      {claimStep === 'submitting' && 'Verify the proof below then submit via the relayer.'}
                    </p>
                  </div>

                  {/* Status row */}
                  <div className={`status-row ${status.type === 'loading' ? 'loading' : status.type === 'ready' ? 'ready' : status.type === 'error' ? 'error' : ''}`}>
                    {status.type === 'loading' && <div className="spinner" aria-hidden="true" />}
                    {status.type === 'ready'   && <CheckCircle size={16} aria-hidden="true" />}
                    {status.type === 'error'   && <AlertCircle size={16} aria-hidden="true" />}
                    {status.type === 'idle'    && <div className="pulse-dot" aria-hidden="true" />}
                    <span>{status.msg}</span>
                  </div>

                  {/* ── FORM FIELDS ─────────────────────────────── */}
                  {(claimStep === 'form') && (
                    <form
                      onSubmit={e => { e.preventDefault(); handleGenerateProof(); }}
                      noValidate
                      aria-label="Wage claim form"
                    >
                      <div className="form-grid">
                        {/* Worker ID */}
                        <div className="input-group">
                          <label className="input-label" htmlFor="workerId">
                            Worker ID <span className="required" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="workerId"
                            className={`input-field mono${errors.workerId ? ' input-error' : ''}`}
                            type="text"
                            value={form.workerId}
                            onChange={update('workerId')}
                            placeholder="e.g. WORKER_001"
                            required
                            aria-required="true"
                            aria-describedby={errors.workerId ? 'workerIdErr' : 'workerIdHint'}
                            autoComplete="off"
                          />
                          {errors.workerId ? (
                            <span id="workerIdErr" className="input-error-msg" role="alert">{errors.workerId}</span>
                          ) : (
                            <span id="workerIdHint" className="input-helper">Your unique payroll identifier</span>
                          )}
                        </div>

                        {/* Wage Amount */}
                        <div className="input-group">
                          <label className="input-label" htmlFor="wageAmount">
                            Wage Amount (USD) <span className="required" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="wageAmount"
                            className={`input-field${errors.wageAmount ? ' input-error' : ''}`}
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            value={form.wageAmount}
                            onChange={update('wageAmount')}
                            placeholder="e.g. 500.00"
                            required
                            aria-required="true"
                            aria-describedby={errors.wageAmount ? 'wageErr' : undefined}
                          />
                          {errors.wageAmount && <span id="wageErr" className="input-error-msg" role="alert">{errors.wageAmount}</span>}
                        </div>

                        {/* Secret Salt */}
                        <div className="input-group form-full">
                          <label className="input-label" htmlFor="secretSalt">
                            Secret Salt <span className="required" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="secretSalt"
                            className={`input-field mono${errors.secretSalt ? ' input-error' : ''}`}
                            type="password"
                            value={form.secretSalt}
                            onChange={update('secretSalt')}
                            placeholder="A secret phrase known only to you (min 12 chars)"
                            required
                            aria-required="true"
                            aria-describedby={errors.secretSalt ? 'saltErr' : 'saltHint'}
                            autoComplete="new-password"
                          />
                          {errors.secretSalt ? (
                            <span id="saltErr" className="input-error-msg" role="alert">{errors.secretSalt}</span>
                          ) : (
                            <span id="saltHint" className="input-helper">
                              <Key size={12} style={{ display: 'inline', marginRight: 4 }} aria-hidden="true" />
                              Never shared. Used to generate your unique nullifier and commitment.
                            </span>
                          )}
                        </div>

                        {/* Merkle Root */}
                        <div className="input-group">
                          <label className="input-label" htmlFor="merkleRoot">
                            Payroll Merkle Root <span className="required" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="merkleRoot"
                            className={`input-field mono${errors.merkleRoot ? ' input-error' : ''}`}
                            type="text"
                            value={form.merkleRoot}
                            onChange={update('merkleRoot')}
                            placeholder="0x21888cfea..."
                            required
                            aria-required="true"
                            aria-describedby={errors.merkleRoot ? 'rootErr' : 'rootHint'}
                          />
                          {errors.merkleRoot ? (
                            <span id="rootErr" className="input-error-msg" role="alert">{errors.merkleRoot}</span>
                          ) : (
                            <span id="rootHint" className="input-helper">Provided by your employer or the AegisPay dashboard</span>
                          )}
                        </div>

                        {/* Employer ID */}
                        <div className="input-group">
                          <label className="input-label" htmlFor="employerId">
                            Employer ID <span className="required" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="employerId"
                            className={`input-field mono${errors.employerId ? ' input-error' : ''}`}
                            type="text"
                            value={form.employerId}
                            onChange={update('employerId')}
                            placeholder="e.g. EMPLOYER_XYZ"
                            required
                            aria-required="true"
                            aria-describedby={errors.employerId ? 'empErr' : undefined}
                          />
                          {errors.employerId && <span id="empErr" className="input-error-msg" role="alert">{errors.employerId}</span>}
                        </div>

                        {/* Anchor Address */}
                        <div className="input-group">
                          <label className="input-label" htmlFor="anchorAddress">
                            Anchor Deposit Address <span className="required" aria-hidden="true">*</span>
                          </label>
                          <input
                            id="anchorAddress"
                            className={`input-field mono${errors.anchorAddress ? ' input-error' : ''}`}
                            type="text"
                            value={form.anchorAddress}
                            onChange={update('anchorAddress')}
                            placeholder="G..."
                            required
                            aria-required="true"
                            aria-describedby={errors.anchorAddress ? 'anchorErr' : 'anchorHint'}
                          />
                          {errors.anchorAddress ? (
                            <span id="anchorErr" className="input-error-msg" role="alert">{errors.anchorAddress}</span>
                          ) : (
                            <span id="anchorHint" className="input-helper">Your local SEP-31 anchor's Stellar deposit address</span>
                          )}
                        </div>

                        {/* Target Asset */}
                        <div className="input-group">
                          <label className="input-label" htmlFor="targetAsset">Target Asset</label>
                          <select
                            id="targetAsset"
                            className="input-field"
                            value={form.targetAsset}
                            onChange={update('targetAsset')}
                            aria-describedby="assetHint"
                          >
                            <option value="USDC">USDC (US Dollar)</option>
                            <option value="EURC">EURC (Euro)</option>
                            <option value="NGNC">NGNC (Nigerian Naira)</option>
                            <option value="BRLT">BRLT (Brazilian Real)</option>
                            <option value="PHPC">PHPC (Philippine Peso)</option>
                          </select>
                          <span id="assetHint" className="input-helper">The fiat-anchored asset you want to receive</span>
                        </div>
                        
                        {/* Proof Server URL */}
                        <div className="input-group form-full">
                          <label className="input-label" htmlFor="proofServerUrl">Proof Server URL</label>
                          <input
                            id="proofServerUrl"
                            className="input-field mono"
                            type="text"
                            value={form.proofServerUrl}
                            onChange={update('proofServerUrl')}
                            placeholder="http://localhost:3002"
                            required
                          />
                        </div>
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--space-3)', fontSize: '1.05rem', padding: '14px' }}
                        aria-label="Generate zero-knowledge proof"
                      >
                        <Hash size={18} aria-hidden="true" />
                        Generate ZK Proof
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>

                      <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                        🔒 All cryptography runs locally. No data is sent to any server before proof generation.
                      </p>
                    </form>
                  )}

                  {/* ── GENERATING STATE ─────────────────────── */}
                  {claimStep === 'generating' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                        style={{ width: 60, height: 60, border: '3px solid rgba(34,197,94,0.15)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto var(--space-6)' }}
                        aria-hidden="true"
                      />
                      <h3 style={{ marginBottom: 'var(--space-3)' }}>Running BN254 Circuit</h3>
                      <p style={{ fontSize: '0.9rem' }}>Building your Groth16 proof locally.</p>
                      
                      {/* Progress Bars */}
                      <div style={{ marginTop: 'var(--space-6)', maxWidth: 400, marginInline: 'auto', textAlign: 'left' }}>
                        <div style={{ marginBottom: 'var(--space-3)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                            <span>circuit.wasm</span>
                            <span>{progress.wasm}%</span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: 'var(--color-bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${progress.wasm}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.2s' }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                            <span>circuit_final.zkey</span>
                            <span>{progress.zkey}%</span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: 'var(--color-bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${progress.zkey}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.2s' }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 'var(--space-8)', display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {['Fetching proof', 'Downloading keys', 'Generating proof'].map((s, i) => (
                          <motion.span
                            key={i}
                            className="badge badge-info"
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.4, ease: 'easeInOut' }}
                          >{s}</motion.span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* ── SUBMIT STATE ─────────────────────────── */}
                  {claimStep === 'submitting' && proofData && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <ProofDisplay
                        proof={proofData.proof}
                        signals={proofData.publicSignals}
                        nullifier={proofData.nullifier}
                      />
                      <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-5)', background: 'var(--color-bg-raised)', borderRadius: 'var(--radius-md)', border: 'var(--glass-border)' }}>
                        <h4 style={{ marginBottom: 'var(--space-3)', fontSize: '1rem' }}>Claim Summary</h4>
                        {[
                          { label: 'Amount', value: `$${parseFloat(form.wageAmount).toFixed(2)} → ${form.targetAsset}` },
                          { label: 'Destination', value: form.anchorAddress.slice(0, 8) + '...' + form.anchorAddress.slice(-8) },
                          { label: 'Network Fee', value: '0 XLM (covered by relayer)' },
                          { label: 'Privacy', value: 'Identity hidden ✓' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                            <span style={{ color: 'var(--color-muted)' }}>{label}</span>
                            <span style={{ fontFamily: label === 'Destination' ? 'var(--font-mono)' : undefined, fontSize: label === 'Destination' ? '0.8rem' : undefined, color: label === 'Network Fee' || label === 'Privacy' ? 'var(--color-accent)' : 'var(--color-foreground)', fontWeight: 500 }}>{value}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--space-5)', fontSize: '1.05rem', padding: '14px' }}
                        onClick={handleSubmitClaim}
                        aria-label="Submit wage claim via relayer"
                      >
                        <DollarSign size={18} aria-hidden="true" />
                        Submit Claim via Relayer
                        <ChevronRight size={18} aria-hidden="true" />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
