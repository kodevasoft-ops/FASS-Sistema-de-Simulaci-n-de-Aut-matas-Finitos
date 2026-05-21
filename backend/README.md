# FASS — Sistema de Simulación de Autómatas Finitos

---

## ¿Qué es FASS?

**FASS** (Finite Automata Simulation System) es una herramienta interactiva desarrollada para la materia de **Teoría de Compiladores**. Permite construir, visualizar y simular el comportamiento de **Autómatas Finitos** de manera visual y paso a paso, sin necesidad de hacer cálculos a mano.

Con FASS puedes:

- Crear estados y transiciones de forma gráfica.
- Elegir entre un autómata determinista (AFD) o no determinista (AFN).
- Escribir una cadena de texto y ver cómo el autómata la procesa símbolo por símbolo.
- Saber si una cadena es **aceptada** o **rechazada** con animación en tiempo real.
- Exportar e importar autómatas en formato JSON para guardar tu trabajo.

> 💡 **¿No sabes por dónde empezar?** Haz clic en el botón **"Load Demo"** dentro de la aplicación y se cargará automáticamente un autómata de ejemplo listo para probar.

---

## Conceptos clave — Guía de ayuda

Antes de usar el simulador, es importante entender qué significa cada término. Aquí te lo explicamos con lenguaje sencillo y con ejemplos reales.

---

### 🔵 Estado (`state`)

**¿Qué es?**
Un estado representa una situación o condición en la que se encuentra el autómata en un momento dado. Puedes imaginarlo como una "pantalla" en un videojuego: el personaje siempre está en alguna pantalla.

**Tipos de estado:**

| Tipo | Símbolo | ¿Qué significa? |
|------|---------|-----------------|
| **Inicial** | `▶` | Por aquí empieza el autómata. Solo puede haber uno. |
| **Final / de aceptación** | `◉` | Si el autómata termina aquí, la cadena es ACEPTADA. |
| **Normal** | sin símbolo | Estado intermedio, de paso. |

**Ejemplo:**
Imagina un torniquete de metro. Tiene dos estados:
- `bloqueado` → Estado inicial (no puedes pasar).
- `desbloqueado` → Estado final (puedes pasar después de pagar).

---

### 🟡 Transición (`transition`)

**¿Qué es?**
Una transición es la "regla" que dice: *"Si estoy en el estado X y leo el símbolo Y, entonces me muevo al estado Z."* Es la flecha que conecta dos estados en el diagrama.

**Formato:** `(estado_origen, símbolo) → estado_destino`

**Ejemplo:**
En el torniquete:
- `(bloqueado, moneda) → desbloqueado` — Al insertar una moneda, se desbloquea.
- `(desbloqueado, empujar) → bloqueado` — Al pasar, vuelve a bloquearse.

> 💡 **Ayuda:** En la aplicación, al crear una transición debes elegir el estado de origen, escribir el símbolo (una letra, número, etc.) y elegir el estado de destino.

---

### 🔴 AFD — Autómata Finito Determinista

**¿Qué es?**
Es el tipo de autómata más simple. Se llama "determinista" porque **para cada estado y cada símbolo, existe exactamente una respuesta**: siempre sabe a dónde ir. No hay ambigüedad.

**Regla de oro del AFD:**
> Desde un estado, con un símbolo dado, solo puedes ir a **un único estado destino**.

**Ejemplo — Cadenas que terminan en "abb":**

Autómata que acepta cadenas como `abb`, `aabb`, `babb`, `aaabb`:

```
Estado q0 (inicial):
  - Lee 'a' → va a q1
  - Lee 'b' → se queda en q0

Estado q1:
  - Lee 'a' → se queda en q1
  - Lee 'b' → va a q2

Estado q2:
  - Lee 'a' → va a q1
  - Lee 'b' → va a q3 ✅ (final)

Estado q3 (final):
  - Lee 'a' → va a q1
  - Lee 'b' → va a q0
```

Si ingresamos la cadena `"aabb"`:
- q0 → lee 'a' → q1
- q1 → lee 'a' → q1
- q1 → lee 'b' → q2
- q2 → lee 'b' → q3 ✅ **ACEPTADA**

Si ingresamos `"ab"`:
- q0 → lee 'a' → q1
- q1 → lee 'b' → q2 ✗ **RECHAZADA** (termina en q2, no en q3)

> 💡 **Ayuda:** Selecciona el modo **AFD** en el panel lateral antes de crear las transiciones. El sistema te avisará si intentas crear una transición duplicada (mismo estado + mismo símbolo), ya que eso no está permitido en un AFD.

