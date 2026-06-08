import { useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { FileDown, ArrowLeft, Loader2 } from 'lucide-react';
import InsightBadge from './InsightBadge.jsx';
import {
  computeStats, getAllPackages, getPackageDiffs,
  generateInsightChips, generateDiagnosticInsights,
} from '../utils/compareUtils.js';
import { exportReport } from '../utils/exportPdf.js';

// ─── helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '17px', margin: 0 }}>
        {title}
      </h2>
      {subtitle && <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 2 }}>{subtitle}</p>}
      <div style={{ height: 1, background: '#1f2937', marginTop: 10 }} />
    </div>
  );
}

function StatRow({ label, value, color, suffix }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1f293740' }}>
      <span style={{ color: '#9ca3af', fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: color ?? '#f9fafb', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: '14px' }}>{value}</span>
        {suffix}
      </span>
    </div>
  );
}

function DeviceCard({ label, stats, accent, memTrend }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: '#111827', border: `1px solid ${accent}40`,
      borderRadius: '14px', padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent }} />
        <span style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '14px' }}>
          {label}
        </span>
      </div>
      <StatRow
        label="Mem. disponible (prom.)"
        value={`${stats.avgMem} MB`}
        color="#3b82f6"
        suffix={memTrend && <span style={{ color: memTrend.color, fontWeight: 700, fontSize: '15px', lineHeight: 1 }}>{memTrend.arrow}</span>}
      />
      <StatRow label="Mem. disponible (mín.)"  value={`${stats.minMem} MB`} color={stats.minMem < 200 ? '#ef4444' : '#f9fafb'} />
      <StatRow label="Swap usado (prom.)"       value={`${stats.avgSwap} MB`} color={stats.avgSwap > 300 ? '#f59e0b' : '#f9fafb'} />
      <StatRow label="Eventos críticos"          value={String(stats.alertCount)} color={stats.alertCount > 0 ? '#ef4444' : '#10b981'} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
        <span style={{ color: '#9ca3af', fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px' }}>Procesos no deseados</span>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', fontWeight: 600,
          color: stats.hasUnwanted ? '#ef4444' : '#10b981',
        }}>
          {stats.hasUnwanted ? 'Detectados' : 'Ninguno'}
        </span>
      </div>
    </div>
  );
}

// ─── overlaid chart ──────────────────────────────────────────────────────────

function calcMemTrend(entries) {
  const vals = entries.map(e => e.memAvailableMB);
  const n = Math.min(3, vals.length);
  const first = vals.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const last  = vals.slice(-n).reduce((a, b) => a + b, 0) / n;
  const pct = first > 0 ? (last - first) / first : 0;
  return pct > 0.05  ? { arrow: '↑', color: '#10b981' }
       : pct < -0.05 ? { arrow: '↓', color: '#ef4444' }
       :               { arrow: '→', color: '#6b7280' };
}

