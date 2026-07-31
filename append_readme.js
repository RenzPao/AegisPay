const fs = require('fs');

const csvContent = fs.readFileSync('test_scripts/results.csv', 'utf8').trim().split('\n').slice(1);
let md = '\n## Proof of 50+ Users / Wallet Activity\n\n| Wallet Address | Transaction Hash | Stellar Expert Link |\n|---|---|---|\n';

for(const line of csvContent) {
    const parts = line.split(',');
    if (parts.length >= 4) {
        const addr = parts[0];
        const tx = parts[1];
        const link = parts[2];
        const status = parts[3];
        
        if(status.trim() === 'Success') {
            md += `| ${addr} | ${tx.slice(0, 15)}... | [View on Stellar Expert](${link}) |\n`;
        }
    }
}

fs.appendFileSync('README.md', md);
console.log('Appended to README.md successfully!');