---

### 🟣 AFN — Autómata Finito No Determinista

**¿Qué es?**
Es una versión más flexible del autómata. Se llama "no determinista" porque **desde un estado, con un mismo símbolo, puede haber varios caminos posibles** al mismo tiempo. El autómata "explora" todos los caminos en paralelo.

**Diferencia clave con el AFD:**

| Característica | AFD | AFN |
|----------------|-----|-----|
| Destinos por símbolo | Exactamente 1 | 1 o más |
| Transiciones ε (vacías) | No permitidas | Permitidas |
| Facilidad de diseño | Más complejo | Más intuitivo |
| Poder de cómputo | Igual al AFN | Igual al AFD |

**Transición épsilon (ε):**
Es una transición especial que ocurre **sin leer ningún símbolo**. El autómata puede moverse de un estado a otro "gratis", sin consumir entrada.

**Ejemplo — AFN que acepta cadenas que terminan en "a" o en "b":**

```
Estado q0 (inicial):
  - Lee 'a' → puede ir a q1 o quedarse en q0
  - Lee 'b' → puede ir a q2 o quedarse en q0

Estado q1 (final): acepta si terminamos aquí
Estado q2 (final): acepta si terminamos aquí
```

> 💡 **Ayuda:** En modo **AFN**, puedes crear múltiples transiciones con el mismo origen y símbolo. El simulador usará **BFS (búsqueda en anchura)** internamente para explorar todos los caminos posibles al mismo tiempo y determinar si alguno llega a un estado final.

---

### 🟢 Cadena (`string`)

**¿Qué es?**
Es la secuencia de símbolos que el autómata va a procesar. Puede ser una palabra, un número, o cualquier combinación de caracteres del alfabeto del autómata.

**Ejemplo:**
Si el alfabeto es `{a, b}`, cadenas válidas serían: `"ab"`, `"ba"`, `"aabb"`, `""` (cadena vacía).

**¿Qué significa que una cadena sea aceptada o rechazada?**
- ✅ **ACEPTADA:** El autómata procesó todos los símbolos y terminó en un estado final.
- ✗ **RECHAZADA:** El autómata terminó en un estado no final, o no encontró transición para algún símbolo (estado muerto `∅`).

> 💡 **Ayuda:** Escribe la cadena en la barra inferior de la aplicación y presiona **Enter**. El simulador la procesará símbolo por símbolo con animación. Puedes ajustar la velocidad de la animación con el control deslizante que aparece al lado.

---

### ⚡ Cerradura Épsilon (`ε-closure`)

**¿Qué es?**
Solo aplica en AFN. Es el conjunto de todos los estados a los que puede llegar el autómata **siguiendo únicamente transiciones épsilon**, sin leer ningún símbolo. Se calcula automáticamente por el simulador.

**Ejemplo:**
Si desde `q0` hay una transición `ε → q1`, y desde `q1` hay `ε → q2`, entonces la cerradura épsilon de `{q0}` es `{q0, q1, q2}`.

> 💡 **Ayuda:** No necesitas calcularla a mano. Al crear transiciones con el campo de símbolo **vacío** en modo AFN, el sistema las interpreta automáticamente como transiciones épsilon y las procesa correctamente.

---

### 📋 Tabla de Transiciones

**¿Qué es?**
Es una representación en forma de tabla de todas las reglas del autómata. Las filas son los estados, las columnas son los símbolos del alfabeto y las celdas muestran a qué estado se va.

**Ejemplo para el AFD de "cadenas que terminan en abb":**

| Estado | a | b |
|--------|---|---|
| →q0 | q1 | q0 |
| q1 | q1 | q2 |
| q2 | q1 | q3 |
| *q3 | q1 | q0 |

> `→` = estado inicial, `*` = estado final

> 💡 **Ayuda:** Puedes ver esta tabla en la pestaña **"TABLE"** de la consola derecha, dentro de la aplicación. Se actualiza automáticamente cada vez que agregas una transición.

---

### 📊 Alfabeto (Σ)

**¿Qué es?**
El alfabeto es el conjunto de todos los símbolos que el autómata puede leer. Se define implícitamente al crear las transiciones: cada símbolo que uses en una transición pasa a formar parte del alfabeto.

**Ejemplo:**
Si creas transiciones con los símbolos `a` y `b`, entonces `Σ = {a, b}`.

> 💡 **Ayuda:** Puedes ver el alfabeto actual en la pestaña **"STATS"** de la consola derecha.

