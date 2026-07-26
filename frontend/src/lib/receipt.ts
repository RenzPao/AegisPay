import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface ReceiptData {
  txHash: string;
  amount: string;
  asset: string;
  workerId?: string;
  employerId?: string;
  networkFee?: string;
  date: string;
}

export function downloadReceiptPDF(data: ReceiptData) {
  const doc = new jsPDF();

  // Branding
  doc.setFontSize(22);
  doc.setTextColor(34, 197, 94); // var(--color-accent) approx
  doc.text('AegisPay', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Privacy-Preserving Payroll on Stellar', 14, 28);
  
  // Title
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text('Transaction Receipt', 14, 45);

  // Data Table
  const tableData = [
    ['Transaction Hash', data.txHash],
    ['Date', data.date],
    ['Amount', `${data.amount} ${data.asset}`],
    ['Worker ID', data.workerId || 'N/A'],
    ['Employer ID', data.employerId || 'N/A'],
    ['Network Fee (Paid by Relayer)', data.networkFee || '0 XLM']
  ];

  (doc as any).autoTable({
    startY: 55,
    head: [['Field', 'Value']],
    body: tableData,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [34, 197, 94], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 80 },
      1: { cellWidth: 'auto' }
    }
  });

  doc.save(`AegisPay_Receipt_${data.txHash.substring(0,8)}.pdf`);
}

export function downloadReceiptCSV(data: ReceiptData) {
  const headers = ['Transaction Hash', 'Date', 'Amount', 'Asset', 'Worker ID', 'Employer ID', 'Network Fee'];
  const row = [
    data.txHash,
    data.date,
    data.amount,
    data.asset,
    data.workerId || 'N/A',
    data.employerId || 'N/A',
    data.networkFee || '0 XLM'
  ];

  const csvContent = headers.join(',') + '\n' + row.map(v => `"${v}"`).join(',');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AegisPay_Receipt_${data.txHash.substring(0,8)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
