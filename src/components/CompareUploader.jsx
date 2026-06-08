import { useRef, useState } from 'react';
import { Upload, CheckCircle, Pencil } from 'lucide-react';
import { parseLogFile } from '../utils/logParser.js';

function UploadCard({ cardLabel, accent, file, label, onFile, onLabelChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState(null);
  const [editing, setEditing]   = useState(false);

  function readFile(f) {
    if (!f) return;
    if (!f.name.endsWith('.txt')) { setError('Por favor selecciona un archivo .txt'); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => onFile({ entries: parseLogFile(e.target.result), fileName: f.name });
    reader.readAsText(f);
  }

  const borderColor = file ? '#10b981' : dragging ? accent : '#374151';

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: '#111827',
      border: `2px solid ${borderColor}`,
      borderRadius: '16px', padding: '24px',
      display: 'flex', flexDirection: 'column', gap: '14px',
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <span style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '15px' }}>
          {cardLabel}
        </span>
      </div>

      {/* Editable label */}
      <div>
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
            style={{
              background: '#1f2937', border: `1px solid ${accent}`,
              borderRadius: '6px', padding: '4px 10px', width: '100%',
              color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px',
              outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <span style={{ color: '#9ca3af', fontSize: '12px', fontFamily: "'Space Grotesk', sans-serif" }}>
              {label}
            </span>
            <Pencil size={10} color="#4b5563" />
          </button>
        )}
      </div>

      {/* Loaded state */}
      {file ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 14px', background: 'rgba(16,185,129,0.08)',
          borderRadius: '10px', border: '1px solid rgba(16,185,129,0.25)',
        }}>
          <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: '#10b981', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.fileName}
            </p>
            <p style={{ color: '#6b7280', fontSize: '11px', fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>
              {file.entries.length} entradas
            </p>
          </div>
          <button
            onClick={() => onFile(null)}
            style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}
          >×</button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? accent : '#374151'}`,
            borderRadius: '10px', padding: '28px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
            cursor: 'pointer', background: dragging ? `${accent}10` : 'transparent',
            transition: 'all 0.15s',
          }}
        >
          <Upload size={24} color={dragging ? accent : '#4b5563'} />
          <p style={{ color: '#9ca3af', fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px', textAlign: 'center', margin: 0 }}>
            Arrastra o haz clic para subir
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
            style={{
              background: accent, color: '#fff', border: 'none', borderRadius: '8px',
              padding: '6px 18px', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", fontSize: '12px', fontWeight: 600,
            }}
          >
            Buscar archivo
          </button>
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: '11px', fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>{error}</p>}
      <input ref={inputRef} type="file" accept=".txt" onChange={(e) => readFile(e.target.files[0])} style={{ display: 'none' }} />
    </div>
  );
}

export default function CompareUploader({ onBothLoaded }) {
  const [fileA, setFileA]   = useState(null);
  const [fileB, setFileB]   = useState(null);
  const [labelA, setLabelA] = useState('Dispositivo con paquetes habilitados');
  const [labelB, setLabelB] = useState('Dispositivo sin paquetes habilitados');

  const ready = fileA && fileB;

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '22px', margin: 0 }}>
          Comparación de Dispositivos
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: 8, fontFamily: "'Space Grotesk', sans-serif" }}>
          Carga los logs de ambos dispositivos para comparar su rendimiento de memoria
        </p>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <UploadCard
          cardLabel="Dispositivo A"
          accent="#3b82f6"
          file={fileA}
          label={labelA}
          onFile={setFileA}
          onLabelChange={setLabelA}
        />
        <UploadCard
          cardLabel="Dispositivo B"
          accent="#a855f7"
          file={fileB}
          label={labelB}
          onFile={setFileB}
          onLabelChange={setLabelB}
        />
      </div>

      <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center' }}>
        <button
          disabled={!ready}
          onClick={() => ready && onBothLoaded(
            { ...fileA, label: labelA },
            { ...fileB, label: labelB }
          )}
          style={{
            background: ready ? 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)' : '#1f2937',
            color: ready ? '#fff' : '#4b5563',
            border: 'none', borderRadius: '10px',
            padding: '11px 32px', cursor: ready ? 'pointer' : 'not-allowed',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '14px',
            transition: 'opacity 0.15s',
            opacity: ready ? 1 : 0.6,
          }}
        >
          Comparar →
        </button>
      </div>
    </div>
  );
}
