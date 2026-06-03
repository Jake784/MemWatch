import { useMemo } from 'react';
import { MemoryStick, TrendingDown, BarChart2, HardDrive, AlertTriangle, FileText } from 'lucide-react';

function memColor(mb) {
  if (mb < 200) return '#ef4444';
  if (mb < 400) return '#f59e0b';
  return '#10b981';
}

function swapColor(mb) {
  return mb > 400 ? '#f59e0b' : '#10b981';
}

function Card({ icon: Icon, label, value, unit, color, sub }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2 transition-all duration-200"
      style={{ background: '#111827', border: '1px solid #1f2937' }}
    >
      <div className="flex items-center justify-between">
        <span style={{ color: '#9ca3af', fontSize: '12px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${color}18` }}
        >
          <Icon size={16} color={color} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="text-3xl font-bold"
          style={{ color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ color: '#6b7280', fontSize: '14px', marginBottom: '2px', fontFamily: "'Space Grotesk', sans-serif" }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <span style={{ color: '#6b7280', fontSize: '12px', fontFamily: "'Space Grotesk', sans-serif" }}>
          {sub}
        </span>
      )}
      <div className="h-1 rounded-full mt-1" style={{ background: `${color}30` }}>
        <div className="h-full rounded-full" style={{ background: color, width: '100%', opacity: 0.7 }} />
      </div>
    </div>
  );
}

export default function SummaryCards({ entries, latest }) {
  const stats = useMemo(() => {
    if (!entries.length) return null;
    const avails = entries.map(e => e.memAvailableMB);
    const minAvail = Math.min(...avails);
    const avgAvail = Math.round(avails.reduce((a, b) => a + b, 0) / avails.length);
    const anyUnwanted = entries.some(e => e.hasUnwantedProcesses);
    const first = entries[0].timestamp;
    const last  = entries[entries.length - 1].timestamp;
    return { minAvail, avgAvail, anyUnwanted, first, last };
  }, [entries]);

  if (!stats) return null;

  function formatRange(a, b) {
    if (a === b) return a;
    const da = a.split(' ')[0];
    const db = b.split(' ')[0];
    if (da === db) return `${a.split(' ')[1]} – ${b.split(' ')[1]}`;
    return `${a} – ${b}`;
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
    >
      <Card
        icon={MemoryStick}
        label="MemAvailable (ahora)"
        value={latest.memAvailableMB}
        unit="MB"
        color={memColor(latest.memAvailableMB)}
        sub="Memoria disponible actual"
      />
      <Card
        icon={TrendingDown}
        label="MemAvailable (mínimo)"
        value={stats.minAvail}
        unit="MB"
        color={stats.minAvail < 200 ? '#ef4444' : '#f59e0b'}
        sub="Peor registro en el log"
      />
      <Card
        icon={BarChart2}
        label="MemAvailable (promedio)"
        value={stats.avgAvail}
        unit="MB"
        color={memColor(stats.avgAvail)}
        sub="Media de todas las entradas"
      />
      <Card
        icon={HardDrive}
        label="Swap usado (ahora)"
        value={latest.swapUsedMB}
        unit="MB"
        color={swapColor(latest.swapUsedMB)}
        sub="Uso actual de swap"
      />
      <Card
        icon={AlertTriangle}
        label="Procesos no deseados"
        value={stats.anyUnwanted ? 'Detectados' : 'Ninguno ✓'}
        unit=""
        color={stats.anyUnwanted ? '#ef4444' : '#10b981'}
        sub={stats.anyUnwanted ? 'Hallados en alguna entrada' : 'Todo limpio'}
      />
      <Card
        icon={FileText}
        label="Entradas en el log"
        value={entries.length}
        unit=""
        color="#3b82f6"
        sub={formatRange(stats.first, stats.last)}
      />
    </div>
  );
}
