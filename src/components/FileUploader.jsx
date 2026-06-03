import { useRef, useState } from 'react';
import { Upload, Activity, Cpu } from 'lucide-react';

export default function FileUploader({ onFileLoaded, style = {} }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  function readFile(file) {
    if (!file) return;
    if (!file.name.endsWith('.txt')) {
      setError('Por favor selecciona un archivo .txt');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => onFileLoaded(e.target.result, file.name);
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    readFile(e.dataTransfer.files[0]);
  }

  function handleChange(e) {
    readFile(e.target.files[0]);
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-4"
      style={{ background: '#0a0f1e', minHeight: '100vh', ...style }}
    >
      {/* Logo / title */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
          >
            <Activity size={22} color="#fff" />
          </div>
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f9fafb' }}
          >
            MemWatch
          </h1>
        </div>
        <p style={{ color: '#9ca3af', fontFamily: "'Space Grotesk', sans-serif", fontSize: '15px' }}>
          Android Memory Log Visualizer
        </p>
        <div
          className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs"
          style={{
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#93c5fd',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <Cpu size={12} />
          Rockchip RK356x / Quintex · com.signagesuite
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
        className="cursor-pointer w-full max-w-lg rounded-2xl flex flex-col items-center justify-center gap-4 p-12 transition-all duration-200"
        style={{
          border: `2px dashed ${dragging ? '#3b82f6' : '#1f2937'}`,
          background: dragging ? 'rgba(59,130,246,0.06)' : '#111827',
          minHeight: '280px',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: dragging ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)' }}
        >
          <Upload size={32} color={dragging ? '#60a5fa' : '#3b82f6'} />
        </div>
        <div className="text-center">
          <p
            className="text-lg font-semibold mb-1"
            style={{ color: '#f9fafb', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo de log'}
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            o haz clic para buscar en tu equipo
          </p>
          <p className="mt-2 text-xs" style={{ color: '#4b5563', fontFamily: "'JetBrains Mono', monospace" }}>
            Acepta archivos .txt
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
          className="mt-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-150"
          style={{
            background: '#3b82f6',
            color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif",
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#2563eb')}
          onMouseOut={(e)  => (e.currentTarget.style.background = '#3b82f6')}
        >
          Buscar archivo
        </button>
      </div>

      {error && (
        <p className="mt-4 text-sm" style={{ color: '#ef4444' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        onChange={handleChange}
        className="hidden"
      />

      <p className="mt-8 text-xs" style={{ color: '#374151' }}>
        Todo el procesamiento ocurre en tu navegador — ningún dato se envía a servidores.
      </p>
    </div>
  );
}
