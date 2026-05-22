/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║      FASS v2 — Módulo de Algoritmos Formales                            ║
 * ║                    Archivo: algorithms.js                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Expone en el frontend los 3 algoritmos formales del backend:           ║
 * ║    1. Construcción de Subconjuntos  (AFN → AFD)                        ║
 * ║    2. Minimización de Hopcroft      (AFD → AFD mínimo)                 ║
 * ║    3. Construcción de Thompson      (Regex → AFN)                      ║
 * ║  + Verificación de equivalencia entre autómatas                         ║
 * ║  + Generación de cadena de ejemplo aceptada                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Algorithms = (() => {

  // URL dinámica: relativa en producción, localhost en desarrollo
  const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api';

  async function _post(path, body) {
    const r = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  }

  async function _get(path) {
    const r = await fetch(`${API}${path}`);
    return r.json();
  }

  // ── Implementaciones locales (fallback sin backend) ────────────────────────

  /**
   * Construcción de subconjuntos local (JavaScript).
   * Replica la lógica de subset_construction.py para modo offline.
   */
  function _localSubsetConstruction(data) {
    const { states, transitions, initial, finals } = data;
    const finalsSet = new Set(finals);

    // Tabla de transición del AFN
    const deltaNFA = {};
    transitions.forEach(t => {
      if (!deltaNFA[t.from]) deltaNFA[t.from] = {};
      if (!deltaNFA[t.from][t.symbol]) deltaNFA[t.from][t.symbol] = [];
      deltaNFA[t.from][t.symbol].push(t.to);
    });

    // Alfabeto (sin épsilon)
    const alphabet = [...new Set(transitions.map(t => t.symbol).filter(s => s !== ''))].sort();

    function epsilonClosure(stateSet) {
      const closure = new Set(stateSet);
      const stack = [...stateSet];
      while (stack.length) {
        const s = stack.pop();
        ((deltaNFA[s] || {})[''] || []).forEach(t => {
          if (!closure.has(t)) { closure.add(t); stack.push(t); }
        });
      }
      return closure;
    }

    function move(stateSet, symbol) {
      const result = new Set();
      stateSet.forEach(s => ((deltaNFA[s] || {})[symbol] || []).forEach(t => result.add(t)));
      return result;
    }

    function subsetName(subset) {
      if (!subset.size) return '∅';
      const parts = [...subset].sort();
      return parts.length === 1 ? parts[0] : '{' + parts.join(',') + '}';
    }

    const initialSubset = epsilonClosure(new Set([initial]));
    const initialName   = subsetName(initialSubset);

    const dfa_states      = new Map(); // nombre → subset
    const dfa_transitions = [];
    const queue           = [initialSubset];
    const processed       = new Set();
    const subsetTable     = [];

    dfa_states.set(initialName, initialSubset);

    while (queue.length) {
      const current = queue.shift();
      const curName = subsetName(current);
      if (processed.has(curName)) continue;
      processed.add(curName);

      const row = { subset: curName, is_initial: curName === initialName,
                    is_final: [...current].some(s => finalsSet.has(s)), transitions: {} };

      alphabet.forEach(a => {
        const moved   = move(current, a);
        const reached = epsilonClosure(moved);
        const rName   = subsetName(reached);

        row.transitions[a] = rName;
        dfa_transitions.push({ from: curName, symbol: a, to: rName });

        if (!processed.has(rName) && !queue.find(q => subsetName(q) === rName)) {
          dfa_states.set(rName, reached);
          queue.push(reached);
        }
      });

      subsetTable.push(row);
    }

    const stateList = [];
    dfa_states.forEach((subset, name) => {
      stateList.push({
        id: name, name,
        is_initial: name === initialName,
        is_final: [...subset].some(s => finalsSet.has(s))
      });
    });

    const state_map = {};
    dfa_states.forEach((subset, name) => { state_map[name] = [...subset].sort(); });

    return {
      states: stateList, transitions: dfa_transitions,
      initial: initialName,
      finals: stateList.filter(s => s.is_final).map(s => s.id),
      alphabet, subset_table: subsetTable, state_map
    };
  }

  /**
   * Construcción de Thompson local (JavaScript).
   * Parsea la regex y construye el AFN-ε.
   */
  function _localThompson(regex) {
    let counter = 0;
    const newState = () => `s${counter++}`;
    const addT = (list, f, sym, t) => list.push({ from: f, symbol: sym, to: t });

    function nfaSymbol(sym) {
      const s = newState(), e = newState(), ts = [];
      addT(ts, s, sym, e);
      return { start: s, end: e, states: [s, e], transitions: ts };
    }

    function concat(n1, n2) {
      const ts = [...n1.transitions, ...n2.transitions];
      addT(ts, n1.end, '', n2.start);
      return { start: n1.start, end: n2.end, states: [...n1.states, ...n2.states], transitions: ts };
    }

    function union(n1, n2) {
      const ns = newState(), ne = newState(), ts = [...n1.transitions, ...n2.transitions];
      addT(ts, ns, '', n1.start); addT(ts, ns, '', n2.start);
      addT(ts, n1.end, '', ne);   addT(ts, n2.end, '', ne);
      return { start: ns, end: ne, states: [ns, ne, ...n1.states, ...n2.states], transitions: ts };
    }

    function kleene(n) {
      const ns = newState(), ne = newState(), ts = [...n.transitions];
      addT(ts, ns, '', n.start); addT(ts, ns, '', ne);
      addT(ts, n.end, '', n.start); addT(ts, n.end, '', ne);
      return { start: ns, end: ne, states: [ns, ne, ...n.states], transitions: ts };
    }

    // Agregar operador de concatenación explícito
    function addConcat(re) {
      let r = '';
      for (let i = 0; i < re.length; i++) {
        r += re[i];
        if (i + 1 < re.length) {
          const c = re[i], n = re[i+1];
          if (!['(','|'].includes(c) && ![')',  '|', '*', '+', '?'].includes(n))
            r += '·';
        }
      }
      return r;
    }

    function toPostfix(re) {
      const prec = { '|': 1, '·': 2, '*': 3, '+': 3, '?': 3 };
      const out = [], stack = [];
      for (const ch of re) {
        if (ch === '(') { stack.push(ch); }
        else if (ch === ')') {
          while (stack.length && stack[stack.length-1] !== '(') out.push(stack.pop());
          stack.pop();
        } else if (prec[ch] !== undefined) {
          while (stack.length && stack[stack.length-1] !== '(' &&
                 prec[stack[stack.length-1]] >= prec[ch]) out.push(stack.pop());
          stack.push(ch);
        } else { out.push(ch); }
      }
      while (stack.length) out.push(stack.pop());
      return out.join('');
    }

    try {
      const normalized = regex.replace(/ε/g, '\x00');
      const postfix = toPostfix(addConcat(normalized));
      const stack = [];
      for (const ch of postfix) {
        if (ch === '*') { stack.push(kleene(stack.pop())); }
        else if (ch === '+') { const n = stack.pop(); stack.push(concat(n, kleene({ ...n, states: [...n.states], transitions: [...n.transitions] }))); }
        else if (ch === '?') { const n = stack.pop(); stack.push(union(n, nfaSymbol(''))); }
        else if (ch === '·') { const n2 = stack.pop(), n1 = stack.pop(); stack.push(concat(n1, n2)); }
        else if (ch === '|') { const n2 = stack.pop(), n1 = stack.pop(); stack.push(union(n1, n2)); }
        else { stack.push(nfaSymbol(ch === '\x00' ? '' : ch)); }
      }

      if (!stack.length) throw new Error('Expresión vacía');
      const nfa = stack[0];
      const alphabet = [...new Set(nfa.transitions.map(t => t.symbol).filter(s => s !== ''))].sort();

      return {
        states: nfa.states.map(s => ({
          id: s, name: s,
          is_initial: s === nfa.start,
          is_final: s === nfa.end
        })),
        transitions: nfa.transitions,
        initial: nfa.start,
        finals: [nfa.end],
        alphabet,
        regex,
        error: null
      };
    } catch (e) {
      return { error: 'Regex inválida: ' + e.message, states: [], transitions: [], initial: null, finals: [], alphabet: [] };
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // API PÚBLICA
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Convierte el AFN actual en AFD usando construcción de subconjuntos.
   * Intenta el backend primero; si falla, usa la implementación local.
   *
   * @param {Object} automataData - { states, transitions, initial, finals } (opcional, usa sesión si omitido)
   * @returns {Promise<Object>} - { ok, afd, subset_table, state_map }
   */
  async function convertAFNtoAFD(automataData = null) {
    const body = automataData || Simulator.localState;
    try {
      const res = await _post('/convert/afn-to-afd', {
        states:      Object.entries(body.states || {}).map(([id, s]) => ({ id, ...s })),
        transitions: body.transitions || [],
        initial:     body.initial,
        finals:      [...(body.finals || [])]
      });
      if (res.ok) return res;
      throw new Error(res.msg);
    } catch {
      // Fallback local
      const local = Simulator.localState;
      const data  = {
        states:      Object.keys(local.states),
        transitions: local.transitions,
        initial:     local.initial,
        finals:      [...local.finals]
      };
      const afd = _localSubsetConstruction(data);
      return { ok: true, afd, subset_table: afd.subset_table, state_map: afd.state_map };
    }
  }

  /**
   * Minimiza un AFD usando el algoritmo de Hopcroft.
   * Si el autómata es AFN, lo convierte primero.
   *
   * @param {Object} automataData - Opcional; usa la sesión si omitido
   * @returns {Promise<Object>} - { ok, minimized, groups, removed, original_count, min_count }
   */
  async function minimizeAFD(automataData = null) {
    const local = Simulator.localState;
    const body  = automataData || {
      type:        local.type,
      states:      Object.entries(local.states).map(([id, s]) => ({ id, ...s })),
      transitions: local.transitions,
      initial:     local.initial,
      finals:      [...local.finals]
    };
    try {
      return await _post('/minimize', body);
    } catch {
      return { ok: false, msg: 'Backend no disponible para minimización' };
    }
  }

  /**
   * Convierte una expresión regular en AFN-ε (Thompson).
   *
   * @param {string} regex - Expresión regular. Ej: "(a|b)*abb"
   * @returns {Promise<Object>} - { ok, afn, regex }
   */
  async function regexToAFN(regex) {
    try {
      const res = await _post('/regex/to-afn', { regex });
      if (res.ok) return res;
      throw new Error(res.msg);
    } catch {
      // Fallback local
      const afn = _localThompson(regex);
      if (afn.error) return { ok: false, msg: afn.error };
      return { ok: true, afn, regex };
    }
  }

  /**
   * Pipeline completo: Regex → AFN → AFD → AFD mínimo.
   *
   * @param {string}  regex    - Expresión regular
   * @param {boolean} minimize - Si minimizar el AFD resultante
   * @returns {Promise<Object>} - { ok, afn, afd, minimized, pipeline_summary }
   */
  async function regexPipeline(regex, minimize = true) {
    try {
      return await _post('/regex/to-afd', { regex, minimize });
    } catch {
      // Fallback encadenado localmente
      const afnRes = _localThompson(regex);
      if (afnRes.error) return { ok: false, msg: afnRes.error };

      const afdRes = _localSubsetConstruction({
        states:      afnRes.states.map(s => s.id),
        transitions: afnRes.transitions,
        initial:     afnRes.initial,
        finals:      afnRes.finals
      });

      return {
        ok: true, afn: afnRes, afd: afdRes, minimized: null,
        pipeline_summary: {
          regex,
          afn_states: afnRes.states.length,
          afd_states: afdRes.states.length,
          min_states: null,
          alphabet:   afdRes.alphabet
        }
      };
    }
  }

  /**
   * Verifica si dos autómatas son equivalentes (mismo lenguaje).
   *
   * @param {Object} automataA - Primer autómata (usa sesión si omitido)
   * @param {Object} automataB - Segundo autómata
   * @returns {Promise<Object>} - { ok, equivalent, witness, detail }
   */
  async function checkEquivalence(automataA = null, automataB) {
    try {
      return await _post('/equivalence', {
        automata_a: automataA,
        automata_b: automataB
      });
    } catch {
      return { ok: false, msg: 'Backend requerido para verificación de equivalencia' };
    }
  }

  /**
   * Genera la cadena más corta aceptada por el autómata actual.
   * Usa BFS sobre el grafo de transiciones.
   *
   * @param {number} maxLength - Longitud máxima de búsqueda
   * @returns {Promise<Object>} - { ok, string, path, length }
   */
  async function generateExample(maxLength = 10) {
    try {
      return await _get(`/generate?max_length=${maxLength}`);
    } catch {
      // Fallback local con BFS
      const local = Simulator.localState;
      if (!local.initial || !local.finals.size)
        return { ok: false, msg: 'Autómata incompleto' };

      const adj = {};
      local.transitions.forEach(t => {
        if (!adj[t.from]) adj[t.from] = [];
        adj[t.from].push({ sym: t.symbol, to: t.to });
      });

      const queue   = [[local.initial, '', [local.initial]]];
      const visited = new Set([local.initial]);

      while (queue.length) {
        const [state, word, path] = queue.shift();
        if (local.finals.has(state))
          return { ok: true, string: word || 'ε', path, length: word.length };
        if (word.length >= maxLength) continue;
        (adj[state] || []).forEach(({ sym, to }) => {
          if (!visited.has(to)) {
            visited.add(to);
            queue.push([to, word + (sym || ''), [...path, to]]);
          }
        });
      }
      return { ok: false, msg: `Sin cadena aceptada en ${maxLength} pasos` };
    }
  }

  return {
    convertAFNtoAFD,
    minimizeAFD,
    regexToAFN,
    regexPipeline,
    checkEquivalence,
    generateExample,
    // Exponer implementaciones locales para testing
    _localSubsetConstruction,
    _localThompson
  };

})();
