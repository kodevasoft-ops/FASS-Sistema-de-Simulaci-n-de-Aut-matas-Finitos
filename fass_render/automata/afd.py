"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           FASS — Motor AFD (Autómata Finito Determinista)                  ║
║                        Archivo: afd.py                                      ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  ¿Qué es un AFD?                                                             ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Un Autómata Finito Determinista es un modelo matemático que representa      ║
║  una máquina capaz de reconocer patrones en cadenas de texto.                ║
║                                                                              ║
║  Se llama "DETERMINISTA" porque en cada momento el autómata sabe             ║
║  EXACTAMENTE a dónde ir. Dado un estado y un símbolo, hay UNA SOLA          ║
║  transición posible. No existe ambigüedad.                                   ║
║                                                                              ║
║  Definición formal:  M = (Q, Σ, δ, q0, F)                                  ║
║    • Q  → Conjunto finito de estados        (ej: {q0, q1, q2, q3})         ║
║    • Σ  → Alfabeto de entrada               (ej: {a, b})                   ║
║    • δ  → Función de transición δ(q,a)→q'  (tabla de movimientos)          ║
║    • q0 → Estado inicial (único)                                             ║
║    • F  → Conjunto de estados de aceptación (ej: {q3})                     ║
║                                                                              ║
║  Ejemplo — AFD que acepta cadenas terminadas en "abb":                      ║
║    δ(q0,a)=q1  δ(q0,b)=q0                                                  ║
║    δ(q1,a)=q1  δ(q1,b)=q2                                                  ║
║    δ(q2,a)=q1  δ(q2,b)=q3   ← q3 es estado final                          ║
║    δ(q3,a)=q1  δ(q3,b)=q0                                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""