function ComparisonBanner({ statsA, statsB, labelA, labelB }) {
  const memDiff  = statsB.avgMem - statsA.avgMem;
  const memPct   = statsA.avgMem > 0 ? Math.abs(Math.round(memDiff / statsA.avgMem * 100)) : 0;
  const swapDiff = statsA.avgSwap - statsB.avgSwap;
  const swapPct  = statsA.avgSwap > 0 ? Math.abs(Math.round(swapDiff / statsA.avgSwap * 100)) : 0;
  const alertDiff = statsA.alertCount - statsB.alertCount;

  const bIsBetter = statsB.avgMem > statsA.avgMem;
  const betterLabel = bIsBetter ? labelB : labelA;

  let color, bg, border;
  if (!bIsBetter) {
    color = '#ef4444'; bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.3)';
  } else if (memPct < 10) {
    color = '#f59e0b'; bg = 'rgba(245,158,11,0.08)'; border = 'rgba(245,158,11,0.3)';
  } else {
    color = '#10b981'; bg = 'rgba(16,185,129,0.08)'; border = 'rgba(16,185,129,0.3)';
  }

  const swapText  = swapDiff >= 0
    ? `Swap ${swapPct}% menor`
    : `Swap ${swapPct}% mayor`;
  const alertText = alertDiff > 0
    ? `${alertDiff} evento${alertDiff !== 1 ? 's' : ''} crítico${alertDiff !== 1 ? 's' : ''} menos`
    : alertDiff < 0
    ? `${Math.abs(alertDiff)} evento${Math.abs(alertDiff) !== 1 ? 's' : ''} crítico${Math.abs(alertDiff) !== 1 ? 's' : ''} más`
    : 'Sin diferencia en eventos críticos';

  return (
    <div style={{
      padding: '14px 20px',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: '12px',
      marginBottom: '28px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color, fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 600 }}>
        {betterLabel} tiene {memPct}% más memoria disponible · {swapText} · {alertText}
      </span>
    </div>
  );
}

function shortLabel(ts) {
  if (!ts) return '';
  const parts = ts.split(' ');
  return parts.length === 2 ? parts[1].slice(0, 5) : ts.slice(0, 5);
}

function CompareTooltip({ active, payload, label, labelA, labelB }) {
  if (!active || !payload?.length) return null;
  const ts   = payload[0]?.payload?.tsA ?? payload[0]?.payload?.tsB;
  const hhmm = shortLabel(ts);
  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '10px 14px' }}>
      <p style={{ color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', marginBottom: 4 }}>
        {hhmm ? `${hhmm} — Entrada #${label}` : `Entrada #${label}`}
      </p>
      {payload.map((p, i) => p.value != null && (
        <p key={i} style={{ color: p.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {p.value} MB
        </p>
      ))}
    </div>
  );
}

function OverlaidLineChart({ dataA, dataB, labelA, labelB, colorA, colorB, yUnit = 'MB', refLines = [], timestampsA = [], timestampsB = [] }) {
  const chartData = useMemo(() => {
    const len = Math.max(dataA.length, dataB.length);
    return Array.from({ length: len }, (_, i) => ({
      index: i,
      tsA: timestampsA[i] ?? null,
      tsB: timestampsB[i] ?? null,
      [labelA]: dataA[i] ?? null,
      [labelB]: dataB[i] ?? null,
    }));
  }, [dataA, dataB, labelA, labelB, timestampsA, timestampsB]);

  const allVals = [...dataA, ...dataB].filter(v => v != null);
  const yMin = Math.max(0, Math.min(...allVals) - 40);
  const yMax = Math.max(...allVals) + 80;

  const tickCount = Math.min(chartData.length, 10);
  const step = Math.ceil(chartData.length / tickCount);
  const ticks = chartData.filter((_, i) => i % step === 0).map(d => d.index);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis
          dataKey="index"
          ticks={ticks}
          tick={{ fill: '#6b7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
          axisLine={{ stroke: '#1f2937' }} tickLine={false}
          tickFormatter={idx => {
            const d  = chartData[idx];
            const ts = d?.tsA ?? d?.tsB;
            return ts ? (ts.split(' ')[1]?.slice(0, 5) ?? String(idx)) : String(idx);
          }}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fill: '#6b7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
          axisLine={{ stroke: '#1f2937' }} tickLine={false} width={50}
          tickFormatter={v => `${v}`}
        />
        <Tooltip content={<CompareTooltip labelA={labelA} labelB={labelB} />} />
        <Legend wrapperStyle={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', paddingTop: '8px' }} />
        {refLines.map(rl => (
          <ReferenceLine key={rl.y} y={rl.y} stroke={rl.color} strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: rl.label, position: 'insideTopRight', fill: rl.color, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
        ))}
        <Line type="monotone" dataKey={labelA} stroke={colorA} strokeWidth={2}
          dot={false} activeDot={{ r: 4, fill: colorA }}
          connectNulls={false} isAnimationActive={chartData.length < 300} />
        <Line type="monotone" dataKey={labelB} stroke={colorB} strokeWidth={2}
          dot={false} activeDot={{ r: 4, fill: colorB }}
          connectNulls={false} isAnimationActive={chartData.length < 300} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── package comparison ──────────────────────────────────────────────────────

function isDisabled(v) { return v === 0 || v === 3; }

function pkgHasActiveProcess(pkgName, procs) {
  const lower = pkgName.toLowerCase();
  return procs.some(p => {
    const pl = p.trim().toLowerCase();
    return pl.length > 0 && (pl.includes(lower) || lower.includes(pl));
  });
}

function StatusDot({ value }) {
  if (value == null) {
    return <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#374151', margin: '0 auto' }} title="No registrado" />;
  }
  const color = isDisabled(value) ? '#10b981' : '#ef4444';
  const label = value === 0 ? 'Deshabilitado (sistema)' : value === 3 ? 'Deshabilitado (usuario)' : 'Activo';
  return <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, margin: '0 auto' }} title={`${label} (enabled=${value})`} />;
}

function PackageComparison({ entriesA, entriesB, labelA, labelB }) {
  const packages  = useMemo(() => getAllPackages(entriesA, entriesB), [entriesA, entriesB]);
  const diffCount = packages.filter(p => p.isProblematic).length;
  const procsA    = entriesA[entriesA.length - 1]?.unwantedProcesses ?? [];
  const procsB    = entriesB[entriesB.length - 1]?.unwantedProcesses ?? [];

  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Banner */}
      {diffCount > 0 && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(239,68,68,0.08)',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <span style={{
            color: '#ef4444',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 600,
          }}>
            {`${diffCount} paquete${diffCount !== 1 ? 's' : ''} está${diffCount !== 1 ? 'n' : ''} activo${diffCount !== 1 ? 's' : ''} en "${labelA}" pero deshabilitado${diffCount !== 1 ? 's' : ''} en "${labelB}" — revisar si el script de optimización se aplicó correctamente`}
          </span>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937' }}>
              <th style={{ padding: '10px 20px', textAlign: 'left', color: '#9ca3af', fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Paquete
              </th>
              {[labelA, labelB].map((lbl, i) => (
                <th key={i} style={{ padding: '10px 16px', textAlign: 'center', color: i === 0 ? '#3b82f6' : '#a855f7', fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', fontWeight: 600 }}>
                  {lbl}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg, idx) => {
              const inMemA = pkgHasActiveProcess(pkg.name, procsA);
              const inMemB = pkgHasActiveProcess(pkg.name, procsB);
              return (
                <tr key={pkg.name} style={{
                  borderBottom: '1px solid #0f172a',
                  background: pkg.isProblematic ? 'rgba(239,68,68,0.06)' : (idx % 2 === 0 ? '#111827' : '#0d1523'),
                }}>
                  <td style={{
                    padding: '8px 20px',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: '12px',
                    color: pkg.isProblematic ? '#ef4444' : '#9ca3af',
                    fontWeight: pkg.isProblematic ? 600 : 400,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px',
                  }} title={pkg.name}>
                    {pkg.name}
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <StatusDot value={pkg.valA} />
                      {inMemA && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0, cursor: 'default' }} title="Proceso activo en memoria detectado en última entrada" />}
                    </div>
                  </td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                      <StatusDot value={pkg.valB} />
                      {inMemB && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0, cursor: 'default' }} title="Proceso activo en memoria detectado en última entrada" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid #1f2937', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <span style={{ color: '#4b5563', fontFamily: "'Space Grotesk', sans-serif", fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
          Leyenda
        </span>
        {[
          { size: 10, color: '#10b981', label: 'Deshabilitado (0/3)' },
          { size: 10, color: '#ef4444', label: 'Activo (1/2)' },
          { size: 10, color: '#374151', label: 'No registrado' },
          { size: 6,  color: '#ef4444', label: 'Proceso activo en memoria' },
        ].map(({ size, color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: size, height: size, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: '#6b7280', fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ComparisonDashboard({ deviceA, deviceB, onReset }) {
  const { entries: entriesA, fileName: fileA, label: labelA } = deviceA;
  const { entries: entriesB, fileName: fileB, label: labelB } = deviceB;

  const compareMemChartRef  = useRef(null);
  const compareSwapChartRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const statsA = useMemo(() => computeStats(entriesA), [entriesA]);
  const statsB = useMemo(() => computeStats(entriesB), [entriesB]);

  const chips    = useMemo(() => generateInsightChips(statsA, statsB, labelA, labelB), [statsA, statsB, labelA, labelB]);
  const pkgDiffs = useMemo(() => getPackageDiffs(entriesA, entriesB), [entriesA, entriesB]);
  const diagnosis = useMemo(() => generateDiagnosticInsights(statsA, statsB, labelA, labelB, pkgDiffs), [statsA, statsB, labelA, labelB, pkgDiffs]);

  const memA  = useMemo(() => entriesA.map(e => e.memAvailableMB),  [entriesA]);
  const memB  = useMemo(() => entriesB.map(e => e.memAvailableMB),  [entriesB]);
  const swapA = useMemo(() => entriesA.map(e => e.swapUsedMB),      [entriesA]);
  const swapB = useMemo(() => entriesB.map(e => e.swapUsedMB),      [entriesB]);
  const tsA   = useMemo(() => entriesA.map(e => e.timestamp),        [entriesA]);
  const tsB   = useMemo(() => entriesB.map(e => e.timestamp),        [entriesB]);
  const trendA = useMemo(() => calcMemTrend(entriesA), [entriesA]);
  const trendB = useMemo(() => calcMemTrend(entriesB), [entriesB]);

  const critA = memA.filter(v => v < 200).length;
  const critB = memB.filter(v => v < 200).length;

  const swapPeaksA = swapA.filter(v => v > 400).length;
  const swapPeaksB = swapB.filter(v => v > 400).length;

  async function handleExport() {
    setIsExporting(true);
    try {
      await exportReport('compare', {
        deviceA, deviceB,
        refs: { memChartRef: compareMemChartRef, swapChartRef: compareSwapChartRef },
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh' }}>
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Section header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '20px', margin: 0 }}>
              Análisis Comparativo
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
              <span style={{ color: '#3b82f6', fontWeight: 600 }}>{labelA}</span>
              {' '}vs{' '}
              <span style={{ color: '#a855f7', fontWeight: 600 }}>{labelB}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: '#1e3a5f', border: '1px solid #2563eb40',
                color: '#93c5fd', cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.7 : 1,
                fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 600,
              }}
              onMouseOver={e => { if (!isExporting) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseOut={e => { if (!isExporting) e.currentTarget.style.background = '#1e3a5f'; }}
            >
              {isExporting
                ? <Loader2 size={14} className="animate-spin" />
                : <FileDown size={14} />}
              {isExporting ? 'Generando PDF...' : 'Exportar PDF'}
            </button>
            <button
              onClick={onReset}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: 'transparent', border: '1px solid #374151',
                color: '#9ca3af', cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#f9fafb'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            >
              <ArrowLeft size={14} />
              Cambiar archivos
            </button>
          </div>
        </div>

        {/* Summary Banner */}
        <ComparisonBanner statsA={statsA} statsB={statsB} labelA={labelA} labelB={labelB} />

        {/* 1. Summary Cards */}
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader title="Resumen Comparativo" subtitle="Métricas clave por dispositivo" />
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <DeviceCard label={labelA} stats={statsA} accent="#3b82f6" memTrend={trendA} />
            <DeviceCard label={labelB} stats={statsB} accent="#a855f7" memTrend={trendB} />
          </div>
          {/* Insight chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {chips.map((c, i) => <InsightBadge key={i} type={c.type} text={c.text} />)}
          </div>
        </section>

        {/* 2. Memory Chart */}
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader title="Memoria Disponible — Comparación" subtitle="MemAvailable a lo largo del tiempo por dispositivo" />
          <div ref={compareMemChartRef} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px' }}>
            <OverlaidLineChart
              dataA={memA} dataB={memB}
              labelA={labelA} labelB={labelB}
              colorA="#3b82f6" colorB="#a855f7"
              timestampsA={tsA} timestampsB={tsB}
              refLines={[
                { y: 200, color: '#ef4444', label: 'Crítico 200 MB' },
                { y: 400, color: '#f59e0b', label: 'Advertencia 400 MB' },
              ]}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
              {(critA > 0 || critB > 0) && (
                <InsightBadge type="danger" text={`${labelA} mostró valores críticos (<200 MB) en ${critA} puntos vs ${critB} en ${labelB}`} />
              )}
              {critA === 0 && critB === 0 && (
                <InsightBadge type="success" text="Ambos dispositivos mantuvieron MemAvailable por encima de 200 MB" />
              )}
            </div>
          </div>
        </section>

        {/* 3. Swap Chart */}
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader title="Swap Utilizado — Comparación" subtitle="SwapUsed a lo largo del tiempo por dispositivo" />
          <div ref={compareSwapChartRef} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '16px', padding: '20px' }}>
            <OverlaidLineChart
              dataA={swapA} dataB={swapB}
              labelA={labelA} labelB={labelB}
              colorA="#3b82f6" colorB="#a855f7"
              timestampsA={tsA} timestampsB={tsB}
              refLines={[
                { y: 400, color: '#f59e0b', label: 'Advertencia 400 MB' },
              ]}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
              {(swapPeaksA > 0 || swapPeaksB > 0) && (
                <InsightBadge type="warning" text={`Picos de Swap >400 MB: ${swapPeaksA} en ${labelA} vs ${swapPeaksB} en ${labelB}`} />
              )}
              {swapPeaksA === 0 && swapPeaksB === 0 && (
                <InsightBadge type="success" text="Ningún dispositivo superó el umbral de swap de 400 MB" />
              )}
            </div>
          </div>
        </section>

        {/* 4. Package Comparison */}
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader title="Estado de Paquetes" subtitle="Configuración en la última entrada de cada dispositivo" />
          <PackageComparison entriesA={entriesA} entriesB={entriesB} labelA={labelA} labelB={labelB} />
        </section>

        {/* 5. Diagnostic Conclusion */}
        <section>
          <SectionHeader title="Diagnóstico Comparativo" />
          <div style={{
            background: '#111827', border: '1px solid #1e3a5f',
            borderRadius: '16px', padding: '24px',
          }}>
            <h3 style={{ color: '#93c5fd', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '16px', marginTop: 0 }}>
              Diagnóstico comparativo
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {diagnosis.map((finding, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#3b82f6', fontSize: '16px', lineHeight: 1.4, flexShrink: 0 }}>•</span>
                  <span style={{ color: '#d1d5db', fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', lineHeight: 1.6 }}>
                    {finding}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