---

## Estructura del proyecto

```
fass/
├── README.md                       ← Este archivo de documentación
│
├── backend/                        ← Servidor Python (opcional)
│   ├── app.py                      ← Punto de entrada del servidor Flask
│   ├── requirements.txt            ← Librerías Python necesarias
│   └── automata/
│       ├── afd.py                  ← Motor de simulación AFD
│       ├── afn.py                  ← Motor de simulación AFN
│       └── validator.py            ← Cálculo de estadísticas del autómata
│
└── frontend/                       ← Aplicación web (se abre en el navegador)
    ├── index.html                  ← Página principal
    ├── css/
    │   └── style.css               ← Estilos visuales (diseño cyber-retro)
    └── js/
        ├── animations.js           ← Efectos visuales y animaciones
        ├── graph.js                ← Dibuja el grafo del autómata
        ├── simulator.js            ← Lógica de simulación
        └── ui.js                   ← Controla botones, modales y consola
```

---

## ¿Para qué sirve cada archivo?

### Backend (servidor Python)

**`app.py`** — El servidor principal. Recibe las peticiones del navegador (crear estados, validar cadenas, etc.) y devuelve los resultados. Funciona como el "cerebro" del sistema cuando se usa con backend.

**`automata/afd.py`** — Contiene toda la lógica del Autómata Finito Determinista. Cuando le das una cadena, la procesa símbolo por símbolo usando una tabla de búsqueda ultrarrápida y te dice si es aceptada o rechazada.

**`automata/afn.py`** — Contiene la lógica del Autómata Finito No Determinista. Usa BFS (búsqueda en anchura) para explorar todos los caminos posibles al mismo tiempo, incluyendo las transiciones épsilon.

**`automata/validator.py`** — Analiza la estructura del autómata y calcula estadísticas: cuántos estados hay, cuál es el alfabeto, si el autómata está completo, cuáles estados son inalcanzables, etc.

**`requirements.txt`** — Lista las librerías de Python que necesitas instalar para que el servidor funcione. Solo contiene dos: `flask` (el servidor web) y `flask-cors` (para permitir la conexión desde el navegador).

---

### Frontend (aplicación web)

**`index.html`** — Es la página principal que abres en el navegador. Contiene toda la estructura visual: el panel lateral, el área del grafo, la consola y los modales. También es el punto de arranque que carga todos los demás módulos.

**`css/style.css`** — Define toda la apariencia visual de la aplicación: colores, tipografías, efectos de brillo (glow), scanlines de pantalla CRT, animaciones y el diseño responsivo para móviles.

**`js/animations.js`** — Se encarga de todos los efectos visuales: la secuencia de arranque tipo BIOS, el efecto de escritura en la consola, las partículas digitales del fondo y el parpadeo de pantalla retro.

**`js/graph.js`** — Dibuja y actualiza el grafo del autómata usando la librería vis.js. Maneja la apariencia de los nodos (estados), las flechas (transiciones) y los efectos de iluminación durante la simulación.

**`js/simulator.js`** — Es el motor cliente. Cuando no hay servidor Flask disponible, incluye toda la lógica AFD y AFN en JavaScript para que la aplicación funcione igual. También se comunica con el servidor cuando sí está activo.

**`js/ui.js`** — Controla toda la interfaz de usuario: los botones del panel lateral, los modales para crear estados y transiciones, las pestañas de la consola, la barra de estado y los mensajes del sistema.

---

## Instalación y ejecución

### Opción A — Sin servidor (la más sencilla) ✅ Recomendada

No necesitas instalar nada. Simplemente abre el archivo `frontend/index.html` en tu navegador. Todo funciona de forma local gracias al motor JavaScript integrado.

```bash
# Doble clic en el archivo, o desde terminal:
open frontend/index.html
```

Si tu navegador bloquea archivos locales, usa este comando para levantar un mini servidor:

```bash
cd frontend
python3 -m http.server 8080
# Luego abre: http://localhost:8080
```

---

### Opción B — Con servidor Flask

Usa esta opción si quieres que el historial y los datos persistan en el servidor.

```bash
# Paso 1: Instalar las librerías necesarias
cd backend
pip install -r requirements.txt

# Paso 2: Iniciar el servidor
python app.py
# El servidor queda corriendo en: http://localhost:5000

# Paso 3: En otra terminal, servir el frontend
cd frontend
python3 -m http.server 8080
# Abrir en el navegador: http://localhost:8080
```

