/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        FASS — Controlador de Interfaz de Usuario                        ║
 * ║                       Archivo: ui.js                                    ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  ¿Para qué sirve este módulo?                                            ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  Es el módulo que conecta la interfaz visual con la lógica:             ║
 * ║    • Escucha los eventos del usuario (clics, teclas, cambios)           ║
 * ║    • Abre y cierra los modales (ventanas emergentes)                    ║
 * ║    • Actualiza la consola con logs y trazas                             ║
 * ║    • Coordina Graph, Simulator y Animations durante la simulación       ║
 * ║    • Maneja las pestañas de la consola derecha                          ║
 * ║    • Actualiza la barra de estado inferior                              ║
 * ║                                                                          ║
 * ║  Patrón MVC aplicado:                                                    ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  • Model      → Simulator (datos y lógica del autómata)                 ║
 * ║  • View       → Graph + Animations (renderizado visual)                 ║
 * ║  • Controller → UI (este módulo: conecta Model y View)                  ║
 * ║                                                                          ║
 * ║  Dependencias: Simulator, Graph, Animations (deben cargarse antes)      ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const UI = (() => {

  // ── Atajo para getElementById ─────────────────────────────────────────────
  // Simplifica las referencias al DOM: $('id') en lugar de document.getElementById('id')
  const $ = id => document.getElementById(id);

  // ── Cache de referencias DOM ──────────────────────────────────────────────
  // Se llena en init(). Cachear referencias evita buscar el elemento en el DOM
  // cada vez que se necesita, lo que mejora el rendimiento en operaciones frecuentes.
  const dom = {};

  // ── Estado interno del UI ─────────────────────────────────────────────────
  let _activeTab    = 'log';   // Pestaña activa en la consola derecha
  let _selectedNode = null;    // ID del nodo seleccionado en el grafo (si hay)

  // ════════════════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa el módulo UI: cachea DOM, vincula eventos, arranca el reloj.
   *
   * ¿Por qué separar init() del constructor del módulo?
   * ─────────────────────────────────────────────────────────────────────────
   * El módulo IIFE se ejecuta al cargar el archivo, pero el DOM puede
   * no estar listo todavía. init() se llama explícitamente desde main()
   * en index.html, garantizando que el DOM está completamente cargado.
   *
   * Orden de llamada recomendado:
   *   1. Animations.runBoot()  → pantalla de arranque
   *   2. Simulator.init()      → verificar backend
   *   3. Graph.init()          → crear el grafo
   *   4. UI.init()             → este método
   */
  function init() {
    // ── Cachear todas las referencias DOM ────────────────────────────────
    Object.assign(dom, {
      app:            $('app'),
      bootScreen:     $('boot-screen'),
      headerMode:     $('header-mode'),
      headerClock:    $('header-clock'),
      sidebar:        $('sidebar'),
      sidebarToggle:  $('sidebar-toggle'),
      canvasArea:     $('canvas-area'),
      resultOverlay:  $('result-overlay'),
      validateInput:  $('validate-input'),
      speedRange:     $('speed-range'),
      speedLabel:     $('speed-label'),
      // Paneles de la consola
      panelLog:       $('panel-log'),
      panelTrace:     $('panel-trace'),
      panelTable:     $('panel-table'),
      panelStats:     $('panel-stats'),
      panelHistory:   $('panel-history'),
      // Modales
      modalState:     $('modal-state'),
      modalTrans:     $('modal-trans'),
      modalImport:    $('modal-import'),
      // Inputs del modal de estado
      stateIdInput:   $('state-id-input'),
      stateNameInput: $('state-name-input'),
      stateInitChk:   $('state-init-chk'),
      stateFinalChk:  $('state-final-chk'),
      // Inputs del modal de transición
      transFromSel:   $('trans-from-sel'),
      transSymInput:  $('trans-sym-input'),
      transToSel:     $('trans-to-sel'),
      // Modal de importar
      importTextarea: $('import-textarea'),
      // Botones de tipo AFD/AFN
      btnAFD:         $('btn-type-afd'),
      btnAFN:         $('btn-type-afn'),
      // Barra de estado
      statusStates:   $('status-states'),
      statusTrans:    $('status-trans'),
      statusType:     $('status-type'),
      statusMsg:      $('status-msg'),
    });

    _bindEvents();      // Vincular todos los listeners de eventos
    _startClock();      // Iniciar el reloj en el header
    _refreshStatus();   // Mostrar contadores iniciales en la statusbar
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VINCULACIÓN DE EVENTOS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Vincula todos los event listeners de la interfaz.
   *
   * ¿Qué es un event listener?
   * ─────────────────────────────────────────────────────────────────────────
   * Es una función que se ejecuta cuando ocurre un evento del usuario
   * (clic, tecla presionada, cambio de valor, etc.) en un elemento del DOM.
   * Se registra con addEventListener(tipo_evento, función_callback).
   *
   * Centralizar todos los listeners aquí hace el código más mantenible:
   * si necesitas cambiar el comportamiento de un botón, sabes exactamente
   * dónde buscarlo.
   */
  function _bindEvents() {

    // ── Selector de tipo (AFD / AFN) ────────────────────────────────────
    dom.btnAFD.addEventListener('click', () => _setType('AFD'));
    dom.btnAFN.addEventListener('click', () => _setType('AFN'));

    // ── Botones del sidebar ──────────────────────────────────────────────
    $('btn-add-state').addEventListener('click',   () => openModal('state'));
    $('btn-add-trans').addEventListener('click',   () => openModal('trans'));
    $('btn-reset').addEventListener('click',       _resetAll);
    $('btn-export').addEventListener('click',      _exportJSON);
    $('btn-import').addEventListener('click',      () => openModal('import'));
    $('btn-fit').addEventListener('click',         () => Graph.fit());
    $('btn-demo').addEventListener('click',        _runDemo);
    $('btn-validate-trigger').addEventListener('click', () => dom.validateInput.focus());

    // ── Validación con tecla Enter ───────────────────────────────────────
    // El usuario escribe la cadena en el input y presiona Enter para validar.
    dom.validateInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') _triggerValidation();
    });

    // ── Control de velocidad de animación ────────────────────────────────
    // El slider va de 100 a 950. Se invierte para que "más a la derecha"
    // sea más rápido: delay = 1050 - valor_slider
    dom.speedRange.addEventListener('input', () => {
      const v  = parseInt(dom.speedRange.value);
      const ms = 1050 - v;
      Simulator.setSpeed(ms);
      // Mostrar velocidad en formato "Nx" (ej: "2x", "5x")
      dom.speedLabel.textContent = `${Math.round(1000 / ms)}x`;
    });

    // ── Pestañas de la consola ───────────────────────────────────────────
    document.querySelectorAll('.console-tab').forEach(tab => {
      tab.addEventListener('click', () => _switchTab(tab.dataset.tab));
    });

    // ── Modales: cerrar al hacer clic fuera ──────────────────────────────
    // Si el usuario hace clic en el overlay oscuro (fuera del modal), se cierra.
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('click', e => {
        if (e.target === bd) closeModal();   // Solo si clic en el backdrop, no en el modal
      });
    });

    // ── Botones de confirmación de modales ───────────────────────────────
    $('btn-state-confirm').addEventListener('click',  _submitState);
    $('btn-trans-confirm').addEventListener('click',  _submitTransition);
    $('btn-import-confirm').addEventListener('click', _submitImport);

    // ── Botones de cancelar (todos los modales) ──────────────────────────
    document.querySelectorAll('.btn-modal-cancel').forEach(b => {
      b.addEventListener('click', closeModal);
    });

    // ── Toggle de sidebar en móvil ────────────────────────────────────────
    dom.sidebarToggle.addEventListener('click', () => {
      dom.sidebar.classList.toggle('open');
    });

    // ── Tecla Escape: cerrar modal o cancelar simulación ─────────────────
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeModal();
        if (Simulator.isRunning()) {
          Simulator.abort();
          log('warn', 'Simulación cancelada por el usuario');
        }
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // TIPO DE AUTÓMATA
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Cambia el tipo de autómata y actualiza los indicadores visuales.
   *
   * Actualiza:
   *   - Los botones AFD/AFN (clase 'active' al seleccionado)
   *   - El badge del header que muestra el tipo actual
   *   - El indicador en la statusbar inferior
   *
   * @param {string} type - 'AFD' o 'AFN'
   */
  async function _setType(type) {
    const res = await Simulator.setType(type);
    if (res.ok !== false) {
      dom.btnAFD.classList.toggle('active', type === 'AFD');
      dom.btnAFN.classList.toggle('active', type === 'AFN');
      dom.headerMode.textContent  = type;
      dom.statusType.textContent  = type;
      log('info', `Modo cambiado a ${type}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODALES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Abre el modal especificado y lo prepara para su uso.
   *
   * ¿Qué es un modal?
   * ─────────────────────────────────────────────────────────────────────────
   * Un modal es una ventana emergente que aparece sobre la interfaz principal,
   * bloqueando la interacción con el fondo hasta que se cierre.
   * Se implementa como un div con posición fija que cubre toda la pantalla.
   *
   * Tipos de modal en FASS:
   *   'state'  → Formulario para crear un nuevo estado
   *   'trans'  → Formulario para crear una nueva transición
   *   'import' → Área de texto para pegar JSON del autómata
   *
   * @param {string} which - Qué modal abrir: 'state', 'trans' o 'import'
   */
  function openModal(which) {
    closeModal();   // Cerrar cualquier modal previo

    if (which === 'state') {
      // Pre-rellenar: si no hay estados aún, el primero es inicial por defecto
      dom.stateIdInput.value    = '';
      dom.stateNameInput.value  = '';
      dom.stateInitChk.checked  = Object.keys(Simulator.localState.states).length === 0;
      dom.stateFinalChk.checked = false;
      dom.modalState.classList.add('open');
      // Enfocar el primer campo después de que el modal esté visible
      setTimeout(() => dom.stateNameInput.focus(), 100);

    } else if (which === 'trans') {
      _populateStateSelects();   // Llenar los selects con los estados existentes
      dom.transSymInput.value = '';
      dom.modalTrans.classList.add('open');
      setTimeout(() => dom.transSymInput.focus(), 100);

    } else if (which === 'import') {
      dom.importTextarea.value = '';
      dom.modalImport.classList.add('open');
      setTimeout(() => dom.importTextarea.focus(), 100);
    }
  }

  /**
   * Cierra todos los modales abiertos.
   * Simplemente quita la clase 'open' de todos los backdrops.
   */
  function closeModal() {
    document.querySelectorAll('.modal-backdrop').forEach(b => b.classList.remove('open'));
  }

  /**
   * Rellena los selectores de estado en el modal de transiciones.
   *
   * Los <select> del modal necesitan tener una opción por cada estado
   * existente en el autómata. Se regeneran cada vez que se abre el modal
   * para reflejar los estados actuales.
   */
  function _populateStateSelects() {
    const states = Object.entries(Simulator.localState.states);
    const options = states.map(([id, s]) =>
      `<option value="${id}">${id}: ${s.name}</option>`
    ).join('');

    dom.transFromSel.innerHTML = options;
    dom.transToSel.innerHTML   = options;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ENVÍO DE FORMULARIOS DE MODALES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Procesa el formulario de creación de estado.
   *
   * Flujo:
   *   1. Validar que el nombre no esté vacío.
   *   2. Generar ID automático si no se ingresó uno.
   *   3. Llamar a Simulator.addState().
   *   4. Si es exitoso: agregar nodo al grafo, cerrar modal, actualizar stats.
   *   5. Si falla: animar el campo con shake y mostrar error en consola.
   */
  async function _submitState() {
    const name = dom.stateNameInput.value.trim();
    if (!name) {
      _shake(dom.stateNameInput);   // Animación de error
      return;
    }

    const id  = dom.stateIdInput.value.trim() || `q${Object.keys(Simulator.localState.states).length}`;
    const res = await Simulator.addState({
      id,
      name,
      is_initial: dom.stateInitChk.checked,
      is_final:   dom.stateFinalChk.checked,
    });

    if (res.ok === false) {
      log('err', res.msg || 'Error al crear el estado');
      _shake(dom.stateNameInput);
      return;
    }

    // Construir objeto estado para el grafo (usar res.state si viene del backend)
    const state = res.state || {
      id, name,
      is_initial: dom.stateInitChk.checked,
      is_final:   dom.stateFinalChk.checked
    };

    Graph.addNode(state);   // Añadir el nodo visualmente al grafo
    closeModal();
    log('ok', `Estado [${state.id}] creado${state.is_initial ? ' — INICIAL' : ''}${state.is_final ? ' — FINAL' : ''}`);
    _refreshStatus();
    _refreshTable();
  }

  /**
   * Procesa el formulario de creación de transición.
   *
   * Flujo:
   *   1. Obtener from, symbol y to del formulario.
   *   2. Llamar a Simulator.addTransition().
   *   3. Si es exitoso: agregar arista al grafo, cerrar modal, actualizar tabla.
   *   4. Si falla (ej: AFD con transición duplicada): mostrar error.
   *
   * Nota sobre el símbolo épsilon:
   *   Si el campo de símbolo se deja vacío en modo AFN, se crea una
   *   transición épsilon (ε). En modo AFD esto no está permitido.
   */
  async function _submitTransition() {
    const from   = dom.transFromSel.value;
    const symbol = dom.transSymInput.value;   // Puede ser '' para épsilon en AFN
    const to     = dom.transToSel.value;

    if (!from || !to) {
      _shake(dom.transFromSel);
      return;
    }

    const res = await Simulator.addTransition(from, symbol, to);
    if (res.ok === false) {
      log('err', res.msg || 'Error en la transición');
      _shake(dom.transSymInput);
      return;
    }

    Graph.addEdge({ from, symbol, to });   // Añadir la flecha al grafo
    closeModal();
    log('ok', `Transición (${from}, '${symbol || 'ε'}') → ${to}`);
    _refreshStatus();
    _refreshTable();
  }

  /**
   * Procesa el JSON pegado en el modal de importación.
   *
   * Flujo:
   *   1. Parsear el JSON del textarea.
   *   2. Llamar a Simulator.importJSON() para cargar los datos.
   *   3. Renderizar el grafo completo con Graph.render().
   *   4. Actualizar el tipo, estadísticas y tabla.
   *   5. Si el JSON es inválido: mostrar error y animación de shake.
   *
   * ¿Por qué usar try/catch?
   * JSON.parse() lanza una excepción si el texto no es JSON válido.
   * try/catch captura ese error y lo muestra al usuario sin romper la app.
   */
  async function _submitImport() {
    try {
      const data    = JSON.parse(dom.importTextarea.value);
      await Simulator.importJSON(data);
      const automata = await Simulator.getAutomata();
      Graph.render(automata);
      await _setType(automata.type);
      closeModal();
      log('ok', `Importado: ${automata.states.length} estados, ${automata.transitions.length} transiciones`);
      _refreshStatus();
      _refreshTable();
      _refreshStats();
    } catch (e) {
      log('err', 'JSON inválido: ' + e.message);
      _shake(dom.importTextarea);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SIMULACIÓN Y VALIDACIÓN
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Inicia la validación animada de la cadena ingresada.
   *
   * ¿Qué hace exactamente?
   * ─────────────────────────────────────────────────────────────────────────
   * 1. Toma la cadena del input de validación.
   * 2. Limpia el grafo (resetea highlights del paso anterior).
   * 3. Cambia a la pestaña TRACE de la consola.
   * 4. Resalta el estado inicial en el grafo.
   * 5. Llama a Simulator.runAnimated() que ejecuta los pasos con delays.
   * 6. En cada paso (onStep): actualiza el grafo y la traza de la consola.
   * 7. Al terminar (onDone): muestra el resultado y actualiza el historial.
   *
   * Cadena vacía (""):
   *   Es válida y representa la cadena épsilon (ε).
   *   Se muestra como "ε" en los logs para mayor claridad.
   */
  async function _triggerValidation() {
    if (Simulator.isRunning()) return;   // No iniciar si ya hay simulación

    const string  = dom.validateInput.value;
    const display = string === '' ? 'ε' : string;

    log('info', `Validando: "${display}"`);
    _switchTab('trace');                  // Cambiar a la pestaña de traza
    dom.panelTrace.innerHTML = '';        // Limpiar traza anterior

    // Limpiar highlights del grafo anterior
    Graph.highlightNode(null, 'reset');
    dom.resultOverlay.className = '';

    // ── Encabezado de la traza ────────────────────────────────────────
    const traceHeader = document.createElement('div');
    traceHeader.style.cssText = 'margin-bottom:8px;font-size:11px;color:var(--text3);';
    traceHeader.innerHTML = `Cadena: <span id="string-display" style="font-family:var(--font-mono);letter-spacing:3px;color:var(--green);">${display}</span>`;
    dom.panelTrace.appendChild(traceHeader);

    // Resaltar el estado inicial en el grafo
    const initial = Simulator.localState.initial;
    if (initial) Graph.highlightNode(initial, 'active');

    // ── Ejecutar simulación animada ───────────────────────────────────
    await Simulator.runAnimated(
      string,

      // ── onStep: callback en cada paso individual ──────────────────
      // Se llama una vez por símbolo leído, con el delay de animación entre cada llamada.
      (step, idx, total) => {
        // Actualizar el highlight del símbolo activo en la cadena
        const strDisp = $('string-display');
        if (strDisp && string) {
          Animations.renderStringHighlight(strDisp, string, step.index);
        }

        if (step.from_state !== undefined) {
          // ── Paso AFD: un solo estado origen y destino ──────────────
          Graph.highlightNode(step.from_state, 'visited');

          if (step.to_state) {
            Graph.highlightEdge(step.from_state, step.to_state, true);
            Graph.highlightNode(step.to_state, step.dead ? 'dead' : 'active');
          }
          _addTraceStep(step, idx);

        } else {
          // ── Paso AFN: conjuntos de estados ─────────────────────────
          (step.from_states || []).forEach(s => Graph.highlightNode(s, 'visited'));
          (step.to_states   || []).forEach(s => Graph.highlightNode(s, step.dead ? 'dead' : 'active'));
          _addTraceStepAFN(step, idx);
        }
      },

      // ── onDone: callback al terminar toda la simulación ───────────
      (result) => {
        const acc = result.accepted;
        Animations.showResult(dom.resultOverlay, acc);
        log(acc ? 'ok' : 'err', `"${display}" → ${acc ? 'ACEPTADA ✓' : 'RECHAZADA ✗'}`);

        // Resaltar el estado final con el color apropiado
        const finalState = result.current || (result.final_states || [])[0];
        if (finalState && finalState !== '∅') {
          Graph.highlightNode(finalState, acc ? 'final' : 'dead');
        }

        _refreshHistory();   // Actualizar la pestaña de historial
      }
    );
  }

  /**
   * Agrega una fila de traza al panel TRACE para un paso AFD.
   *
   * Muestra: número de paso, estado origen, símbolo leído, flecha, estado destino.
   * Si el destino es estado final, agrega un badge "FINAL".
   * Si es estado muerto, agrega un badge "MUERTO" en rojo.
   *
   * @param {Object} step - Paso de simulación del AFD
   * @param {number} idx  - Índice del paso (0-based)
   */
  function _addTraceStep(step, idx) {
    const el = document.createElement('div');
    el.className = `step-item ${step.dead ? 'dead' : ''}`;
    el.innerHTML = `
      <span class="step-num">${idx + 1}</span>
      <span class="step-state">${step.from_state}</span>
      <span class="step-sym">${step.symbol || 'ε'}</span>
      <span class="step-arrow">→</span>
      <span class="step-state">${step.to_state || '∅'}</span>
      ${step.is_final ? '<span class="tag tag-green" style="margin-left:4px;font-size:9px;">FINAL</span>' : ''}
      ${step.dead     ? '<span class="tag tag-red"   style="margin-left:4px;font-size:9px;">MUERTO</span>' : ''}
    `;
    dom.panelTrace.appendChild(el);
    dom.panelTrace.scrollTop = dom.panelTrace.scrollHeight;
  }

  /**
   * Agrega una fila de traza para un paso AFN (con conjuntos de estados).
   *
   * El AFN puede estar en múltiples estados simultáneamente, por eso
   * se muestran como conjuntos: {q0, q1} → símbolo → {q1, q2}
   *
   * @param {Object} step - Paso de simulación del AFN
   * @param {number} idx  - Índice del paso
   */
  function _addTraceStepAFN(step, idx) {
    const el   = document.createElement('div');
    el.className = `step-item ${step.dead ? 'dead' : ''}`;
    const from = `{${(step.from_states || []).join(', ')}}`;
    const to   = step.dead ? '∅' : `{${(step.to_states || []).join(', ')}}`;
    el.innerHTML = `
      <span class="step-num">${idx + 1}</span>
      <span class="step-state" style="font-size:10px;">${from}</span>
      <span class="step-sym">${step.symbol || 'ε'}</span>
      <span class="step-arrow">→</span>
      <span class="step-state" style="font-size:10px;">${to}</span>
      ${step.is_final ? '<span class="tag tag-green" style="margin-left:4px;font-size:9px;">FINAL</span>' : ''}
    `;
    dom.panelTrace.appendChild(el);
    dom.panelTrace.scrollTop = dom.panelTrace.scrollHeight;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RESET, EXPORT Y DEMO
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Reinicia completamente la simulación: borra todos los estados, transiciones
   * y limpia el grafo y la consola.
   *
   * Pide confirmación al usuario antes de proceder, ya que la acción
   * no puede deshacerse.
   */
  async function _resetAll() {
    if (!confirm('¿Reiniciar el autómata? Esta acción no se puede deshacer.')) return;
    await Simulator.reset();
    Graph.clear();
    dom.panelLog.innerHTML     = '';
    dom.panelTrace.innerHTML   = '';
    dom.panelTable.innerHTML   = '';
    dom.panelHistory.innerHTML = '';
    dom.resultOverlay.className = '';
    dom.validateInput.value    = '';
    log('warn', 'Simulación reiniciada — todos los estados eliminados');
    _refreshStatus();
  }

  /**
   * Exporta el autómata actual como archivo JSON descargable.
   *
   * ¿Cómo funciona la descarga en el navegador?
   * ─────────────────────────────────────────────────────────────────────────
   * 1. Crear un Blob (Binary Large Object) con el JSON como texto.
   * 2. Crear una URL temporal que apunta a ese Blob (URL.createObjectURL).
   * 3. Crear un enlace <a> invisible con esa URL y el atributo download.
   * 4. Simular un clic en el enlace para disparar la descarga.
   * 5. Liberar la URL temporal (URL.revokeObjectURL) para evitar memory leaks.
   */
  async function _exportJSON() {
    const data = await Simulator.exportJSON();
    if (!data) { log('err', 'No hay datos para exportar'); return; }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `fass-automata-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    log('ok', 'Autómata exportado como JSON');
  }

  /**
   * Carga el autómata de demostración predefinido.
   *
   * El demo es el AFD clásico de la materia:
   * "Cadenas sobre {a,b} que terminan en 'abb'"
   * Es el ejemplo estándar para introducir los AFD en teoría de compiladores.
   *
   * Después de cargarlo, el usuario puede:
   *   - Probar la cadena "aabb" → ACEPTADA
   *   - Probar la cadena "ab"   → RECHAZADA
   *   - Ver la tabla de transiciones en la pestaña TABLE
   */
  async function _runDemo() {
    if (Simulator.isRunning()) return;
    log('info', 'Cargando demo: AFD para (a|b)*abb');

    // Definición completa del autómata de ejemplo en formato JSON
    const demo = {
      type: 'AFD',
      states: [
        { id: 'q0', name: 'q0', is_initial: true,  is_final: false },
        { id: 'q1', name: 'q1', is_initial: false, is_final: false },
        { id: 'q2', name: 'q2', is_initial: false, is_final: false },
        { id: 'q3', name: 'q3', is_initial: false, is_final: true  },
      ],
      transitions: [
        { from: 'q0', symbol: 'a', to: 'q1' },
        { from: 'q0', symbol: 'b', to: 'q0' },
        { from: 'q1', symbol: 'a', to: 'q1' },
        { from: 'q1', symbol: 'b', to: 'q2' },
        { from: 'q2', symbol: 'a', to: 'q1' },
        { from: 'q2', symbol: 'b', to: 'q3' },
        { from: 'q3', symbol: 'a', to: 'q1' },
        { from: 'q3', symbol: 'b', to: 'q0' },
      ],
      initial: 'q0',
      finals:  ['q3'],
    };

    await Simulator.importJSON(demo);
    const automata = await Simulator.getAutomata();
    Graph.render(automata);
    await _setType('AFD');
    dom.validateInput.value = 'aabb';
    log('ok', 'Demo cargado — prueba "aabb" (acepta) o "ab" (rechaza)');
    _refreshStatus();
    _refreshTable();
    _refreshStats();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONSOLA: LOGS Y TABS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Agrega una entrada al log de la consola técnica (panel LOG).
   *
   * Tipos disponibles:
   *   'ok'   → Verde:  operación exitosa
   *   'err'  → Rojo:   error o rechazo
   *   'warn' → Ámbar:  advertencia
   *   'info' → Azul:   información del sistema
   *   ''     → Gris:   mensaje neutro
   *
   * También actualiza el mensaje de la statusbar inferior.
   *
   * @param {string} type - Tipo del log (determina el color)
   * @param {string} msg  - Mensaje a mostrar
   */
  function log(type, msg) {
    // Crear el elemento de log con timestamp
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;

    const now = new Date();
    const ts  = `[${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}]`;

    entry.innerHTML = `<span class="ts">${ts}</span><span class="msg">${msg}</span>`;
    dom.panelLog.appendChild(entry);
    dom.panelLog.scrollTop = dom.panelLog.scrollHeight;   // Scroll al final

    // Mostrar resumen en la barra de estado
    dom.statusMsg.textContent = msg.substring(0, 55);
  }

  /**
   * Cambia la pestaña activa de la consola derecha.
   *
   * Las pestañas son: LOG, TRACE, TABLE, STATS, HIST
   * Cada una muestra un panel diferente con información distinta.
   * Al cambiar a STATS o HISTORY, se recarga el contenido dinámicamente.
   *
   * @param {string} tab - ID de la pestaña: 'log', 'trace', 'table', 'stats', 'history'
   */
  function _switchTab(tab) {
    _activeTab = tab;

    // Actualizar clases de los botones de pestaña
    document.querySelectorAll('.console-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Mostrar solo el panel correspondiente
    document.querySelectorAll('.console-panel').forEach(p => {
      p.classList.toggle('active', p.id === `panel-${tab}`);
    });

    // Recargar contenido bajo demanda (evita cargas innecesarias)
    if (tab === 'stats')   _refreshStats();
    if (tab === 'history') _refreshHistory();
    if (tab === 'table')   _refreshTable();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTUALIZACIÓN DE PANELES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Actualiza los contadores de la statusbar inferior.
   * Se llama después de agregar/eliminar estados o transiciones.
   */
  function _refreshStatus() {
    const s = Simulator.localState;
    dom.statusStates.textContent = Object.keys(s.states).length;
    dom.statusTrans.textContent  = s.transitions.length;
    dom.statusType.textContent   = s.type;
  }

  /**
   * Actualiza el panel STATS con las estadísticas del autómata actual.
   *
   * Muestra tarjetas con:
   *   - Total de estados
   *   - Total de transiciones
   *   - Tamaño del alfabeto |Σ|
   *   - Número de estados finales
   *   - Propiedades booleanas (¿tiene inicial? ¿está completo? ¿tiene épsilon?)
   */
  async function _refreshStats() {
    const stats = await Simulator.getStats();
    dom.panelStats.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-val">${stats.total_states || 0}</div>
          <div class="stat-lbl">Estados |Q|</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-val">${stats.total_transitions || 0}</div>
          <div class="stat-lbl">Transiciones</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-val">${stats.alphabet_size || 0}</div>
          <div class="stat-lbl">Alfabeto |Σ|</div>
        </div>
        <div class="stat-card ${stats.final_states ? '' : 'red'}">
          <div class="stat-val">${stats.final_states || 0}</div>
          <div class="stat-lbl">Estados finales |F|</div>
        </div>
      </div>
      <div style="margin-top:8px;">
        <div class="sidebar-section-title">ALFABETO Σ</div>
        <div style="padding:4px 0;">
          ${(stats.alphabet || []).map(s =>
            `<span class="tag tag-amber">${s || 'ε'}</span>`
          ).join('') || '<span class="text-dim">— vacío —</span>'}
        </div>
      </div>
      <div style="margin-top:10px;">
        <div class="sidebar-section-title">PROPIEDADES</div>
        ${_statRow('Estado inicial definido',  stats.has_initial)}
        ${_statRow('Tiene transiciones ε',     stats.has_epsilon)}
        ${_statRow('AFD completo (δ total)',   stats.is_complete)}
      </div>
    `;
  }

  /**
   * Genera una fila de propiedad booleana para el panel de estadísticas.
   * Muestra el nombre de la propiedad y un badge YES/NO con color.
   *
   * @param {string}  label - Nombre de la propiedad
   * @param {boolean} val   - Valor (true = YES verde, false = NO rojo)
   * @returns {string}      - HTML de la fila
   */
  function _statRow(label, val) {
    const cls = val ? 'tag-green' : 'tag-red';
    const txt = val ? 'SÍ' : 'NO';
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:4px 0;font-size:11px;border-bottom:1px solid var(--border);">
        <span style="color:var(--text2);">${label}</span>
        <span class="tag ${cls}">${txt}</span>
      </div>
    `;
  }

  /**
   * Actualiza el panel TABLE con la tabla de transiciones actual.
   * Formato: Estado | Símbolo | → | Destino
   *
   * Muestra un estado vacío si no hay transiciones definidas.
   */
  function _refreshTable() {
    const s = Simulator.localState;

    if (!s.transitions.length) {
      dom.panelTable.innerHTML = `
        <div class="empty-state">
          <div class="icon">⊘</div>
          Sin transiciones definidas
        </div>`;
      return;
    }

    const rows = s.transitions.map(t => `
      <tr>
        <td class="state-id">${t.from}</td>
        <td class="sym">${t.symbol || 'ε'}</td>
        <td class="arrow">→</td>
        <td class="state-id">${t.to}</td>
      </tr>
    `).join('');

    dom.panelTable.innerHTML = `
      <table class="trans-table">
        <thead>
          <tr>
            <th>DESDE</th>
            <th>SÍM</th>
            <th></th>
            <th>HACIA</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  /**
   * Actualiza el panel HIST con el historial de simulaciones.
   *
   * Muestra las últimas validaciones realizadas con:
   *   - La cadena validada
   *   - El tipo de autómata usado
   *   - El resultado (ACEPTADA / RECHAZADA)
   *
   * Al hacer clic en una entrada del historial, se repite esa simulación
   * automáticamente (llama a replayHistory).
   */
  async function _refreshHistory() {
    const hist = await Simulator.getHistory();

    if (!hist.length) {
      dom.panelHistory.innerHTML = `
        <div class="empty-state">
          <div class="icon">⊘</div>
          Sin simulaciones aún
        </div>`;
      return;
    }

    dom.panelHistory.innerHTML = hist.map(h => `
      <div class="hist-item" onclick="UI.replayHistory('${h.string}')">
        <div class="hist-string">${h.string || 'ε (vacía)'}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;">
          <span class="text-dim" style="font-size:10px;">${h.type || ''}</span>
          <span class="hist-result ${h.accepted ? 'acc' : 'rej'}">
            ${h.accepted ? '✓ ACEPTADA' : '✗ RECHAZADA'}
          </span>
        </div>
      </div>
    `).join('');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CALLBACKS Y UTILIDADES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Callback llamado por Graph cuando el usuario selecciona un nodo.
   * Muestra información del estado en el log de la consola.
   *
   * @param {string} id - ID del nodo seleccionado
   */
  function onNodeSelected(id) {
    _selectedNode = id;
    const state   = Simulator.localState.states[id];
    if (state) {
      log('info', `Seleccionado: [${id}] ${state.name}` +
        `${state.is_initial ? ' [INICIAL]' : ''}` +
        `${state.is_final   ? ' [FINAL]'   : ''}`);
    }
  }

  /** Callback llamado cuando se deselecciona un nodo en el grafo. */
  function clearNodeHighlight() { _selectedNode = null; }

  /**
   * Repite la simulación de una cadena del historial.
   * Se llama desde el HTML cuando el usuario hace clic en una entrada del historial.
   *
   * @param {string} string - Cadena a re-validar
   */
  function replayHistory(string) {
    dom.validateInput.value = string;
    _triggerValidation();
  }

  /**
   * Inicia el reloj en tiempo real del header.
   * Se actualiza cada segundo mostrando la hora actual en formato HH:MM:SS.
   */
  function _startClock() {
    function tick() {
      dom.headerClock.textContent = new Date().toLocaleTimeString('es-CO', { hour12: false });
    }
    tick();
    setInterval(tick, 1000);
  }

  /**
   * Aplica una animación de "sacudida" (shake) a un elemento.
   * Se usa para indicar visualmente que hay un error en un campo de formulario.
   *
   * La keyframe @keyframes shake está inyectada al final de este módulo.
   *
   * @param {HTMLElement} el - Elemento a animar
   */
  function _shake(el) {
    el.style.animation = 'none';
    el.offsetHeight;   // Forzar reflow del DOM para reiniciar la animación
    el.style.animation = 'shake 0.3s ease';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }

  // ── Inyectar keyframe de shake ────────────────────────────────────────────
  // Se ejecuta al cargar el módulo. Agrega la animación al DOM una sola vez.
  const _shakeStyle = document.createElement('style');
  _shakeStyle.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0);   }
      20%      { transform: translateX(-4px);}
      40%      { transform: translateX(4px); }
      60%      { transform: translateX(-3px);}
      80%      { transform: translateX(3px); }
    }
  `;
  document.head.appendChild(_shakeStyle);

  // ── API pública del módulo ────────────────────────────────────────────────
  // Solo estas funciones son accesibles desde otros módulos o desde el HTML.
  return {
    init,
    openModal,
    closeModal,
    log,
    onNodeSelected,
    clearNodeHighlight,
    replayHistory,
  };

})();
