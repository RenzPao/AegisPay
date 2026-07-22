import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Hash, DollarSign, User, ChevronRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { ToastType } from './Toast';

import { config } from '../lib/config';
import { generateProof, hashToField } from '../lib/zkProver';
import type { ProgressCallback } from '../lib/zkProver';

// ── Types ─────────────────────────────────────────────────────
interface ClaimForm {
  workerId:     string;
  wageAmount:   string;
  secretSalt:   string;
  merkleRoot:   string;
  employerId:   string;
  pathElements: string[];
  pathIndices:  number[];
  nullifier:    string;
  anchorAddress:string;
  targetAsset:  string;
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
  if (!f.anchorAddress.trim()) err.anchorAddress = 'Anchor address is required';
  if (!f.workerId || !f.merkleRoot || f.pathElements.length === 0) err.workerId = 'Invalid or missing claim file data';
  return err;
}

import { submitClaimToContract } from '../lib/stellar';

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
        Your ZK proof has been verified on-chain. <strong style={{ color: 'var(--color-accent)' }}>{(parseFloat(amount) / 1e7).toFixed(2)} XLM</strong> is
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
  const [claimFileUploaded, setClaimFileUploaded] = useState(false);
  const [form, setForm] = useState<ClaimForm>({
    workerId: '', wageAmount: '', secretSalt: '', merkleRoot: '', employerId: '', 
    pathElements: [], pathIndices: [], nullifier: '',
    anchorAddress: '', targetAsset: 'XLM'
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ClaimForm, string>>>({});
  const [proofData, setProofData] = useState<{ proof: object; nullifier: string; publicSignals: string[] } | null>(null);
  const [txHash, setTxHash] = useState('');
  const [status, setStatus] = useState<{ msg: string; type: 'idle' | 'loading' | 'ready' | 'error' }>({ msg: 'Upload your claim file to begin', type: 'idle' });
  const [progress, setProgress] = useState<{ wasm: number; zkey: number }>({ wasm: 0, zkey: 0 });
  
  const [xlmPrice, setXlmPrice] = useState<number | null>(null);

  React.useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd')
      .then(res => res.json())
      .then(data => {
        if (data.stellar && data.stellar.usd) {
          setXlmPrice(data.stellar.usd);
        }
      })
      .catch(console.error);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const data = JSON.parse(text);
        if (!data.workerId || !data.pathElements) throw new Error('Invalid format');
        
        setForm(prev => ({
          ...prev,
          workerId: data.workerId,
          wageAmount: data.wageAmount,
          secretSalt: data.secretSalt,
          merkleRoot: data.merkleRoot,
          employerId: data.employerId,
          pathElements: data.pathElements,
          pathIndices: data.pathIndices,
          nullifier: data.nullifier
        }));
        setClaimFileUploaded(true);
        setStatus({ msg: 'Claim file loaded. Ready to generate proof.', type: 'ready' });
      } catch (e) {
        notify('error', 'Invalid File', 'Could not parse the claim file.');
      }
    };
    reader.readAsText(file);
  };

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
      setStatus({ msg: 'Generating ZK-SNARK proof...', type: 'loading' });
      const handleProgress: ProgressCallback = (file, loaded, total) => {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        setProgress(p => ({ ...p, [file]: percent }));
      };
      
      const inputs = {
        workerId: await hashToField(form.workerId),
        wageAmount: BigInt(form.wageAmount),
        secretSalt: BigInt(form.secretSalt),
        employerId: await hashToField(form.employerId), // or BigInt if already parsed, depending on claim file format
        pathElements: form.pathElements.map(x => BigInt(x)),
        pathIndices: form.pathIndices,
        merkleRoot: BigInt(form.merkleRoot)
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
    setStatus({ msg: 'Submitting transaction to Stellar network...', type: 'loading' });
    try {
      const employerIdHex = '0000000000000000000000000000000000000000000000000000000000000123';
      const txHash = await submitClaimToContract(
        config.contractId,
        employerIdHex,
        form.merkleRoot,
        proofData.nullifier,
        Number(form.wageAmount),
        form.anchorAddress
      );
      setTxHash(txHash);
      setClaimStep('success');
      setCurrentStep(3);
      setStatus({ msg: 'Claim confirmed on-chain.', type: 'ready' });
      notify('success', 'Claim Confirmed!', 'Funds are being routed to your anchor.');
    } catch (e: any) {
      console.error(e);
      let errorMsg = e.message || 'The network could not process your transaction.';
      if (errorMsg.includes('Error(Contract, #5)') || errorMsg.includes('NullifierSpent')) {
        errorMsg = 'This claim file has already been redeemed.';
      }
      setStatus({ msg: 'Submission failed. Please retry.', type: 'error' });
      notify('error', 'Submission Failed', errorMsg);
    }
  }, [proofData, form, notify]);

  const handleReset = () => {
    setClaimStep('form');
    setCurrentStep(0);
    setProofData(null);
    setTxHash('');
    setErrors({});
    setClaimFileUploaded(false);
    setStatus({ msg: 'Upload your claim file to begin', type: 'idle' });
    setForm({ workerId: '', wageAmount: '', secretSalt: '', merkleRoot: '', employerId: '', anchorAddress: '', targetAsset: 'XLM', pathElements: [], pathIndices: [], nullifier: '' });
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
                        
                        {!claimFileUploaded ? (
                          <div style={{ 
                            gridColumn: '1 / -1',
                            border: '2px dashed var(--color-border)', 
                            borderRadius: 'var(--radius-lg)', 
                            padding: 'var(--space-8)', 
                            textAlign: 'center',
                            background: 'var(--color-bg-raised)',
                            position: 'relative'
                          }}>
                            <input 
                              type="file" 
                              accept=".json" 
                              onChange={handleFileUpload}
                              style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                              aria-label="Upload Claim File"
                            />
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                            <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Upload Claim File (.json)</p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Drag and drop the file provided by your employer.</p>
                          </div>
                        ) : (
                          <>
                            {/* Worker Info Preview */}
                            <div style={{ gridColumn: '1 / -1', padding: '16px', background: 'rgba(34,197,94,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-accent)', fontWeight: 'bold', marginBottom: 8 }}>
                                <CheckCircle size={16} /> Claim File Loaded Successfully
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                                <span style={{ marginRight: 16 }}><strong>ID:</strong> {form.workerId}</span>
                                <span><strong>Amount:</strong> {(Number(form.wageAmount) / 1e7).toFixed(2)} XLM {xlmPrice ? `(approx. $${((Number(form.wageAmount) / 1e7) * xlmPrice).toFixed(2)})` : ''}</span>
                              </div>
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
                                <option value="XLM">XLM (Stellar Lumens)</option>
                              </select>
                              <span id="assetHint" className="input-helper">The asset you will receive</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Submit */}
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 'var(--space-3)', fontSize: '1.05rem', padding: '14px' }}
                        aria-label="Generate zero-knowledge proof"
                        disabled={!claimFileUploaded}
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
                          { label: 'Amount', value: `${(parseFloat(form.wageAmount) / 1e7).toFixed(2)} XLM ${xlmPrice ? `(~$${((parseFloat(form.wageAmount) / 1e7) * xlmPrice).toFixed(2)})` : ''} → ${form.targetAsset}` },
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
