import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { computeStats, getAllPackages, getPackageDiffs, generateDiagnosticInsights } from './compareUtils.js';

const NAVY  = [30, 58, 95];
const WHITE = [255, 255, 255];
const ROW1  = [245, 247, 250];
const ROW2  = [255, 255, 255];

function drawCoverPage(doc, { title, subtitle, dateStr, fileNames, modeName }) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Navy header band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 110, 'F');

  // Title
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(title, 40, 48);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(subtitle, 40, 68);

  // Mode badge
  doc.setFontSize(9);
  doc.text(modeName, 40, 86);

  // Metadata below header
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de exportación:', 40, 135);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 175, 135);

  doc.setFont('helvetica', 'bold');
  doc.text('Archivo(s) analizado(s):', 40, 155);
  doc.setFont('helvetica', 'normal');
  fileNames.forEach((name, i) => doc.text(name, 175, 155 + i * 16));

  // Divider
  doc.setDrawColor(200, 210, 225);
  doc.line(40, 180 + (fileNames.length - 1) * 16, W - 40, 180 + (fileNames.length - 1) * 16);
}

function sectionTitle(doc, y, text) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text(text, 40, y);
  doc.setDrawColor(...NAVY);
  doc.line(40, y + 4, doc.internal.pageSize.getWidth() - 40, y + 4);
  return y + 18;
}

