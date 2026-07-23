const fs = require('fs');
let code = fs.readFileSync('frontend/src/lib/stellar.ts', 'utf-8');

const replacementStr = `  let nullifierBuffer: Buffer;
  if (nullifierHex.startsWith('0xMOCK')) {
    const data = new TextEncoder().encode(nullifierHex);
    // @ts-ignore
    const hash = await crypto.subtle.digest('SHA-256', data);
    nullifierBuffer = Buffer.from(hash);
  } else {
    if (/^\\d+$/.test(nullifierHex)) {
      const hex = BigInt(nullifierHex).toString(16).padStart(64, '0');
      nullifierBuffer = Buffer.from(hex, 'hex');
    } else {
      nullifierBuffer = hexToBytes32(nullifierHex);
    }
  }`;

code = code.replace(/  let nullifierBuffer: Buffer;[\s\S]*?nullifierBuffer = hexToBytes32\(nullifierHex\);\s*}/g, replacementStr);
fs.writeFileSync('frontend/src/lib/stellar.ts', code);
console.log('Updated stellar.ts');

let dashCode = fs.readFileSync('frontend/src/pages/EmployerDashboard.tsx', 'utf-8');
const newTabsStr = `<div style={{ 
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
          </div>`;

dashCode = dashCode.replace(/<div style={{ display: 'flex', gap: 10, marginBottom: 'var\(--space-8\)', borderBottom: '1px solid var\(--color-border\)', paddingBottom: 16, overflowX: 'auto' }}>[\s\S]*?<\/div>/, newTabsStr);
fs.writeFileSync('frontend/src/pages/EmployerDashboard.tsx', dashCode);
console.log('Updated EmployerDashboard.tsx');
