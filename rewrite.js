const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/EmployerDashboard.tsx', 'utf-8');

// 1. Add imports
code = code.replace(
  "import { deployRootToContract, fundEscrowContract, initializeContract, addPayrollRoot } from '../lib/stellar';",
  "import { deployRootToContract, fundEscrowContract, initializeContract, addPayrollRoot, isNullifierSpent } from '../lib/stellar';\nimport { supabase } from '../lib/supabase';\nimport { kit } from '../lib/wallet';\nimport { History } from 'lucide-react';"
);

// 2. Add history types
code = code.replace(
  "type PublishStatus = 'idle' | 'initializing' | 'deploying' | 'funding' | 'done' | 'error';",
  "type PublishStatus = 'idle' | 'initializing' | 'deploying' | 'funding' | 'done' | 'error';\ntype Tab = 'run_payroll' | 'history';"
);

// 3. Add History state and effect
const stateToAdd = `  const [activeTab, setActiveTab] = useState<Tab>('run_payroll');
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
`;

code = code.replace("  const { modalError, showError, clearError } = useErrorModal();", "  const { modalError, showError, clearError } = useErrorModal();\n" + stateToAdd);

// 4. Update handlePublish to save to supabase
const handlePublishSearch = `      setPublishStatus('done');
      setStep('distribute');`;
const handlePublishReplace = `      setPublishStatus('done');
      setStep('distribute');
      
      const { address } = await kit.getAddress();
      if (address) {
        await supabase.from('payroll_history').insert({
          employer: address,
          root: merkleRoot,
          workers: registry
        });
      }`;
code = code.replace(handlePublishSearch, handlePublishReplace);

// 5. Update UI to include tabs and conditionally render Stepper/Wizard vs History
const uiSearch = `          <Stepper current={step} />

          <div className="neu-card glass-card" style={{ padding: 'var(--space-8)' }}>
            <AnimatePresence mode="wait">`;

const uiReplace = `          <div style={{ display: 'flex', gap: 10, marginBottom: 'var(--space-8)', borderBottom: '1px solid var(--color-border)', paddingBottom: 16, overflowX: 'auto' }}>
            <button className={\`btn \${activeTab === 'run_payroll' ? 'btn-primary' : 'btn-glass'}\`} onClick={() => setActiveTab('run_payroll')}><UploadCloud size={16}/> Run Payroll</button>
            <button className={\`btn \${activeTab === 'history' ? 'btn-primary' : 'btn-glass'}\`} onClick={() => setActiveTab('history')}><History size={16}/> History</button>
          </div>

          {activeTab === 'run_payroll' && <Stepper current={step} />}

          <div className="neu-card glass-card" style={{ padding: 'var(--space-8)' }}>
            <AnimatePresence mode="wait">
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
                                      const a = document.createElement('a'); a.href = url; a.download = \`claim_\${w.workerId}.json\`; a.click();
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
`;

code = code.replace(uiSearch, uiReplace);

// 6. Conditionally render the wizard steps
code = code.replace("{step === 'upload' && (", "{activeTab === 'run_payroll' && step === 'upload' && (");
code = code.replace("{step === 'review' && (", "{activeTab === 'run_payroll' && step === 'review' && (");
code = code.replace("{step === 'distribute' && (", "{activeTab === 'run_payroll' && step === 'distribute' && (");

fs.writeFileSync('frontend/src/pages/EmployerDashboard.tsx', code);
