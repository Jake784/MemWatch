import { useMemo } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AlertsTimeline({ entries }) {
  const alerts = useMemo(() => {
    const list = [];
    for (const e of entries) {
      if (e.memAvailableMB < 200) {
        list.push({ ts: e.timestamp, type: 'danger', icon: 'critical', msg: `MemAvailable crítico: ${e.memAvailableMB} MB` });
      } else if (e.memAvailableMB < 400) {
        list.push({ ts: e.timestamp, type: 'warning', icon: 'warn-mem', msg: `MemAvailable baja: ${e.memAvailableMB} MB` });
      }
      if (e.swapUsedMB > 400) {
        list.push({ ts: e.timestamp, type: 'warning', icon: 'warn-swap', msg: `Swap elevado: ${e.swapUsedMB} MB` });
      }
      if (e.hasUnwantedProcesses) {
        list.push({ ts: e.timestamp, type: 'danger', icon: 'proc', msg: `Procesos no deseados: ${e.unwantedProcesses.join(', ')}` });
      }
    }
    list.sort((a, b) => a.ts.localeCompare(b.ts));
    return list;
  }, [entries]);

  return (
    <div className="rounded-2xl" style={{ background: '#111827', border: '1px solid #1f2937', overflow: 'hidden' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1f2937' }}>
        <h3 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', margin: 0 }}>
          Alertas Detectadas
        </h3>
        <p style={{ color: '#6b7280', fontSize: '12px', marginTop: 4 }}>
          {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} en el log
        </p>
      </div>
      <div className="px-5 py-4" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle size={20} color="#10b981" />
            <span style={{ color: '#10b981', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
              Sin alertas detectadas ✓
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {alerts.map((alert, i) => {
              const isDanger = alert.type === 'danger';
              const color = isDanger ? '#ef4444' : '#f59e0b';
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2.5 px-3 rounded-lg"
                  style={{
                    background: isDanger ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                    borderLeft: `3px solid ${color}`,
                  }}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isDanger
                      ? <AlertCircle size={15} color={color} />
                      : <AlertTriangle size={15} color={color} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{
                      color: '#9ca3af',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      marginBottom: '2px',
                    }}>
                      {alert.ts}
                    </p>
                    <p style={{
                      color: '#e5e7eb',
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '13px',
                      wordBreak: 'break-word',
                    }}>
                      {alert.msg}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
