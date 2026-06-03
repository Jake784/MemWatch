import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, Dot,
} from 'recharts';
import InsightBadge from './InsightBadge.jsx';

function shortLabel(ts) {
  const parts = ts.split(' ');
  return parts.length === 2 ? parts[1].slice(0, 5) : ts.slice(0, 5);
}

function StatBadge({ label, value, color }) {
  return (
    <div
      className="flex flex-col items-center px-4 py-2 rounded-lg"
      style={{ background: '#0a0f1e', border: `1px solid ${color}33` }}
    >
      <span style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Space Grotesk', sans-serif" }}>
        {label}
      </span>
      <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: '18px' }}>
        {value} <span style={{ fontSize: '11px', fontWeight: 400 }}>MB</span>
      </span>
    </div>
  );
}

function CustomDot(props) {
  const { cx, cy, payload } = props;
  if (payload.memAvailableMB < 200) {
    return <circle cx={cx} cy={cy} r={4} fill="#ef4444" stroke="#ef444480" strokeWidth={2} />;
  }
  return null;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#111827', border: '1px solid #1f2937',
      borderRadius: '8px', padding: '10px 14px',
    }}>
      <p style={{ color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
        {payload[0].value} MB
      </p>
    </div>
  );
}

export default function MemoryChart({ entries }) {
  const data = useMemo(() =>
    entries.map(e => ({ ts: e.timestamp, label: shortLabel(e.timestamp), memAvailableMB: e.memAvailableMB })),
    [entries]
  );

  const vals = data.map(d => d.memAvailableMB);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const avg  = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const yMin = Math.max(0, min - 50);
  const yMax = max + 100;

  const tickCount = Math.min(data.length, 12);
  const step = Math.ceil(data.length / tickCount);
  const ticks = data.filter((_, i) => i % step === 0).map(d => d.label);

  // Insights
  const criticalCount = vals.filter(v => v < 200).length;
  const minIdx        = vals.indexOf(min);
  const minTs         = data[minIdx]?.ts ?? '';

  const sl        = Math.max(1, Math.floor(vals.length * 0.2));
  const firstAvg  = vals.slice(0, sl).reduce((a, b) => a + b, 0) / sl;
  const lastAvg   = vals.slice(-sl).reduce((a, b) => a + b, 0) / sl;
  const isDowntrend = vals.length >= 10 && lastAvg < firstAvg;

  const allAbove400 = min > 400;

  return (
    <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1f2937' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', margin: 0 }}>
          Memoria Disponible (MemAvailable)
        </h3>
      </div>
      <div className="flex gap-3 mb-5">
        <StatBadge label="Mínimo" value={min} color="#ef4444" />
        <StatBadge label="Promedio" value={avg} color="#f59e0b" />
        <StatBadge label="Máximo" value={max} color="#10b981" />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            ticks={ticks}
            tick={{ fill: '#6b7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fill: '#6b7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
            tickFormatter={v => `${v}`}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={200} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: 'Crítico 200MB', position: 'insideTopRight', fill: '#ef4444', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
          <ReferenceLine y={400} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: 'Advertencia 400MB', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
          <Line
            type="monotone"
            dataKey="memAvailableMB"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5, fill: '#3b82f6' }}
            isAnimationActive={entries.length < 300}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Insights */}
      {(criticalCount > 0 || isDowntrend || allAbove400) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {criticalCount > 0 && (
            <InsightBadge type="danger" text={`Se registraron ${criticalCount} puntos críticos con MemAvailable < 200 MB (mínimo: ${min} MB en ${minTs})`} />
          )}
          {isDowntrend && (
            <InsightBadge type="warning" text="La memoria disponible muestra tendencia descendente durante el período" />
          )}
          {allAbove400 && (
            <InsightBadge type="success" text="Memoria disponible se mantuvo por encima del umbral de advertencia" />
          )}
        </div>
      )}
    </div>
  );
}
