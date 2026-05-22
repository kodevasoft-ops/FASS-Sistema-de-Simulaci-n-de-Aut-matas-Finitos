"""
╔══════════════════════════════════════════════════════════════════════════════╗
║       FASS v2 — Minimización de AFD (Algoritmo de Hopcroft)                ║
║                      Archivo: hopcroft.py                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Algoritmo: Minimización de Hopcroft (1971)                                 ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Produce el AFD mínimo equivalente: el autómata con el menor número         ║
║  posible de estados que reconoce exactamente el mismo lenguaje.             ║
║                                                                              ║
║  ¿Por qué minimizar?                                                         ║
║    • El AFD resultante de la construcción de subconjuntos puede tener       ║
║      estados redundantes (equivalentes entre sí).                           ║
║    • Dos estados son EQUIVALENTES si para toda cadena w, ambos             ║
║      aceptan o ambos rechazan w.                                            ║
║    • El AFD mínimo es ÚNICO (salvo renombramiento de estados).             ║
║    • Permite verificar EQUIVALENCIA entre dos AFD: si sus AFD mínimos      ║
║      son isomorfos, reconocen el mismo lenguaje.                            ║
║                                                                              ║
║  Idea del algoritmo (refinamiento de particiones):                          ║
║    1. Partición inicial P = { F, Q\F }  (finales vs no finales)            ║
║    2. Repetir hasta que P no cambie:                                         ║
║         Para cada clase C ∈ P y símbolo a ∈ Σ:                             ║
║           Si δ(q,a) y δ(r,a) caen en clases distintas → separar C          ║
║    3. Cada clase de la partición final = un estado del AFD mínimo          ║
║                                                                              ║
║  Complejidad: O(n·|Σ|·log n)  donde n = número de estados                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from collections import defaultdict


class HopcroftMinimizer:
    """
    Minimiza un AFD usando el algoritmo de Hopcroft.

    El resultado es el AFD con el mínimo número de estados posible
    que reconoce exactamente el mismo lenguaje que el AFD original.
    """

    def __init__(self, states, transitions, initial, finals):
        """
        Inicializa el minimizador con la definición del AFD a minimizar.

        Parámetros:
            states      (list[str])  → Todos los estados del AFD
            transitions (list[dict]) → [{'from','symbol','to'}]
            initial     (str)        → Estado inicial
            finals      (list/set)   → Estados de aceptación
        """
        self.states  = list(states)
        self.finals  = set(finals)
        self.initial = initial

        # Calcular alfabeto Σ
        self.alphabet = sorted(set(
            t['symbol'] for t in transitions if t['symbol']
        ))

        # Tabla de transición: delta[estado][símbolo] = estado_destino
        # Estados sin transición van a None (estado muerto implícito)
        self.delta = defaultdict(dict)
        for t in transitions:
            self.delta[t['from']][t['symbol']] = t['to']

        # Agregar estado muerto explícito si hay huecos
        dead = '__dead__'
        self.dead_state = None
        needs_dead = False

        for s in self.states:
            for a in self.alphabet:
                if a not in self.delta[s]:
                    self.delta[s][a] = dead
                    needs_dead = True

        if needs_dead:
            self.states.append(dead)
            self.dead_state = dead
            for a in self.alphabet:
                self.delta[dead][a] = dead

        # Eliminar estados inalcanzables antes de minimizar (optimización)
        self.states = list(self._reachable_states())

    # ─────────────────────────────────────────────────────────────────────────
    def _reachable_states(self):
        """
        Retorna solo los estados alcanzables desde el estado inicial.

        Eliminar estados inalcanzables antes de minimizar es una optimización
        que reduce el tamaño del problema sin afectar el resultado.
        """
        if not self.initial:
            return set()
        visited = set()
        queue   = [self.initial]
        while queue:
            s = queue.pop(0)
            if s in visited:
                continue
            visited.add(s)
            for a in self.alphabet:
                dest = self.delta[s].get(a)
                if dest and dest not in visited:
                    queue.append(dest)
        return visited

    # ─────────────────────────────────────────────────────────────────────────
    def minimize(self):
        """
        Ejecuta el algoritmo de Hopcroft y retorna el AFD mínimo.

        Algoritmo de refinamiento de particiones:
        ─────────────────────────────────────────────────────────────────────
        Dos estados p, q son DISTINGUIBLES si existe alguna cadena w tal que
        exactamente uno de δ*(p,w) y δ*(q,r) es un estado final.

        El algoritmo construye la partición más gruesa (menos divisiones)
        donde ningún par de estados dentro de la misma clase es distinguible.

        Fases:
          1. Partición inicial: {F} y {Q\F}
             (los estados finales siempre son distinguibles de los no finales)

          2. Refinamiento iterativo:
             Para cada clase C de la partición y símbolo a:
               Si hay estados en C que van a clases distintas con a → dividir C

          3. Nombrar estados: cada clase → un estado del AFD mínimo
             (elegir un representante o usar el nombre del conjunto)

        Retorna:
            dict con:
              states      → estados del AFD mínimo
              transitions → transiciones del AFD mínimo
              initial     → estado inicial
              finals      → estados finales
              groups      → tabla de grupos para visualización
              removed     → cantidad de estados eliminados
        """
        if not self.states or not self.initial:
            return self._empty_result()

        # ── Fase 1: Partición inicial ──────────────────────────────────────
        finals_reach     = frozenset(s for s in self.states if s in self.finals)
        non_finals_reach = frozenset(s for s in self.states if s not in self.finals)

        # Eliminar clases vacías
        partition = set()
        if finals_reach:
            partition.add(finals_reach)
        if non_finals_reach:
            partition.add(non_finals_reach)

        if not partition:
            return self._empty_result()

        # ── Fase 2: Refinamiento iterativo ────────────────────────────────
        # Continuar hasta que la partición no cambie (punto fijo)
        changed = True
        while changed:
            changed       = False
            new_partition = set()

            for group in partition:
                # Intentar dividir este grupo
                splits = self._split(group, partition)

                if len(splits) > 1:
                    # El grupo se dividió → partición cambió
                    changed = True

                for s in splits:
                    new_partition.add(s)

            partition = new_partition

        # ── Fase 3: Construir el AFD mínimo ───────────────────────────────
        return self._build_minimized_dfa(partition)

    # ─────────────────────────────────────────────────────────────────────────
    def _split(self, group, partition):
        """
        Intenta dividir un grupo de estados usando la partición actual.

        Dos estados p, q en el mismo grupo son DISTINGUIBLES con símbolo a
        si δ(p,a) y δ(q,a) caen en DIFERENTES clases de la partición.

        Si todos los estados del grupo son indistinguibles → no se divide.
        Si algún par es distinguible → dividir en subgrupos según el destino.

        Parámetros:
            group     (frozenset) → Grupo de estados a intentar dividir
            partition (set)       → Partición actual

        Retorna:
            list[frozenset] → Lista de subgrupos (1 elemento si no se dividió)
        """
        # Función: dado un estado, ¿en qué clase cae su destino con cada símbolo?
        def signature(state):
            sig = []
            for a in self.alphabet:
                dest  = self.delta[state].get(a)
                # Encontrar la clase de 'dest' en la partición actual
                cls   = self._find_class(dest, partition)
                sig.append((a, id(cls) if cls else None))
            return tuple(sig)

        # Agrupar estados del grupo según su firma
        sig_map = defaultdict(set)
        for s in group:
            sig_map[signature(s)].add(s)

        return [frozenset(g) for g in sig_map.values()]

    # ─────────────────────────────────────────────────────────────────────────
    def _find_class(self, state, partition):
        """
        Encuentra la clase de la partición que contiene a 'state'.

        Parámetros:
            state     (str)  → Estado a buscar
            partition (set)  → Partición actual

        Retorna:
            frozenset | None → La clase que contiene al estado
        """
        if state is None:
            return None
        for cls in partition:
            if state in cls:
                return cls
        return None

    # ─────────────────────────────────────────────────────────────────────────
    def _build_minimized_dfa(self, partition):
        """
        Construye el AFD mínimo a partir de la partición final.

        Cada clase de la partición se convierte en un estado del AFD mínimo.
        El representante de cada clase es el primer elemento (ordenado).

        Parámetros:
            partition (set[frozenset]) → Partición final del algoritmo

        Retorna:
            dict con la definición completa del AFD mínimo
        """
        # Mapeo clase → nombre del estado mínimo
        # Usar el representante más pequeño (lexicográfico) como nombre base
        class_name = {}
        groups_info = []

        for cls in partition:
            # Filtrar el estado muerto del nombre visible
            visible = sorted(s for s in cls if s != self.dead_state)
            if not visible:
                rep = self.dead_state or '∅'
            elif len(visible) == 1:
                rep = visible[0]
            else:
                rep = '{' + ','.join(visible) + '}'
            class_name[cls] = rep
            groups_info.append({
                'name':     rep,
                'members':  visible,
                'is_final': bool(cls & self.finals)
            })

        # Estado inicial mínimo = clase que contiene al estado inicial original
        init_class   = self._find_class(self.initial, partition)
        min_initial  = class_name.get(init_class, self.initial)

        # Construir estados y transiciones del AFD mínimo
        min_states      = []
        min_transitions = []
        min_finals      = set()

        for cls in partition:
            name       = class_name[cls]
            is_final   = bool(cls & self.finals)
            is_initial = (cls == init_class)

            # Ignorar el estado muerto en la salida (si existe)
            if name == self.dead_state or (
                self.dead_state and self.dead_state in cls and not (cls & self.finals)
                and len(cls) == 1
            ):
                continue

            min_states.append({
                'id':         name,
                'name':       name,
                'is_initial': is_initial,
                'is_final':   is_final
            })

            if is_final:
                min_finals.add(name)

            # Tomar un representante de la clase para calcular transiciones
            rep_state = next(iter(cls))
            for a in self.alphabet:
                dest      = self.delta[rep_state].get(a)
                dest_cls  = self._find_class(dest, partition)
                dest_name = class_name.get(dest_cls, '∅') if dest_cls else '∅'

                # No agregar transiciones al estado muerto
                if dest_name == self.dead_state:
                    continue

                min_transitions.append({
                    'from':   name,
                    'symbol': a,
                    'to':     dest_name
                })

        original_count = len([s for s in self.states if s != self.dead_state])
        min_count      = len(min_states)

        return {
            'states':      min_states,
            'transitions': min_transitions,
            'initial':     min_initial,
            'finals':      list(min_finals),
            'alphabet':    self.alphabet,
            'groups':      groups_info,
            'removed':     original_count - min_count,
            'original_count': original_count,
            'min_count':      min_count
        }

    def _empty_result(self):
        return {
            'states': [], 'transitions': [], 'initial': None,
            'finals': [], 'alphabet': [], 'groups': [],
            'removed': 0, 'original_count': 0, 'min_count': 0
        }

    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def are_equivalent(dfa1_result, dfa2_result):
        """
        Verifica si dos AFD (ya minimizados) son equivalentes.

        Dos AFD son equivalentes si reconocen exactamente el mismo lenguaje.
        Método: minimizar ambos y comparar sus tablas de transición.

        Si los AFD mínimos son isomorfos (misma estructura renombrando estados),
        entonces son equivalentes.

        Implementación simplificada: BFS simultáneo sobre pares de estados.
        Si en algún momento uno está en estado final y el otro no → no equivalentes.

        Parámetros:
            dfa1_result (dict) → Resultado de minimize() del primer AFD
            dfa2_result (dict) → Resultado de minimize() del segundo AFD

        Retorna:
            dict → { equivalent: bool, witness: str|None }
                   witness = cadena que distingue los dos AFD (o None si equivalentes)
        """
        # Construir tablas de transición para BFS
        def build_delta(result):
            d = {}
            for t in result.get('transitions', []):
                d[(t['from'], t['symbol'])] = t['to']
            return d

        delta1  = build_delta(dfa1_result)
        delta2  = build_delta(dfa2_result)
        finals1 = set(dfa1_result.get('finals', []))
        finals2 = set(dfa2_result.get('finals', []))
        init1   = dfa1_result.get('initial')
        init2   = dfa2_result.get('initial')

        if not init1 or not init2:
            return {'equivalent': init1 == init2, 'witness': None}

        alphabet = sorted(set(
            list(dfa1_result.get('alphabet', [])) +
            list(dfa2_result.get('alphabet', []))
        ))

        # BFS simultáneo sobre pares (estado1, estado2)
        visited = set()
        queue   = [(init1, init2, '')]   # (estado_afd1, estado_afd2, cadena_leída)

        while queue:
            s1, s2, word = queue.pop(0)
            pair = (s1, s2)

            if pair in visited:
                continue
            visited.add(pair)

            # ¿Uno acepta y el otro no? → no son equivalentes
            in_f1 = s1 in finals1
            in_f2 = s2 in finals2
            if in_f1 != in_f2:
                return {
                    'equivalent': False,
                    'witness':    word if word else 'ε',
                    'detail':     f'"{word or "ε"}": AFD1 {"acepta" if in_f1 else "rechaza"}, '
                                  f'AFD2 {"acepta" if in_f2 else "rechaza"}'
                }

            # Continuar BFS con cada símbolo del alfabeto
            for a in alphabet:
                next1 = delta1.get((s1, a))
                next2 = delta2.get((s2, a))
                # Si ambos van a None (estado muerto), son iguales en ese símbolo
                if (next1, next2) not in visited:
                    n1 = next1 or '__dead1__'
                    n2 = next2 or '__dead2__'
                    queue.append((n1, n2, word + a))

        return {'equivalent': True, 'witness': None}
