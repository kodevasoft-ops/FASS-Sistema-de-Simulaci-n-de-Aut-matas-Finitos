"""
╔══════════════════════════════════════════════════════════════════════════════╗
║       FASS v2 — Construcción de Subconjuntos (AFN → AFD)                   ║
║                  Archivo: subset_construction.py                            ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Algoritmo: Construcción de Subconjuntos (Subset Construction)              ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Convierte cualquier AFN (incluyendo AFN-ε) en un AFD equivalente          ║
║  que reconoce exactamente el mismo lenguaje regular.                        ║
║                                                                              ║
║  Fundamento teórico:                                                         ║
║    Cada ESTADO del AFD resultante corresponde a un SUBCONJUNTO              ║
║    de estados del AFN original. Por eso se llama "construcción              ║
║    de subconjuntos" o "powerset construction".                               ║
║                                                                              ║
║  Complejidad: O(2^n) estados en el peor caso (n = estados del AFN)          ║
║  En la práctica, muchos subconjuntos son inalcanzables y no se generan.     ║
║                                                                              ║
║  Pasos del algoritmo:                                                        ║
║    1. Estado inicial del AFD = ε-closure({q0_afn})                         ║
║    2. Para cada subconjunto S y símbolo a ∈ Σ:                              ║
║         δ_afd(S, a) = ε-closure( ∪{ δ_afn(q,a) | q ∈ S } )               ║
║    3. Un subconjunto S es final en el AFD si S ∩ F_afn ≠ ∅                 ║
║    4. Repetir con BFS hasta que no haya subconjuntos nuevos                 ║
║                                                                              ║
║  Ejemplo:                                                                    ║
║    AFN con estados {q0,q1,q2}, q2 final, q0→ε→q1, q0→a→q2                 ║
║    AFD resultante:                                                           ║
║      {q0,q1} --a--> {q2}  (final)                                          ║
║      {q0,q1} --b--> ∅     (muerto)                                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from collections import defaultdict


class SubsetConstruction:
    """
    Implementa la construcción de subconjuntos para convertir AFN → AFD.

    El AFD resultante es semánticamente equivalente al AFN:
    acepta exactamente el mismo conjunto de cadenas.
    """

    def __init__(self, afn_states, afn_transitions, afn_initial, afn_finals):
        """
        Inicializa con la definición formal del AFN fuente.

        Parámetros:
            afn_states      (list[str])  → Estados del AFN
            afn_transitions (list[dict]) → [{'from','symbol','to'}]
            afn_initial     (str)        → Estado inicial del AFN
            afn_finals      (set/list)   → Estados finales del AFN
        """
        self.afn_states      = afn_states
        self.afn_finals      = set(afn_finals)
        self.afn_initial     = afn_initial

        # Tabla de transición del AFN: delta[estado][símbolo] = [destinos]
        self.delta_afn = defaultdict(lambda: defaultdict(list))
        for t in afn_transitions:
            self.delta_afn[t['from']][t['symbol']].append(t['to'])

        # Calcular el alfabeto Σ (excluir épsilon)
        self.alphabet = sorted(set(
            t['symbol'] for t in afn_transitions if t['symbol'] != ''
        ))

        # Resultados que se llenan al ejecutar convert()
        self.dfa_states      = []    # Estados del AFD (como frozensets)
        self.dfa_transitions = []    # Transiciones del AFD
        self.dfa_initial     = None  # Estado inicial del AFD
        self.dfa_finals      = set() # Estados finales del AFD
        self.subset_table    = []    # Tabla de subconjuntos (para visualización)
        self.state_names     = {}    # Mapeo frozenset → nombre legible

    # ─────────────────────────────────────────────────────────────────────────
    def epsilon_closure(self, states):
        """
        Calcula la ε-closure de un conjunto de estados del AFN.

        La ε-closure es el conjunto de todos los estados alcanzables
        siguiendo solo transiciones épsilon (sin leer ningún símbolo).
        Incluye siempre los estados de partida.

        Algoritmo: DFS iterativo sobre transiciones con símbolo ''.

        Parámetros:
            states (iterable) → Conjunto de estados de partida

        Retorna:
            frozenset → ε-closure inmutable (usable como clave de dict)
        """
        closure = set(states)
        stack   = list(states)

        while stack:
            s = stack.pop()
            for t in self.delta_afn[s].get('', []):
                if t not in closure:
                    closure.add(t)
                    stack.append(t)

        return frozenset(closure)

    # ─────────────────────────────────────────────────────────────────────────
    def move(self, states, symbol):
        """
        Calcula el conjunto de estados alcanzables leyendo un símbolo.

        Operación: move(S, a) = ∪{ δ_afn(q, a) | q ∈ S }

        Parámetros:
            states (frozenset) → Conjunto de estados activos
            symbol (str)       → Símbolo a leer

        Retorna:
            set → Unión de todos los estados destino
        """
        result = set()
        for s in states:
            result.update(self.delta_afn[s].get(symbol, []))
        return result

    # ─────────────────────────────────────────────────────────────────────────
    def _name_state(self, subset):
        """
        Genera un nombre legible para un subconjunto de estados.

        Convierte el frozenset en una cadena con formato {q0,q1,q2}.
        El estado vacío (estado muerto) se llama '∅'.

        Parámetros:
            subset (frozenset) → Subconjunto de estados del AFN

        Retorna:
            str → Nombre del estado del AFD
        """
        if not subset:
            return '∅'
        # Ordenar los estados para nombres deterministas
        parts = sorted(subset)
        if len(parts) == 1:
            return parts[0]
        return '{' + ','.join(parts) + '}'

    # ─────────────────────────────────────────────────────────────────────────
    def convert(self):
        """
        Ejecuta la construcción de subconjuntos y retorna el AFD equivalente.

        Algoritmo BFS sobre subconjuntos:
        ─────────────────────────────────────────────────────────────────────
        1. El estado inicial del AFD es ε-closure({q0_afn}).
        2. Usar una cola BFS de subconjuntos por explorar.
        3. Para cada subconjunto S no procesado:
             Para cada símbolo a ∈ Σ:
               T = ε-closure(move(S, a))
               Registrar transición S --a--> T
               Si T es nuevo, agregarlo a la cola
        4. Un subconjunto S es estado final si S ∩ F_afn ≠ ∅

        Retorna:
            dict con:
              states      → lista de estados del AFD (nombres legibles)
              transitions → lista de transiciones del AFD
              initial     → nombre del estado inicial
              finals      → lista de estados finales
              subset_table→ tabla de subconjuntos para visualización
              state_map   → mapeo nombre → subconjunto original
        """
        if not self.afn_initial:
            return self._empty_result()

        # ── Estado inicial: ε-closure del estado inicial del AFN ──────────
        initial_subset = self.epsilon_closure({self.afn_initial})
        self.state_names[initial_subset] = self._name_state(initial_subset)

        # Cola BFS y conjunto de subconjuntos ya procesados
        queue     = [initial_subset]
        processed = set()

        # Tabla de subconjuntos: registra cada subconjunto y sus transiciones
        table_rows = []

        while queue:
            current = queue.pop(0)

            if current in processed:
                continue
            processed.add(current)

            row = {
                'subset':     self.state_names.get(current, self._name_state(current)),
                'is_initial': current == initial_subset,
                'is_final':   bool(current & self.afn_finals),
                'transitions': {}
            }

            # ── Para cada símbolo del alfabeto ────────────────────────────
            for symbol in self.alphabet:
                # move: ¿a qué estados vamos leyendo 'symbol'?
                moved   = self.move(current, symbol)
                # ε-closure: expandir por épsilons
                reached = self.epsilon_closure(moved)

                # Registrar nombre del nuevo estado
                if reached not in self.state_names:
                    self.state_names[reached] = self._name_state(reached)

                row['transitions'][symbol] = self.state_names[reached]

                # Si es un subconjunto nuevo, agregar a la cola
                if reached not in processed and reached not in queue:
                    queue.append(reached)

                # Registrar la transición del AFD
                self.dfa_transitions.append({
                    'from':   self.state_names[current],
                    'symbol': symbol,
                    'to':     self.state_names[reached]
                })

            table_rows.append(row)

        # ── Construir lista de estados del AFD ────────────────────────────
        all_subsets = list(processed)
        for subset in all_subsets:
            name = self.state_names[subset]
            self.dfa_states.append(name)
            if bool(subset & self.afn_finals):
                self.dfa_finals.add(name)

        self.dfa_initial  = self.state_names[initial_subset]
        self.subset_table = table_rows

        # Construir mapeo reverso nombre → miembros del subconjunto
        state_map = {v: sorted(k) for k, v in self.state_names.items()}

        return {
            'states': [
                {
                    'id':         name,
                    'name':       name,
                    'is_initial': name == self.dfa_initial,
                    'is_final':   name in self.dfa_finals
                }
                for name in self.dfa_states
            ],
            'transitions': self.dfa_transitions,
            'initial':     self.dfa_initial,
            'finals':      list(self.dfa_finals),
            'alphabet':    self.alphabet,
            'subset_table':table_rows,
            'state_map':   state_map
        }

    def _empty_result(self):
        return {
            'states': [], 'transitions': [], 'initial': None,
            'finals': [], 'alphabet': [], 'subset_table': [], 'state_map': {}
        }
