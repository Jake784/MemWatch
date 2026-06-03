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
  if (payload.swapUsedMB > 400) {
    return <circle cx={cx} cy={cy} r={4} fill="#f59e0b" stroke="#f59e0b80" strokeWidth={2} />;
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
      <p style={{ color: '#a855f7', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
        {payload[0].value} MB
      </p>
    </div>
  );
}

export default function SwapChart({ entries }) {
  const data = useMemo(() =>
    entries.map(e => ({ ts: e.timestamp, label: shortLabel(e.timestamp), swapUsedMB: e.swapUsedMB })),
    [entries]
  );

  const vals = data.map(d => d.swapUsedMB);
  const min  = Math.min(...vals);
  const max  = Math.max(...vals);
  const avg  = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const yMax = Math.max(...vals) + 80;

  const tickCount = Math.min(data.length, 12);
  const step = Math.ceil(data.length / tickCount);
  const ticks = data.filter((_, i) => i % step === 0).map(d => d.label);

  // Insights
  const peakCount = vals.filter(v => v > 400).length;
  const noSwap    = max === 0;

  return (
    <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1f2937' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', margin: 0 }}>
          Swap Utilizado
        </h3>
      </div>
      <div className="flex gap-3 mb-5">
        <StatBadge label="Mínimo" value={min} color="#10b981" />
        <StatBadge label="Promedio" value={avg} color="#a855f7" />
        <StatBadge label="Máximo" value={max} color="#f59e0b" />
      </div>
      <ResponsiveContainer width="100%" height={220}>
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
            domain={[0, yMax]}
            tick={{ fill: '#6b7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={400} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
            label={{ value: 'Advertencia 400MB', position: 'insideTopRight', fill: '#f59e0b', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
          <Line
            type="monotone"
            dataKey="swapUsedMB"
            stroke="#a855f7"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5, fill: '#a855f7' }}
            isAnimationActive={entries.length < 300}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Insights */}
      {(peakCount > 0 || avg > 300 || noSwap) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {peakCount > 0 && (
            <InsightBadge type="warning" text={`Se detectaron ${peakCount} picos de Swap > 400 MB — posible presión de memoria`} />
          )}
          {avg > 300 && (
            <InsightBadge type="warning" text={`Uso de swap elevado en promedio (${avg} MB) — revisar procesos en background`} />
          )}
          {noSwap && (
            <InsightBadge type="success" text="Sin uso de swap durante el período" />
          )}
        </div>
      )}
    </div>
  );
}
