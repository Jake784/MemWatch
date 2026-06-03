const SIGNAGE_APP = 'com.signagesuite';

export default function TopProcessesTable({ latest }) {
  const procs = latest?.topProcesses ?? [];

  if (!procs.length) {
    return (
      <div className="rounded-2xl" style={{ background: '#111827', border: '1px solid #1f2937', overflow: 'hidden' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #1f2937' }}>
          <h3 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', margin: 0 }}>
            Top Procesos por RAM
          </h3>
        </div>
        <div className="px-5 py-6 text-center">
          <p style={{ color: '#6b7280', fontFamily: "'Space Grotesk', sans-serif" }}>Sin datos disponibles</p>
        </div>
      </div>
    );
  }

  const maxRam = Math.max(...procs.map(p => p.ramMB));

  return (
    <div className="rounded-2xl" style={{ background: '#111827', border: '1px solid #1f2937', overflow: 'hidden' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1f2937' }}>
        <h3 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', margin: 0 }}>
          Top Procesos por RAM
        </h3>
        <p style={{ color: '#6b7280', fontSize: '12px', marginTop: 4 }}>
          Última entrada · {latest?.timestamp}
        </p>
      </div>
      <div className="px-5 py-4">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937' }}>
              {['#', 'Proceso', 'RAM', ''].map((h, i) => (
                <th
                  key={h + i}
                  style={{
                    padding: '6px 8px',
                    textAlign: i === 0 ? 'center' : i === 2 ? 'right' : 'left',
                    color: '#6b7280',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {procs.map((p, i) => {
              const isSignage = p.name === SIGNAGE_APP;
              const barPct = Math.round((p.ramMB / maxRam) * 100);
              const barColor = isSignage ? '#3b82f6' : '#374151';
              return (
                <tr
                  key={p.name}
                  style={{
                    borderBottom: '1px solid #0f172a',
                    background: isSignage ? 'rgba(59,130,246,0.05)' : 'transparent',
                  }}
                >
                  <td style={{
                    padding: '10px 8px',
                    textAlign: 'center',
                    color: '#4b5563',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                  }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '13px',
                      color: isSignage ? '#60a5fa' : '#e5e7eb',
                      fontWeight: isSignage ? 600 : 400,
                    }}>
                      {p.name}
                    </span>
                    {isSignage && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '99px',
                          background: 'rgba(59,130,246,0.15)',
                          color: '#93c5fd',
                          fontFamily: "'Space Grotesk', sans-serif",
                        }}
                      >
                        signage
                      </span>
                    )}
                  </td>
                  <td style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                    color: isSignage ? '#60a5fa' : '#9ca3af',
                    fontWeight: isSignage ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}>
                    {p.ramMB} MB
                  </td>
                  <td style={{ padding: '10px 8px 10px 4px', width: '120px' }}>
                    <div style={{ background: '#1f2937', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${barPct}%`,
                          height: '100%',
                          background: isSignage ? 'linear-gradient(90deg, #3b82f6, #6366f1)' : barColor,
                          borderRadius: '99px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
