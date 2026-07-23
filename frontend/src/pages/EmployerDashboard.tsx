import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar, Footer } from '../components/Layout';
import { UploadCloud, FileText, CheckCircle, RefreshCcw, Database, Server, Download } from 'lucide-react';
import { config } from '../lib/config';
import { generateRegistry } from '../lib/registry';
import type { PayrollRegistry } from '../lib/registry';
import { deployRootToContract, fundEscrowContract, initializeContract } from '../lib/stellar';
import { ErrorModal, useErrorModal } from '../components/ErrorModal';

interface WorkerData {
  workerId: string;
  wageAmountUsd: number;
  wageAmountXlm: number;
}

export default function EmployerDashboard() {
  const [contractId] = useState(config.contractId || 'CACJ4XYZ...');
  const [merkleRoot, setMerkleRoot] = useState('0x...');
  const [balance, setBalance] = useState('0.00');
  
  const [csvData, setCsvData] = useState<WorkerData[]>([]);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [registry, setRegistry] = useState<PayrollRegistry | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const { modalError, showError, clearError } = useErrorModal();

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
    if (!xlmPrice) {
      showError('xlm price feed not yet available, please try again in a moment.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const parsed: WorkerData[] = [];
      let totalXlm = 0;
      // Skip header if exists, assuming workerId,wageAmountUsd
      for (let i = 1; i < lines.length; i++) {
        const [id, wageUsdStr] = lines[i].split(',');
        if (id && wageUsdStr) {
          const wageUsd = parseFloat(wageUsdStr);
          const wageXlm = wageUsd / xlmPrice;
          parsed.push({ workerId: id.trim(), wageAmountUsd: wageUsd, wageAmountXlm: wageXlm });
          totalXlm += wageXlm;
        }
      }
      setCsvData(parsed);
      setTotalPayroll(totalXlm);
    };
    reader.readAsText(file);
  };

  const handleGenerateTree = async () => {
    setIsGenerating(true);
    try {
      // Pass the XLM amounts to generateRegistry
      const registryData = csvData.map(d => ({ workerId: d.workerId, wageAmount: d.wageAmountXlm }));
      const reg = await generateRegistry(registryData, 'AegisPayEmployer123');
      setMerkleRoot(reg.merkleRoot);
      setRegistry(reg);
    } catch (e) {
      console.error(e);
      showError('Error generating registry from the uploaded CSV.');
    }
    setIsGenerating(false);
  };

  const handleExportJSON = () => {
    if (!registry) return;
    const blob = new Blob([JSON.stringify(registry, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registry.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadClaimFile = (workerId: string) => {
    if (!registry) return;
    const worker = registry.workers.find(w => w.workerId === workerId);
    if (!worker) return;
    const proof = registry.proofs[workerId];
    
    const claimData = {
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
      nullifier: proof.nullifier
    };
    
    const blob = new Blob([JSON.stringify(claimData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `claim_${workerId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeployRoot = async () => {
    try {
      await deployRootToContract(contractId, merkleRoot);
      setSuccessMsg('Merkle Root published on-chain successfully!');
    } catch (e: any) {
      showError(e?.message || 'Failed to deploy Merkle Root to contract');
    }
  };

  const handleFundEscrow = async () => {
    try {
      await fundEscrowContract(contractId, totalPayroll);
      setBalance(totalPayroll.toFixed(2));
      setSuccessMsg(`Escrow funded with ${totalPayroll.toFixed(2)} XLM successfully!`);
    } catch (e: any) {
      showError(e?.message || 'Failed to fund escrow contract');
    }
  };

  const handleInitialize = async () => {
    try {
      const employerIdHex = '0000000000000000000000000000000000000000000000000000000000000123';
      const rootHex = merkleRoot === '0x...' ? '0000000000000000000000000000000000000000000000000000000000000000' : merkleRoot;
      await initializeContract(contractId, employerIdHex, rootHex);
      setSuccessMsg('Contract initialized successfully!');
    } catch (e: any) {
      showError(e?.message || 'Contract initialization failed');
    }
  };

  return (
    <>
      <ErrorModal error={modalError} onClose={clearError} />
      {successMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', top: 24, right: 24, zIndex: 9000,
            background: 'var(--color-bg-card)',
            border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: 12,
            color: 'var(--color-foreground)', fontSize: '0.9rem', fontWeight: 500,
            maxWidth: 360,
          }}
        >
          <CheckCircle size={20} color="var(--color-accent)" />
          {successMsg}
          <button
            onClick={() => setSuccessMsg('')}
            aria-label="Dismiss"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}
          >✕</button>
        </div>
      )}
      <Navbar activeSection="none" onNav={() => {}} />
      <main style={{ paddingTop: '100px', minHeight: '80vh' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
            <span className="badge badge-accent" style={{ marginBottom: 16 }}>Employer Portal</span>
            <h2>Payroll Management</h2>
            <p style={{ marginTop: 12, maxWidth: 600, marginInline: 'auto' }}>
              Upload your payroll registry, generate the Merkle Tree, and fund the smart contract on Stellar.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            
            {/* Panel 1: Contract Status */}
            <motion.div className="neu-card glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem' }}><Database size={20} /> Contract Status</h3>
                <button className="btn" style={{ padding: '4px 8px', minHeight: 'auto', background: 'transparent' }} aria-label="Refresh">
                  <RefreshCcw size={16} />
                </button>
              </div>
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-bg-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Contract ID</span>
                  <span className="mono" style={{ fontSize: '0.85rem' }}>{contractId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Current Root</span>
                  <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--color-accent)' }}>{merkleRoot}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>Escrow Balance</span>
                  <span style={{ fontWeight: 'bold' }}>{balance} XLM</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                <div className="pulse-dot green" /> Stellar Testnet Active
              </div>
            </motion.div>

            {/* Panel 3: Deploy to Contract */}
            <motion.div className="neu-card glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginBottom: 'var(--space-4)' }}><Server size={20} /> Deploy & Fund</h3>
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted)' }}>New Merkle Root:</span>
                  <span className="mono" style={{ fontSize: '0.85rem' }}>{merkleRoot}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Required Deposit:</span>
                  <span style={{ fontWeight: 'bold' }}>{totalPayroll.toFixed(2)} XLM</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexDirection: 'column' }}>
                <button className="btn btn-glass" onClick={handleInitialize} style={{ borderColor: 'var(--color-accent)' }}>
                  Initialize Escrow
                </button>
                <button className="btn btn-glass" disabled={merkleRoot === '0x...'} onClick={handleDeployRoot}>
                  Deploy Root
                </button>
                <button className="btn btn-primary" disabled={totalPayroll === 0} onClick={handleFundEscrow}>
                  Fund Escrow ({totalPayroll.toFixed(2)} XLM)
                </button>
              </div>
            </motion.div>
          </div>

          {/* Panel 2: Upload Payroll CSV */}
          <motion.div className="neu-card glass-card" style={{ marginBottom: 'var(--space-6)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginBottom: 'var(--space-4)' }}><FileText size={20} /> Upload Payroll CSV</h3>
            
            <div style={{ 
              border: '2px dashed var(--color-border)', 
              borderRadius: 'var(--radius-lg)', 
              padding: 'var(--space-8)', 
              textAlign: 'center',
              marginBottom: 'var(--space-6)',
              background: 'var(--color-bg-raised)',
              position: 'relative'
            }}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                aria-label="Upload CSV"
              />
              <UploadCloud size={48} color="var(--color-muted)" style={{ margin: '0 auto var(--space-4)' }} />
              <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Drag and drop your CSV file here</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Format: workerId, wageAmount (in USD)</p>
              {xlmPrice && <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginTop: 8 }}>Live Rate: 1 XLM = ${xlmPrice.toFixed(4)}</p>}
            </div>

            {csvData.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <span style={{ fontWeight: 'bold' }}>Parsed {csvData.length} workers (Total: {totalPayroll.toFixed(2)} XLM)</span>
                  <button className="btn btn-primary" onClick={handleGenerateTree} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate Merkle Tree'}
                  </button>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: 'var(--color-bg-raised)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Worker ID</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Wage (USD)</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Converted (XLM)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{row.workerId}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>${row.wageAmountUsd.toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-accent)' }}>{row.wageAmountXlm.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>

          {/* Panel 4: Registry Status */}
          <motion.div className="neu-card glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem' }}><CheckCircle size={20} /> Claim Files</h3>
              <button className="btn btn-glass" onClick={handleExportJSON} disabled={!registry} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.9rem' }}>
                <Download size={16} /> Export Master Registry
              </button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
              Download the individual claim files and send them to your employees. They will use this file on the Employee Dashboard to generate their Zero-Knowledge proof and claim their wages.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Worker ID</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {csvData.length === 0 ? (
                  <tr><td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: 'var(--color-muted)' }}>No registry generated yet.</td></tr>
                ) : (
                  csvData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{row.workerId}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => handleDownloadClaimFile(row.workerId)} 
                          disabled={!registry}
                          style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Download size={14} /> Claim File
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </motion.div>

        </div>
      </main>
      <Footer />
    </>
  );
}
