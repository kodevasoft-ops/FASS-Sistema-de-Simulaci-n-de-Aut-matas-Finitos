/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║       FASS v3 — Módulo de Exportación                                   ║
 * ║                    Archivo: exporter.js                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Exporta el autómata en múltiples formatos:                             ║
 * ║    • PNG  — Captura del grafo vis.js como imagen                        ║
 * ║    • SVG  — Grafo como vector escalable                                 ║
 * ║    • CSV  — Tabla de transiciones como hoja de cálculo                  ║
 * ║    • JSON — Definición formal del autómata (ya existía en v1)           ║
 * ║    • TXT  — Descripción formal en texto plano                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Exporter = (() => {

  // ── Descarga genérica de archivo ───────────────────────────────────────────
  function _download(content, filename, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Exportar PNG ───────────────────────────────────────────────────────────
  /**
   * Captura el canvas del grafo vis.js como imagen PNG.
   *
   * vis.js renderiza en un elemento <canvas> interno.
   * Lo extraemos, lo dibujamos sobre un canvas temporal con fondo
   * negro (#050505) y lo exportamos como PNG.
   */
  function exportPNG() {
    const container = document.getElementById('graph-container');
    const visCanvas = container?.querySelector('canvas');

    if (!visCanvas) {
      UI.log('err', 'No hay grafo para exportar');
      return;
    }

    // Canvas temporal con fondo negro
    const outCanvas = document.createElement('canvas');
    outCanvas.width  = visCanvas.width;
    outCanvas.height = visCanvas.height;
    const ctx = outCanvas.getContext('2d');

    // Fondo negro (el canvas de vis.js es transparente)
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);

    // Dibujar el grafo encima
    ctx.drawImage(visCanvas, 0, 0);

    // Descargar
    outCanvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url;
      a.download = `fass-grafo-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      UI.log('ok', 'Grafo exportado como PNG');
    }, 'image/png');
  }

  // ── Exportar SVG ───────────────────────────────────────────────────────────
  /**
   * Genera un SVG del grafo a partir de los datos del autómata.
   *
   * vis.js no expone directamente el SVG, así que construimos
   * el SVG manualmente usando las posiciones de los nodos del network.
   */
  function exportSVG() {
    // Obtener la instancia del network de vis.js desde Graph
    const container = document.getElementById('graph-container');
    const positions = {};

    // Intentar obtener posiciones del network interno
    try {
      const canvases = container.querySelectorAll('canvas');
      if (!canvases.length) { UI.log('err', 'Sin grafo para exportar'); return; }
    } catch { UI.log('err', 'Sin grafo para exportar'); return; }

    const local   = Simulator.localState;
    const states  = Object.entries(local.states);
    const trans   = local.transitions;

    if (!states.length) { UI.log('err', 'Sin estados para exportar'); return; }

    // Layout circular simple para posicionar nodos en el SVG
    const W = 800, H = 600, cx = W / 2, cy = H / 2;
    const r = Math.min(cx, cy) - 80;

    states.forEach(([id], i) => {
      const angle   = (2 * Math.PI * i) / states.length - Math.PI / 2;
      positions[id] = {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      };
    });

    // Agrupar transiciones entre mismos estados
    const edgeMap = {};
    trans.forEach(t => {
      const key = `${t.from}→${t.to}`;
      if (!edgeMap[key]) edgeMap[key] = { from: t.from, to: t.to, symbols: [] };
      edgeMap[key].symbols.push(t.symbol || 'ε');
    });

    // Generar SVG
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#2a5a3a"/>
    </marker>
    <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#00FF9C"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="#050505"/>
  <!-- Grid técnico -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,255,156,0.04)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <!-- Título -->
  <text x="16" y="28" font-family="monospace" font-size="12" fill="rgba(0,255,156,0.4)">
    FASS — ${local.type} — ${states.length} estados — ${trans.length} transiciones
  </text>`;

    // Dibujar aristas
    Object.values(edgeMap).forEach(edge => {
      const from = positions[edge.from];
      const to   = positions[edge.to];
      if (!from || !to) return;

      const label = edge.symbols.join(', ');

      if (edge.from === edge.to) {
        // Auto-loop
        const lx = from.x + 35, ly = from.y - 35;
        svg += `
  <path d="M ${from.x + 15},${from.y - 15} C ${lx + 30},${ly - 30} ${lx + 30},${ly + 10} ${from.x + 15},${from.y + 5}"
    fill="none" stroke="#2a5a3a" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="${lx + 20}" y="${ly - 10}" font-family="monospace" font-size="11" fill="#FFB000" text-anchor="middle">${label}</text>`;
      } else {
        // Arista normal con curvatura leve
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        // Vector perpendicular para curva
        const dx = to.x - from.x, dy = to.y - from.y;
        const len = Math.sqrt(dx*dx + dy*dy) || 1;
        const curve = 20;
        const cpx = mx - (dy / len) * curve;
        const cpy = my + (dx / len) * curve;

        // Ajustar punto final para no solapar con el círculo (r=28)
        const ratio = 28 / len;
        const ex = to.x - dx * ratio;
        const ey = to.y - dy * ratio;

        svg += `
  <path d="M ${from.x},${from.y} Q ${cpx},${cpy} ${ex},${ey}"
    fill="none" stroke="#2a5a3a" stroke-width="1.5" marker-end="url(#arrow)"/>
  <text x="${cpx}" y="${cpy - 6}" font-family="monospace" font-size="11" fill="#FFB000" text-anchor="middle">${label}</text>`;
      }
    });

    // Flecha de estado inicial
    const initState = local.initial;
    if (initState && positions[initState]) {
      const p = positions[initState];
      svg += `
  <line x1="${p.x - 55}" y1="${p.y}" x2="${p.x - 32}" y2="${p.y}"
    stroke="#00FF9C" stroke-width="2" marker-end="url(#arrow-active)"/>`;
    }

    // Dibujar nodos
    states.forEach(([id, info]) => {
      const p  = positions[id];
      if (!p) return;
      const isInit  = info.is_initial;
      const isFinal = info.is_final;
      const fill    = isInit ? '#0a1f0a' : isFinal ? '#0d2a0d' : '#0d1a0d';
      const stroke  = isInit || isFinal ? '#00FF9C' : '#00C97B';
      const glow    = isInit ? '0 0 14px rgba(0,255,156,0.5)' : '';

      svg += `
  <circle cx="${p.x}" cy="${p.y}" r="28" fill="${fill}" stroke="${stroke}" stroke-width="${isFinal ? 2.5 : 1.5}"
    ${isFinal ? 'stroke-dasharray="4,3"' : ''}/>`;

      // Doble círculo para estado final
      if (isFinal) {
        svg += `
  <circle cx="${p.x}" cy="${p.y}" r="22" fill="none" stroke="${stroke}" stroke-width="1" opacity="0.5"/>`;
      }

      // Etiqueta
      const label = (isInit ? '▶' : '') + id + (isFinal ? '◉' : '');
      svg += `
  <text x="${p.x}" y="${p.y + 5}" font-family="monospace" font-size="12"
    fill="${isInit ? '#00FF9C' : isFinal ? '#00C97B' : '#6aff9e'}" text-anchor="middle">${label}</text>`;
    });

    svg += '\n</svg>';
    _download(svg, `fass-automata-${Date.now()}.svg`, 'image/svg+xml');
    UI.log('ok', 'Grafo exportado como SVG');
  }

  // ── Exportar CSV ───────────────────────────────────────────────────────────
  /**
   * Exporta la tabla de transiciones como CSV.
   * Compatible con Excel, LibreOffice Calc y Google Sheets.
   *
   * Formato:
   *   Estado, [INICIAL], [FINAL], símbolo1, símbolo2, ...
   */
  function exportCSV() {
    const local    = Simulator.localState;
    const alphabet = [...new Set(
      local.transitions.map(t => t.symbol).filter(s => s !== '')
    )].sort();

    if (!Object.keys(local.states).length) {
      UI.log('err', 'Sin datos para exportar');
      return;
    }

    const header = ['Estado', 'Inicial', 'Final', ...alphabet].join(',');
    const rows   = Object.entries(local.states).map(([id, info]) => {
      const cells = alphabet.map(sym => {
        const targets = local.transitions
          .filter(t => t.from === id && t.symbol === sym)
          .map(t => t.to);
        return targets.length ? `"${targets.join('|')}"` : '∅';
      });
      return [id, info.is_initial ? 'SÍ' : 'NO', info.is_final ? 'SÍ' : 'NO', ...cells].join(',');
    });

    const csv = [header, ...rows].join('\n');
    _download(csv, `fass-tabla-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    UI.log('ok', 'Tabla de transiciones exportada como CSV');
  }

  // ── Exportar TXT (descripción formal) ─────────────────────────────────────
  /**
   * Exporta la definición formal del autómata como texto plano.
   * Útil para incluir en informes académicos.
   */
  function exportTXT() {
    const local    = Simulator.localState;
    const alphabet = [...new Set(
      local.transitions.map(t => t.symbol).filter(s => s !== '')
    )].sort();

    const finals   = [...local.finals];
    const states   = Object.keys(local.states);

    let txt = `═══════════════════════════════════════════════════════
FASS — Definición Formal del Autómata
═══════════════════════════════════════════════════════

Tipo:              ${local.type}
Fecha de exportación: ${new Date().toLocaleString('es-CO')}

─── Tupla formal M = (Q, Σ, δ, q0, F) ─────────────────

Q  (Estados):     { ${states.join(', ')} }
Σ  (Alfabeto):    { ${alphabet.join(', ') || '∅'} }
q0 (Inicial):     ${local.initial || '—'}
F  (Finales):     { ${finals.join(', ') || '∅'} }

─── Función de Transición δ ────────────────────────────

`;

    local.transitions.forEach(t => {
      txt += `  δ(${t.from.padEnd(6)}, '${t.symbol || 'ε'}')  →  ${t.to}\n`;
    });

    txt += `
─── Tabla de Transiciones ──────────────────────────────

`;
    const colW = 10;
    const header = '  Estado  '.padEnd(colW) + alphabet.map(a => a.padEnd(colW)).join('');
    txt += header + '\n';
    txt += '─'.repeat(header.length) + '\n';

    states.forEach(sid => {
      const info = local.states[sid];
      const mark = (info.is_initial ? '→' : ' ') + (info.is_final ? '*' : ' ');
      let row = `${mark} ${sid.padEnd(colW - 2)}`;
      alphabet.forEach(sym => {
        const targets = local.transitions.filter(t => t.from === sid && t.symbol === sym).map(t => t.to);
        row += (targets.length ? targets.join('|') : '∅').padEnd(colW);
      });
      txt += row + '\n';
    });

    txt += `
─── Leyenda ────────────────────────────────────────────
  →  Estado inicial
  *  Estado final (aceptación)
  ∅  Estado muerto (sin transición)

═══════════════════════════════════════════════════════
Generado por FASS v3 — Finite Automata Simulation System
═══════════════════════════════════════════════════════
`;

    _download(txt, `fass-definicion-${Date.now()}.txt`, 'text/plain;charset=utf-8;');
    UI.log('ok', 'Definición formal exportada como TXT');
  }

  return { exportPNG, exportSVG, exportCSV, exportTXT };

})();