---

## Ejemplo completo paso a paso

> **Objetivo:** Crear un AFD que acepte cadenas sobre `{a, b}` que terminen en `"abb"`.
> Ejemplos aceptados: `abb`, `aabb`, `babb`, `aaabb`

### Paso 1 — Seleccionar tipo de autómata
En el panel lateral, haz clic en **AFD**.

### Paso 2 — Crear los estados
Haz clic en **"Add State"** y crea los siguientes:

| ID | Nombre | ¿Inicial? | ¿Final? |
|----|--------|-----------|---------|
| q0 | q0 | ✅ Sí | ❌ No |
| q1 | q1 | ❌ No | ❌ No |
| q2 | q2 | ❌ No | ❌ No |
| q3 | q3 | ❌ No | ✅ Sí |

### Paso 3 — Crear las transiciones
Haz clic en **"Add Transition"** y agrega cada regla:

| Desde | Símbolo | Hacia |
|-------|---------|-------|
| q0 | a | q1 |
| q0 | b | q0 |
| q1 | a | q1 |
| q1 | b | q2 |
| q2 | a | q1 |
| q2 | b | q3 |
| q3 | a | q1 |
| q3 | b | q0 |

### Paso 4 — Validar cadenas
Escribe en la barra inferior y presiona **Enter**:

- `abb` → ✅ **ACEPTADA** (q0→q1→q2→q3)
- `ab` → ✗ **RECHAZADA** (termina en q2, no en q3)
- `babb` → ✅ **ACEPTADA** (q0→q0→q1→q2→q3)

> 💡 **Atajo:** En lugar de crear todo esto a mano, haz clic en **"Load Demo"** y el simulador cargará este mismo autómata automáticamente.

---

## Exportar e importar autómatas

Una vez que construyas tu autómata, puedes guardarlo como archivo JSON para no perderlo.

**Para exportar:** Clic en **"Export JSON"** → se descarga un archivo `.json`.

**Para importar:** Clic en **"Import JSON"** → pega el contenido JSON → clic en **Import**.

**Formato del archivo:**
```json
{
  "type": "AFD",
  "states": [
    { "id": "q0", "name": "q0", "is_initial": true,  "is_final": false },
    { "id": "q1", "name": "q1", "is_initial": false, "is_final": false },
    { "id": "q2", "name": "q2", "is_initial": false, "is_final": false },
    { "id": "q3", "name": "q3", "is_initial": false, "is_final": true  }
  ],
  "transitions": [
    { "from": "q0", "symbol": "a", "to": "q1" },
    { "from": "q0", "symbol": "b", "to": "q0" },
    { "from": "q1", "symbol": "a", "to": "q1" },
    { "from": "q1", "symbol": "b", "to": "q2" },
    { "from": "q2", "symbol": "a", "to": "q1" },
    { "from": "q2", "symbol": "b", "to": "q3" },
    { "from": "q3", "symbol": "a", "to": "q1" },
    { "from": "q3", "symbol": "b", "to": "q0" }
  ],
  "initial": "q0",
  "finals": ["q3"]
}
```

---

## Preguntas frecuentes

**¿Por qué el autómata no me acepta la cadena?**
Verifica que: (1) existe un estado inicial definido, (2) existe al menos un estado final, y (3) hay transiciones para todos los símbolos que usas en la cadena.

**¿Puedo usar números o caracteres especiales como símbolos?**
Sí. Puedes usar `0`, `1`, `x`, `#`, o cualquier caracter como símbolo de transición.

**¿Qué pasa si dejo el símbolo vacío en una transición?**
En modo AFN se crea una transición épsilon (ε). En modo AFD no está permitido.

**¿El servidor Flask es obligatorio?**
No. La aplicación funciona completamente en modo local desde el navegador.

**¿Cómo reinicio todo?**
Haz clic en el botón rojo **"Reset All"** en el panel lateral. Esto borra todos los estados, transiciones e historial de la sesión actual.

---

## Tecnologías utilizadas

| Tecnología | Uso |
|------------|-----|
| **HTML5 / CSS3** | Estructura y diseño visual de la aplicación |
| **JavaScript (Vanilla)** | Lógica del cliente, módulos del simulador |
| **vis.js** | Renderizado interactivo del grafo del autómata |
| **Python + Flask** | Servidor REST opcional para procesamiento backend |
| **Canvas API** | Partículas digitales animadas en el fondo |
| **Google Fonts** | Tipografías: Orbitron, Share Tech Mono, VT323 |
