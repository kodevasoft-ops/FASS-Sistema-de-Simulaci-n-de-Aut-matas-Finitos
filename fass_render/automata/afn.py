"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          FASS — Motor AFN (Autómata Finito No Determinista)                 ║
║                        Archivo: afn.py                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ¿Qué es un AFN?                                                             ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Un Autómata Finito No Determinista es una extensión del AFD donde          ║
║  desde un estado se pueden tomar MÚLTIPLES caminos con el mismo símbolo.    ║
║  El autómata "explora" todos los caminos posibles en paralelo.              ║
║                                                                              ║
║  Diferencias clave con el AFD:                                               ║
║    • AFD: δ(q, a) → un único estado destino                                 ║
║    • AFN: δ(q, a) → un CONJUNTO de estados destino {q1, q2, ...}           ║
║    • AFN: permite transiciones épsilon δ(q, ε) → sin leer ningún símbolo   ║
║                                                                              ║
║  Definición formal: M = (Q, Σ, δ, q0, F)                                   ║
║    • Q  → Conjunto finito de estados                                         ║
║    • Σ  → Alfabeto (sin incluir ε)                                           ║
║    • δ  → δ: Q × (Σ ∪ {ε}) → 2^Q  (función al conjunto potencia)           ║
║    • q0 → Estado inicial                                                     ║
║    • F  → Estados de aceptación                                              ║
║                                                                              ║
║  Poder expresivo:                                                             ║
║    AFN y AFD reconocen exactamente los MISMOS lenguajes (regulares).        ║
║    Sin embargo, los AFN suelen ser más fáciles de diseñar y más             ║
║    compactos. Todo AFN puede convertirse a un AFD equivalente.              ║
║                                                                              ║
║  ¿Qué es la Cerradura Épsilon (ε-closure)?                                  ║
║    Es el conjunto de todos los estados alcanzables desde un estado           ║
║    siguiendo SOLO transiciones épsilon, sin leer ningún símbolo.            ║
║    Ejemplo: si q0 →ε→ q1 →ε→ q2, entonces ε-closure(q0) = {q0, q1, q2}   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

from collections import defaultdict


