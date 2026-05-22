"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           FASS — Módulo de Validación y Estadísticas                        ║
║                      Archivo: validator.py                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ¿Para qué sirve este módulo?                                                ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Este módulo NO simula cadenas. Su función es analizar la ESTRUCTURA        ║
║  del autómata en sí mismo y responder preguntas como:                       ║
║                                                                              ║
║    • ¿Cuántos estados tiene el autómata?                                    ║
║    • ¿Cuál es el alfabeto Σ?                                                 ║
║    • ¿El autómata está completo? (¿tiene transición para todo q ∈ Q, a ∈ Σ) ║
║    • ¿Hay estados inalcanzables desde el estado inicial?                    ║
║    • ¿Hay transiciones épsilon (solo en AFN)?                               ║
║    • ¿Cuáles son los estados trampa (sin salida)?                           ║
║                                                                              ║
║  Esta información se muestra en la pestaña "STATS" de la consola            ║
║  derecha de la aplicación.                                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from collections import defaultdict


class AutomataValidator:
    """
    Analizador estructural de autómatas finitos.

    Calcula métricas y propiedades del autómata sin simular cadenas.
    Permite detectar problemas de diseño como estados inalcanzables,
    falta de estado inicial o autómata incompleto.

    Uso:
        v = AutomataValidator(states, transitions, initial, finals)
        stats = v.compute_stats()
        table = v.get_transition_table()
    """

    def __init__(self, states, transitions, initial, finals):
        """
        Inicializa el validador con la definición del autómata.

        Parámetros:
            states      (dict)      → {id: {name, is_initial, is_final}}
            transitions (list[dict])→ [{'from','symbol','to'}, ...]
            initial     (str)       → ID del estado inicial (o None)
            finals      (list[str]) → IDs de estados finales
        """
        self.states      = states
        self.transitions = transitions
        self.initial     = initial
        self.finals      = set(finals)

    # ─────────────────────────────────────────────────────────────────────────
    def compute_stats(self):
        """
        Calcula todas las estadísticas y propiedades del autómata.

        Propiedades calculadas:
        ─────────────────────────────────────────────────────────────────────
        • total_states       → Número total de estados en Q
        • total_transitions  → Número total de transiciones definidas
        • alphabet           → Conjunto Σ de símbolos usados (ordenado)
        • alphabet_size      → Cardinalidad de Σ (|Σ|)
        • reachable_states   → Cuántos estados son alcanzables desde q0
        • unreachable_states → Cuántos estados NO son alcanzables (mala práctica)
        • final_states       → Cuántos estados de aceptación hay en F
        • trap_states        → Estados sin transiciones salientes y no finales
        • has_initial        → ¿Está definido el estado inicial?
        • is_complete        → ¿Todo (estado, símbolo) tiene transición definida?
        • has_epsilon        → ¿Hay transiciones épsilon? (indica AFN)

        ¿Qué es un autómata completo?
        ─────────────────────────────
        Un AFD es completo si para CADA estado q ∈ Q y CADA símbolo a ∈ Σ
        existe una transición δ(q,a). Si falta alguna, existe un "hueco"
        que implícitamente es el estado muerto ∅.

        Retorna:
            dict → Todas las propiedades listadas arriba
        """
        # ── Calcular el alfabeto Σ ─────────────────────────────────────────
        # El alfabeto se infiere de los símbolos usados en las transiciones.
        # Se excluyen las transiciones épsilon (símbolo vacío '').
        alphabet = set()
        for t in self.transitions:
            if t["symbol"]:   # Ignorar épsilons
                alphabet.add(t["symbol"])

        # ── Estados alcanzables ────────────────────────────────────────────
        reachable = self._bfs_reachable()

        # ── Estados trampa ─────────────────────────────────────────────────
        # Un estado trampa es aquel que:
        #   1. No tiene transiciones salientes (no puede avanzar)
        #   2. No es estado final (no puede aceptar)
        # → Cualquier cadena que llegue ahí será inevitablemente rechazada.
        trap_states = [
            sid for sid in self.states
            if not any(t["from"] == sid for t in self.transitions)
            and sid not in self.finals
        ]

        return {
            "total_states":      len(self.states),
            "total_transitions": len(self.transitions),
            "alphabet":          sorted(alphabet),
            "alphabet_size":     len(alphabet),
            "reachable_states":  len(reachable),
            "unreachable_states":len(self.states) - len(reachable),
            "final_states":      len(self.finals),
            "trap_states":       trap_states,
            "has_initial":       self.initial is not None,
            "is_complete":       self._is_complete(alphabet),
            "has_epsilon":       any(t["symbol"] == "" for t in self.transitions)
        }

    # ─────────────────────────────────────────────────────────────────────────
    def _bfs_reachable(self):
        """
        Encuentra los estados alcanzables desde el estado inicial usando BFS.

        BFS (Breadth-First Search / Búsqueda en Anchura):
        ─────────────────────────────────────────────────────────────────────
        Explora el grafo de transiciones nivel por nivel:
          - Nivel 0: solo el estado inicial {q0}
          - Nivel 1: estados alcanzables desde q0 con un solo paso
          - Nivel 2: estados alcanzables en dos pasos... y así.

        Garantiza que todos los estados alcanzables serán encontrados.
        Complejidad: O(Q + T) donde Q = estados, T = transiciones.

        Retorna:
            set[str] → Conjunto de IDs de estados alcanzables
        """
        if not self.initial:
            return set()

        visited = set()
        queue   = [self.initial]

        # Construir lista de adyacencia para BFS más eficiente
        adj = defaultdict(list)
        for t in self.transitions:
            adj[t["from"]].append(t["to"])

        while queue:
            s = queue.pop(0)
            if s in visited:
                continue
            visited.add(s)
            queue.extend(adj[s])   # Agregar vecinos no visitados

        return visited

    # ─────────────────────────────────────────────────────────────────────────
    def _is_complete(self, alphabet):
        """
        Verifica si el autómata es completo (no tiene "huecos" en δ).

        Un AFD es completo si para CADA par (estado, símbolo) existe
        al menos una transición definida. Si falta alguna, el autómata
        tiene "huecos" que implícitamente llevan al estado muerto ∅.

        ¿Por qué importa?
        ─────────────────────────────────────────────────────────────────────
        En la teoría formal, los AFD suelen definirse como "completos".
        En la práctica, los huecos se manejan implícitamente como rechazo.
        Un autómata incompleto puede causar comportamientos inesperados
        si no se maneja correctamente el estado muerto.

        Parámetro:
            alphabet (set) → Conjunto de símbolos Σ del autómata

        Retorna:
            bool → True si está completo, False si tiene huecos
        """
        if not alphabet or not self.states:
            return False

        for sid in self.states:
            for sym in alphabet:
                has_transition = any(
                    t["from"] == sid and t["symbol"] == sym
                    for t in self.transitions
                )
                if not has_transition:
                    return False   # Hueco encontrado: (sid, sym) sin transición

        return True

    # ─────────────────────────────────────────────────────────────────────────
    def get_transition_table(self):
        """
        Genera la tabla de transiciones en formato matricial.

        ¿Qué es la tabla de transiciones?
        ─────────────────────────────────────────────────────────────────────
        Es la representación tabular del autómata donde:
          - Las FILAS son los estados Q
          - Las COLUMNAS son los símbolos Σ
          - Las CELDAS muestran el/los estados destino

        Ejemplo para el AFD de cadenas terminadas en "abb":
            Estado | a  | b
            ──────────────
              →q0  | q1 | q0
               q1  | q1 | q2
               q2  | q1 | q3
              *q3  | q1 | q0

            → = estado inicial   * = estado final

        La tabla puede tener múltiples destinos por celda en un AFN.

        Retorna (dict):
            alphabet (list) → Símbolos ordenados del alfabeto
            table    (dict) → {estado: {símbolo: [destinos]}}

        Ejemplo de retorno:
            {
                'alphabet': ['a', 'b'],
                'table': {
                    'q0': {'a': ['q1'], 'b': ['q0']},
                    'q1': {'a': ['q1'], 'b': ['q2']},
                }
            }
        """
        alphabet = sorted(set(
            t["symbol"] for t in self.transitions if t["symbol"]
        ))

        table = {}
        for sid in self.states:
            table[sid] = {}
            for sym in alphabet:
                # Recolectar todos los destinos para (sid, sym) — soporta AFN
                targets = [
                    t["to"] for t in self.transitions
                    if t["from"] == sid and t["symbol"] == sym
                ]
                table[sid][sym] = targets

        return {"alphabet": alphabet, "table": table}
