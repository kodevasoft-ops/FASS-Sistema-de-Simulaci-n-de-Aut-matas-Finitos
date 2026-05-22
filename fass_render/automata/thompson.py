"""
╔══════════════════════════════════════════════════════════════════════════════╗
║       FASS v2 — Construcción de Thompson (Regex → AFN)                     ║
║                      Archivo: thompson.py                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Algoritmo: Construcción de Thompson (1968)                                 ║
║  ─────────────────────────────────────────────────────────────────────────  ║
║  Convierte una Expresión Regular en un AFN-ε equivalente.                  ║
║  Es el PRIMER PASO de la cadena clásica de compiladores:                   ║
║                                                                              ║
║    Regex → AFN (Thompson) → AFD (Subconjuntos) → AFD mínimo (Hopcroft)    ║
║                                                                              ║
║  Sintaxis soportada:                                                         ║
║    a       → símbolo literal                                                 ║
║    ab      → concatenación (a seguido de b)                                 ║
║    a|b     → unión (a o b)                                                  ║
║    a*      → clausura de Kleene (cero o más repeticiones de a)              ║
║    a+      → clausura positiva (una o más: equivale a aa*)                  ║
║    a?      → opcional (cero o una: equivale a a|ε)                          ║
║    (a|b)*  → paréntesis para agrupar                                        ║
║    ε       → cadena vacía (épsilon literal)                                 ║
║                                                                              ║
║  Reglas de construcción de Thompson:                                         ║
║    1. Base: símbolo 'a'  →  q0 --a--> q1                                   ║
║    2. Base: épsilon      →  q0 --ε--> q1                                   ║
║    3. Concatenación N1·N2: final(N1) --ε--> inicial(N2)                    ║
║    4. Unión N1|N2: nuevo inicio --ε--> {ini(N1), ini(N2)}                  ║
║                   {fin(N1), fin(N2)} --ε--> nuevo final                     ║
║    5. Kleene N*:  nuevo inicio --ε--> {ini(N), nuevo final}                ║
║                   fin(N) --ε--> {ini(N), nuevo final}                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import re as _re


class ThompsonNFA:
    """
    Fragmento de AFN usado durante la construcción de Thompson.
    Representa un AFN parcial con un estado inicial y uno final.
    """
    def __init__(self, start, end, states, transitions):
        self.start       = start        # Estado inicial del fragmento
        self.end         = end          # Estado final del fragmento
        self.states      = states       # Todos los estados del fragmento
        self.transitions = transitions  # Transiciones del fragmento


class ThompsonConstruction:
    """
    Implementa la construcción de Thompson para convertir Regex → AFN-ε.

    Usa un parser recursivo descendente para analizar la expresión regular
    y construir el AFN por composición de fragmentos elementales.
    """

    def __init__(self):
        self._counter = 0    # Contador para generar IDs únicos de estados

    # ─────────────────────────────────────────────────────────────────────────
    def _new_state(self):
        """
        Genera un nuevo ID de estado único con formato 's0', 's1', 's2'...

        Retorna:
            str → ID del nuevo estado
        """
        s = f's{self._counter}'
        self._counter += 1
        return s

    # ─────────────────────────────────────────────────────────────────────────
    def _add_trans(self, transitions, frm, symbol, to):
        """
        Agrega una transición a la lista de transiciones del fragmento.

        Parámetros:
            transitions (list) → Lista donde agregar la transición
            frm        (str)   → Estado origen
            symbol     (str)   → Símbolo ('', 'a', 'b'...) — '' = épsilon
            to         (str)   → Estado destino
        """
        transitions.append({'from': frm, 'symbol': symbol, 'to': to})

    # ─────────────────────────────────────────────────────────────────────────
    # REGLAS ELEMENTALES DE THOMPSON
    # ─────────────────────────────────────────────────────────────────────────

    def _nfa_symbol(self, symbol):
        """
        Regla base: AFN para un símbolo literal 'a'.
        Construye: q_start --a--> q_end

        Parámetro:
            symbol (str) → Símbolo literal o '' para épsilon

        Retorna:
            ThompsonNFA
        """
        start = self._new_state()
        end   = self._new_state()
        trans = []
        self._add_trans(trans, start, symbol, end)
        return ThompsonNFA(start, end, [start, end], trans)

    def _nfa_concat(self, nfa1, nfa2):
        """
        Regla de concatenación: N1 seguido de N2.
        Conecta el final de N1 con el inicio de N2 mediante épsilon.

        Construcción:
            [N1: s0→s1] --ε--> [N2: s2→s3]
            Resultado: s0 --...N1...--> s1 --ε--> s2 --...N2...--> s3

        Parámetros:
            nfa1, nfa2 (ThompsonNFA)

        Retorna:
            ThompsonNFA
        """
        trans = nfa1.transitions + nfa2.transitions
        self._add_trans(trans, nfa1.end, '', nfa2.start)
        states = nfa1.states + nfa2.states
        return ThompsonNFA(nfa1.start, nfa2.end, states, trans)

    def _nfa_union(self, nfa1, nfa2):
        """
        Regla de unión: N1 | N2.
        Nuevo inicio con ε a ambos, ε de ambos finales a nuevo final.

        Construcción:
            new_start --ε--> nfa1.start
            new_start --ε--> nfa2.start
            nfa1.end  --ε--> new_end
            nfa2.end  --ε--> new_end

        Parámetros:
            nfa1, nfa2 (ThompsonNFA)

        Retorna:
            ThompsonNFA
        """
        new_start = self._new_state()
        new_end   = self._new_state()
        trans     = nfa1.transitions + nfa2.transitions

        self._add_trans(trans, new_start, '', nfa1.start)
        self._add_trans(trans, new_start, '', nfa2.start)
        self._add_trans(trans, nfa1.end,  '', new_end)
        self._add_trans(trans, nfa2.end,  '', new_end)

        states = [new_start, new_end] + nfa1.states + nfa2.states
        return ThompsonNFA(new_start, new_end, states, trans)

    def _nfa_kleene(self, nfa):
        """
        Regla de clausura de Kleene: N*.
        Permite cero o más repeticiones.

        Construcción:
            new_start --ε--> nfa.start
            new_start --ε--> new_end      (permite cero repeticiones)
            nfa.end   --ε--> nfa.start    (permite repetición)
            nfa.end   --ε--> new_end      (permite salir)

        Parámetro:
            nfa (ThompsonNFA)

        Retorna:
            ThompsonNFA
        """
        new_start = self._new_state()
        new_end   = self._new_state()
        trans     = list(nfa.transitions)

        self._add_trans(trans, new_start, '', nfa.start)
        self._add_trans(trans, new_start, '', new_end)
        self._add_trans(trans, nfa.end,   '', nfa.start)
        self._add_trans(trans, nfa.end,   '', new_end)

        states = [new_start, new_end] + nfa.states
        return ThompsonNFA(new_start, new_end, states, trans)

    def _nfa_plus(self, nfa):
        """
        Clausura positiva: N+  (equivale a N·N*)

        Parámetro:
            nfa (ThompsonNFA)

        Retorna:
            ThompsonNFA
        """
        return self._nfa_concat(nfa, self._nfa_kleene(nfa))

    def _nfa_optional(self, nfa):
        """
        Operador opcional: N?  (equivale a N|ε)

        Parámetro:
            nfa (ThompsonNFA)

        Retorna:
            ThompsonNFA
        """
        return self._nfa_union(nfa, self._nfa_symbol(''))

    # ─────────────────────────────────────────────────────────────────────────
    # PARSER DE EXPRESIONES REGULARES
    # ─────────────────────────────────────────────────────────────────────────

    def build(self, regex):
        """
        Punto de entrada principal: convierte una regex en AFN.

        Normaliza la regex, la parsea y retorna el resultado completo.

        Parámetro:
            regex (str) → Expresión regular. Ej: "(a|b)*abb"

        Retorna:
            dict con:
              states       → lista de estados del AFN
              transitions  → lista de transiciones
              initial      → estado inicial
              finals       → [estado final]
              alphabet     → símbolos del alfabeto
              regex        → regex original normalizada
        """
        self._counter = 0

        # Normalizar: reemplazar 'ε' textual por cadena vacía interna
        regex = regex.strip().replace('ε', '\x00')

        try:
            # Agregar concatenación explícita antes de parsear
            regex_concat = self._add_concat_op(regex)
            # Convertir a notación postfija (Shunting-Yard)
            postfix      = self._to_postfix(regex_concat)
            # Construir AFN desde postfijo
            nfa          = self._build_from_postfix(postfix)
        except Exception as e:
            return {'error': f'Regex inválida: {str(e)}',
                    'states': [], 'transitions': [], 'initial': None,
                    'finals': [], 'alphabet': [], 'regex': regex}

        # Marcar el estado final
        alphabet = sorted(set(
            t['symbol'] for t in nfa.transitions if t['symbol'] and t['symbol'] != '\x00'
        ))

        states = [
            {
                'id':         s,
                'name':       s,
                'is_initial': s == nfa.start,
                'is_final':   s == nfa.end
            }
            for s in nfa.states
        ]

        return {
            'states':      states,
            'transitions': nfa.transitions,
            'initial':     nfa.start,
            'finals':      [nfa.end],
            'alphabet':    alphabet,
            'regex':       regex.replace('\x00', 'ε'),
            'error':       None
        }

    # ─────────────────────────────────────────────────────────────────────────
    def _add_concat_op(self, regex):
        """
        Inserta el operador de concatenación explícito '·' donde corresponde.

        La concatenación en regex es implícita (sin operador). Para el
        algoritmo Shunting-Yard necesitamos hacerla explícita.

        Regla: insertar '·' entre dos tokens cuando:
          - El primero es: símbolo, ')', '*', '+', '?'
          - El segundo es: símbolo, '('

        Parámetro:
            regex (str) → Regex con paréntesis y operadores

        Retorna:
            str → Regex con '·' para concatenación explícita
        """
        result = []
        for i, ch in enumerate(regex):
            result.append(ch)
            if i + 1 < len(regex):
                curr = ch
                nxt  = regex[i + 1]
                # Insertar concatenación si el contexto lo requiere
                if (curr not in ('(', '|', '·') and
                    nxt  not in (')', '|', '*', '+', '?', '·')):
                    result.append('·')
        return ''.join(result)

    # ─────────────────────────────────────────────────────────────────────────
    def _to_postfix(self, regex):
        """
        Convierte la regex infija a notación postfija (Algoritmo Shunting-Yard).

        La notación postfija elimina los paréntesis y hace explícito
        el orden de operaciones, facilitando la construcción del AFN.

        Precedencia de operadores (mayor número = mayor precedencia):
          '|'  → 1  (menor precedencia: evaluar al final)
          '·'  → 2  (concatenación: precedencia media)
          '*','+',' ?' → 3  (clausuras: mayor precedencia)

        Ejemplo:
            (a|b)*·a·b·b  →  ab|*a·b·b·

        Parámetro:
            regex (str) → Regex con operador '·' explícito

        Retorna:
            str → Regex en notación postfija
        """
        precedence = {'|': 1, '·': 2, '*': 3, '+': 3, '?': 3}
        output = []
        stack  = []

        for ch in regex:
            if ch == '(':
                stack.append(ch)
            elif ch == ')':
                while stack and stack[-1] != '(':
                    output.append(stack.pop())
                if stack:
                    stack.pop()   # Descartar '('
            elif ch in precedence:
                # Operador: vaciar stack de operadores con mayor o igual precedencia
                while (stack and stack[-1] != '(' and
                       stack[-1] in precedence and
                       precedence[stack[-1]] >= precedence[ch]):
                    output.append(stack.pop())
                stack.append(ch)
            else:
                # Símbolo literal o épsilon
                output.append(ch)

        while stack:
            output.append(stack.pop())

        return ''.join(output)

    # ─────────────────────────────────────────────────────────────────────────
    def _build_from_postfix(self, postfix):
        """
        Construye el AFN desde la expresión en notación postfija.

        Usa una pila de fragmentos NFAThompson:
          - Símbolo literal → push(nfa_symbol)
          - '*' → pop n1, push(nfa_kleene(n1))
          - '+' → pop n1, push(nfa_plus(n1))
          - '?' → pop n1, push(nfa_optional(n1))
          - '·' → pop n2, pop n1, push(nfa_concat(n1, n2))
          - '|' → pop n2, pop n1, push(nfa_union(n1, n2))

        Parámetro:
            postfix (str) → Regex en notación postfija

        Retorna:
            ThompsonNFA → Fragmento completo del AFN
        """
        stack = []

        for ch in postfix:
            if ch == '*':
                n1 = stack.pop()
                stack.append(self._nfa_kleene(n1))
            elif ch == '+':
                n1 = stack.pop()
                stack.append(self._nfa_plus(n1))
            elif ch == '?':
                n1 = stack.pop()
                stack.append(self._nfa_optional(n1))
            elif ch == '·':
                n2 = stack.pop()
                n1 = stack.pop()
                stack.append(self._nfa_concat(n1, n2))
            elif ch == '|':
                n2 = stack.pop()
                n1 = stack.pop()
                stack.append(self._nfa_union(n1, n2))
            else:
                # Símbolo literal (o épsilon interno '\x00')
                sym = '' if ch == '\x00' else ch
                stack.append(self._nfa_symbol(sym))

        if not stack:
            raise ValueError('Expresión regular vacía o inválida')

        return stack[0]