function tableStyles() {
  return {
    headStyles:          { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles:  { fillColor: ROW1 },
    bodyStyles:          { fillColor: ROW2, fontSize: 9, textColor: [40, 40, 40] },
    margin:              { left: 40, right: 40 },
    styles:              { cellPadding: 4 },
    theme:               'grid',
  };
}

function getLastY(doc) {
  return (doc.lastAutoTable?.finalY ?? 0) + 16;
}

export async function exportReport(mode, data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (mode === 'single') {
    const { entries, fileName } = data;

    drawCoverPage(doc, {
      title:     'MemWatch — Reporte de Monitoreo Android',
      subtitle:  'Rockchip RK356x / Quintex · com.signagesuite',
      dateStr,
      fileNames: [fileName],
      modeName:  'Modo: Análisis individual',
    });

    doc.addPage();
    const latest = entries[entries.length - 1];
    const stats  = computeStats(entries);
    const cpuVals = entries.map(e => e.cpuLoad1);
    const cpuAvg  = (cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length).toFixed(2);
    const timeRange = `${entries[0].timestamp}  →  ${latest.timestamp}`;

    let y = 50;
    y = sectionTitle(doc, y, '1. Resumen Ejecutivo');

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', 'Valor actual', 'Mínimo', 'Promedio']],
      body: [
        ['MemAvailable', `${latest.memAvailableMB} MB`, `${stats.minMem} MB`, `${stats.avgMem} MB`],
        ['SwapUsed',     `${latest.swapUsedMB} MB`,    '—',                  `${stats.avgSwap} MB`],
        ['CPU Load 1m',  `${latest.cpuLoad1}`,         '—',                  cpuAvg],
        ['Total entradas', String(entries.length), '—', '—'],
        ['Rango temporal', timeRange, '—', '—'],
      ],
    });

    y = getLastY(doc);
    y = sectionTitle(doc, y, '2. Alertas de Memoria');

    const alerts = entries.filter(e => e.memAvailableMB < 200 || e.swapUsedMB > 400);
    if (alerts.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Sin alertas detectadas durante el período.', 40, y + 8);
      y += 24;
    } else {
      autoTable(doc, {
        ...tableStyles(),
        startY: y,
        head: [['Timestamp', 'MemAvailable (MB)', 'SwapUsed (MB)']],
        body: alerts.map(e => [e.timestamp, String(e.memAvailableMB), String(e.swapUsedMB)]),
      });
      y = getLastY(doc);
    }

    y = sectionTitle(doc, y, '3. Estado de Paquetes (última entrada)');

    const pkgs = Object.entries(latest.packages).map(([name, val]) => [
      name, String(val), val === 0 ? 'OK' : 'ALERTA',
    ]);

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Paquete', 'enabled', 'Estado']],
      body: pkgs,
      bodyStyles: { fontSize: 8 },
      columnStyles: { 2: { fontStyle: 'bold' } },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 2) {
          data.cell.styles.textColor = data.cell.text[0] === 'ALERTA' ? [220, 38, 38] : [16, 185, 129];
        }
      },
    });

    y = getLastY(doc);
    y = sectionTitle(doc, y, '4. Top Procesos por RAM (última entrada)');

    const procs = latest.topProcesses.map((p, i) => [String(i + 1), p.name, `${p.ramMB} MB`]);

    if (procs.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Sin datos de procesos.', 40, y + 8);
    } else {
      autoTable(doc, {
        ...tableStyles(),
        startY: y,
        head: [['#', 'Proceso', 'RAM']],
        body: procs,
        columnStyles: { 0: { halign: 'center', cellWidth: 30 } },
      });
    }

  } else {
    // Compare mode
    const { deviceA, deviceB } = data;
    const labelA = deviceA.label;
    const labelB = deviceB.label;

    drawCoverPage(doc, {
      title:     'MemWatch — Reporte de Monitoreo Android',
      subtitle:  'Rockchip RK356x / Quintex · com.signagesuite',
      dateStr,
      fileNames: [`${labelA}: ${deviceA.fileName}`, `${labelB}: ${deviceB.fileName}`],
      modeName:  'Modo: Análisis comparativo',
    });

    doc.addPage();

    const sA = computeStats(deviceA.entries);
    const sB = computeStats(deviceB.entries);

    let y = 50;
    y = sectionTitle(doc, y, '1. Resumen Comparativo');

    const memDiff  = sA.avgMem  - sB.avgMem;
    const swapDiff = sA.avgSwap - sB.avgSwap;

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', labelA, labelB, 'Diferencia (A − B)']],
      body: [
        ['MemAvailable promedio', `${sA.avgMem} MB`,  `${sB.avgMem} MB`,  `${memDiff > 0 ? '+' : ''}${memDiff} MB`],
        ['MemAvailable mínimo',   `${sA.minMem} MB`,  `${sB.minMem} MB`,  `${sA.minMem - sB.minMem > 0 ? '+' : ''}${sA.minMem - sB.minMem} MB`],
        ['SwapUsed promedio',     `${sA.avgSwap} MB`, `${sB.avgSwap} MB`, `${swapDiff > 0 ? '+' : ''}${swapDiff} MB`],
        ['Alertas (mem/swap)',    String(sA.alertCount), String(sB.alertCount), String(sA.alertCount - sB.alertCount)],
        ['Total entradas',       String(deviceA.entries.length), String(deviceB.entries.length), '—'],
      ],
    });

    y = getLastY(doc);
    y = sectionTitle(doc, y, '2. Comparación de Paquetes');

    const allPkgs = getAllPackages(deviceA.entries, deviceB.entries);
    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Paquete', labelA, labelB, 'Coincide']],
      body: allPkgs.map(p => [
        p.name,
        p.valA === 0 ? 'OK (0)' : `ACTIVO (${p.valA})`,
        p.valB === 0 ? 'OK (0)' : `ACTIVO (${p.valB})`,
        p.valA === p.valB ? '✓' : '✗',
      ]),
      bodyStyles: { fontSize: 8 },
      didParseCell(data) {
        if (data.section === 'body') {
          if (data.column.index === 3) {
            data.cell.styles.textColor = data.cell.text[0] === '✓' ? [16, 185, 129] : [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 1 && data.row.raw[1].startsWith('ACTIVO')) {
            data.cell.styles.textColor = [220, 38, 38];
          }
          if (data.column.index === 2 && data.row.raw[2].startsWith('ACTIVO')) {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
    });

    y = getLastY(doc);
    y = sectionTitle(doc, y, '3. Diagnóstico Comparativo');

    const pkgDiffs  = getPackageDiffs(deviceA.entries, deviceB.entries);
    const diagnosis = generateDiagnosticInsights(sA, sB, labelA, labelB, pkgDiffs);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    const W = doc.internal.pageSize.getWidth();
    diagnosis.forEach(line => {
      const wrapped = doc.splitTextToSize(`• ${line}`, W - 80);
      if (y + wrapped.length * 14 > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 50;
      }
      doc.text(wrapped, 48, y);
      y += wrapped.length * 14 + 6;
    });
  }

  const datePart = now.toISOString().slice(0, 10);
  doc.save(`memwatch-${mode}-${datePart}.pdf`);
}
