import { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
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
        {value}
      </span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#111827', border: '1px solid #1f2937',
      borderRadius: '8px', padding: '10px 14px',
    }}>
      <p style={{ color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
        Load: {payload[0].value}
      </p>
    </div>
  );
}

export default function CpuChart({ entries }) {
  const data = useMemo(() =>
    entries.map(e => ({ ts: e.timestamp, label: shortLabel(e.timestamp), cpuLoad1: e.cpuLoad1 })),
    [entries]
  );

  const vals    = data.map(d => d.cpuLoad1);
  const minVal  = Math.min(...vals);
  const maxVal  = Math.max(...vals);
  const avgVal  = vals.reduce((a, b) => a + b, 0) / vals.length;
  const min     = minVal.toFixed(2);
  const max     = maxVal.toFixed(2);
  const avg     = avgVal.toFixed(2);
  const yMax    = maxVal + 0.5;

  const tickCount = Math.min(data.length, 12);
  const step = Math.ceil(data.length / tickCount);
  const ticks = data.filter((_, i) => i % step === 0).map(d => d.label);

  // Insights
  const maxIdx = vals.indexOf(maxVal);
  const maxTs  = data[maxIdx]?.ts ?? '';

  return (
    <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1f2937' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', margin: 0 }}>
          Carga de CPU (1 min)
        </h3>
      </div>
      <div className="flex gap-3 mb-5">
        <StatBadge label="Mínimo" value={min} color="#10b981" />
        <StatBadge label="Promedio" value={avg} color="#10b981" />
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
          <Line
            type="monotone"
            dataKey="cpuLoad1"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: '#10b981' }}
            isAnimationActive={entries.length < 300}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Insights */}
      {(avgVal > 1.5 || maxVal > 3.0 || avgVal < 0.5) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {maxVal > 3.0 && (
            <InsightBadge type="danger" text={`Picos de CPU detectados (máximo: ${max}) en ${maxTs}`} />
          )}
          {avgVal > 1.5 && (
            <InsightBadge type="warning" text={`Carga de CPU elevada en promedio (${avg}) — puede afectar rendimiento`} />
          )}
          {avgVal < 0.5 && (
            <InsightBadge type="success" text="Carga de CPU normal durante todo el período" />
          )}
        </div>
      )}
    </div>
  );
}
