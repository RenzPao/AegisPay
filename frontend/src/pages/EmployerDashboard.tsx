import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar, Footer } from '../components/Layout';
import { UploadCloud, FileText, CheckCircle, RefreshCcw, Database, Server, Download } from 'lucide-react';
import { config } from '../lib/config';
import { generateRegistry, PayrollRegistry } from '../lib/registry';
import { deployRootToContract, fundEscrowContract } from '../lib/stellar';

interface WorkerData {
  workerId: string;
  wageAmount: number;
}

export default function EmployerDashboard() {
  const [contractId] = useState(config.contractId || 'CACJ4XYZ...');
  const [merkleRoot, setMerkleRoot] = useState('0x...');
  const [balance, setBalance] = useState('0.00');
  
  const [csvData, setCsvData] = useState<WorkerData[]>([]);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [registry, setRegistry] = useState<PayrollRegistry | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      const parsed: WorkerData[] = [];
      let total = 0;
      // Skip header if exists, assuming workerId,wageAmount
      for (let i = 1; i < lines.length; i++) {
        const [id, wage] = lines[i].split(',');
        if (id && wage) {
          parsed.push({ workerId: id.trim(), wageAmount: parseFloat(wage) });
          total += parseFloat(wage);
        }
      }
      setCsvData(parsed);
      setTotalPayroll(total);
    };
    reader.readAsText(file);
  };

  const handleGenerateTree = async () => {
    setIsGenerating(true);
    try {
      const reg = await generateRegistry(csvData, 'AegisPayEmployer123');
      setMerkleRoot(reg.merkleRoot);
      setRegistry(reg);
    } catch (e) {
      console.error(e);
      alert('Error generating registry');
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

  const handleDeployRoot = async () => {
    try {
      await deployRootToContract(contractId, merkleRoot);
      alert('Deploy Root Transaction Submitted Successfully!');
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const handleFundEscrow = async () => {
    try {
      await fundEscrowContract(contractId, totalPayroll);
      alert('Fund Escrow Transaction Submitted Successfully!');
      setBalance(totalPayroll.toFixed(2));
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  return (
    <>
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
                  <span style={{ fontWeight: 'bold' }}>${balance} USDC</span>
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
                  <span style={{ fontWeight: 'bold' }}>${totalPayroll.toFixed(2)} USDC</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexDirection: 'column' }}>
                <button className="btn btn-glass" disabled={merkleRoot === '0x...'} onClick={handleDeployRoot}>
                  Deploy Root
                </button>
                <button className="btn btn-primary" disabled={totalPayroll === 0} onClick={handleFundEscrow}>
                  Fund Escrow (${totalPayroll.toFixed(2)})
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
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>Format: workerId, wageAmount</p>
            </div>

            {csvData.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <span style={{ fontWeight: 'bold' }}>Parsed {csvData.length} workers (Total: ${totalPayroll.toFixed(2)})</span>
                  <button className="btn btn-primary" onClick={handleGenerateTree} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : 'Generate Merkle Tree'}
                  </button>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead style={{ background: 'var(--color-bg-raised)', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Worker ID</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid var(--color-border)' }}>Wage Amount (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{row.workerId}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>${row.wageAmount.toFixed(2)}</td>
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
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem' }}><CheckCircle size={20} /> Proof Server Registry</h3>
              <button className="btn btn-glass" onClick={handleExportJSON} disabled={!registry} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.9rem' }}>
                <Download size={16} /> Export JSON
              </button>
            </div>
            
            <div className="proof-terminal" style={{ marginBottom: 'var(--space-4)' }}>
               <div className="proof-terminal-header">
                  <span className="terminal-dot red" /><span className="terminal-dot yellow" /><span className="terminal-dot green" />
                  <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>Start Proof Server</span>
               </div>
               <div className="proof-terminal-body">
                  <div><span className="comment">// Run this command in the tools/proofServer directory to serve proofs</span></div>
                  <div><span className="label">$ </span><span className="value">node src/index.js --registry=registry.json</span></div>
               </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Worker ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {csvData.length === 0 ? (
                  <tr><td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: 'var(--color-muted)' }}>No registry generated yet.</td></tr>
                ) : (
                  csvData.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{row.workerId}</td>
                      <td style={{ padding: '10px 12px' }}><span className="badge badge-accent" style={{ background: 'transparent', border: '1px solid var(--color-accent)' }}>Unclaimed</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {csvData.length > 5 && <div style={{ textAlign: 'center', padding: '12px', fontSize: '0.85rem', color: 'var(--color-muted)' }}>+ {csvData.length - 5} more workers</div>}
          </motion.div>

        </div>
      </main>
      <Footer />
    </>
  );
}
