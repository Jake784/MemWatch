import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { computeStats, getAllPackages, getPackageDiffs, generateDiagnosticInsights } from './compareUtils.js';

const NAVY  = [30, 58, 95];
const WHITE = [255, 255, 255];
const ROW1  = [245, 247, 250];
const ROW2  = [255, 255, 255];

async function captureChart(ref) {
  if (!ref?.current) return null;
  try {
    const canvas = await html2canvas(ref.current, {
      backgroundColor: '#111827',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function addChartImage(doc, imgData, y) {
  if (!imgData) return y;
  const imgWidth = 182;
  const props = doc.getImageProperties(imgData);
  const imgHeight = (props.height / props.width) * imgWidth;
  doc.addImage(imgData, 'PNG', 14, y, imgWidth, imgHeight);
  return y + imgHeight + 6;
}

function drawCoverPage(doc, { title, subtitle, modeName, dateStr, fileNames, extraInfo = [] }) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 55, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subtitle, 14, 36);

  doc.setFontSize(8);
  doc.text(modeName, 14, 47);

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);

  let y = 70;

  doc.setFont('helvetica', 'bold');
  doc.text('Fecha de exportación:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 80, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Archivo(s) analizado(s):', 14, y);
  doc.setFont('helvetica', 'normal');
  fileNames.forEach((name, i) => {
    const wrapped = doc.splitTextToSize(name, 116);
    doc.text(wrapped, 80, y + i * 8);
  });
  y += fileNames.length * 8 + 4;

  extraInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(String(value), 116);
    doc.text(wrapped, 80, y);
    y += wrapped.length * 5 + 5;
  });

  doc.setDrawColor(200, 210, 225);
  doc.line(14, y + 4, 196, y + 4);
}

function sectionTitle(doc, y, text) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(text, 14, y);
  doc.setDrawColor(...NAVY);
  doc.line(14, y + 2, 196, y + 2);
  return y + 12;
}

function tableStyles() {
  return {
    headStyles:         { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: ROW1 },
    bodyStyles:         { fillColor: ROW2, fontSize: 8, textColor: [40, 40, 40] },
    margin:             { left: 14, right: 14 },
    styles:             { cellPadding: 3 },
    theme:              'grid',
  };
}

function getLastY(doc) {
  return (doc.lastAutoTable?.finalY ?? 0) + 8;
}

