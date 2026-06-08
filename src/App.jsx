import { useState, useMemo, useRef } from 'react';
import { Activity, FolderOpen, X, FileDown, GitCompareArrows, BarChart2, Loader2, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import { parseLogFile } from './utils/logParser';
import { exportReport } from './utils/exportPdf.js';
import FileUploader from './components/FileUploader';
import SummaryCards from './components/SummaryCards';
import MemoryChart from './components/MemoryChart';
import SwapChart from './components/SwapChart';
import CpuChart from './components/CpuChart';
import PackagesTable from './components/PackagesTable';
import AlertsTimeline from './components/AlertsTimeline';
import TopProcessesTable from './components/TopProcessesTable';
import CompareUploader from './components/CompareUploader';
import ComparisonDashboard from './components/ComparisonDashboard';

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2 style={{
        color: '#f9fafb',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: '17px',
        margin: 0,
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: '#6b7280', fontSize: '13px', marginTop: 2 }}>{subtitle}</p>
      )}
      <div style={{ height: 1, background: '#1f2937', marginTop: 10 }} />
    </div>
  );
}

function ModeToggle({ mode, onModeChange }) {
  return (
    <div style={{
      display: 'flex',
      background: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '10px',
      padding: '3px',
      gap: '2px',
      flexShrink: 0,
    }}>
      {[
        { id: 'single',  label: 'Análisis Individual',  Icon: BarChart2 },
        { id: 'compare', label: 'Comparar Dispositivos', Icon: GitCompareArrows },
      ].map(({ id, label, Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '7px',
              background: active ? '#3b82f6' : 'transparent',
              color: active ? '#fff' : '#9ca3af',
              border: 'none', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '12px', fontWeight: active ? 600 : 400,
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={e => { if (!active) e.currentTarget.style.color = '#f9fafb'; }}
            onMouseOut={e  => { if (!active) e.currentTarget.style.color = '#9ca3af'; }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function extractDeviceLabel(text) {
  const m = text.match(/Dispositivo:\s*([^\n]+)/i);
  return m ? m[1].trim() : '—';
}

function HistoryCard({ item, onReload }) {
  const dateParts = item.firstTs ? item.firstTs.split(' ') : ['', ''];
  const date      = dateParts[0] ?? '';
  const firstTime = (dateParts[1] ?? '').slice(0, 5);
  const lastTime  = (item.lastTs?.split(' ')[1] ?? '').slice(0, 5);

  return (
    <div style={{
      background: '#111827', border: '1px solid #1f2937',
      borderRadius: '12px', padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div>
        <p style={{
          color: '#f9fafb', fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px', fontWeight: 600, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={item.fileName}>
          {item.fileName}
        </p>
        <p style={{
          color: '#6b7280', fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '11px', margin: '4px 0 0',
        }}>
          {item.deviceLabel}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
          <Clock size={11} color="#4b5563" style={{ flexShrink: 0 }} />
          <span style={{
            color: '#6b7280', fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {date} · {firstTime} → {lastTime}
          </span>
        </div>
        <span style={{
          flexShrink: 0, background: '#1f2937', color: '#6b7280',
          fontSize: '10px', borderRadius: '6px', padding: '2px 7px',
          fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap',
        }}>
          {item.entryCount} ent.
        </span>
      </div>
      <button
        onClick={() => onReload(item)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '6px', borderRadius: '8px', width: '100%',
          background: 'transparent', border: '1px solid #374151',
          color: '#9ca3af', cursor: 'pointer',
          fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px',
        }}
        onMouseOver={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#f9fafb'; }}
        onMouseOut={e  => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
      >
        <RefreshCw size={12} />
        Cargar de nuevo
      </button>
    </div>
  );
}

function HistoryPanel({ history, onReload, isOpen, onToggle }) {
  if (history.length === 0) return null;
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 48px' }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '14px 0',
          borderTop: '1px solid #1f2937', borderBottom: 'none',
          borderLeft: 'none', borderRight: 'none',
          background: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={14} color="#6b7280" />
          <span style={{
            color: '#9ca3af', fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600, fontSize: '14px',
          }}>
            Historial de análisis
          </span>
          <span style={{
            background: '#1f2937', color: '#6b7280',
            fontSize: '10px', fontFamily: "'Space Grotesk', sans-serif",
            borderRadius: '99px', padding: '2px 8px',
          }}>
            {history.length}
          </span>
        </div>
        <ChevronDown
          size={16}
          color="#6b7280"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </button>
      {isOpen && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '12px', paddingTop: '16px',
        }}>
          {history.map(item => (
            <HistoryCard key={item.id} item={item} onReload={onReload} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState('single');

  // Single mode
  const [entries, setEntries]   = useState(null);
  const [fileName, setFileName] = useState('');

  // Chart refs for PDF export (single mode)
  const memChartRef  = useRef(null);
  const swapChartRef = useRef(null);
  const cpuChartRef  = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  // Session history (in-memory, single mode)
  const [history,       setHistory]       = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  // Compare mode
  const [deviceA, setDeviceA] = useState(null);
  const [deviceB, setDeviceB] = useState(null);

  function switchMode(newMode) {
    if (newMode === mode) return;
    setMode(newMode);
    setEntries(null);
    setFileName('');
    setDeviceA(null);
    setDeviceB(null);
  }

  function handleFileLoaded(text, name) {
    const parsed   = parseLogFile(text);
    const safeName = name || 'log.txt';
    setEntries(parsed);
    setFileName(safeName);
    if (parsed.length > 0) {
      const entry = {
        id:          Date.now(),
        fileName:    safeName,
        deviceLabel: extractDeviceLabel(text),
        firstTs:     parsed[0].timestamp,
        lastTs:      parsed[parsed.length - 1].timestamp,
        entryCount:  parsed.length,
        entries:     parsed,
      };
      setHistory(prev => [entry, ...prev.filter(h => h.fileName !== safeName)]);
    }
  }

  function resetSingle() {
    setEntries(null);
    setFileName('');
  }

  function handleBothLoaded(a, b) {
    setDeviceA(a);
    setDeviceB(b);
  }

  function resetCompare() {
    setDeviceA(null);
    setDeviceB(null);
  }

  function reloadFromHistory(item) {
    setMode('single');
    setDeviceA(null);
    setDeviceB(null);
    setEntries(item.entries);
    setFileName(item.fileName);
  }

  async function handleExportSingle() {
    setIsExporting(true);
    try {
      await exportReport('single', { entries, fileName, refs: { memChartRef, swapChartRef, cpuChartRef } });
    } finally {
      setIsExporting(false);
    }
  }

  const latest = useMemo(() => entries?.[entries.length - 1] ?? null, [entries]);

  // ── Compare mode ──────────────────────────────────────────────────────────

  if (mode === 'compare') {
    const showDashboard = deviceA && deviceB;
    return (
      <div style={{ background: '#0a0f1e', minHeight: '100vh' }}>
        {/* Minimal navbar for compare upload / full navbar in compare dashboard */}
        <nav style={{
          background: '#0d1424', borderBottom: '1px solid #1f2937',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{
            maxWidth: '1400px', margin: '0 auto', height: '56px',
            padding: '0 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              }}>
                <Activity size={15} color="#fff" />
              </div>
              <span style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '16px' }}>
                MemWatch
              </span>
            </div>
            <ModeToggle mode={mode} onModeChange={switchMode} />
            {showDashboard && (
              <button
                onClick={resetCompare}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: '8px',
                  background: 'transparent', border: '1px solid #374151',
                  color: '#9ca3af', cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px',
                  flexShrink: 0,
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#f9fafb'; }}
                onMouseOut={e  => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
              >
                <X size={14} />
                Nuevo análisis
              </button>
            )}
          </div>
        </nav>

        {!showDashboard ? (
          <CompareUploader onBothLoaded={handleBothLoaded} />
        ) : (
          <ComparisonDashboard
            deviceA={deviceA}
            deviceB={deviceB}
            onReset={resetCompare}
          />
        )}
        <HistoryPanel
          history={history}
          onReload={reloadFromHistory}
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen(v => !v)}
        />
      </div>
    );
  }

  // ── Single mode — no file loaded ──────────────────────────────────────────

  if (!entries) {
    return (
      <div style={{ background: '#0a0f1e', minHeight: '100vh' }}>
        <nav style={{
          background: '#0d1424', borderBottom: '1px solid #1f2937',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{
            maxWidth: '1400px', margin: '0 auto', height: '56px',
            padding: '0 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              }}>
                <Activity size={15} color="#fff" />
              </div>
              <span style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '16px' }}>
                MemWatch
              </span>
            </div>
            <ModeToggle mode={mode} onModeChange={switchMode} />
            <div style={{ width: 120, flexShrink: 0 }} /> {/* spacer */}
          </div>
        </nav>
        <FileUploader onFileLoaded={handleFileLoaded} style={{ minHeight: 'calc(100vh - 56px)' }} />
        <HistoryPanel
          history={history}
          onReload={reloadFromHistory}
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen(v => !v)}
        />
      </div>
    );
  }

  // ── Single mode — parse error ─────────────────────────────────────────────

  if (entries.length === 0) {
    return (
      <div style={{ background: '#0a0f1e', minHeight: '100vh' }}>
        <nav style={{
          background: '#0d1424', borderBottom: '1px solid #1f2937',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{
            maxWidth: '1400px', margin: '0 auto', height: '56px',
            padding: '0 24px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              }}>
                <Activity size={15} color="#fff" />
              </div>
              <span style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '16px' }}>
                MemWatch
              </span>
            </div>
            <ModeToggle mode={mode} onModeChange={switchMode} />
            <div style={{ width: 120 }} />
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center gap-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <p style={{ color: '#ef4444', fontFamily: "'Space Grotesk', sans-serif" }}>
            No se encontraron entradas válidas en el archivo.
          </p>
          <button
            onClick={resetSingle}
            style={{
              background: '#1f2937', color: '#f9fafb', border: '1px solid #374151',
              borderRadius: '8px', padding: '8px 20px', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            Intentar con otro archivo
          </button>
        </div>
      </div>
    );
  }

  // ── Single mode — dashboard ───────────────────────────────────────────────

  return (
    <div className="animate-fade-in-up" style={{ background: '#0a0f1e', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav
        style={{
          background: '#0d1424',
          borderBottom: '1px solid #1f2937',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            height: '56px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              }}
            >
              <Activity size={15} color="#fff" />
            </div>
            <span style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '16px' }}>
              MemWatch
            </span>
          </div>

          {/* Mode toggle */}
          <ModeToggle mode={mode} onModeChange={switchMode} />

          {/* File chip */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px', borderRadius: '8px',
              background: '#1f2937', border: '1px solid #374151',
              maxWidth: '280px', minWidth: 0, flex: 1,
            }}
          >
            <FolderOpen size={13} color="#9ca3af" style={{ flexShrink: 0 }} />
            <span style={{
              color: '#9ca3af', fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {fileName}
            </span>
            <span style={{ color: '#4b5563', fontFamily: "'Space Grotesk', sans-serif", fontSize: '11px', flexShrink: 0 }}>
              · {entries.length} entradas
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {/* Export PDF */}
            <button
              onClick={handleExportSingle}
              disabled={isExporting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px',
                background: '#1e3a5f', border: '1px solid #2563eb40',
                color: '#93c5fd', cursor: isExporting ? 'not-allowed' : 'pointer',
                opacity: isExporting ? 0.7 : 1,
                fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', fontWeight: 600,
              }}
              onMouseOver={e => { if (!isExporting) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseOut={e  => { if (!isExporting) e.currentTarget.style.background = '#1e3a5f'; }}
            >
              {isExporting
                ? <Loader2 size={14} className="animate-spin" />
                : <FileDown size={14} />}
              {isExporting ? 'Generando PDF...' : 'Exportar PDF'}
            </button>

            {/* Reset */}
            <button
              onClick={resetSingle}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '8px',
                background: 'transparent', border: '1px solid #374151',
                color: '#9ca3af', cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#f9fafb'; }}
              onMouseOut={e  => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            >
              <X size={14} />
              Cargar otro archivo
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '28px 24px 60px' }}>

        <section style={{ marginBottom: '36px' }} className="animate-fade-in-up animate-fade-in-up-delay-1">
          <SectionHeader title="Resumen General" subtitle="Métricas clave del log de monitoreo" />
          <SummaryCards entries={entries} latest={latest} />
        </section>

        <section style={{ marginBottom: '36px' }} className="animate-fade-in-up animate-fade-in-up-delay-2">
          <SectionHeader title="Memoria Disponible" subtitle="Evolución de MemAvailable a lo largo del tiempo" />
          <MemoryChart entries={entries} ref={memChartRef} />
        </section>

        <section style={{ marginBottom: '36px' }} className="animate-fade-in-up animate-fade-in-up-delay-3">
          <SectionHeader title="Swap y CPU" subtitle="Uso de swap y carga del procesador" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            <SwapChart entries={entries} ref={swapChartRef} />
            <CpuChart entries={entries} ref={cpuChartRef} />
          </div>
        </section>

        <section style={{ marginBottom: '36px' }} className="animate-fade-in-up animate-fade-in-up-delay-4">
          <SectionHeader title="Paquetes Deshabilitados" subtitle="Estado de cada paquete en cada entrada del log" />
          <PackagesTable entries={entries} />
        </section>

        <section className="animate-fade-in-up animate-fade-in-up-delay-5">
          <SectionHeader title="Alertas y Procesos" subtitle="Alertas detectadas en el log y top procesos por RAM" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            <AlertsTimeline entries={entries} />
            <TopProcessesTable latest={latest} />
          </div>
        </section>
      </main>
      <HistoryPanel
        history={history}
        onReload={reloadFromHistory}
        isOpen={isHistoryOpen}
        onToggle={() => setIsHistoryOpen(v => !v)}
      />
    </div>
  );
}
