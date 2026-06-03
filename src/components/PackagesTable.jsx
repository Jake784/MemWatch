import { useMemo } from 'react';

function shortTime(ts) {
  const parts = ts.split(' ');
  return parts.length === 2 ? parts[1].slice(0, 5) : ts.slice(0, 5);
}

function StatusDot({ value }) {
  const color = value === 0 ? '#10b981' : '#ef4444';
  return (
    <div className="flex items-center justify-center">
      <div
        style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }}
        title={`enabled=${value}`}
      />
    </div>
  );
}

export default function PackagesTable({ entries }) {
  const { packages, timestamps, packageNames } = useMemo(() => {
    if (!entries.length) return { packages: [], timestamps: [], packageNames: [] };
    const names = Object.keys(entries[0].packages);
    return {
      packageNames: names,
      timestamps: entries.map(e => ({ full: e.timestamp, short: shortTime(e.timestamp) })),
      packages: names.map(name => ({
        name,
        values: entries.map(e => e.packages[name] ?? 0),
        hasIssue: entries.some(e => (e.packages[name] ?? 0) !== 0),
      })),
    };
  }, [entries]);

  if (!packages.length) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: '#111827', border: '1px solid #1f2937' }}>
        <p style={{ color: '#6b7280' }}>Sin datos de paquetes</p>
      </div>
    );
  }

  const MAX_COLS = 30;
  const displayedEntries = entries.length > MAX_COLS
    ? entries.filter((_, i) => i % Math.ceil(entries.length / MAX_COLS) === 0 || i === entries.length - 1)
    : entries;

  const displayedTimes = displayedEntries.map(e => shortTime(e.timestamp));

  return (
    <div className="rounded-2xl" style={{ background: '#111827', border: '1px solid #1f2937', overflow: 'hidden' }}>
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #1f2937' }}>
        <h3 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '15px', margin: 0 }}>
          Estado de Paquetes Deshabilitados
        </h3>
        <p style={{ color: '#6b7280', fontSize: '12px', marginTop: 4 }}>
          Verde = disabled (0) · Rojo = enabled (1/2)
          {entries.length > MAX_COLS && ` · Mostrando ${displayedEntries.length} de ${entries.length} entradas`}
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '220px', minWidth: '180px' }} />
            {displayedTimes.map((_, i) => <col key={i} style={{ width: '52px', minWidth: '44px' }} />)}
            <col style={{ width: '100px', minWidth: '90px' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid #1f2937' }}>
              <th
                style={{
                  position: 'sticky', left: 0, zIndex: 2,
                  background: '#111827',
                  padding: '8px 16px',
                  textAlign: 'left',
                  color: '#9ca3af',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderRight: '1px solid #1f2937',
                }}
              >
                Paquete
              </th>
              {displayedTimes.map((t, i) => (
                <th
                  key={i}
                  style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    color: '#4b5563',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '10px',
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    height: '60px',
                  }}
                >
                  {t}
                </th>
              ))}
              <th
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: '#9ca3af',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderLeft: '1px solid #1f2937',
                }}
              >
                Actual
              </th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg, rowIdx) => {
              const displayedVals = displayedEntries.map(e => e.packages[pkg.name] ?? 0);
              const lastVal = entries[entries.length - 1].packages[pkg.name] ?? 0;
              return (
                <tr
                  key={pkg.name}
                  style={{
                    borderBottom: '1px solid #0f172a',
                    background: rowIdx % 2 === 0 ? '#111827' : '#0d1523',
                  }}
                >
                  <td
                    style={{
                      position: 'sticky', left: 0, zIndex: 1,
                      background: rowIdx % 2 === 0 ? '#111827' : '#0d1523',
                      padding: '7px 16px',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '12px',
                      color: pkg.hasIssue ? '#ef4444' : '#9ca3af',
                      fontWeight: pkg.hasIssue ? 600 : 400,
                      borderRight: '1px solid #1f2937',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={pkg.name}
                  >
                    {pkg.name}
                  </td>
                  {displayedVals.map((val, colIdx) => (
                    <td key={colIdx} style={{ padding: '7px 4px' }}>
                      <StatusDot value={val} />
                    </td>
                  ))}
                  <td style={{ padding: '7px 12px', textAlign: 'center', borderLeft: '1px solid #1f2937' }}>
                    <StatusDot value={lastVal} />
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