class AFN:
    """
    Motor de simulación de un Autómata Finito No Determinista con soporte
    para transiciones épsilon (ε).

    Implementa:
      - Tabla de transiciones como mapa de conjuntos: δ(q,a) → {q1, q2, ...}
      - Cálculo de cerradura épsilon (ε-closure) mediante DFS iterativo
      - Simulación por conjuntos de estados activos con BFS implícito
      - Generación de pasos para animación visual

    Uso básico:
        afn = AFN(
            states=['q0','q1','q2'],
            transitions=[
                {'from':'q0','symbol':'a','to':'q1'},
                {'from':'q0','symbol':'a','to':'q2'},  # no determinismo
                {'from':'q1','symbol':'','to':'q2'},   # épsilon
            ],
            initial='q0',
            finals=['q2']
        )
        resultado = afn.validate("a")
        # → { 'accepted': True, ... }
    """

    def __init__(self, states, transitions, initial, finals):
        """
        Inicializa el AFN y construye la tabla de transición no determinista.

        ¿Cómo se diferencia de la tabla del AFD?
        ─────────────────────────────────────────────────────────────────────
        En el AFD, cada clave (estado, símbolo) mapea a UN estado destino.
        En el AFN, cada clave mapea a una LISTA de estados destino.

        Estructura resultante:
            self.delta = {
                'q0': {
                    'a': ['q1', 'q2'],   ← No determinismo: dos destinos
                    '' : ['q3']          ← Épsilon: sin consumir símbolo
                },
                'q1': {
                    'b': ['q2']
                }
            }

        Se usa defaultdict para evitar errores al acceder a claves inexistentes.

        Parámetros:
            states      (list[str])  → IDs de todos los estados
            transitions (list[dict]) → [{'from':'q0','symbol':'a','to':'q1'}, ...]
                                        symbol='' representa transición épsilon
            initial     (str)        → ID del estado inicial
            finals      (list[str])  → IDs de estados de aceptación
        """
        self.states  = states
        self.finals  = set(finals)
        self.initial = initial

        # ── Construcción de la tabla δ no determinista ────────────────────
        # defaultdict(list) crea automáticamente una lista vacía para
        # cualquier clave nueva, evitando KeyError al agregar transiciones.
        self.delta = defaultdict(lambda: defaultdict(list))

        for t in transitions:
            # Agregar el estado destino a la lista de la clave (from, symbol)
            # Si ya existen destinos para esa clave, se agrega uno más (AFN)
            self.delta[t["from"]][t["symbol"]].append(t["to"])

    # ─────────────────────────────────────────────────────────────────────────
    def epsilon_closure(self, states):
        """
        Calcula la cerradura épsilon de un conjunto de estados.

        ¿Qué es la cerradura épsilon?
        ─────────────────────────────────────────────────────────────────────
        Es el conjunto de todos los estados que el AFN puede alcanzar
        desde el conjunto dado, siguiendo ÚNICAMENTE transiciones épsilon
        (transiciones que no consumen ningún símbolo de entrada).

        Es el PRIMER paso en cualquier simulación AFN:
        antes de leer el primer símbolo, se calcula ε-closure del estado
        inicial para saber el conjunto de estados "activos" al comienzo.

        Algoritmo: DFS iterativo (pila)
        ─────────────────────────────────────────────────────────────────────
        1. Inicializar el cierre con los estados de entrada.
        2. Para cada estado en la pila, buscar transiciones con símbolo ''.
        3. Agregar los destinos de esas transiciones al cierre (si son nuevos).
        4. Repetir hasta que la pila esté vacía.

        Ejemplo:
            Estados: q0, q1, q2
            Transiciones épsilon: q0→ε→q1, q1→ε→q2
            ε-closure({q0}) = {q0, q1, q2}

        Parámetro:
            states (iterable) → Conjunto/lista de estados de partida

        Retorna:
            set[str] → Todos los estados alcanzables por épsilon
        """
        closure = set(states)   # El cierre siempre incluye los estados de partida
        stack   = list(states)  # Pila DFS inicializada con los estados de partida

        while stack:
            s = stack.pop()
            # Buscar transiciones épsilon desde el estado 's'
            # En la tabla, '' (cadena vacía) representa el símbolo épsilon
            for target in self.delta[s].get("", []):
                if target not in closure:
                    closure.add(target)
                    stack.append(target)   # Explorar recursivamente desde target

        return closure

    # ─────────────────────────────────────────────────────────────────────────
    def move(self, states, symbol):
        """
        Calcula el conjunto de estados alcanzables leyendo un símbolo.

        ¿Para qué sirve?
        ─────────────────────────────────────────────────────────────────────
        En un AFN, cuando se lee un símbolo, TODOS los estados activos
        intentan hacer una transición con ese símbolo. El resultado es
        la UNIÓN de todos los estados destino posibles.

        Operación: move(S, a) = ∪{ δ(q, a) | q ∈ S }

        Esta función implementa el movimiento "simultáneo" del AFN:
        como si el autómata se clonara a sí mismo para explorar cada camino.

        Ejemplo:
            Estados activos: {q0, q1}
            δ(q0, 'a') = {q2}
            δ(q1, 'a') = {q2, q3}
            move({q0,q1}, 'a') = {q2, q3}

        Parámetros:
            states (set/list) → Estados actualmente activos
            symbol (str)      → Símbolo a leer

        Retorna:
            set[str] → Unión de todos los estados destino posibles
        """
        result = set()
        for s in states:
            # Agregar todos los destinos de la transición (s, symbol)
            result.update(self.delta[s].get(symbol, []))
        return result

    # ─────────────────────────────────────────────────────────────────────────
    def validate(self, string):
        """
        Valida si una cadena es aceptada por el AFN.

        ¿Cómo funciona la simulación AFN?
        ─────────────────────────────────────────────────────────────────────
        A diferencia del AFD (que solo sigue un estado), el AFN mantiene
        un CONJUNTO de estados activos y los actualiza en cada símbolo.

        Algoritmo de simulación por subconjuntos:
          1. Calcular ε-closure({q0}) → conjunto de estados iniciales activos
          2. Para cada símbolo en la cadena:
               a. move(estados_activos, símbolo) → nuevos estados tras leer
               b. ε-closure(nuevos_estados)      → expandir por épsilons
               c. Actualizar estados_activos con el resultado
               d. Si estados_activos = ∅ → RECHAZADA (sin caminos posibles)
          3. Al terminar: si estados_activos ∩ F ≠ ∅ → ACEPTADA ✅

        ¿Por qué esto funciona?
        Porque mantener el conjunto de estados activos es equivalente a
        explorar TODOS los caminos del AFN simultáneamente.

        Parámetro:
            string (str) → Cadena a validar

        Retorna (dict):
            accepted       (bool)      → True si aceptada
            path           (list)      → Pasos [{states, symbol, step, dead}]
            states_per_step(list[list])→ Conjunto de estados en cada paso
            final_states   (list)      → Estados activos al terminar
        """
        if self.initial is None:
            return {"accepted": False, "path": [], "states_per_step": []}

        # ── Paso 0: calcular estados iniciales con ε-closure ──────────────
        # Antes de leer el primer símbolo, expandir por transiciones épsilon
        current_states    = self.epsilon_closure({self.initial})
        states_per_step   = [list(current_states)]
        path              = [{"states": list(current_states), "symbol": None, "step": 0}]

        # ── Procesar cada símbolo ──────────────────────────────────────────
        for i, symbol in enumerate(string):
            # a) Mover: ¿a qué estados vamos leyendo 'symbol'?
            moved = self.move(current_states, symbol)

            # b) Expandir por épsilons desde los nuevos estados
            current_states = self.epsilon_closure(moved)

            states_per_step.append(list(current_states))
            path.append({
                "states": list(current_states),
                "symbol": symbol,
                "step":   i + 1,
                "dead":   len(current_states) == 0   # Sin caminos = muerto
            })

            # c) Optimización: si no hay estados activos, cortar
            if not current_states:
                break

        # ── Verificar aceptación ───────────────────────────────────────────
        # La cadena es aceptada si AL MENOS UN estado activo es final
        accepted = bool(current_states & self.finals)

        return {
            "accepted":        accepted,
            "path":            path,
            "states_per_step": states_per_step,
            "final_states":    list(current_states)
        }

    # ─────────────────────────────────────────────────────────────────────────
    def step_by_step(self, string):
        """
        Genera los pasos detallados de simulación para animar el grafo.

        Igual que en el AFD, pero cada paso incluye CONJUNTOS de estados
        (porque el AFN puede estar en múltiples estados al mismo tiempo).

        Parámetro:
            string (str) → Cadena a procesar

        Retorna (list[dict]), cada paso con:
            index       (int)       → Posición del símbolo (0, 1, 2...)
            symbol      (str)       → Símbolo leído en este paso
            from_states (list[str]) → Estados activos ANTES de leer
            to_states   (list[str]) → Estados activos DESPUÉS de leer
            valid       (bool)      → False si no quedan estados activos
            dead        (bool)      → True si el conjunto resultante es vacío
            is_final    (bool)      → True si algún estado destino es final

        Ejemplo — AFN con no determinismo en 'a':
            Cadena "a", δ(q0,'a')={q1,q2}, q2 es final:
            [
              {index:0, symbol:'a', from_states:['q0'],
               to_states:['q1','q2'], valid:True, dead:False, is_final:True}
            ]
        """
        if self.initial is None:
            return []

        current_states = self.epsilon_closure({self.initial})
        steps          = []

        for i, symbol in enumerate(string):
            prev_states    = list(current_states)
            moved          = self.move(current_states, symbol)
            current_states = self.epsilon_closure(moved)

            steps.append({
                "index":       i,
                "symbol":      symbol,
                "from_states": prev_states,
                "to_states":   list(current_states),
                "valid":       len(current_states) > 0,
                "dead":        len(current_states) == 0,
                "is_final":    bool(current_states & self.finals)
            })

            if not current_states:
                break   # Sin caminos: cortar la simulación

        return steps

    # ─────────────────────────────────────────────────────────────────────────
    def accepts(self, string):
        """
        Atajo rápido: retorna solo True/False para una cadena dada.

        Parámetro:
            string (str) → Cadena a verificar

        Retorna:
            bool → True si aceptada, False si rechazada
        """
        return self.validate(string)["accepted"]

    # ─────────────────────────────────────────────────────────────────────────
    def get_all_transitions(self):
        """
        Retorna todas las transiciones como lista plana de diccionarios.

        Útil para serializar o inspeccionar la tabla del AFN.

        Retorna:
            list[dict] → [{'from':'q0','symbol':'a','to':'q1'}, ...]
        """
        result = []
        for frm, syms in self.delta.items():
            for sym, targets in syms.items():
                for to in targets:
                    result.append({"from": frm, "symbol": sym, "to": to})
        return result
