/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        FASS — Módulo de Renderizado del Grafo                           ║
 * ║                     Archivo: graph.js                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  ¿Para qué sirve este módulo?                                            ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  Es responsable de TODO lo relacionado con el grafo visual:             ║
 * ║    • Inicializar el grafo con vis.js                                    ║
 * ║    • Dibujar nodos (estados) y aristas (transiciones)                   ║
 * ║    • Animar el recorrido durante la simulación (highlight)              ║
 * ║    • Gestionar la apariencia según el tipo de estado                    ║
 * ║                                                                          ║
 * ║  ¿Qué es vis.js?                                                         ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  vis.js es una librería JavaScript para visualizar redes/grafos de      ║
 * ║  forma interactiva. Permite:                                             ║
 * ║    • Crear nodos y aristas dinámicamente                                ║
 * ║    • Arrastrar nodos con el mouse (drag & drop)                         ║
 * ║    • Hacer zoom con la rueda del mouse                                  ║
 * ║    • Aplicar física para auto-organizar los nodos                       ║
 * ║                                                                          ║
 * ║  ¿Qué es un grafo dirigido?                                              ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  Un grafo es una estructura con NODOS (vértices) y ARISTAS (edges).     ║
 * ║  En un grafo DIRIGIDO, las aristas tienen dirección (flechas).          ║
 * ║  El autómata finito se representa como un grafo dirigido donde:         ║
 * ║    • Nodos = Estados (q0, q1, q2...)                                    ║
 * ║    • Aristas = Transiciones con su símbolo como etiqueta               ║
 * ║                                                                          ║
 * ║  Dependencias: vis.js (cargado desde CDN en index.html)                 ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Graph = (() => {

  // ── Estado interno del módulo ─────────────────────────────────────────────
  // Variables privadas: solo accesibles dentro de este módulo IIFE.
  let network   = null;   // Instancia principal de vis.Network
  let nodes     = null;   // vis.DataSet de nodos (estados)
  let edges     = null;   // vis.DataSet de aristas (transiciones)
  let container = null;   // Elemento DOM donde se renderiza el grafo

  // ── Paleta de colores del grafo ────────────────────────────────────────────
  // Centralizados aquí para mantener consistencia visual y facilitar cambios.
  // Todos los colores siguen la paleta cyber-retro del sistema.
  const C = {
    nodeBg:       '#0d1a0d',              // Fondo oscuro de nodos normales
    nodeBorder:   '#00C97B',              // Borde verde de nodos normales
    nodeFont:     '#00FF9C',              // Texto verde fósforo
    edgeColor:    '#2a5a3a',              // Color de aristas en reposo
    edgeFont:     '#FFB000',              // Color del símbolo en aristas (ámbar)
    initialNode:  '#0a1f0a',             // Fondo del estado inicial (verde muy oscuro)
    finalNode:    '#0d2a0d',             // Fondo del estado final (verde oscuro)
    activeNode:   '#003320',             // Fondo cuando el nodo está siendo visitado
    activeBorder: '#00FF9C',             // Borde brillante del nodo activo
    deadNode:     '#1a0008',             // Fondo del estado muerto/rechazado
    deadBorder:   '#FF3366',             // Borde rojo del estado muerto
    visitedNode:  '#001f10',             // Fondo de nodos ya visitados
    visitedBorder:'#00C97B',             // Borde tenue de nodos visitados
    activeEdge:   '#00FF9C',             // Color de arista activa durante simulación
  };

  // ── Opciones de configuración de vis.js ──────────────────────────────────
  // Define el aspecto visual y el comportamiento físico del grafo.
  // Documentación completa: https://visjs.github.io/vis-network/docs/
  const OPTIONS = {
    // ── Configuración de nodos ──────────────────────────────────────────
    nodes: {
      shape: 'ellipse',      // Forma circular/elíptica (estándar en autómatas)
      size: 28,              // Radio del nodo en píxeles
      font: {
        color: C.nodeFont,
        size:  14,
        face:  "'Share Tech Mono', monospace",  // Fuente monoespaciada técnica
      },
      color: {
        background: C.nodeBg,
        border:     C.nodeBorder,
        highlight:  { background: C.activeNode,  border: C.activeBorder },
        hover:      { background: C.visitedNode, border: C.activeBorder },
      },
      borderWidth:         1.5,
      borderWidthSelected: 2.5,
      // Sombra suave para efecto glow
      shadow: { enabled: true, color: 'rgba(0,255,156,0.25)', size: 10, x: 0, y: 0 },
    },

    // ── Configuración de aristas ────────────────────────────────────────
    edges: {
      width: 1.5,
      color: {
        color:     C.edgeColor,
        highlight: C.activeEdge,
        hover:     '#00C97B'
      },
      font: {
        color:       C.edgeFont,     // Ámbar para los símbolos en las flechas
        size:        12,
        face:        "'Share Tech Mono', monospace",
        background:  '#050505',      // Fondo oscuro detrás del texto del símbolo
        strokeWidth: 0,
      },
      arrows: {
        to: { enabled: true, scaleFactor: 0.7, type: 'arrow' }  // Punta de flecha
      },
      smooth: { type: 'curvedCW', roundness: 0.2 },  // Aristas curvas (más legibles)
    },

    // ── Motor de física (auto-organización) ──────────────────────────────
    // La física mueve los nodos automáticamente para que no se superpongan.
    // Se desactiva después de la estabilización para que el usuario pueda
    // arrastrar nodos sin que vuelvan a moverse solos.
    physics: {
      enabled: true,
      solver:  'forceAtlas2Based',    // Algoritmo de distribución de fuerzas
      forceAtlas2Based: {
        gravitationalConstant: -60,   // Repulsión entre nodos (negativo = alejan)
        centralGravity:        0.01,  // Atracción hacia el centro del canvas
        springLength:          120,   // Longitud ideal de las aristas
        springConstant:        0.06,  // Rigidez de las aristas
        damping:               0.4,   // Amortiguación del movimiento
      },
      stabilization: { iterations: 200, fit: true },  // Auto-ajustar al estabilizar
    },

    // ── Interacción con el usuario ────────────────────────────────────────
    interaction: {
      hover:       true,    // Efecto al pasar el mouse por encima
      zoomView:    true,    // Zoom con rueda del mouse
      dragView:    true,    // Arrastrar el canvas
      dragNodes:   true,    // Arrastrar nodos individuales
      multiselect: false,   // No permitir selección múltiple
    },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNCIONES PRIVADAS (construcción de nodos y aristas)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Construye el objeto visual de un nodo para vis.js a partir de un estado.
   *
   * ¿Por qué es necesaria?
   * ─────────────────────────────────────────────────────────────────────────
   * vis.js necesita objetos con propiedades específicas (id, label, color...).
   * Esta función convierte los datos del estado del autómata al formato
   * que vis.js entiende, aplicando los estilos correctos según el tipo.
   *
   * Lógica visual:
   *   Estado inicial → fondo más oscuro + sombra más intensa + prefijo "▶"
   *   Estado final   → borde punteado (doble circunferencia) + sufijo "◉"
   *   Estado normal  → estilo base del sistema
   *
   * @param {Object} state - { id, name, is_initial, is_final }
   * @returns {Object}     - Objeto de nodo para vis.DataSet
   */
  function _buildNodeVisual(state) {
    const isFinal   = state.is_final;
    const isInitial = state.is_initial;

    // Determinar color de fondo y borde según tipo de estado
    let bg     = C.nodeBg;
    let border = C.nodeBorder;
    if (isInitial) { bg = C.initialNode; border = '#00FF9C'; }
    if (isFinal)   { bg = C.finalNode;   border = '#00FF9C'; }

    // Construir la etiqueta con indicadores visuales
    const prefix = isInitial ? '▶ ' : '';   // Flecha para estado inicial
    const suffix = isFinal   ? ' ◉' : '';   // Círculo para estado final
    const label  = `${prefix}${state.name || state.id}${suffix}`;

    return {
      id:    state.id,
      label,
      title: `Estado: ${state.id}${isInitial ? ' [INICIAL]' : ''}${isFinal ? ' [FINAL]' : ''}`,
      color: {
        background: bg,
        border,
        highlight: { background: C.activeNode,  border: C.activeBorder },
        hover:     { background: C.visitedNode, border: '#00FF9C' },
      },
      borderWidth:  isFinal ? 3 : 1.5,
      borderDashes: isFinal ? [4, 3] : false,  // Punteado = estado final (doble borde simulado)
      shadow: {
        enabled: true,
        color:   isInitial ? 'rgba(0,255,156,0.4)' : isFinal ? 'rgba(0,255,156,0.3)' : 'rgba(0,255,156,0.15)',
        size:    isInitial ? 14 : 8,
        x: 0, y: 0,
      },
      font: {
        color: isInitial ? '#00FF9C' : isFinal ? '#00C97B' : '#6aff9e',
        size:  13,
      },
    };
  }

  /**
   * Construye el objeto visual de una arista para vis.js.
   *
   * Maneja el caso especial de auto-loops (transiciones q→q del mismo estado)
   * aplicando una curvatura mayor para que sean visibles.
   *
   * La agrupación de múltiples símbolos en la misma arista se hace
   * en la función render() para evitar aristas paralelas duplicadas.
   *
   * @param {Object} t     - { from, symbol, to }
   * @param {number} index - Índice único para generar el ID de la arista
   * @returns {Object}     - Objeto de arista para vis.DataSet
   */
  function _buildEdgeVisual(t, index) {
    const isLoop = t.from === t.to;  // ¿Es una transición al mismo estado?

    return {
      id:    `e_${t.from}_${t.symbol}_${t.to}_${index}`,
      from:  t.from,
      to:    t.to,
      label: t.symbol === '' ? 'ε' : t.symbol,  // '' = épsilon
      // Auto-loops necesitan más curvatura para ser visibles
      smooth: isLoop
        ? { type: 'curvedCW', roundness: 0.5 }
        : { type: 'curvedCW', roundness: 0.2 },
      color: {
        // Las transiciones épsilon tienen color ámbar oscuro para distinguirse
        color:     t.symbol === '' ? '#4a3a00' : C.edgeColor,
        highlight: C.activeEdge,
        hover:     '#00C97B',
      },
      font: {
        color:      t.symbol === '' ? '#FFB000' : C.edgeFont,
        size:       12,
        background: '#050505',
        strokeWidth:0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API PÚBLICA DEL MÓDULO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa el grafo vis.js en el contenedor especificado.
   *
   * Debe llamarse UNA SOLA VEZ al arrancar la aplicación.
   * Crea los DataSets vacíos y la instancia de Network.
   * También configura los listeners de eventos del grafo.
   *
   * @param {string} containerId - ID del elemento DOM donde renderizar
   * @returns {vis.Network}      - La instancia del grafo creada
   */
  function init(containerId) {
    container = document.getElementById(containerId);

    // vis.DataSet es una estructura de datos reactiva de vis.js.
    // Cuando se modifica (add/update/remove), el grafo se re-renderiza
    // automáticamente sin necesidad de redibujar todo manualmente.
    nodes   = new vis.DataSet([]);
    edges   = new vis.DataSet([]);
    network = new vis.Network(container, { nodes, edges }, OPTIONS);

    // ── Eventos del grafo ───────────────────────────────────────────────
    // Cuando el usuario hace clic en un nodo, notificar al módulo UI.
    network.on('selectNode', e => {
      if (e.nodes[0]) UI.onNodeSelected(e.nodes[0]);
    });

    network.on('deselectNode', () => UI.clearNodeHighlight());

    // Desactivar física después de estabilizar (los nodos quedan fijos
    // para que el usuario pueda arrastrarlos sin que se muevan solos).
    network.on('stabilizationIterationsDone', () => {
      network.setOptions({ physics: { enabled: false } });
    });

    return network;
  }

  /**
   * Reconstruye el grafo completo desde los datos del autómata.
   *
   * Llamar cuando se carga un autómata nuevo (importar, demo, reset).
   * Borra el grafo anterior y lo reconstruye desde cero.
   *
   * Optimización de aristas:
   * Si hay múltiples transiciones entre los mismos estados (A→B con 'a' y 'b'),
   * se agrupan en una sola arista con la etiqueta "a, b" en lugar de
   * dibujar dos flechas paralelas que serían difíciles de leer.
   *
   * @param {Object} data - { states: [...], transitions: [...] }
   */
  function render(data) {
    if (!network) return;

    // Reconstruir nodos desde la lista de estados
    const newNodes = (data.states || []).map(s => _buildNodeVisual(s));
    nodes.clear();
    nodes.add(newNodes);

    // ── Agrupar aristas por par (from, to) ──────────────────────────────
    // Esto evita flechas paralelas entre los mismos estados.
    // Si hay dos transiciones A→B con 'a' y con 'b', se muestran como una
    // sola flecha A→B con etiqueta "a, b".
    const edgeMap = {};
    (data.transitions || []).forEach((t, i) => {
      const key = `${t.from}→${t.to}`;
      if (edgeMap[key]) {
        // Ya existe arista entre estos estados: agregar símbolo a la etiqueta
        edgeMap[key].label += `, ${t.symbol === '' ? 'ε' : t.symbol}`;
      } else {
        edgeMap[key] = _buildEdgeVisual(t, i);
      }
    });

    edges.clear();
    edges.add(Object.values(edgeMap));

    // Reactivar física brevemente para organizar los nuevos nodos
    network.setOptions({ physics: { enabled: true } });
    setTimeout(() => network.setOptions({ physics: { enabled: false } }), 1500);
  }

  /**
   * Agrega un solo nodo al grafo sin reconstruir todo.
   *
   * Más eficiente que render() cuando solo se agrega un estado.
   * Si el nodo ya existe (por ID duplicado), lo actualiza.
   *
   * @param {Object} state - { id, name, is_initial, is_final }
   */
  function addNode(state) {
    if (!network) return;
    try {
      nodes.add(_buildNodeVisual(state));
    } catch (e) {
      // El ID ya existe en el DataSet: actualizar en lugar de agregar
      nodes.update(_buildNodeVisual(state));
    }
  }

  /**
   * Elimina un nodo y todas sus aristas conectadas del grafo.
   *
   * @param {string} stateId - ID del estado a eliminar
   */
  function removeNode(stateId) {
    if (!network) return;
    nodes.remove(stateId);
    // Eliminar todas las aristas que salen o llegan a este nodo
    const toRemove = edges.get().filter(e => e.from === stateId || e.to === stateId);
    edges.remove(toRemove.map(e => e.id));
  }

  /**
   * Agrega una arista al grafo, agrupando el símbolo si ya existe una entre esos nodos.
   *
   * @param {Object} transition - { from, symbol, to }
   */
  function addEdge(transition) {
    if (!network) return;
    const existing = edges.get().find(
      e => e.from === transition.from && e.to === transition.to
    );

    if (existing) {
      // Agregar el símbolo a la etiqueta existente: "a" → "a, b"
      const newLabel = existing.label + `, ${transition.symbol === '' ? 'ε' : transition.symbol}`;
      edges.update({ id: existing.id, label: newLabel });
    } else {
      edges.add(_buildEdgeVisual(transition, Date.now()));
    }
  }

  /**
   * Cambia el color/estilo de un nodo para destacarlo durante la simulación.
   *
   * Tipos de highlight disponibles:
   * ─────────────────────────────────────────────────────────────────────────
   *   'active'  → Nodo actualmente activo (verde brillante)
   *              Se usa para el estado donde está el autómata en este momento.
   *
   *   'visited' → Nodo ya visitado (verde tenue)
   *              Se usa para estados que ya fueron recorridos.
   *
   *   'dead'    → Estado muerto / rechazo (rojo)
   *              Se usa cuando no hay transición o la cadena es rechazada.
   *
   *   'final'   → Estado final aceptado (verde muy brillante)
   *              Se usa al terminar en un estado de aceptación.
   *
   *   'reset'   → Restaurar todos los nodos y aristas a su estilo original.
   *              Se llama antes de cada nueva simulación.
   *
   * @param {string} stateId - ID del nodo a destacar (ignorado en 'reset')
   * @param {string} type    - Tipo de highlight (ver arriba)
   */
  function highlightNode(stateId, type = 'active') {
    if (!network) return;

    if (type === 'reset') {
      // Restaurar TODOS los nodos a su estilo original
      const all = nodes.get().map(n => ({
        id: n.id,
        color: {
          background: C.nodeBg,
          border:     C.nodeBorder,
          highlight:  { background: C.activeNode,  border: C.activeBorder },
          hover:      { background: C.visitedNode, border: '#00FF9C' },
        },
        borderWidth: 1.5,
        shadow: { enabled: true, color: 'rgba(0,255,156,0.15)', size: 8, x: 0, y: 0 },
      }));
      nodes.update(all);

      // Restaurar también todas las aristas
      const allEdges = edges.get().map(e => ({
        id:    e.id,
        color: { color: C.edgeColor, highlight: C.activeEdge },
        width: 1.5,
      }));
      edges.update(allEdges);
      return;
    }

    if (!nodes.get(stateId)) return;  // El nodo no existe, ignorar

    const colorMap = {
      active:  { bg: '#003a1a', border: '#00FF9C', shadow: 'rgba(0,255,156,0.6)' },
      visited: { bg: '#001f10', border: '#00C97B', shadow: 'rgba(0,201,123,0.3)' },
      dead:    { bg: '#1a0008', border: '#FF3366', shadow: 'rgba(255,51,102,0.5)' },
      final:   { bg: '#003a1a', border: '#00FF9C', shadow: 'rgba(0,255,156,0.8)' },
    };

    const c = colorMap[type];
    if (!c) return;

    nodes.update({
      id: stateId,
      color: {
        background: c.bg,
        border:     c.border,
        highlight:  { background: c.bg, border: c.border },
        hover:      { background: c.bg, border: c.border },
      },
      borderWidth: 2.5,
      shadow: { enabled: true, color: c.shadow, size: 18, x: 0, y: 0 },
    });
  }

  /**
   * Ilumina o apaga una arista durante la simulación.
   *
   * Cuando el autómata hace una transición de A→B leyendo el símbolo 'x',
   * la arista entre A y B se ilumina en verde brillante para mostrar
   * visualmente qué transición se está tomando.
   *
   * @param {string}  from   - ID del nodo origen
   * @param {string}  to     - ID del nodo destino
   * @param {boolean} active - True = iluminar, False = apagar
   */
  function highlightEdge(from, to, active = true) {
    if (!network) return;
    const edge = edges.get().find(e => e.from === from && e.to === to);
    if (!edge) return;
    edges.update({
      id:    edge.id,
      color: { color: active ? C.activeEdge : C.edgeColor },
      width: active ? 3 : 1.5,
    });
  }

  /**
   * Ajusta el zoom y posición del grafo para mostrar todos los nodos.
   * Útil después de agregar muchos estados o importar un autómata grande.
   */
  function fit() {
    if (network) {
      network.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
    }
  }

  /**
   * Elimina todos los nodos y aristas del grafo.
   * Llamado al resetear la simulación.
   */
  function clear() {
    if (!network) return;
    nodes.clear();
    edges.clear();
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return { init, render, addNode, removeNode, addEdge, highlightNode, highlightEdge, fit, clear };

})();
