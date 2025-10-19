// CSV
export function exportArrayToCSV(rows, filename = 'export.csv') {
  if (!Array.isArray(rows) || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    // quote if needed; escape inner quotes
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => escape(r[h])).join(',')))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// JSON
export function exportArrayToJSON(rows, filename = 'export.json') {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// PDF with jsPDF + autoTable
// npm i jspdf jspdf-autotable
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function exportArrayToPDF(rows, title = 'Export', filename = 'export.pdf') {
  if (!Array.isArray(rows) || !rows.length) return;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const headers = Object.keys(rows[0]);
  const data = rows.map(r => headers.map(h => (r[h] == null ? '' : String(r[h]))));

  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.autoTable({
    startY: 60,
    head: [headers],
    body: data,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [33, 37, 41] }, // dark header
    margin: { left: 40, right: 40 }
  });
  doc.save(filename);
}