class AFD:
    """
    Motor de simulación de un Autómata Finito Determinista.

    Implementa la lógica completa para:
      - Construir la tabla de transiciones δ como diccionario hash O(1)
      - Validar cadenas de entrada símbolo a símbolo
      - Generar trazabilidad paso a paso para animación visual
      - Detectar estados inalcanzables mediante BFS

    Ejemplo de uso:
        afd = AFD(
            states=['q0','q1','q2','q3'],
            transitions=[
                {'from':'q0','symbol':'a','to':'q1'},
                {'from':'q1','symbol':'b','to':'q2'},
                {'from':'q2','symbol':'b','to':'q3'},
            ],
            initial='q0',
            finals=['q3']
        )
        resultado = afd.validate("abb")
        # → { 'accepted': True, 'path': [...], 'current': 'q3' }
    """

    def __init__(self, states, transitions, initial, finals):
        """
        Inicializa el AFD y construye la tabla de transición δ.

        ¿Qué hace internamente?
        ─────────────────────────────────────────────────────────────────────
        Convierte la lista plana de transiciones en un diccionario hash.
        Esto permite encontrar el estado destino para cualquier par
        (estado_actual, símbolo) en tiempo O(1) durante la simulación.

        Estructura del diccionario δ resultante:
            { (estado_origen, símbolo) : estado_destino }
            Ej: { ('q0','a'):'q1', ('q0','b'):'q0', ('q1','b'):'q2' }

        Parámetros:
            states      (list[str])  → IDs de todos los estados. Ej: ['q0','q1']
            transitions (list[dict]) → Reglas: [{'from':'q0','symbol':'a','to':'q1'}]
            initial     (str)        → ID del estado inicial. Ej: 'q0'
            finals      (list[str])  → IDs de estados finales. Ej: ['q3']
        """
        self.states  = states
        self.finals  = set(finals)   # Set para búsqueda O(1): ¿es estado final?
        self.initial = initial

        # ── Construcción de la tabla δ ─────────────────────────────────────
        # Recorre cada transición y la guarda en el diccionario con clave
        # (estado_origen, símbolo). En un AFD, cada clave es ÚNICA.
        self.delta = {}
        for t in transitions:
            key = (t["from"], t["symbol"])
            self.delta[key] = t["to"]

    # ─────────────────────────────────────────────────────────────────────────
    def validate(self, string):
        """
        Valida si una cadena completa es aceptada o rechazada por el AFD.

        ¿Cómo funciona paso a paso?
        ─────────────────────────────────────────────────────────────────────
        1. El autómata parte del estado inicial q0.
        2. Lee la cadena símbolo por símbolo (de izquierda a derecha).
        3. En cada símbolo consulta δ(estado_actual, símbolo):
             - Si existe → mueve al estado destino y continúa.
             - Si NO existe → cae en estado muerto ∅ → RECHAZADA.
        4. Al terminar todos los símbolos:
             - Si el estado actual ∈ F (finales) → ACEPTADA ✅
             - Si el estado actual ∉ F            → RECHAZADA ✗

        Caso especial — cadena vacía "":
            El autómata no lee ningún símbolo. Si q0 ∈ F → ACEPTADA.

        Parámetro:
            string (str) → Cadena a validar. Puede ser "" (vacía).

        Retorna (dict):
            accepted       (bool) → True si la cadena es aceptada
            path           (list) → Secuencia de pasos [{state, symbol, step}]
            current        (str)  → Estado donde terminó el autómata
            dead           (bool) → True si llegó al estado muerto ∅
            rejected_at    (int)  → Índice del símbolo que causó rechazo (opcional)
            rejected_symbol(str)  → El símbolo que causó el rechazo (opcional)

        Ejemplo — validate("aabb") con el AFD de cadenas terminadas en "abb":
            Retorna: { 'accepted': True, 'current': 'q3', path: [q0,q1,q1,q2,q3] }
        """
        if self.initial is None:
            return {"accepted": False, "path": [], "current": None, "dead": True}

        current = self.initial

        # path: registra cada paso para mostrarlo en la consola del frontend
        # Formato de cada entrada: {state: ID, symbol: carácter leído, step: número}
        path = [{"state": current, "symbol": None, "step": 0}]

        # ── Lectura símbolo a símbolo ──────────────────────────────────────
        for i, symbol in enumerate(string):
            key = (current, symbol)

            if key not in self.delta:
                # Estado muerto: no existe transición para este (estado, símbolo).
                # ∅ representa el estado trampa implícito del AFD.
                path.append({"state": "∅", "symbol": symbol, "step": i + 1})
                return {
                    "accepted": False, "path": path,
                    "current": "∅",   "dead": True,
                    "rejected_at": i, "rejected_symbol": symbol
                }

            current = self.delta[key]
            path.append({"state": current, "symbol": symbol, "step": i + 1})

        # ── ¿Terminó en estado final? ──────────────────────────────────────
        accepted = current in self.finals
        return {"accepted": accepted, "path": path, "current": current, "dead": False}

    # ─────────────────────────────────────────────────────────────────────────
    def step_by_step(self, string):
        """
        Genera la lista de movimientos individuales para animar el grafo.

        ¿Para qué sirve?
        ─────────────────────────────────────────────────────────────────────
        El frontend necesita animar CADA transición individualmente:
        iluminar el nodo origen, trazar la flecha, iluminar el nodo destino.
        Este método entrega exactamente esa información por cada símbolo leído.

        Diferencia con validate():
            validate()     → resultado final + camino completo
            step_by_step() → cada movimiento individual para animación

        Parámetro:
            string (str) → Cadena a procesar

        Retorna (list[dict]), cada elemento con:
            index      (int)  → Posición del símbolo en la cadena (0, 1, 2...)
            symbol     (str)  → Símbolo que se está leyendo en este paso
            from_state (str)  → Estado de origen
            to_state   (str)  → Estado de destino (None si estado muerto)
            valid      (bool) → True si la transición existe
            dead       (bool) → True si no hay transición (estado muerto)
            is_final   (bool) → True si el estado destino es final

        Ejemplo — step_by_step("ab") con q0→q1→q2(final):
            [
              {index:0, symbol:'a', from_state:'q0', to_state:'q1',
               valid:True, dead:False, is_final:False},
              {index:1, symbol:'b', from_state:'q1', to_state:'q2',
               valid:True, dead:False, is_final:True},
            ]
        """
        if self.initial is None:
            return []

        current = self.initial
        steps   = []

        for i, symbol in enumerate(string):
            key = (current, symbol)

            if key not in self.delta:
                # Sin transición → estado muerto → detener simulación
                steps.append({
                    "index": i, "symbol": symbol,
                    "from_state": current, "to_state": None,
                    "valid": False, "dead": True
                })
                break

            to = self.delta[key]
            steps.append({
                "index": i, "symbol": symbol,
                "from_state": current, "to_state": to,
                "valid": True, "dead": False,
                "is_final": to in self.finals
            })
            current = to

        return steps

    # ─────────────────────────────────────────────────────────────────────────
    def accepts(self, string):
        """
        Atajo rápido: retorna solo True/False si la cadena es aceptada.

        Útil cuando no se necesita el detalle del camino recorrido,
        solo la respuesta de aceptación o rechazo.

        Parámetro:
            string (str) → Cadena a verificar

        Retorna:
            bool → True si aceptada, False si rechazada
        """
        return self.validate(string)["accepted"]

    # ─────────────────────────────────────────────────────────────────────────
    def get_reachable_states(self):
        """
        Encuentra todos los estados alcanzables desde el estado inicial.

        ¿Por qué importa?
        ─────────────────────────────────────────────────────────────────────
        Un autómata bien diseñado no debería tener estados inalcanzables.
        Si un estado no puede ser visitado desde q0 por ninguna combinación
        de símbolos, es un estado "muerto de diseño" y puede eliminarse
        sin cambiar el lenguaje que reconoce el autómata.

        Algoritmo: BFS (Búsqueda en Anchura)
        ─────────────────────────────────────────────────────────────────────
        BFS explora el grafo por "niveles" desde el estado inicial:
          Nivel 0: {q0}
          Nivel 1: todos los estados alcanzables desde q0 con 1 paso
          Nivel 2: todos los alcanzables en 2 pasos ... y así.

        Complejidad: O(Q + T) donde Q = estados, T = transiciones.

        Retorna:
            set[str] → Conjunto de IDs de estados alcanzables
                       Ej: {'q0', 'q1', 'q2'} (si q3 es inalcanzable)
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
            for (frm, _), to in self.delta.items():
                if frm == s and to not in visited:
                    queue.append(to)

        return visited
