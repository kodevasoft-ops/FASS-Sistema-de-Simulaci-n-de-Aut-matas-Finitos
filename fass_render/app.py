"""
FASS v3 — Backend Flask para Render.com
Estructura plana: automata/ en la raíz, static/ para el frontend.
  /api/convert/afn-to-afd   → Construcción de subconjuntos
  /api/minimize              → Algoritmo de Hopcroft
  /api/regex/to-afn          → Construcción de Thompson
  /api/equivalence           → Comparación de dos autómatas
  /api/generate              → Generar cadena de ejemplo aceptada
  + todos los endpoints v1
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from automata.afd import AFD
from automata.afn import AFN
from automata.validator import AutomataValidator
from automata.subset_construction import SubsetConstruction
from automata.hopcroft import HopcroftMinimizer
from automata.thompson import ThompsonConstruction

import os

# ── Flask: sirve el frontend desde static/ ────────────────────────────────────
# En Render, los archivos estáticos (index.html, CSS, JS) están en static/
# Flask los sirve directamente desde aquí sin necesitar un servidor HTTP separado.
app = Flask(__name__, static_folder='static', static_url_path='')

# ── CORS: permitir peticiones desde cualquier origen ──────────────────────────
# Necesario para que el frontend (servido por Flask en la misma URL) pueda
# llamar a los endpoints /api/* sin bloqueos del navegador.
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Ruta raíz: servir el frontend ────────────────────────────────────────────
# Cuando el usuario visita https://tu-app.onrender.com/
# Flask devuelve el index.html del frontend.
@app.route('/')
def index():
    return app.send_static_file('index.html')

# Catch-all: cualquier ruta desconocida devuelve index.html (SPA behavior)
@app.errorhandler(404)
def not_found(e):
    # Solo redirigir al frontend si NO es una ruta /api/
    from flask import request as req
    if req.path.startswith('/api/'):
        return jsonify({"ok": False, "msg": "Endpoint no encontrado"}), 404
    return app.send_static_file('index.html')


# ── Sesión principal (autómata activo) ────────────────────────────────────────
session = {
    "type": "AFD", "states": {}, "transitions": [],
    "initial": None, "finals": set(), "history": []
}

# ── Sesión secundaria (autómata B para comparación) ──────────────────────────
session_b = {
    "type": "AFD", "states": {}, "transitions": [],
    "initial": None, "finals": set()
}


def _build_automata(sess=None):
    s = sess or session
    states = list(s["states"].keys())
    if s["type"] == "AFD":
        return AFD(states, s["transitions"], s["initial"], list(s["finals"]))
    return AFN(states, s["transitions"], s["initial"], list(s["finals"]))


def _session_to_dict(sess):
    return {
        "type":        sess["type"],
        "states":      [{"id": sid, **info} for sid, info in sess["states"].items()],
        "transitions": sess["transitions"],
        "initial":     sess["initial"],
        "finals":      list(sess["finals"])
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS V1 (compatibilidad total)
# ══════════════════════════════════════════════════════════════════════════════

@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({"status": "ONLINE", "version": "2.0.0", "type": session["type"]})


@app.route("/api/reset", methods=["POST"])
def reset():
    session.update({"states": {}, "transitions": [], "initial": None,
                    "finals": set(), "history": [], "type": "AFD"})
    return jsonify({"ok": True})


@app.route("/api/type", methods=["POST"])
def set_type():
    t = request.json.get("type", "AFD").upper()
    if t not in ("AFD", "AFN"):
        return jsonify({"ok": False, "msg": "Tipo inválido"}), 400
    session["type"] = t
    return jsonify({"ok": True, "type": t})


@app.route("/api/state", methods=["POST"])
def add_state():
    data = request.json
    sid  = data.get("id") or f"q{len(session['states'])}"
    if sid in session["states"]:
        return jsonify({"ok": False, "msg": f"Estado '{sid}' ya existe"}), 409
    session["states"][sid] = {
        "name": data.get("name", sid),
        "is_initial": data.get("is_initial", False),
        "is_final":   data.get("is_final", False)
    }
    if data.get("is_initial"): session["initial"] = sid
    if data.get("is_final"):   session["finals"].add(sid)
    return jsonify({"ok": True, "state": {"id": sid, **session["states"][sid]}})


@app.route("/api/state/<sid>", methods=["DELETE"])
def delete_state(sid):
    if sid not in session["states"]:
        return jsonify({"ok": False, "msg": "Estado no encontrado"}), 404
    del session["states"][sid]
    session["transitions"] = [t for t in session["transitions"]
                               if t["from"] != sid and t["to"] != sid]
    session["finals"].discard(sid)
    if session["initial"] == sid: session["initial"] = None
    return jsonify({"ok": True})


@app.route("/api/transition", methods=["POST"])
def add_transition():
    data = request.json
    frm, sym, to = data.get("from"), data.get("symbol", ""), data.get("to")
    if frm not in session["states"] or to not in session["states"]:
        return jsonify({"ok": False, "msg": "Estado no encontrado"}), 404
    if session["type"] == "AFD":
        if any(t["from"] == frm and t["symbol"] == sym for t in session["transitions"]):
            return jsonify({"ok": False,
                            "msg": f"AFD: ya existe δ({frm}, '{sym}')"}), 409
    t = {"from": frm, "symbol": sym, "to": to}
    session["transitions"].append(t)
    return jsonify({"ok": True, "transition": t})


@app.route("/api/automata", methods=["GET"])
def get_automata():
    return jsonify(_session_to_dict(session))


@app.route("/api/validate", methods=["POST"])
def validate():
    string = request.json.get("string", "")
    if not session["initial"]:
        return jsonify({"ok": False, "msg": "Sin estado inicial"}), 400
    result = _build_automata().validate(string)
    entry  = {"string": string, "accepted": result["accepted"],
              "path": result.get("path", []), "type": session["type"]}
    session["history"].insert(0, entry)
    session["history"] = session["history"][:20]
    return jsonify(result)


@app.route("/api/validate/step", methods=["POST"])
def validate_step():
    string = request.json.get("string", "")
    if not session["initial"]:
        return jsonify({"ok": False, "msg": "Sin estado inicial"}), 400
    return jsonify({"ok": True, "steps": _build_automata().step_by_step(string)})


@app.route("/api/history",  methods=["GET"])
def get_history():  return jsonify(session["history"])


@app.route("/api/export",   methods=["GET"])
def export_json():  return jsonify(_session_to_dict(session))


@app.route("/api/import",   methods=["POST"])
def import_json():
    data = request.json
    try:
        session.update({"states": {}, "transitions": [], "finals": set(),
                        "initial": None, "type": data.get("type", "AFD")})
        for s in data.get("states", []):
            session["states"][s["id"]] = {
                "name": s.get("name", s["id"]),
                "is_initial": s.get("is_initial", False),
                "is_final":   s.get("is_final",   False)
            }
            if s.get("is_initial"): session["initial"] = s["id"]
            if s.get("is_final"):   session["finals"].add(s["id"])
        session["transitions"] = data.get("transitions", [])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 400


@app.route("/api/stats", methods=["GET"])
def get_stats():
    v = AutomataValidator(session["states"], session["transitions"],
                          session["initial"], list(session["finals"]))
    return jsonify(v.compute_stats())


@app.route("/api/alphabet", methods=["GET"])
def get_alphabet():
    return jsonify(sorted(set(t["symbol"] for t in session["transitions"] if t["symbol"])))


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINTS V2 — ALGORITMOS FORMALES
# ══════════════════════════════════════════════════════════════════════════════

# ── POST /api/convert/afn-to-afd ─────────────────────────────────────────────
@app.route("/api/convert/afn-to-afd", methods=["POST"])
def convert_afn_to_afd():
    """
    Convierte el autómata actual (AFN) en un AFD equivalente
    usando la construcción de subconjuntos.

    Puede operar sobre el autómata de sesión (sin body)
    o sobre un autómata enviado en el body (para conversión inline).

    Body opcional:
        { states, transitions, initial, finals }

    Retorna:
        {
          ok, afd: { states, transitions, initial, finals },
          subset_table: [...],
          state_map:    {...}
        }
    """
    data = request.json or {}

    # Usar datos del body si se proveen, sino usar la sesión actual
    if data.get("states"):
        states      = [s["id"] if isinstance(s, dict) else s for s in data["states"]]
        transitions = data.get("transitions", [])
        initial     = data.get("initial")
        finals      = data.get("finals", [])
    else:
        states      = list(session["states"].keys())
        transitions = session["transitions"]
        initial     = session["initial"]
        finals      = list(session["finals"])

    if not initial:
        return jsonify({"ok": False, "msg": "Sin estado inicial definido"}), 400

    sc     = SubsetConstruction(states, transitions, initial, finals)
    result = sc.convert()

    return jsonify({"ok": True, "afd": result, "subset_table": result["subset_table"],
                    "state_map": result["state_map"]})


# ── POST /api/minimize ────────────────────────────────────────────────────────
@app.route("/api/minimize", methods=["POST"])
def minimize():
    """
    Minimiza un AFD usando el algoritmo de Hopcroft.

    Puede recibir un AFD en el body o usar el autómata de sesión actual.
    Si el autómata actual es un AFN, primero lo convierte a AFD.

    Body opcional:
        { states, transitions, initial, finals }

    Retorna:
        {
          ok,
          minimized: { states, transitions, initial, finals },
          groups:    [ { name, members, is_final } ],
          removed:   N,           ← cuántos estados se eliminaron
          original_count: N,
          min_count:      N
        }
    """
    data = request.json or {}

    if data.get("states"):
        states      = [s["id"] if isinstance(s, dict) else s for s in data["states"]]
        transitions = data.get("transitions", [])
        initial     = data.get("initial")
        finals      = data.get("finals", [])
        atype       = data.get("type", "AFD")
    else:
        states      = list(session["states"].keys())
        transitions = session["transitions"]
        initial     = session["initial"]
        finals      = list(session["finals"])
        atype       = session["type"]

    if not initial:
        return jsonify({"ok": False, "msg": "Sin estado inicial"}), 400

    # Si es AFN, convertir a AFD primero
    if atype == "AFN":
        sc   = SubsetConstruction(states, transitions, initial, finals)
        afd  = sc.convert()
        states      = [s["id"] for s in afd["states"]]
        transitions = afd["transitions"]
        initial     = afd["initial"]
        finals      = afd["finals"]

    minimizer = HopcroftMinimizer(states, transitions, initial, finals)
    result    = minimizer.minimize()

    return jsonify({"ok": True, "minimized": result, **result})


# ── POST /api/regex/to-afn ────────────────────────────────────────────────────
@app.route("/api/regex/to-afn", methods=["POST"])
def regex_to_afn():
    """
    Convierte una expresión regular en un AFN-ε usando la construcción de Thompson.

    Body:
        { "regex": "(a|b)*abb" }

    Sintaxis soportada:
        a     → símbolo literal
        ab    → concatenación
        a|b   → unión
        a*    → clausura de Kleene
        a+    → clausura positiva
        a?    → opcional
        (...)  → agrupación
        ε     → épsilon literal

    Retorna:
        {
          ok,
          afn: { states, transitions, initial, finals, alphabet },
          regex: "regex normalizada"
        }
    """
    data  = request.json or {}
    regex = data.get("regex", "").strip()

    if not regex:
        return jsonify({"ok": False, "msg": "Expresión regular vacía"}), 400

    tc     = ThompsonConstruction()
    result = tc.build(regex)

    if result.get("error"):
        return jsonify({"ok": False, "msg": result["error"]}), 400

    return jsonify({"ok": True, "afn": result, "regex": result["regex"]})


# ── POST /api/regex/to-afd ────────────────────────────────────────────────────
@app.route("/api/regex/to-afd", methods=["POST"])
def regex_to_afd():
    """
    Pipeline completo: Regex → AFN (Thompson) → AFD (Subconjuntos) → AFD mínimo (Hopcroft).
    Este es el flujo estándar de un analizador léxico de compiladores.

    Body:
        { "regex": "(a|b)*abb", "minimize": true }

    Retorna:
        {
          ok,
          afn:       { ... },     ← AFN de Thompson
          afd:       { ... },     ← AFD por subconjuntos
          minimized: { ... },     ← AFD mínimo (si minimize=true)
          pipeline_summary: { ... }
        }
    """
    data     = request.json or {}
    regex    = data.get("regex", "").strip()
    do_min   = data.get("minimize", True)

    if not regex:
        return jsonify({"ok": False, "msg": "Expresión regular vacía"}), 400

    # Paso 1: Regex → AFN (Thompson)
    tc      = ThompsonConstruction()
    afn_res = tc.build(regex)
    if afn_res.get("error"):
        return jsonify({"ok": False, "msg": afn_res["error"]}), 400

    # Paso 2: AFN → AFD (Subconjuntos)
    afn_states = [s["id"] for s in afn_res["states"]]
    sc         = SubsetConstruction(
        afn_states, afn_res["transitions"],
        afn_res["initial"], afn_res["finals"]
    )
    afd_res = sc.convert()

    # Paso 3: AFD → AFD mínimo (Hopcroft)
    min_res = None
    if do_min:
        afd_state_ids = [s["id"] for s in afd_res["states"]]
        minimizer     = HopcroftMinimizer(
            afd_state_ids, afd_res["transitions"],
            afd_res["initial"], afd_res["finals"]
        )
        min_res = minimizer.minimize()

    summary = {
        "regex":          regex,
        "afn_states":     len(afn_res["states"]),
        "afd_states":     len(afd_res["states"]),
        "min_states":     len(min_res["states"]) if min_res else None,
        "alphabet":       afd_res["alphabet"]
    }

    return jsonify({
        "ok":              True,
        "afn":             afn_res,
        "afd":             afd_res,
        "minimized":       min_res,
        "pipeline_summary":summary
    })


# ── POST /api/equivalence ─────────────────────────────────────────────────────
@app.route("/api/equivalence", methods=["POST"])
def check_equivalence():
    """
    Verifica si dos autómatas son equivalentes (reconocen el mismo lenguaje).

    Método: minimizar ambos y comparar con BFS simultáneo.
    Si son equivalentes, retorna true.
    Si no, retorna una cadena testigo que uno acepta y el otro rechaza.

    Body:
        {
          "automata_a": { states, transitions, initial, finals, type },
          "automata_b": { states, transitions, initial, finals, type }
        }
        Si automata_a está ausente, usa el autómata de sesión.
        Si automata_b está ausente, usa session_b.

    Retorna:
        {
          ok, equivalent: bool,
          witness: "cadena" | null,
          detail:  "explicación" | null,
          min_a:   { ... },   ← AFD mínimo de A
          min_b:   { ... }    ← AFD mínimo de B
        }
    """
    data = request.json or {}

    def resolve(key, fallback_sess):
        d = data.get(key)
        if d:
            return d
        return _session_to_dict(fallback_sess)

    def to_min_afd(automata_data):
        """Normaliza a AFD mínimo independientemente del tipo de entrada."""
        atype  = automata_data.get("type", "AFD")
        states = [s["id"] if isinstance(s, dict) else s
                  for s in automata_data.get("states", [])]
        trans  = automata_data.get("transitions", [])
        init   = automata_data.get("initial")
        finals = automata_data.get("finals", [])

        if atype == "AFN":
            sc     = SubsetConstruction(states, trans, init, finals)
            afd    = sc.convert()
            states = [s["id"] for s in afd["states"]]
            trans  = afd["transitions"]
            init   = afd["initial"]
            finals = afd["finals"]

        m = HopcroftMinimizer(states, trans, init, finals)
        return m.minimize()

    automata_a = resolve("automata_a", session)
    automata_b = resolve("automata_b", session_b)

    if not automata_a.get("initial") or not automata_b.get("initial"):
        return jsonify({"ok": False, "msg": "Ambos autómatas deben tener estado inicial"}), 400

    min_a = to_min_afd(automata_a)
    min_b = to_min_afd(automata_b)

    result = HopcroftMinimizer.are_equivalent(min_a, min_b)

    return jsonify({
        "ok":         True,
        "equivalent": result["equivalent"],
        "witness":    result.get("witness"),
        "detail":     result.get("detail"),
        "min_a":      min_a,
        "min_b":      min_b
    })


# ── POST /api/automata-b ──────────────────────────────────────────────────────
@app.route("/api/automata-b", methods=["POST"])
def set_automata_b():
    """Carga el autómata B para comparación de equivalencia."""
    data = request.json
    try:
        session_b.update({"states": {}, "transitions": [], "finals": set(),
                           "initial": None, "type": data.get("type", "AFD")})
        for s in data.get("states", []):
            session_b["states"][s["id"]] = {
                "name": s.get("name", s["id"]),
                "is_initial": s.get("is_initial", False),
                "is_final":   s.get("is_final", False)
            }
            if s.get("is_initial"): session_b["initial"] = s["id"]
            if s.get("is_final"):   session_b["finals"].add(s["id"])
        session_b["transitions"] = data.get("transitions", [])
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 400


# ── GET /api/generate ─────────────────────────────────────────────────────────
@app.route("/api/generate", methods=["GET"])
def generate_example():
    """
    Genera la cadena más corta aceptada por el autómata actual.

    Usa BFS sobre el grafo de estados para encontrar el camino
    más corto desde el estado inicial hasta algún estado final.
    Incluye soporte para transiciones épsilon (ε) en AFN.

    Query params:
        max_length (int, default=10) → Longitud máxima de búsqueda

    Retorna:
        { ok, string, path, length }
        o { ok: false, msg } si no existe cadena aceptada en el límite
    """
    from collections import defaultdict, deque

    max_len = int(request.args.get("max_length", 10))

    # ── Validaciones claras ────────────────────────────────────────────────
    if not session["initial"]:
        return jsonify({"ok": False, "msg": "No hay estado inicial definido. Crea al menos un estado inicial."}), 400

    if not session["finals"]:
        return jsonify({"ok": False, "msg": "No hay estados finales definidos. Marca al menos un estado como final (◉)."}), 400

    if not session["states"]:
        return jsonify({"ok": False, "msg": "El autómata está vacío. Agrega estados y transiciones."}), 400

    # ── Caso especial: el estado inicial ES final → ε es aceptada ─────────
    if session["initial"] in session["finals"]:
        return jsonify({
            "ok":     True,
            "string": "ε",
            "path":   [session["initial"]],
            "length": 0
        })

    # ── Construir tabla de adyacencia ─────────────────────────────────────
    adj = defaultdict(list)
    for t in session["transitions"]:
        adj[t["from"]].append((t["symbol"], t["to"]))

    # ── BFS con deque (más eficiente que list.pop(0)) ─────────────────────
    # Cada elemento: (estado_actual, cadena_leída, camino_de_estados)
    # Usamos un set de (estado, longitud_palabra) para evitar ciclos infinitos
    queue   = deque([(session["initial"], "", [session["initial"]])])
    visited = set()
    visited.add((session["initial"], 0))

    while queue:
        state, word, path = queue.popleft()

        # ¿Llegamos a un estado final con una cadena no vacía?
        if state in session["finals"] and word:
            return jsonify({
                "ok":     True,
                "string": word,
                "path":   path,
                "length": len(word)
            })

        # Límite de longitud alcanzado → no explorar más desde aquí
        if len(word) >= max_len:
            continue

        for sym, dest in adj[state]:
            new_word = word + (sym if sym else "")  # ε no agrega símbolo
            new_len  = len(new_word)
            key      = (dest, new_len)

            if key not in visited:
                visited.add(key)
                queue.append((dest, new_word, path + [dest]))

    # Si llegamos aquí, no se encontró cadena en el límite dado
    finals_list = list(session["finals"])
    return jsonify({
        "ok":  False,
        "msg": (
            f"No se encontró cadena aceptada en {max_len} símbolos. "
            f"Estados finales: {finals_list}. "
            f"Intenta aumentar la longitud máxima o revisa las transiciones."
        )
    })


# ── GET /api/transition-table ─────────────────────────────────────────────────
@app.route("/api/transition-table", methods=["GET"])
def get_transition_table():
    """Retorna la tabla de transiciones completa en formato matricial."""
    v = AutomataValidator(session["states"], session["transitions"],
                          session["initial"], list(session["finals"]))
    return jsonify(v.get_transition_table())


if __name__ == "__main__":
    # En Render, el puerto lo asigna la variable de entorno PORT
    # En local, usa el puerto 5000 por defecto
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"

    print("╔══════════════════════════════════════════╗")
    print("║   FASS v3 Backend — Flask + Gunicorn     ║")
    print(f"║   http://localhost:{port:<22} ║")
    print("║   Frontend: servido desde /static/       ║")
    print("║   Algoritmos: Thompson · Subconjuntos    ║")
    print("║               Hopcroft · Equivalencia    ║")
    print("╚══════════════════════════════════════════╝")
    app.run(host="0.0.0.0", port=port, debug=debug)
