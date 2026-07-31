const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'public/AegisPay Feedback Form (Responses).xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON array
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length === 0) {
        console.log("Sheet is empty");
        process.exit(0);
    }
    
    // Build Markdown Table
    let md = '\n## User Feedback\n\n';
    
    // Process Header
    const headers = data[0];
    md += '| ' + headers.map(h => String(h).replace(/\|/g, '\\|')).join(' | ') + ' |\n';
    md += '|' + headers.map(() => '---').join('|') + '|\n';
    
    // Process Rows
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const paddedRow = headers.map((_, index) => {
            let val = row[index] !== undefined ? String(row[index]) : '';
            // Escape pipe characters for markdown table and replace newlines with space
            return val.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
        });
        
        md += '| ' + paddedRow.join(' | ') + ' |\n';
    }
    
    fs.appendFileSync('README.md', md);
    console.log("Successfully appended feedback to README.md");
} catch(err) {
    console.error("Error processing XLSX:", err);
}