export async function exportReport(mode, data) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  if (mode === 'single') {
    const { entries, fileName, refs = {} } = data;
    const { memChartRef, swapChartRef, cpuChartRef } = refs;

    // Capture all charts before generating PDF
    const [memImg, swapImg, cpuImg] = await Promise.all([
      captureChart(memChartRef),
      captureChart(swapChartRef),
      captureChart(cpuChartRef),
    ]);

    const latest = entries[entries.length - 1];
    const stats  = computeStats(entries);

    const memVals  = entries.map(e => e.memAvailableMB);
    const swapVals = entries.map(e => e.swapUsedMB);
    const cpuVals  = entries.map(e => e.cpuLoad1);

    const memMin  = Math.min(...memVals);
    const memMax  = Math.max(...memVals);
    const memAvg  = stats.avgMem;

    const swapMin = Math.min(...swapVals);
    const swapMax = Math.max(...swapVals);
    const swapAvg = stats.avgSwap;

    const cpuMin = Math.min(...cpuVals).toFixed(2);
    const cpuMax = Math.max(...cpuVals).toFixed(2);
    const cpuAvg = (cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length).toFixed(2);

    const timeRange  = `${entries[0].timestamp}  →  ${latest.timestamp}`;
    const alerts     = entries.filter(e => e.memAvailableMB < 200 || e.swapUsedMB > 400);

    // ── Page 1 — Cover ────────────────────────────────────────────────────────
    drawCoverPage(doc, {
      title:     'MemWatch — Reporte de Monitoreo Android',
      subtitle:  'Rockchip RK356x / Quintex · com.signagesuite',
      modeName:  'Modo: Análisis individual',
      dateStr,
      fileNames: [fileName],
      extraInfo: [
        ['Rango temporal:', timeRange],
        ['Total entradas:', String(entries.length)],
      ],
    });

    // ── Page 2 — Executive Summary ────────────────────────────────────────────
    doc.addPage();
    let y = 20;
    y = sectionTitle(doc, y, '1. Resumen Ejecutivo');

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', 'Valor actual', 'Mínimo', 'Promedio']],
      body: [
        ['MemAvailable',   `${latest.memAvailableMB} MB`, `${memMin} MB`,  `${memAvg} MB`],
        ['SwapUsed',       `${latest.swapUsedMB} MB`,    `${swapMin} MB`, `${swapAvg} MB`],
        ['CPU Load 1m',    String(latest.cpuLoad1),       cpuMin,           cpuAvg],
        ['Alertas totales', String(alerts.length),        '—',              '—'],
        ['Total entradas',  String(entries.length),       '—',              '—'],
        ['Rango temporal',  timeRange,                    '—',              '—'],
      ],
    });

    // ── Page 3 — Memory Chart ─────────────────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '2. Memoria Disponible en el Tiempo');
    y = addChartImage(doc, memImg, y);

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Mínimo',   `${memMin} MB`],
        ['Promedio', `${memAvg} MB`],
        ['Máximo',   `${memMax} MB`],
      ],
    });
    y = getLastY(doc);

    if (alerts.length > 0) {
      y = sectionTitle(doc, y, 'Alertas de Memoria');
      autoTable(doc, {
        ...tableStyles(),
        startY: y,
        head: [['Timestamp', 'MemAvailable (MB)', 'SwapUsed (MB)']],
        body: alerts.map(e => [e.timestamp, String(e.memAvailableMB), String(e.swapUsedMB)]),
      });
    }

    // ── Page 4 — Swap Chart ───────────────────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '3. Uso de Swap en el Tiempo');
    y = addChartImage(doc, swapImg, y);

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Mínimo',   `${swapMin} MB`],
        ['Promedio', `${swapAvg} MB`],
        ['Máximo',   `${swapMax} MB`],
      ],
    });

    // ── Page 5 — CPU Chart ────────────────────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '4. Carga de CPU en el Tiempo');
    y = addChartImage(doc, cpuImg, y);

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Mínimo',   cpuMin],
        ['Promedio', cpuAvg],
        ['Máximo',   cpuMax],
      ],
    });

    // ── Page 6 — Package Status ───────────────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '5. Estado de Paquetes (última entrada)');

    const pkgs = Object.entries(latest.packages).map(([name, val]) => [
      name, String(val), val === 0 ? '✓ Deshabilitado' : '⚠ Habilitado',
    ]);

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Paquete', 'enabled', 'Estado']],
      body: pkgs,
      bodyStyles: { fontSize: 7 },
      columnStyles: { 2: { fontStyle: 'bold' } },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 2) {
          const isAlert = data.cell.text[0].startsWith('⚠');
          data.cell.styles.textColor = isAlert ? [220, 38, 38] : [16, 185, 129];
        }
      },
    });

    // ── Page 7 — Top Processes ────────────────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '6. Top Procesos por RAM (última entrada)');

    const totalRAM = latest.topProcesses.reduce((s, p) => s + p.ramMB, 0);
    const procs    = latest.topProcesses.map((p, i) => [
      String(i + 1),
      p.name,
      `${p.ramMB} MB`,
      totalRAM > 0 ? `${((p.ramMB / totalRAM) * 100).toFixed(1)}%` : '—',
    ]);

    if (procs.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Sin datos de procesos.', 14, y + 6);
    } else {
      autoTable(doc, {
        ...tableStyles(),
        startY: y,
        head: [['#', 'Proceso', 'RAM', '% del total']],
        body: procs,
        columnStyles: { 0: { halign: 'center', cellWidth: 12 } },
      });
    }

  } else {
    // ── Compare mode ──────────────────────────────────────────────────────────
    const { deviceA, deviceB, refs = {} } = data;
    const { memChartRef, swapChartRef } = refs;
    const labelA = deviceA.label;
    const labelB = deviceB.label;

    // Capture charts first
    const [memImg, swapImg] = await Promise.all([
      captureChart(memChartRef),
      captureChart(swapChartRef),
    ]);

    const sA       = computeStats(deviceA.entries);
    const sB       = computeStats(deviceB.entries);
    const pkgDiffs = getPackageDiffs(deviceA.entries, deviceB.entries);
    const diagnosis = generateDiagnosticInsights(sA, sB, labelA, labelB, pkgDiffs);

    const swapMaxA = Math.max(...deviceA.entries.map(e => e.swapUsedMB));
    const swapMaxB = Math.max(...deviceB.entries.map(e => e.swapUsedMB));

    // ── Page 1 — Cover ────────────────────────────────────────────────────────
    drawCoverPage(doc, {
      title:     'MemWatch — Reporte de Monitoreo Android',
      subtitle:  'Rockchip RK356x / Quintex · com.signagesuite',
      modeName:  'Modo: Análisis comparativo',
      dateStr,
      fileNames: [
        `${labelA}: ${deviceA.fileName}`,
        `${labelB}: ${deviceB.fileName}`,
      ],
    });

    // ── Page 2 — Comparison Summary ───────────────────────────────────────────
    doc.addPage();
    let y = 20;
    y = sectionTitle(doc, y, '1. Resumen Comparativo');

    const memDiff  = sA.avgMem  - sB.avgMem;
    const minDiff  = sA.minMem  - sB.minMem;
    const swapDiff = sA.avgSwap - sB.avgSwap;
    const alertDiff = sA.alertCount - sB.alertCount;

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', labelA, labelB, 'Diferencia (A − B)', 'Mejor']],
      body: [
        ['MemAvailable promedio', `${sA.avgMem} MB`,  `${sB.avgMem} MB`,  fmt(memDiff,  'MB'), memDiff  > 0 ? labelA : labelB],
        ['MemAvailable mínimo',   `${sA.minMem} MB`,  `${sB.minMem} MB`,  fmt(minDiff,  'MB'), minDiff  > 0 ? labelA : labelB],
        ['SwapUsed promedio',     `${sA.avgSwap} MB`, `${sB.avgSwap} MB`, fmt(swapDiff, 'MB'), swapDiff < 0 ? labelA : labelB],
        ['Alertas (mem/swap)',    String(sA.alertCount), String(sB.alertCount), fmt(alertDiff), alertDiff < 0 ? labelA : labelB],
        ['Total entradas',        String(deviceA.entries.length), String(deviceB.entries.length), '—', '—'],
      ],
    });

    // ── Page 3 — Memory Comparison Chart ─────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '2. Memoria Disponible — Comparación');
    y = addChartImage(doc, memImg, y);

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', labelA, labelB, 'Diferencia']],
      body: [
        ['Promedio', `${sA.avgMem} MB`, `${sB.avgMem} MB`, fmt(memDiff, 'MB')],
        ['Mínimo',   `${sA.minMem} MB`, `${sB.minMem} MB`, fmt(minDiff, 'MB')],
      ],
    });

    // ── Page 4 — Swap Comparison Chart ───────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '3. Swap Utilizado — Comparación');
    y = addChartImage(doc, swapImg, y);

    autoTable(doc, {
      ...tableStyles(),
      startY: y,
      head: [['Métrica', labelA, labelB, 'Diferencia']],
      body: [
        ['Promedio', `${sA.avgSwap} MB`, `${sB.avgSwap} MB`, fmt(swapDiff,              'MB')],
        ['Máximo',   `${swapMaxA} MB`,   `${swapMaxB} MB`,   fmt(swapMaxA - swapMaxB,   'MB')],
      ],
    });

    // ── Page 5 — Package Comparison ──────────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '4. Comparación de Paquetes');

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
      bodyStyles: { fontSize: 7 },
      didParseCell(data) {
        if (data.section === 'body') {
          if (data.column.index === 3) {
            data.cell.styles.textColor = data.cell.text[0] === '✓' ? [16, 185, 129] : [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 1 && data.row.raw[1].startsWith('ACTIVO'))
            data.cell.styles.textColor = [220, 38, 38];
          if (data.column.index === 2 && data.row.raw[2].startsWith('ACTIVO'))
            data.cell.styles.textColor = [220, 38, 38];
        }
      },
    });

    // ── Page 6 — Diagnostic Conclusion ───────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionTitle(doc, y, '5. Diagnóstico Comparativo');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);

    diagnosis.forEach(line => {
      const wrapped = doc.splitTextToSize(`• ${line}`, 178);
      if (y + wrapped.length * 5.5 > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(wrapped, 18, y);
      y += wrapped.length * 5.5 + 4;
    });
  }

  const datePart = now.toISOString().slice(0, 10);
  doc.save(`memwatch-${mode}-${datePart}.pdf`);
}

function fmt(n, unit = '') {
  const sign = n > 0 ? '+' : '';
  return unit ? `${sign}${n} ${unit}` : `${sign}${n}`;
}
