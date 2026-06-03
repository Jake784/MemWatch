const SEPARATOR_RE = /─{10,}/;

function parseTimestamp(line) {
  const m = line.match(/\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/);
  return m ? m[1] : null;
}

function parseMemoria(lines) {
  const result = { memTotal: 0, memFree: 0, memAvailable: 0, swapUsed: 0 };
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(\d+)\s*kB$/);
    if (!kv) continue;
    switch (kv[1]) {
      case 'MemTotal':     result.memTotal     = parseInt(kv[2], 10); break;
      case 'MemFree':      result.memFree      = parseInt(kv[2], 10); break;
      case 'MemAvailable': result.memAvailable  = parseInt(kv[2], 10); break;
      case 'SwapUsed':     result.swapUsed      = parseInt(kv[2], 10); break;
    }
  }
  return result;
}

function parsePackages(lines) {
  const packages = {};
  for (const line of lines) {
    const m = line.match(/^([\w.]+):\s*enabled=(\d+)/);
    if (m) packages[m[1]] = parseInt(m[2], 10);
  }
  return packages;
}

function parseUnwanted(lines) {
  const procs = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.includes('Ninguno detectado') || t.startsWith('[')) continue;
    procs.push(t);
  }
  return procs;
}

function parseTopProcesses(lines) {
  const list = [];
  for (const line of lines) {
    const m = line.trim().match(/^(\S+)\s+(\d+(?:\.\d+)?)\s+MB$/);
    if (m) list.push({ name: m[1], ramMB: parseFloat(m[2]) });
  }
  return list;
}

function parseCpu(lines) {
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('[')) continue;
    const parts = t.split(/\s+/).map(Number).filter(n => !isNaN(n));
    if (parts.length >= 1) return parts;
  }
  return [0];
}

function parseEntry(block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  const timestamp = parseTimestamp(lines[0]);
  if (!timestamp) return null;

  // Split into sections by [ SECTION ] headers
  const sections = {};
  let currentSection = null;
  let currentLines = [];

  for (let i = 1; i < lines.length; i++) {
    const sectionMatch = lines[i].match(/^\[\s*(.+?)\s*\]$/);
    if (sectionMatch) {
      if (currentSection) sections[currentSection] = currentLines;
      currentSection = sectionMatch[1].toUpperCase();
      currentLines = [];
    } else {
      currentLines.push(lines[i]);
    }
  }
  if (currentSection) sections[currentSection] = currentLines;

  const mem   = parseMemoria(sections['MEMORIA'] || []);
  const pkgs  = parsePackages(sections['PAQUETES DESHABILITADOS'] || []);
  const procs = parseUnwanted(sections['PROCESOS ACTIVOS NO DESEADOS'] || []);
  const top   = parseTopProcesses(sections['TOP 5 PROCESOS POR RAM'] || []);
  const cpu   = parseCpu(sections['CPU'] || []);

  return {
    timestamp,
    memTotal:        mem.memTotal,
    memFree:         mem.memFree,
    memAvailable:    mem.memAvailable,
    memAvailableMB:  Math.round(mem.memAvailable / 1024),
    swapUsed:        mem.swapUsed,
    swapUsedMB:      Math.round(mem.swapUsed / 1024),
    packages:        pkgs,
    unwantedProcesses:    procs,
    hasUnwantedProcesses: procs.length > 0,
    topProcesses:    top,
    cpuLoad:         cpu,
    cpuLoad1:        cpu[0] ?? 0,
  };
}

export function parseLogFile(text) {
  const blocks = text.split(SEPARATOR_RE);
  const entries = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    try {
      const entry = parseEntry(trimmed);
      if (entry) entries.push(entry);
    } catch {
      // skip malformed entries
    }
  }
  return entries;
}
