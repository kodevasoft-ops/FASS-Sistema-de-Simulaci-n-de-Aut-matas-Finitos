/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║       FASS v3 — Módulo Debugger de Simulación                           ║
 * ║                    Archivo: debugger.js                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ¿Para qué sirve?                                                        ║
 * ║  Permite depurar el recorrido del autómata paso a paso:                 ║
 * ║    • Avanzar UN paso hacia adelante                                      ║
 * ║    • Retroceder UN paso hacia atrás                                      ║
 * ║    • Colocar breakpoints en estados (pausa automática al llegar)        ║
 * ║    • Inspeccionar el estado interno en cada paso                         ║
 * ║    • Reproducción automática con velocidad configurable                  ║
 * ║    • Indicador de posición en la cadena con símbolo activo              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Debugger = (() => {

  // ── Estado interno ─────────────────────────────────────────────────────────
  let _steps      = [];      // Todos los pasos de la simulación actual
  let _cursor     = -1;      // Paso actual (-1 = no iniciado)
  let _string     = '';      // Cadena siendo depurada
  let _breakpoints= new Set(); // IDs de estados con breakpoint
  let _active     = false;   // ¿Hay una sesión de debug activa?
  let _autoTimer  = null;    // Timer de reproducción automática
  let _panel      = null;    // Referencia al panel DOM
  let _onStepCb   = null;    // Callback externo en cada paso

  // ── Estilos del debugger ───────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('dbg-styles')) return;
    const s = document.createElement('style');
    s.id = 'dbg-styles';
    s.textContent = `
      /* Panel flotante del debugger */
      #dbg-panel {
        position: fixed;
        bottom: 42px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 600;
        background: #080d08;
        border: 1px solid rgba(0,255,156,0.35);
        box-shadow: 0 0 30px rgba(0,255,156,0.12), 0 -4px 20px rgba(0,0,0,0.8);
        width: 680px;
        max-width: calc(100vw - 32px);
        display: none;
        flex-direction: column;
        font-family: 'Share Tech Mono', monospace;
        animation: dbg-slide-up 0.3s ease;
      }
      @keyframes dbg-slide-up {
        from { opacity:0; transform:translateX(-50%) translateY(12px); }
        to   { opacity:1; transform:translateX(-50%) translateY(0);    }
      }
      #dbg-panel.active { display: flex; }

      /* Header del panel */
      #dbg-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-bottom: 1px solid rgba(0,255,156,0.12);
        background: rgba(0,255,156,0.03);
      }
      #dbg-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 10px;
        color: #00FF9C;
        letter-spacing: 2px;
      }
      #dbg-string-display {
        flex: 1;
        font-family: 'VT323', monospace;
        font-size: 20px;
        letter-spacing: 3px;
        padding: 0 8px;
        color: #6aff9e;
        overflow: hidden;
        white-space: nowrap;
      }
      #dbg-step-counter {
        font-size: 10px;
        color: #3a6645;
        white-space: nowrap;
      }
      #dbg-close {
        background: transparent;
        border: 1px solid rgba(255,51,102,0.3);
        color: #FF3366;
        font-size: 11px;
        padding: 2px 8px;
        cursor: pointer;
        font-family: 'Share Tech Mono', monospace;
      }
      #dbg-close:hover { background: rgba(255,51,102,0.1); }

      /* Controles de navegación */
      #dbg-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-bottom: 1px solid rgba(0,255,156,0.08);
      }
      .dbg-btn {
        background: transparent;
        border: 1px solid rgba(0,255,156,0.2);
        color: #6aff9e;
        font-family: 'Share Tech Mono', monospace;
        font-size: 12px;
        padding: 5px 12px;
        cursor: pointer;
        transition: all 0.12s;
        white-space: nowrap;
      }
      .dbg-btn:hover:not(:disabled) {
        background: rgba(0,255,156,0.08);
        border-color: rgba(0,255,156,0.5);
        color: #00FF9C;
      }
      .dbg-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .dbg-btn.active {
        background: rgba(0,255,156,0.1);
        border-color: #00C97B;
        color: #00FF9C;
      }
      .dbg-btn.danger { border-color: rgba(255,51,102,0.3); color: #FF3366; }
      .dbg-btn.danger:hover { background: rgba(255,51,102,0.08); }

      /* Barra de progreso */
      #dbg-progress-wrap {
        flex: 1;
        height: 3px;
        background: rgba(0,255,156,0.08);
        border-radius: 2px;
        overflow: hidden;
        margin: 0 6px;
      }
      #dbg-progress-fill {
        height: 100%;
        background: #00C97B;
        box-shadow: 0 0 6px #00C97B;
        transition: width 0.2s ease;
      }

      /* Panel de inspección de estado */
      #dbg-inspector {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1px;
        background: rgba(0,255,156,0.06);
        border-top: 1px solid rgba(0,255,156,0.08);
      }
      .dbg-inspector-cell {
        background: #080d08;
        padding: 8px 12px;
      }
      .dbg-inspector-cell .lbl {
        font-size: 9px;
        color: #3a6645;
        letter-spacing: 1px;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .dbg-inspector-cell .val {
        font-family: 'VT323', monospace;
        font-size: 22px;
        color: #00FF9C;
        line-height: 1;
      }
      .dbg-inspector-cell .val.amber { color: #FFB000; }
      .dbg-inspector-cell .val.red   { color: #FF3366; }
      .dbg-inspector-cell .val.blue  { color: #00CFFF; }

      /* Indicador de breakpoint en nodos */
      .dbg-breakpoint-indicator {
        position: absolute;
        width: 8px; height: 8px;
        background: #FF3366;
        border-radius: 50%;
        box-shadow: 0 0 8px #FF3366;
        animation: bp-pulse 1s ease-in-out infinite;
      }
      @keyframes bp-pulse {
        0%,100% { opacity:1; box-shadow: 0 0 8px #FF3366; }
        50%      { opacity:0.5; box-shadow: 0 0 14px #FF3366; }
      }

      /* Botón de activar debugger en el header */
      #btn-debugger {
        margin-left: 6px;
        padding: 3px 10px;
        background: rgba(255,176,0,0.08);
        border: 1px solid rgba(255,176,0,0.3);
        color: #FFB000;
        font-family: 'Orbitron', sans-serif;
        font-size: 9px;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.15s;
      }
      #btn-debugger:hover { background: rgba(255,176,0,0.15); }
      #btn-debugger.active {
        background: rgba(255,176,0,0.2);
        border-color: #FFB000;
        box-shadow: 0 0 10px rgba(255,176,0,0.2);
      }

      /* Tooltip de breakpoint */
      .dbg-bp-badge {
        display: inline-block;
        width: 8px; height: 8px;
        background: #FF3366;
        border-radius: 50%;
        margin-right: 4px;
        box-shadow: 0 0 5px #FF3366;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Construcción del panel DOM ─────────────────────────────────────────────
  function _buildPanel() {
    if (document.getElementById('dbg-panel')) return;

    _panel = document.createElement('div');
    _panel.id = 'dbg-panel';
    _panel.innerHTML = `
      <div id="dbg-header">
        <span id="dbg-title">🔍 DEBUGGER</span>
        <div id="dbg-string-display"></div>
        <span id="dbg-step-counter">— / —</span>
        <button id="dbg-close">✕</button>
      </div>
      <div id="dbg-controls">
        <button class="dbg-btn" id="dbg-btn-restart" title="Reiniciar al inicio">⏮</button>
        <button class="dbg-btn" id="dbg-btn-prev"    title="Paso anterior">◀ PREV</button>
        <button class="dbg-btn" id="dbg-btn-next"    title="Siguiente paso">NEXT ▶</button>
        <button class="dbg-btn" id="dbg-btn-end"     title="Ir al final">⏭</button>
        <div id="dbg-progress-wrap"><div id="dbg-progress-fill" style="width:0%"></div></div>
        <button class="dbg-btn" id="dbg-btn-play"    title="Reproducción automática">▶▶ AUTO</button>
        <button class="dbg-btn danger" id="dbg-btn-bp" title="Agregar/quitar breakpoint en estado actual">⬤ BP</button>
      </div>
      <div id="dbg-inspector">
        <div class="dbg-inspector-cell">
          <div class="lbl">Estado Actual</div>
          <div class="val" id="dbg-val-state">—</div>
        </div>
        <div class="dbg-inspector-cell">
          <div class="lbl">Símbolo Leído</div>
          <div class="val amber" id="dbg-val-symbol">—</div>
        </div>
        <div class="dbg-inspector-cell">
          <div class="lbl">Estado Siguiente</div>
          <div class="val blue" id="dbg-val-next">—</div>
        </div>
      </div>
    `;
    document.body.appendChild(_panel);

    // Eventos
    document.getElementById('dbg-close').addEventListener('click', close);
    document.getElementById('dbg-btn-restart').addEventListener('click', restart);
    document.getElementById('dbg-btn-prev').addEventListener('click', stepBack);
    document.getElementById('dbg-btn-next').addEventListener('click', stepForward);
    document.getElementById('dbg-btn-end').addEventListener('click', goToEnd);
    document.getElementById('dbg-btn-play').addEventListener('click', _toggleAutoPlay);
    document.getElementById('dbg-btn-bp').addEventListener('click', _toggleBreakpointCurrent);

    // Teclado: flechas para navegar cuando el debugger está activo
    document.addEventListener('keydown', _onKey);
  }

  function _onKey(e) {
    if (!_active) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === 'F10') { e.preventDefault(); stepForward(); }
    if (e.key === 'ArrowLeft'  || e.key === 'F9')  { e.preventDefault(); stepBack(); }
    if (e.key === 'F5')  { e.preventDefault(); _toggleAutoPlay(); }
    if (e.key === 'F8')  { e.preventDefault(); _toggleBreakpointCurrent(); }
  }

  // ── Actualización visual del panel ─────────────────────────────────────────
  function _updatePanel() {
    if (!_panel || !_active) return;

    const total   = _steps.length;
    const current = _cursor >= 0 ? _steps[_cursor] : null;
    const pct     = total > 0 ? Math.round((_cursor + 1) / total * 100) : 0;

    // Contador
    document.getElementById('dbg-step-counter').textContent =
      `${Math.max(0, _cursor + 1)} / ${total}`;

    // Barra de progreso
    document.getElementById('dbg-progress-fill').style.width = `${pct}%`;

    // Inspector
    const isAFD = current && current.from_state !== undefined;
    const fromState = isAFD
      ? current?.from_state
      : (current?.from_states || []).join(',') || '—';
    const toState = isAFD
      ? (current?.to_state || '∅')
      : (current?.to_states || []).join(',') || '∅';
    const symbol = current?.symbol ?? '—';

    document.getElementById('dbg-val-state').textContent  = fromState || '—';
    document.getElementById('dbg-val-symbol').textContent = symbol === '' ? 'ε' : symbol;
    document.getElementById('dbg-val-next').textContent   =
      toState === null ? '∅' : (toState || '—');

    // Colorear estado siguiente según resultado
    const nextEl = document.getElementById('dbg-val-next');
    nextEl.className = 'val';
    if (current?.dead)     nextEl.classList.add('red');
    else if (current?.is_final) nextEl.classList.add('amber');
    else                   nextEl.classList.add('blue');

    // String display
    const strEl = document.getElementById('dbg-string-display');
    if (_string) {
      Animations.renderStringHighlight(strEl, _string, _cursor);
    } else {
      strEl.textContent = 'ε';
    }

    // Habilitar/deshabilitar botones
    document.getElementById('dbg-btn-prev').disabled    = _cursor <= 0;
    document.getElementById('dbg-btn-restart').disabled = _cursor <= 0;
    document.getElementById('dbg-btn-next').disabled    = _cursor >= total - 1;
    document.getElementById('dbg-btn-end').disabled     = _cursor >= total - 1;

    // Highlight en el grafo
    _applyGraphHighlight(current);
  }

  function _applyGraphHighlight(step) {
    if (!step) return;
    Graph.highlightNode(null, 'reset');

    if (step.from_state !== undefined) {
      // AFD
      if (step.from_state) Graph.highlightNode(step.from_state, 'visited');
      if (step.to_state)   Graph.highlightNode(step.to_state, step.dead ? 'dead' : 'active');
      if (step.from_state && step.to_state)
        Graph.highlightEdge(step.from_state, step.to_state, true);
    } else {
      // AFN
      (step.from_states || []).forEach(s => Graph.highlightNode(s, 'visited'));
      (step.to_states   || []).forEach(s => Graph.highlightNode(s, step.dead ? 'dead' : 'active'));
    }

    // Marcar breakpoints activos visualmente
    _breakpoints.forEach(bp => {
      const node = document.querySelector(`[title*="State: ${bp}"]`);
      if (node) node.style.outline = '2px solid #FF3366';
    });
  }

  // ── Auto-play ──────────────────────────────────────────────────────────────
  let _isPlaying = false;
  let _playSpeed = 600;

  function _toggleAutoPlay() {
    const btn = document.getElementById('dbg-btn-play');
    if (_isPlaying) {
      clearInterval(_autoTimer);
      _isPlaying = false;
      btn.textContent = '▶▶ AUTO';
      btn.classList.remove('active');
    } else {
      _isPlaying = true;
      btn.textContent = '⏸ PAUSA';
      btn.classList.add('active');
      _autoTimer = setInterval(() => {
        if (_cursor >= _steps.length - 1) {
          _toggleAutoPlay();
          return;
        }
        stepForward();
        // Pausar si hay breakpoint
        const step = _steps[_cursor];
        const state = step?.to_state || (step?.to_states || [])[0];
        if (state && _breakpoints.has(state)) {
          _toggleAutoPlay();
          UI.log('warn', `⬤ Breakpoint en estado [${state}]`);
        }
      }, _playSpeed);
    }
  }

  // ── Breakpoints ────────────────────────────────────────────────────────────
  function _toggleBreakpointCurrent() {
    const step  = _cursor >= 0 ? _steps[_cursor] : null;
    const state = step?.to_state || (step?.to_states || [])[0]
                  || step?.from_state || (step?.from_states || [])[0];
    if (!state) return;
    toggleBreakpoint(state);
  }

  function toggleBreakpoint(stateId) {
    if (_breakpoints.has(stateId)) {
      _breakpoints.delete(stateId);
      UI.log('info', `Breakpoint eliminado en [${stateId}]`);
    } else {
      _breakpoints.add(stateId);
      UI.log('warn', `⬤ Breakpoint agregado en [${stateId}]`);
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────

  /**
   * Inicia una sesión de debug con la cadena dada.
   * Obtiene los pasos del simulador y activa el panel.
   *
   * @param {string}   string  - Cadena a depurar
   * @param {Function} onStep  - Callback opcional en cada paso
   */
  async function start(string, onStep = null) {
    _injectStyles();
    _buildPanel();

    _string   = string;
    _cursor   = -1;
    _active   = true;
    _isPlaying= false;
    _onStepCb = onStep;

    // Obtener todos los pasos del simulador
    const res = await Simulator.getSteps(string);
    _steps = res.steps || res;

    _panel.classList.add('active');

    // Mostrar el estado inicial
    Graph.highlightNode(null, 'reset');
    const initial = Simulator.localState.initial;
    if (initial) Graph.highlightNode(initial, 'active');

    _updatePanel();
    UI.log('info', `🔍 Debugger activo — cadena: "${string || 'ε'}" — ${_steps.length} pasos`);
    UI.log('info', 'Usa ◀ PREV / NEXT ▶ o las teclas ← → para navegar');
  }

  /** Avanza un paso hacia adelante. */
  function stepForward() {
    if (_cursor < _steps.length - 1) {
      _cursor++;
      _updatePanel();
      if (_onStepCb) _onStepCb(_steps[_cursor], _cursor, _steps.length);
    }
  }

  /** Retrocede un paso hacia atrás. */
  function stepBack() {
    if (_cursor > 0) {
      _cursor--;
      _updatePanel();
    } else if (_cursor === 0) {
      _cursor = -1;
      Graph.highlightNode(null, 'reset');
      const initial = Simulator.localState.initial;
      if (initial) Graph.highlightNode(initial, 'active');
      document.getElementById('dbg-val-state').textContent  = '—';
      document.getElementById('dbg-val-symbol').textContent = '—';
      document.getElementById('dbg-val-next').textContent   = '—';
      document.getElementById('dbg-step-counter').textContent = `0 / ${_steps.length}`;
      document.getElementById('dbg-progress-fill').style.width = '0%';
      const strEl = document.getElementById('dbg-string-display');
      if (_string) Animations.renderStringHighlight(strEl, _string, -1);
    }
  }

  /** Reinicia al paso inicial. */
  function restart() {
    _cursor = -1;
    _updatePanel();
  }

  /** Salta al último paso. */
  function goToEnd() {
    _cursor = _steps.length - 1;
    _updatePanel();
  }

  /** Cierra el debugger y limpia el estado. */
  function close() {
    if (_autoTimer) clearInterval(_autoTimer);
    _active    = false;
    _isPlaying = false;
    _steps     = [];
    _cursor    = -1;
    if (_panel) _panel.classList.remove('active');
    Graph.highlightNode(null, 'reset');
    UI.log('info', 'Debugger cerrado');
  }

  /** Establece la velocidad del auto-play en ms. */
  function setSpeed(ms) { _playSpeed = ms; }

  return {
    start, stepForward, stepBack, restart, goToEnd, close,
    toggleBreakpoint, setSpeed,
    get active()      { return _active; },
    get breakpoints() { return _breakpoints; },
  };

})();
