import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const generatePDF = (data, reportType) => {
  if (!data || data.length === 0) {
    return;
  }

  const doc = new jsPDF();
  const date = new Date().toLocaleString();

  doc.setFontSize(22);
  doc.setTextColor(34, 197, 94);
  doc.text("EagleBox Cricket", 14, 22);
  
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text(`${reportType.toUpperCase()} REPORT`, 14, 32);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${date}`, 14, 40);

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Summary Statistics:", 14, 50);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Total Records: ${data.length}`, 14, 56);
  
  let startY = 66;
  if (reportType === 'revenue' || reportType === 'bookings') {
    const totalRev = data.reduce((sum, item) => sum + (Number(item.amountPaid) || 0), 0);
    doc.text(`Total Revenue: INR ${totalRev.toLocaleString()}`, 14, 62);
    startY = 72;
  } else if (reportType === 'memberships') {
    const totalMem = data.length;
    doc.text(`Total Members: ${totalMem}`, 14, 62);
    startY = 72;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map(item => Object.values(item).map(val => (val !== null && val !== undefined) ? String(val) : ''));

  doc.autoTable({
    startY: startY,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 10 }
  });

  const finalY = doc.lastAutoTable.finalY || startY + 20;
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text("_________________________", 14, finalY + 20);
  doc.text("Admin Signature", 14, finalY + 28);
  doc.text("EagleBox Cricket Operations", 14, finalY + 34);

  doc.save(`${reportType}_report.pdf`);
};

export const generateExcel = (data, reportType) => {
  if (!data || data.length === 0) {
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, reportType);
  XLSX.writeFile(workbook, `${reportType}_report.xlsx`);
};

export const generateCSV = (data, reportType) => {
  if (!data || data.length === 0) {
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${reportType}_report.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
