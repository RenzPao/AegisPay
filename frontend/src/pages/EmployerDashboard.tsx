import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar, Footer } from '../components/Layout';
import {
  UploadCloud, ChevronRight, CheckCircle, Download, RefreshCw,
  Users, DollarSign, Shield, Zap, ArrowLeft, FileJson, Clock, History, FileText, Check, AlertCircle
} from 'lucide-react';
import { generateRegistry } from '../lib/registry';
import type { PayrollRegistry } from '../lib/registry';
import { deployRootToContract, fundEscrowContract, initializeContract, addPayrollRoot, isNullifierSpent } from '../lib/stellar';
import { ErrorModal, useErrorModal } from '../components/ErrorModal';
import { config } from '../lib/config';
import { supabase } from '../lib/supabase';
import { kit } from '../lib/wallet';

// Types
interface WorkerRow { workerId: string; wageAmountUsd: number; wageAmountXlm: number; status?: 'pending' | 'claimed'; }

type WizardStep = 'upload' | 'review' | 'distribute';
type PublishStatus = 'idle' | 'initializing' | 'deploying' | 'funding' | 'done' | 'error';
type Tab = 'run_payroll' | 'history';

// Helpers
function formatUsd(n: number) { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function formatXlm(n: number) { return `${n.toFixed(4)} XLM`; }

// Page Component
export default function EmployerDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('run_payroll');
  
  // Create Payroll State
  const [step, setStep] = useState<WizardStep>('upload');
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [xlmPrice, setXlmPrice] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [registry, setRegistry] = useState<PayrollRegistry | null>(null);
  const [merkleRoot, setMerkleRoot] = useState('0x...');
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const [txHash, setTxHash] = useState('');
  
  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const { modalError, showError, clearError } = useErrorModal();

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd')
      .then(r => r.json())
      .then(d => { if (d.stellar?.usd) setXlmPrice(d.stellar.usd); })
      .catch(() => {});
      
    if (activeTab === 'history') {
      loadHistory();
    }
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!xlmPrice) { showError('XLM price feed not available, please try again.'); return; }
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
      if (rows.length === 0) { showError('Invalid CSV format. Use workerId, wageAmountUSD'); return; }
      setWorkers(rows);
    };
    reader.readAsText(file);
  };

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
      showError(err?.message || 'Error generating registry');
    } finally {
      setIsBuilding(false);
    }
  };

  const handlePublish = async () => {
    const contractId = config.contractId;

    try {
      setPublishStatus('initializing');
      try { await initializeContract(contractId, '0000000000000000000000000000000000000000000000000000000000000123'); } catch (e) {}

      setPublishStatus('deploying');
      await addPayrollRoot(contractId, merkleRoot);

      setPublishStatus('funding');
      const totalXlm = workers.reduce((a, w) => a + w.wageAmountXlm, 0);
      const hash = await fundEscrowContract(contractId, totalXlm);
      setTxHash(hash || '');

      setPublishStatus('done');
      setStep('distribute');
      
      // Save to Supabase
      const { address } = await kit.getAddress();
      if (address) {
        await supabase.from('payroll_history').insert({
          employer: address,
          root: merkleRoot,
          workers: registry
        });
      }
    } catch (err: any) {
      setPublishStatus('error');
      showError(err?.message || 'Failed to publish payroll batch');
    }
  };

  const handleDownloadOne = (workerId: string, customRegistry?: any) => {
    const reg = customRegistry || registry;
    if (!reg) return;
    const worker = reg.workers.find((w: any) => w.workerId === workerId);
    if (!worker) return;
    const proof = reg.proofs[workerId];
    const data = {
      employerId: reg.employerId,
      employerIdBigInt: reg.employerIdBigInt.toString(),
      merkleRoot: reg.merkleRoot,
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

  const totalXlm = workers.reduce((a, w) => a + w.wageAmountXlm, 0);

  return (
    <>
      <ErrorModal error={modalError} onClose={clearError} />
      <Navbar activeSection="none" onNav={() => {}} />
      <main style={{ paddingTop: '100px', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <span className="badge badge-accent" style={{ marginBottom: 16 }}>Employer Portal</span>
            <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Payroll Management</h1>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--color-border)', paddingBottom: 16, overflowX: 'auto' }}>
            <button className={`btn ${activeTab === 'run_payroll' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('run_payroll')}><UploadCloud size={16}/> Run Payroll</button>
            <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('history')}><History size={16}/> History</button>
          </div>

          <div className="neu-card glass-card" style={{ padding: 'var(--space-8)' }}>
            <AnimatePresence mode="wait">
              {activeTab === 'run_payroll' && (
                <motion.div key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {step === 'upload' && (
                    <>
                      <h2 style={{ marginBottom: 8 }}>Upload Your Payroll CSV</h2>
                      <div style={{
                        border: `2px dashed ${workers.length > 0 ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xl)', padding: 'var(--space-10)',
                        textAlign: 'center', background: 'var(--color-bg-raised)', position: 'relative', marginBottom: workers.length > 0 ? 'var(--space-6)' : 0
                      }}>
                        <input type="file" accept=".csv" onChange={handleUpload} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                        <UploadCloud size={48} color="var(--color-muted)" style={{ margin: '0 auto var(--space-4)' }} />
                        <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>Drag & drop your CSV here</p>
                      </div>
                      {workers.length > 0 && (
                        <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleBuildBatch} disabled={isBuilding}>
                          {isBuilding ? 'Building Merkle Tree...' : 'Build Payroll Batch'}
                        </button>
                      )}
                    </>
                  )}
                  {step === 'review' && (
                    <>
                      <h2 style={{ marginBottom: 8 }}>Review & Publish</h2>
                      <button className="btn btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handlePublish} disabled={publishStatus === 'deploying' || publishStatus === 'funding'}>
                        Publish & Fund On-Chain
                      </button>
                    </>
                  )}
                  {step === 'distribute' && (
                    <>
                      <h2 style={{ marginBottom: 8 }}>Distributed!</h2>
                      <p>Send these claim files to your workers.</p>
                      <button className="btn btn-primary" style={{ width: '100%', marginBottom: 10 }} onClick={() => workers.forEach(w => handleDownloadOne(w.workerId))}>Download All ({workers.length})</button>
                      <button className="btn btn-glass" style={{ width: '100%' }} onClick={() => { setStep('upload'); setWorkers([]); }}>Start Over</button>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 style={{ marginBottom: 16 }}>Payroll History</h2>
                  {isLoadingHistory ? <p>Loading...</p> : (
                    selectedHistory ? (
                      <div>
                        <button className="btn btn-glass" style={{ marginBottom: 20 }} onClick={() => setSelectedHistory(null)}><ArrowLeft size={16}/> Back to List</button>
                        <h3 style={{ marginBottom: 16 }}>Batch from {new Date(selectedHistory.created_at).toLocaleString()}</h3>
                        <button className="btn btn-glass" style={{ marginBottom: 16 }} onClick={() => checkLiveStatus(selectedHistory)}>Check Live Status</button>
                        
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
                              {selectedHistory.workers.workers.map((w: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                  <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)' }}>{w.workerId}</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>{(w.wageAmount / 1e7).toFixed(4)} XLM</td>
                                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                    {w.status === 'claimed' ? <span style={{ color: 'var(--color-accent)' }}>Claimed</span> : 
                                     w.status === 'pending' ? <span style={{ color: 'var(--color-muted)' }}>Pending</span> : '-'}
                                  </td>
                                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                    <button className="btn btn-glass" style={{ padding: '5px 12px' }} onClick={() => handleDownloadOne(w.workerId, selectedHistory.workers)}>
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
            </AnimatePresence>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
