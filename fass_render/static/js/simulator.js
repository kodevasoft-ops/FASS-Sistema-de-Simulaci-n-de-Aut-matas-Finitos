/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        FASS — Motor de Simulación Cliente                               ║
 * ║                    Archivo: simulator.js                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  ¿Para qué sirve este módulo?                                            ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  Es el CEREBRO del frontend. Tiene dos responsabilidades:               ║
 * ║                                                                          ║
 * ║  1. MODO BACKEND (con Flask corriendo en localhost:5000):               ║
 * ║     Envía peticiones HTTP al servidor Python y recibe los resultados.   ║
 * ║     El servidor hace todos los cálculos del autómata.                   ║
 * ║                                                                          ║
 * ║  2. MODO LOCAL (sin servidor, solo con el navegador):                   ║
 * ║     Implementa toda la lógica de AFD y AFN directamente en JavaScript.  ║
 * ║     El usuario no nota diferencia: la app funciona igual en ambos modos.║
 * ║                                                                          ║
 * ║  También controla la simulación animada:                                 ║
 * ║     • Obtiene los pasos individuales de la validación                   ║
 * ║     • Los ejecuta uno a uno con un delay configurable                   ║
 * ║     • Llama a callbacks para que el UI y el grafo se animen             ║
 * ║                                                                          ║
 * ║  Patrón: módulo IIFE con estado interno privado                         ║
 * ║  Dependencias: ninguna directa (usa fetch API nativa del navegador)     ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Simulator = (() => {

  // ── Configuración de la API ────────────────────────────────────────────────
  // URL base del servidor Flask. El frontend usa rutas relativas a esta base.
  // ── URL de la API ────────────────────────────────────────────────────────────
  // En producción (Render): mismo dominio, ruta relativa /api
  // En desarrollo local: localhost:5000 (backend Flask separado)
  // La detección es automática basándose en window.location
  const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';

  // Flag que indica si usar el motor local (true) o el backend Flask (false).
  // Se determina automáticamente al iniciar probando si el servidor responde.
  let _useLocal = false;

  // ── Estado local del autómata ──────────────────────────────────────────────
  // Replica el estado del backend en el navegador.
  // Sirve como fuente de verdad cuando se usa modo local,
  // y como caché/espejo cuando se usa con backend.
  //
  // Estructura:
  //   type        → 'AFD' o 'AFN'
  //   states      → { id: { name, is_initial, is_final } }
  //   transitions → [ { from, symbol, to }, ... ]
  //   initial     → ID del estado inicial (o null)
  //   finals      → Set de IDs de estados finales
  const local = {
    type:        'AFD',
    states:      {},
    transitions: [],
    initial:     null,
    finals:      new Set(),
  };

  // ── Control de velocidad de animación ────────────────────────────────────
  // Milisegundos de pausa entre cada paso de la simulación animada.
  // Más bajo = más rápido. Se controla con el slider del UI.
  let _stepDelay = 500;

  // ── Control de simulación en curso ───────────────────────────────────────
  // _simRunning: evita lanzar dos simulaciones al mismo tiempo.
  // _simAbort:   permite cancelar la simulación con la tecla Escape.
  let _simRunning = false;
  let _simAbort   = false;

  // ════════════════════════════════════════════════════════════════════════════
  // UTILIDADES HTTP
  // Funciones auxiliares para comunicarse con el backend Flask.
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Envía una petición POST al servidor con datos JSON.
   *
   * ¿Qué es fetch()?
   * ─────────────────────────────────────────────────────────────────────────
   * fetch() es la API nativa del navegador para hacer peticiones HTTP.
   * Es asíncrona: devuelve una Promise que se resuelve cuando el servidor
   * responde. Se usa con await para esperar la respuesta.
   *
   * @param {string} path - Ruta relativa a la API. Ej: '/state', '/validate'
   * @param {Object} body - Datos a enviar como JSON
   * @returns {Promise<Object>} - Respuesta del servidor como objeto JS
   */
  async function _post(path, body) {
    const r = await fetch(`${API}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    return r.json();
  }

  /**
   * Envía una petición GET al servidor y retorna la respuesta JSON.
   *
   * @param {string} path - Ruta relativa a la API. Ej: '/automata', '/stats'
   * @returns {Promise<Object>} - Respuesta del servidor como objeto JS
   */
  async function _get(path) {
    const r = await fetch(`${API}${path}`);
    return r.json();
  }

  /**
   * Verifica si el servidor Flask está disponible.
   *
   * Usa AbortSignal.timeout(1500) para que la petición falle después de
   * 1.5 segundos si el servidor no responde (en lugar de esperar indefinidamente).
   * Si falla, activa el modo local automáticamente.
   */
  async function _checkBackend() {
    try {
      await fetch(`${API}/status`, { signal: AbortSignal.timeout(1500) });
      _useLocal = false;
    } catch {
      _useLocal = true;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MOTOR LOCAL — Lógica AFD en JavaScript
  // Se usa cuando el servidor Flask no está disponible.
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Construye la tabla de transición δ desde el estado local.
   *
   * Convierte la lista de transiciones en un diccionario para búsqueda rápida.
   * Para AFN, cada clave puede tener múltiples destinos.
   *
   * Estructura resultante:
   *   { "q0::a": ["q1"], "q0::b": ["q0"], "q1::a": ["q1", "q2"] }
   *
   * @returns {Object} - Tabla de transición como diccionario
   */
  function _localDelta() {
    const d = {};
    local.transitions.forEach(t => {
      const k = `${t.from}::${t.symbol}`;
      if (!d[k]) d[k] = [];
      d[k].push(t.to);
    });
    return d;
  }

  /**
   * Calcula la cerradura épsilon de un conjunto de estados (solo AFN).
   *
   * ¿Qué es la cerradura épsilon?
   * ─────────────────────────────────────────────────────────────────────────
   * Es el conjunto de todos los estados alcanzables desde los dados
   * siguiendo SOLO transiciones épsilon (sin leer ningún símbolo).
   *
   * Algoritmo DFS iterativo:
   * 1. Iniciar con el conjunto de estados dado.
   * 2. Para cada estado, buscar transiciones con símbolo '' (épsilon).
   * 3. Agregar los destinos al conjunto y continuar desde ellos.
   * 4. Repetir hasta que no haya más estados nuevos.
   *
   * @param {Array}  states - Estados de partida
   * @param {Object} delta  - Tabla de transición (de _localDelta())
   * @returns {Set} - Cerradura épsilon
   */
  function _localEpsilonClosure(states, delta) {
    const closure = new Set(states);
    const stack   = [...states];

    while (stack.length) {
      const s = stack.pop();
      const k = `${s}::`;               // Clave para transiciones épsilon (símbolo vacío)
      (delta[k] || []).forEach(t => {
        if (!closure.has(t)) {
          closure.add(t);
          stack.push(t);               // Explorar recursivamente
        }
      });
    }
    return closure;
  }

  /**
   * Valida una cadena usando el motor local (sin backend).
   *
   * Implementa el algoritmo completo de simulación tanto para AFD como AFN:
   *
   * AFD: Lee símbolo por símbolo, siguiendo una única transición por paso.
   *      Si no hay transición → estado muerto → RECHAZADA.
   *
   * AFN: Mantiene un conjunto de estados activos. En cada símbolo:
   *      1. move(estados_activos, símbolo) → nuevos estados posibles
   *      2. ε-closure(nuevos_estados)      → expandir por épsilons
   *      Si el conjunto resultante es vacío → RECHAZADA.
   *
   * @param {string} string - Cadena a validar
   * @returns {Object} - { accepted, path, current/final_states }
   */
  function _localValidate(string) {
    const delta = _localDelta();
    const path  = [];

    if (!local.initial) return { accepted: false, path, error: 'Sin estado inicial' };

    if (local.type === 'AFD') {
      // ── Simulación AFD ─────────────────────────────────────────────────
      let cur = local.initial;
      path.push({ state: cur, symbol: null, step: 0 });

      for (let i = 0; i < string.length; i++) {
        const sym = string[i];
        const k   = `${cur}::${sym}`;
        const targets = delta[k];

        if (!targets || !targets.length) {
          // Sin transición → estado muerto
          path.push({ state: '∅', symbol: sym, step: i + 1 });
          return { accepted: false, path, dead: true, rejected_at: i };
        }

        cur = targets[0];    // AFD: tomar el ÚNICO destino
        path.push({ state: cur, symbol: sym, step: i + 1 });
      }

      return { accepted: local.finals.has(cur), path, current: cur };

    } else {
      // ── Simulación AFN ─────────────────────────────────────────────────
      let cur = _localEpsilonClosure([local.initial], delta);
      path.push({ states: [...cur], symbol: null, step: 0 });

      for (let i = 0; i < string.length; i++) {
        const sym = string[i];
        const moved = new Set();

        // Mover todos los estados activos con el símbolo leído
        cur.forEach(s => {
          const k = `${s}::${sym}`;
          (delta[k] || []).forEach(t => moved.add(t));
        });

        // Expandir por épsilons
        cur = _localEpsilonClosure([...moved], delta);
        path.push({ states: [...cur], symbol: sym, step: i + 1, dead: cur.size === 0 });
        if (!cur.size) break;    // Sin estados activos → muerto
      }

      const accepted = [...cur].some(s => local.finals.has(s));
      return { accepted, path, final_states: [...cur] };
    }
  }

  /**
   * Genera pasos detallados para animación usando el motor local.
   *
   * Misma lógica que _localValidate() pero devuelve cada movimiento
   * individual en el formato que necesita la animación del grafo.
   *
   * @param {string} string - Cadena a procesar
   * @returns {Array} - Lista de pasos individuales
   */
  function _localStepByStep(string) {
    const delta = _localDelta();
    const steps = [];
    if (!local.initial) return steps;

    if (local.type === 'AFD') {
      let cur = local.initial;
      for (let i = 0; i < string.length; i++) {
        const sym     = string[i];
        const targets = delta[`${cur}::${sym}`];

        if (!targets || !targets.length) {
          steps.push({ index: i, symbol: sym, from_state: cur, to_state: null, valid: false, dead: true });
          break;
        }

        const to = targets[0];
        steps.push({ index: i, symbol: sym, from_state: cur, to_state: to,
                     valid: true, dead: false, is_final: local.finals.has(to) });
        cur = to;
      }
    } else {
      let cur = _localEpsilonClosure([local.initial], delta);
      for (let i = 0; i < string.length; i++) {
        const sym  = string[i];
        const prev = [...cur];
        const moved = new Set();
        cur.forEach(s => (delta[`${s}::${sym}`] || []).forEach(t => moved.add(t)));
        cur = _localEpsilonClosure([...moved], delta);
        steps.push({ index: i, symbol: sym, from_states: prev, to_states: [...cur],
                     valid: cur.size > 0, dead: cur.size === 0,
                     is_final: [...cur].some(s => local.finals.has(s)) });
        if (!cur.size) break;
      }
    }
    return steps;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SINCRONIZACIÓN DE ESTADO LOCAL
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Actualiza el estado local con un nuevo estado del autómata.
   * Se llama tanto en modo local como en modo backend (para mantener
   * el espejo local sincronizado).
   */
  function _syncLocalState(state) {
    local.states[state.id] = {
      name: state.name, is_initial: state.is_initial, is_final: state.is_final
    };
    if (state.is_initial) local.initial = state.id;
    if (state.is_final)   local.finals.add(state.id);
  }

  function _syncLocalTransition(t) {
    local.transitions.push(t);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // API PÚBLICA DEL MÓDULO
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa el simulador: verifica disponibilidad del backend.
   *
   * Debe llamarse una sola vez al arrancar la aplicación, después
   * del boot screen y antes de interactuar con el grafo.
   */
  async function init() {
    await _checkBackend();
    if (!_useLocal) {
      try {
        const status = await _get('/status');
        Console && Console.log('ok', `Backend ONLINE — v${status.version}`);
      } catch { _useLocal = true; }
    }
  }

  /**
   * Cambia el tipo de autómata (AFD o AFN).
   *
   * @param {string} type - 'AFD' o 'AFN'
   * @returns {Promise<Object>} - { ok, type }
   */
  async function setType(type) {
    local.type = type;
    if (_useLocal) return { ok: true, type };
    try { return _post('/type', { type }); }
    catch { return { ok: true, type }; }
  }

  /**
   * Crea un nuevo estado en el autómata.
   *
   * Primero actualiza el estado local, luego sincroniza con el backend.
   * Si el backend rechaza (estado duplicado), deshace el cambio local.
   *
   * @param {Object} opts - { id?, name, is_initial, is_final }
   * @returns {Promise<Object>} - { ok, state } o { ok:false, msg }
   */
  async function addState(opts) {
    const id    = opts.id || `q${Object.keys(local.states).length}`;
    const state = { id, name: opts.name || id, is_initial: !!opts.is_initial, is_final: !!opts.is_final };
    _syncLocalState(state);

    if (_useLocal) return { ok: true, state };

    try {
      const res = await _post('/state', state);
      if (!res.ok) delete local.states[id];   // Deshacer si backend rechazó
      return res;
    } catch { return { ok: true, state }; }
  }

  /**
   * Elimina un estado y todas sus transiciones asociadas.
   *
   * @param {string} id - ID del estado a eliminar
   * @returns {Promise<Object>} - { ok }
   */
  async function deleteState(id) {
    delete local.states[id];
    local.transitions = local.transitions.filter(t => t.from !== id && t.to !== id);
    local.finals.delete(id);
    if (local.initial === id) local.initial = null;
    if (_useLocal) return { ok: true };
    try { return _post(`/state/${id}`, {}); } catch { return { ok: true }; }
  }

  /**
   * Agrega una transición al autómata.
   *
   * En modo AFD, valida que no exista ya una transición (from, symbol)
   * para garantizar el determinismo antes de enviarla al servidor.
   *
   * @param {string} from   - Estado de origen
   * @param {string} symbol - Símbolo ('' = épsilon para AFN)
   * @param {string} to     - Estado de destino
   * @returns {Promise<Object>} - { ok, transition } o { ok:false, msg }
   */
  async function addTransition(from, symbol, to) {
    if (local.type === 'AFD') {
      const dup = local.transitions.find(t => t.from === from && t.symbol === symbol);
      if (dup) return { ok: false, msg: `AFD: ya existe (${from}, '${symbol}')` };
    }

    const t = { from, symbol, to };
    _syncLocalTransition(t);

    if (_useLocal) return { ok: true, transition: t };

    try {
      const res = await _post('/transition', t);
      if (!res.ok) local.transitions.pop();   // Deshacer si backend rechazó
      return res;
    } catch { return { ok: true, transition: t }; }
  }

  /**
   * Retorna la definición completa del autómata actual.
   * Usa el estado local en modo offline, o consulta el servidor en modo backend.
   *
   * @returns {Promise<Object>} - { type, states, transitions, initial, finals }
   */
  async function getAutomata() {
    if (_useLocal) {
      return {
        type:        local.type,
        states:      Object.entries(local.states).map(([id, s]) => ({ id, ...s })),
        transitions: local.transitions,
        initial:     local.initial,
        finals:      [...local.finals],
      };
    }
    try { return _get('/automata'); } catch { return null; }
  }

  /**
   * Valida una cadena y retorna el resultado completo.
   *
   * @param {string} string - Cadena a validar
   * @returns {Promise<Object>} - { accepted, path, current/final_states }
   */
  async function validate(string) {
    if (_useLocal) return _localValidate(string);
    try { return _post('/validate', { string }); }
    catch { return _localValidate(string); }
  }

  /**
   * Obtiene los pasos individuales para la animación.
   *
   * @param {string} string - Cadena a procesar
   * @returns {Promise<Object>} - { ok, steps: [...] }
   */
  async function getSteps(string) {
    if (_useLocal) return { ok: true, steps: _localStepByStep(string) };
    try { return _post('/validate/step', { string }); }
    catch { return { ok: true, steps: _localStepByStep(string) }; }
  }

  /**
   * Obtiene el historial de simulaciones del servidor.
   * Retorna array vacío en modo local (no hay persistencia).
   */
  async function getHistory() {
    if (_useLocal) return [];
    try { return _get('/history'); } catch { return []; }
  }

  /**
   * Obtiene estadísticas estructurales del autómata.
   * En modo local calcula estadísticas básicas sin el validador Python.
   */
  async function getStats() {
    if (_useLocal) {
      const alphabet = [...new Set(local.transitions.filter(t => t.symbol).map(t => t.symbol))];
      return {
        total_states:      Object.keys(local.states).length,
        total_transitions: local.transitions.length,
        alphabet,
        alphabet_size: alphabet.length,
        final_states:  local.finals.size,
        has_initial:   !!local.initial,
      };
    }
    try { return _get('/stats'); } catch { return { total_states: 0, total_transitions: 0, alphabet: [] }; }
  }

  /**
   * Exporta el autómata actual como objeto JSON.
   * @returns {Promise<Object>} - Definición completa del autómata
   */
  async function exportJSON() {
    if (_useLocal) {
      return {
        type:        local.type,
        states:      Object.entries(local.states).map(([id, s]) => ({ id, ...s })),
        transitions: local.transitions,
        initial:     local.initial,
        finals:      [...local.finals],
      };
    }
    try { return _get('/export'); } catch { return null; }
  }

  /**
   * Importa un autómata desde un objeto JSON, reemplazando el actual.
   *
   * @param {Object} data - Definición del autómata en formato FASS
   * @returns {Promise<Object>} - { ok }
   */
  async function importJSON(data) {
    // Siempre importar al estado local primero
    local.type        = data.type || 'AFD';
    local.states      = {};
    local.transitions = data.transitions || [];
    local.initial     = data.initial || null;
    local.finals      = new Set(data.finals || []);

    (data.states || []).forEach(s => {
      local.states[s.id] = {
        name: s.name || s.id, is_initial: s.is_initial, is_final: s.is_final
      };
    });

    if (_useLocal) return { ok: true };
    try { return _post('/import', data); } catch { return { ok: true }; }
  }

  /**
   * Reinicia completamente el autómata (estados, transiciones, historial).
   * @returns {Promise<Object>} - { ok }
   */
  async function reset() {
    local.states      = {};
    local.transitions = [];
    local.initial     = null;
    local.finals      = new Set();
    if (_useLocal) return { ok: true };
    try { return _post('/reset', {}); } catch { return { ok: true }; }
  }

  // ── Control de velocidad y estado de simulación ───────────────────────────

  /** Establece el delay entre pasos de animación en milisegundos. */
  function setSpeed(ms) { _stepDelay = ms; }

  /** Retorna el delay actual de animación. */
  function getSpeed()   { return _stepDelay; }

  /** Retorna true si hay una simulación en curso. */
  function isRunning()  { return _simRunning; }

  /**
   * Cancela la simulación en curso.
   * El flag _simAbort es leído en el loop de runAnimated().
   */
  function abort()      { _simAbort = true; }

  // ── runAnimated ──────────────────────────────────────────────────────────
  /**
   * Ejecuta la simulación animada paso a paso.
   *
   * ¿Cómo funciona?
   * ─────────────────────────────────────────────────────────────────────────
   * 1. Obtiene todos los pasos de la simulación (getSteps).
   * 2. Los ejecuta uno por uno con un delay entre cada uno (_stepDelay ms).
   * 3. En cada paso llama a onStep() para que el UI y el grafo se actualicen.
   * 4. Al terminar todos los pasos, valida la cadena y llama a onDone().
   * 5. Si el usuario presiona Escape, _simAbort se pone en true y el loop
   *    se detiene prematuramente.
   *
   * ¿Por qué usar async/await con delays?
   * En JavaScript, todo corre en un solo hilo. Para "pausar" entre pasos
   * sin bloquear el navegador, se usa await con una Promise que se resuelve
   * después de `_stepDelay` milisegundos usando setTimeout().
   *
   * @param {string}   string  - Cadena a simular
   * @param {Function} onStep  - Llamado en cada paso: (step, index, total)
   * @param {Function} onDone  - Llamado al terminar: (result)
   */
  async function runAnimated(string, onStep, onDone) {
    if (_simRunning) return;    // Evitar simulaciones simultáneas
    _simRunning = true;
    _simAbort   = false;

    const stepsRes = await getSteps(string);
    const steps    = stepsRes.steps || stepsRes;

    // Ejecutar cada paso con delay entre ellos
    for (let i = 0; i < steps.length; i++) {
      if (_simAbort) break;        // El usuario canceló con Escape
      onStep(steps[i], i, steps.length);
      await _delay(_stepDelay);    // Pausa antes del siguiente paso
    }

    // Al terminar, validar y notificar resultado
    if (!_simAbort) {
      const result = await validate(string);
      onDone(result);
    }

    _simRunning = false;
    _simAbort   = false;
  }

  /**
   * Promesa de espera de `ms` milisegundos.
   * Implementa el sleep() que permite pausar entre pasos de animación.
   */
  function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    init, setType, addState, deleteState, addTransition,
    getAutomata, validate, getSteps, getHistory, getStats,
    exportJSON, importJSON, reset,
    setSpeed, getSpeed, isRunning, abort, runAnimated,
    // Propiedades de solo lectura para otros módulos
    get useLocal()   { return _useLocal; },
    get localState() { return local; },
  };

})();
