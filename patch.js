const fs = require('fs');

const path = 'frontend/src/pages/EmployerDashboard.tsx';
let code = fs.readFileSync(path, 'utf8');

const searchStr = `          <Stepper current={step} />

          <div className="neu-card glass-card" style={{ padding: 'var(--space-8)' }}>
            <AnimatePresence mode="wait">`;

const replacement = `          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 12, 
            marginBottom: 'var(--space-10)', 
            paddingBottom: 24,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}>
            <button 
              className={\`btn \${activeTab === 'run_payroll' ? 'btn-primary' : 'btn-glass'}\`}
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
              className={\`btn \${activeTab === 'history' ? 'btn-primary' : 'btn-glass'}\`}
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
              )}`;

// Normalize newlines to match file content (CRLF or LF)
const searchStrCRLF = searchStr.replace(/\\n/g, '\\r\\n');

if (code.includes(searchStr)) {
  code = code.replace(searchStr, replacement);
  fs.writeFileSync(path, code);
  console.log("Success (LF)");
} else if (code.includes(searchStrCRLF)) {
  code = code.replace(searchStrCRLF, replacement);
  fs.writeFileSync(path, code);
  console.log("Success (CRLF)");
} else {
  // Try regex ignoring whitespaces if exact match fails
  const regex = /<Stepper current=\{step\} \/>\s*<div className="neu-card glass-card" style=\{\{ padding: 'var\(--space-8\)' \}\}>\s*<AnimatePresence mode="wait">/;
  if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(path, code);
    console.log("Success (Regex)");
  } else {
    console.log("Error: Could not find target string.");
  }
}
