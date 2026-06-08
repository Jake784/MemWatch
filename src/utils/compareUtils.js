import { SHOULD_BE_DISABLED } from './logParser';

export function computeStats(entries) {
  const memVals  = entries.map(e => e.memAvailableMB);
  const swapVals = entries.map(e => e.swapUsedMB);
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    avgMem:     Math.round(avg(memVals)),
    minMem:     Math.min(...memVals),
    maxMem:     Math.max(...memVals),
    avgSwap:    Math.round(avg(swapVals)),
    alertCount: entries.filter(e => e.memAvailableMB < 200 || e.swapUsedMB > 400).length,
    hasUnwanted: entries.some(e => e.hasUnwantedProcesses),
  };
}

function isDisabled(v) { return v === 0 || v === 3; }

export function getAllPackages(entriesA, entriesB) {
  const lastA = entriesA[entriesA.length - 1];
  const lastB = entriesB[entriesB.length - 1];
  const names = [
    ...new Set([
      ...Object.keys(lastA.packages),
      ...Object.keys(lastB.packages),
      ...SHOULD_BE_DISABLED,
    ]),
  ];
  return names.map(name => {
    const valA = lastA.packages[name] ?? null;
    const valB = lastB.packages[name] ?? null;
    const aActive   = valA != null && !isDisabled(valA);
    const bDisabled = valB == null  || isDisabled(valB);
    return { name, valA, valB, isProblematic: aActive && bDisabled };
  });
}

export function getPackageDiffs(entriesA, entriesB) {
  return getAllPackages(entriesA, entriesB).filter(p => p.isProblematic);
}

export function generateInsightChips(statsA, statsB, labelA, labelB) {
  const chips = [];

  const memBase = Math.max(statsA.avgMem, statsB.avgMem);
  const memPct  = memBase > 0 ? Math.round(Math.abs(statsA.avgMem - statsB.avgMem) / memBase * 100) : 0;
  if (memPct > 10) {
    const worse = statsA.avgMem < statsB.avgMem ? labelA : labelB;
    chips.push({ metric: 'mem', type: 'warning', text: `${worse} tiene ${memPct}% menos memoria disponible en promedio` });
  } else {
    chips.push({ metric: 'mem', type: 'info', text: `Memoria disponible similar en ambos dispositivos (±${memPct}%)` });
  }

  if (statsA.alertCount === 0 && statsB.alertCount === 0) {
    chips.push({ metric: 'alerts', type: 'success', text: 'Ambos dispositivos sin alertas críticas de memoria' });
  } else {
    const worseLabel  = statsA.alertCount >= statsB.alertCount ? labelA : labelB;
    const betterLabel = statsA.alertCount >= statsB.alertCount ? labelB : labelA;
    const wCount      = Math.max(statsA.alertCount, statsB.alertCount);
    const bCount      = Math.min(statsA.alertCount, statsB.alertCount);
    chips.push({ metric: 'alerts', type: 'warning', text: `${worseLabel} generó ${wCount} alertas vs ${bCount} en ${betterLabel}` });
  }

  if (!statsA.hasUnwanted && !statsB.hasUnwanted) {
    chips.push({ metric: 'procs', type: 'success', text: 'Ambos dispositivos sin procesos no deseados' });
  } else {
    if (statsA.hasUnwanted) chips.push({ metric: 'procs', type: 'warning', text: `${labelA}: procesos no deseados detectados` });
    if (statsB.hasUnwanted) chips.push({ metric: 'procs', type: 'warning', text: `${labelB}: procesos no deseados detectados` });
  }

  const swapBase = Math.max(statsA.avgSwap, statsB.avgSwap);
  const swapPct  = swapBase > 0 ? Math.round(Math.abs(statsA.avgSwap - statsB.avgSwap) / swapBase * 100) : 0;
  if (swapPct > 10) {
    const worse = statsA.avgSwap > statsB.avgSwap ? labelA : labelB;
    chips.push({ metric: 'swap', type: 'warning', text: `${worse} usa ${swapPct}% más swap en promedio` });
  } else {
    chips.push({ metric: 'swap', type: 'info', text: `Uso de swap similar en ambos dispositivos (±${swapPct}%)` });
  }

  return chips;
}

export function generateDiagnosticInsights(statsA, statsB, labelA, labelB, pkgDiffs) {
  const findings = [];

  const memDiff = Math.abs(statsA.avgMem - statsB.avgMem);
  const memBase = Math.max(statsA.avgMem, statsB.avgMem);
  const memPct  = memBase > 0 ? Math.round(memDiff / memBase * 100) : 0;
  if (memPct > 10) {
    findings.push(
      `La diferencia de memoria disponible promedio entre dispositivos es de ${memDiff} MB (${memPct}%), lo que sugiere que los paquetes habilitados en ${labelA} están consumiendo recursos adicionales.`
    );
  }

  if (pkgDiffs.length > 0) {
    const list = pkgDiffs.map(p => p.name).join(', ');
    findings.push(
      `Los siguientes paquetes están activos en "${labelA}" y podrían ser responsables del consumo adicional: ${list}`
    );
  }

  const swapDiff = Math.abs(statsA.avgSwap - statsB.avgSwap);
  const swapBase = Math.max(statsA.avgSwap, statsB.avgSwap);
  const swapPct  = swapBase > 0 ? Math.round(swapDiff / swapBase * 100) : 0;
  if (swapPct > 10) {
    const worse = statsA.avgSwap > statsB.avgSwap ? labelA : labelB;
    findings.push(`El uso de swap es significativamente mayor en ${worse}, indicando presión de memoria.`);
  }

  if (statsA.alertCount !== statsB.alertCount) {
    const worseLabel  = statsA.alertCount > statsB.alertCount ? labelA : labelB;
    const betterLabel = statsA.alertCount > statsB.alertCount ? labelB : labelA;
    const wCount      = Math.max(statsA.alertCount, statsB.alertCount);
    const bCount      = Math.min(statsA.alertCount, statsB.alertCount);
    findings.push(`${worseLabel} registró ${wCount} eventos críticos de memoria vs ${bCount} en ${betterLabel}.`);
  }

  findings.push('Recomendación: mantener los paquetes deshabilitados en producción para garantizar estabilidad de memoria.');

  return findings;
}
