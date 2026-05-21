/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║       FASS v3 — Editor de Alfabeto Σ y Validación de Completitud        ║
 * ║                      Archivo: alphabet.js                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ¿Para qué sirve?                                                        ║
 * ║  En teoría formal, el alfabeto Σ se define ANTES que las transiciones.  ║
 * ║  Este módulo permite:                                                    ║
 * ║    • Definir Σ explícitamente (no inferirlo de las transiciones)        ║
 * ║    • Detectar huecos: pares (estado, símbolo) sin transición definida   ║
 * ║    • Completar el AFD agregando el estado trampa ∅ automáticamente      ║
 * ║    • Mostrar advertencias en tiempo real al agregar transiciones        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const AlphabetEditor = (() => {

  // ── Alfabeto explícito definido por el usuario ─────────────────────────────
  // Si está vacío, se infiere de las transiciones (comportamiento v1/v2).
  let _explicit = new Set();

  // ── Estilos ────────────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('alph-styles')) return;
    const s = document.createElement('style');
    s.id = 'alph-styles';
    s.textContent = `
      /* Panel del editor de alfabeto */
      #alph-panel {
        position: fixed;
        top: 50%;
        right: 16px;
        transform: translateY(-50%);
        z-index: 500;
        width: 220px;
        background: #080d08;
        border: 1px solid rgba(0,255,156,0.25);
        box-shadow: 0 0 20px rgba(0,0,0,0.8);
        font-family: 'Share Tech Mono', monospace;
        display: none;
        flex-direction: column;
        animation: alph-in 0.25s ease;
      }
      @keyframes alph-in {
        from { opacity:0; transform:translateY(-50%) translateX(10px); }
        to   { opacity:1; transform:translateY(-50%) translateX(0);    }
      }
      #alph-panel.open { display: flex; }

      #alph-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid rgba(0,255,156,0.12);
        background: rgba(0,255,156,0.03);
      }
      #alph-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 10px;
        color: #00FF9C;
        letter-spacing: 2px;
      }
      #alph-close {
        background: transparent;
        border: none;
        color: #3a6645;
        font-size: 14px;
        cursor: pointer;
        padding: 0 4px;
      }
      #alph-close:hover { color: #FF3366; }

      #alph-body { padding: 10px 12px; }

      /* Chips de símbolos */
      #alph-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        min-height: 32px;
        margin-bottom: 10px;
      }
      .alph-chip {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border: 1px solid rgba(0,255,156,0.35);
        background: rgba(0,255,156,0.06);
        color: #00FF9C;
        font-size: 13px;
        font-family: 'VT323', monospace;
        letter-spacing: 1px;
      }
      .alph-chip .chip-del {
        background: transparent;
        border: none;
        color: #3a6645;
        cursor: pointer;
        font-size: 10px;
        padding: 0;
        line-height: 1;
      }
      .alph-chip .chip-del:hover { color: #FF3366; }

      /* Input de nuevo símbolo */
      #alph-input-row {
        display: flex;
        gap: 5px;
        margin-bottom: 10px;
      }
      #alph-sym-input {
        flex: 1;
        background: #050505;
        border: 1px solid rgba(0,255,156,0.2);
        color: #00FF9C;
        font-family: 'VT323', monospace;
        font-size: 18px;
        padding: 4px 8px;
        outline: none;
        text-align: center;
        letter-spacing: 2px;
        width: 40px;
      }
      #alph-sym-input:focus { border-color: #00C97B; }
      #alph-add-btn {
        flex: 1;
        background: rgba(0,255,156,0.06);
        border: 1px solid rgba(0,255,156,0.3);
        color: #00C97B;
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.12s;
      }
      #alph-add-btn:hover { background: rgba(0,255,156,0.12); color: #00FF9C; }

      /* Sección de completitud */
      #alph-completeness { margin-top: 8px; }
      .alph-section-lbl {
        font-size: 9px;
        color: #3a6645;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 6px;
        padding-bottom: 4px;
        border-bottom: 1px solid rgba(0,255,156,0.08);
      }
      .alph-gap-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 11px;
        border-bottom: 1px solid rgba(255,255,255,0.03);
        color: #c8ffd4;
      }
      .alph-gap-state { color: #00C97B; }
      .alph-gap-sym   { color: #FFB000; font-family: 'VT323', monospace; font-size: 16px; }
      .alph-gap-fix {
        background: transparent;
        border: 1px solid rgba(255,176,0,0.3);
        color: #FFB000;
        font-size: 9px;
        padding: 1px 5px;
        cursor: pointer;
        font-family: 'Share Tech Mono', monospace;
        transition: all 0.12s;
      }
      .alph-gap-fix:hover { background: rgba(255,176,0,0.1); }

      /* Botón "completar AFD" */
      #alph-complete-btn {
        width: 100%;
        margin-top: 8px;
        background: rgba(255,176,0,0.06);
        border: 1px solid rgba(255,176,0,0.3);
        color: #FFB000;
        font-family: 'Share Tech Mono', monospace;
        font-size: 10px;
        padding: 6px;
        cursor: pointer;
        transition: all 0.12s;
        letter-spacing: 0.5px;
      }
      #alph-complete-btn:hover { background: rgba(255,176,0,0.12); }

      /* Badge de completitud */
      #alph-status-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 9px;
        font-family: 'Orbitron', sans-serif;
        letter-spacing: 1px;
        border: 1px solid;
        margin-bottom: 8px;
      }
      #alph-status-badge.complete {
        color: #00FF9C;
        border-color: rgba(0,255,156,0.4);
        background: rgba(0,255,156,0.06);
      }
      #alph-status-badge.incomplete {
        color: #FFB000;
        border-color: rgba(255,176,0,0.4);
        background: rgba(255,176,0,0.06);
      }

      /* Botón en sidebar */
      #btn-alphabet {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 7px 10px;
        background: transparent;
        border: 1px solid rgba(0,207,255,0.15);
        color: #00CFFF;
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s;
        margin-bottom: 6px;
      }
      #btn-alphabet:hover {
        background: rgba(0,207,255,0.06);
        border-color: rgba(0,207,255,0.4);
      }
    `;
    document.head.appendChild(s);
  }

  // ── Construcción del panel ─────────────────────────────────────────────────
  function _buildPanel() {
    if (document.getElementById('alph-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'alph-panel';
    panel.innerHTML = `
      <div id="alph-header">
        <span id="alph-title">ALFABETO Σ</span>
        <button id="alph-close">✕</button>
      </div>
      <div id="alph-body">
        <div id="alph-chips"></div>
        <div id="alph-input-row">
          <input id="alph-sym-input" maxlength="3" placeholder="a" autocomplete="off">
          <button id="alph-add-btn">+ Agregar</button>
        </div>
        <div id="alph-status-badge" class="incomplete">INCOMPLETO</div>
        <div id="alph-completeness">
          <div class="alph-section-lbl">Huecos en δ</div>
          <div id="alph-gaps-list"></div>
          <button id="alph-complete-btn">⚡ Completar AFD (agregar ∅)</button>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    document.getElementById('alph-close').addEventListener('click', close);
    document.getElementById('alph-add-btn').addEventListener('click', _addSymbol);
    document.getElementById('alph-sym-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') _addSymbol();
    });
    document.getElementById('alph-complete-btn').addEventListener('click', completeAFD);
  }

  // ── Lógica ─────────────────────────────────────────────────────────────────

  function _addSymbol() {
    const input = document.getElementById('alph-sym-input');
    const sym   = input.value.trim();
    if (!sym) return;
    _explicit.add(sym);
    input.value = '';
    _render();
    UI.log('info', `Símbolo '${sym}' agregado al alfabeto Σ`);
  }

  function _removeSymbol(sym) {
    _explicit.delete(sym);
    _render();
    UI.log('info', `Símbolo '${sym}' eliminado del alfabeto Σ`);
  }

  /**
   * Calcula el alfabeto efectivo: unión de Σ explícito e inferido.
   * @returns {Set}
   */
  function getEffectiveAlphabet() {
    const local    = Simulator.localState;
    const inferred = new Set(local.transitions.map(t => t.symbol).filter(s => s !== ''));
    return new Set([..._explicit, ...inferred]);
  }

  /**
   * Detecta todos los huecos: pares (estado, símbolo) sin transición.
   * Un AFD es COMPLETO si para todo q ∈ Q y a ∈ Σ existe δ(q, a).
   *
   * @returns {Array} - [{ state, symbol }, ...]
   */
  function findGaps() {
    const local    = Simulator.localState;
    const alphabet = getEffectiveAlphabet();
    const gaps     = [];

    Object.keys(local.states).forEach(sid => {
      alphabet.forEach(sym => {
        const has = local.transitions.some(t => t.from === sid && t.symbol === sym);
        if (!has) gaps.push({ state: sid, symbol: sym });
      });
    });

    return gaps;
  }

  /**
   * Completa el AFD agregando un estado trampa ∅ y todas las
   * transiciones faltantes que apuntan a él.
   * El estado trampa es no-final y absorbe todos los rechazos implícitos.
   */
  async function completeAFD() {
    const gaps = findGaps();
    if (!gaps.length) {
      UI.log('ok', 'El AFD ya está completo — no hay huecos en δ');
      return;
    }

    const TRAP = '∅';

    // Agregar el estado trampa si no existe
    if (!Simulator.localState.states[TRAP]) {
      await Simulator.addState({ id: TRAP, name: '∅', is_initial: false, is_final: false });
      Graph.addNode({ id: TRAP, name: '∅', is_initial: false, is_final: false });
    }

    // Agregar transiciones faltantes → estado trampa
    let added = 0;
    for (const gap of gaps) {
      const res = await Simulator.addTransition(gap.state, gap.symbol, TRAP);
      if (res.ok !== false) {
        Graph.addEdge({ from: gap.state, symbol: gap.symbol, to: TRAP });
        added++;
      }
    }

    // Agregar auto-loop en ∅ para todo símbolo
    const alphabet = getEffectiveAlphabet();
    for (const sym of alphabet) {
      const has = Simulator.localState.transitions.some(
        t => t.from === TRAP && t.symbol === sym
      );
      if (!has) {
        await Simulator.addTransition(TRAP, sym, TRAP);
        Graph.addEdge({ from: TRAP, symbol: sym, to: TRAP });
      }
    }

    UI.log('ok', `AFD completado: ${added} transiciones → estado trampa ∅`);
    _render();
  }

  // ── Render del panel ───────────────────────────────────────────────────────
  function _render() {
    const alphabet = getEffectiveAlphabet();
    const gaps     = findGaps();
    const complete = gaps.length === 0 && alphabet.size > 0;

    // Chips
    const chipsEl = document.getElementById('alph-chips');
    if (chipsEl) {
      chipsEl.innerHTML = [...alphabet].sort().map(sym => `
        <div class="alph-chip">
          <span>${sym}</span>
          <button class="chip-del" data-sym="${sym}" title="Eliminar símbolo">✕</button>
        </div>
      `).join('') || '<span style="color:#3a6645;font-size:11px;">Sin símbolos definidos</span>';

      chipsEl.querySelectorAll('.chip-del').forEach(btn => {
        btn.addEventListener('click', () => _removeSymbol(btn.dataset.sym));
      });
    }

    // Badge de estado
    const badge = document.getElementById('alph-status-badge');
    if (badge) {
      badge.className = `alph-status-badge ${complete ? 'complete' : 'incomplete'}`;
      badge.textContent = complete ? '✓ AFD COMPLETO' : `⚠ ${gaps.length} HUECO(S)`;
    }

    // Lista de huecos
    const gapsList = document.getElementById('alph-gaps-list');
    if (gapsList) {
      if (!gaps.length) {
        gapsList.innerHTML = '<div style="color:#3a6645;font-size:11px;padding:4px 0;">Sin huecos — δ completa ✓</div>';
      } else {
        gapsList.innerHTML = gaps.slice(0, 8).map(g => `
          <div class="alph-gap-row">
            <span class="alph-gap-state">${g.state}</span>
            <span style="color:#3a6645;font-size:10px;">──</span>
            <span class="alph-gap-sym">${g.symbol}</span>
            <span style="color:#3a6645;">──▶</span>
            <span style="color:#FF3366;">∅</span>
            <button class="alph-gap-fix" data-state="${g.state}" data-sym="${g.symbol}">FIX</button>
          </div>
        `).join('') + (gaps.length > 8 ? `<div style="color:#3a6645;font-size:10px;padding:4px 0;">...y ${gaps.length - 8} más</div>` : '');

        gapsList.querySelectorAll('.alph-gap-fix').forEach(btn => {
          btn.addEventListener('click', async () => {
            const s = btn.dataset.state, a = btn.dataset.sym;
            const TRAP = '∅';
            if (!Simulator.localState.states[TRAP]) {
              await Simulator.addState({ id: TRAP, name: '∅', is_initial: false, is_final: false });
              Graph.addNode({ id: TRAP, name: '∅', is_initial: false, is_final: false });
            }
            await Simulator.addTransition(s, a, TRAP);
            Graph.addEdge({ from: s, symbol: a, to: TRAP });
            UI.log('ok', `Hueco corregido: δ(${s}, '${a}') → ∅`);
            _render();
          });
        });
      }
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────

  function open() {
    _injectStyles();
    _buildPanel();
    document.getElementById('alph-panel').classList.add('open');
    _render();
  }

  function close() {
    const p = document.getElementById('alph-panel');
    if (p) p.classList.remove('open');
  }

  /** Fuerza un re-render (llamar después de agregar estados/transiciones). */
  function refresh() {
    if (document.getElementById('alph-panel')?.classList.contains('open')) {
      _render();
    }
  }

  return { open, close, refresh, findGaps, getEffectiveAlphabet, completeAFD };

})();
