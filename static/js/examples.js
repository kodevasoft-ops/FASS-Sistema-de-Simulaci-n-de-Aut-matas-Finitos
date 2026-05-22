/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║      FASS v3 — Librería de Ejemplos Prácticos                           ║
 * ║                    Archivo: examples.js                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Colección de autómatas reales organizados por categoría:               ║
 * ║    1. Programación — tokens, literales, identificadores                 ║
 * ║    2. Redes — IPs, URLs, protocolos, puertos                            ║
 * ║    3. Ingeniería de Sistemas — semáforos, procesos, memoria             ║
 * ║    4. Cotidianos — cajero, semáforo, puerta, vending machine            ║
 * ║    5. Teoría pura — ejemplos clásicos de clase                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Examples = (() => {

  // ══════════════════════════════════════════════════════════════════════════
  // CATÁLOGO DE EJEMPLOS
  // Cada ejemplo tiene:
  //   id, category, title, description, difficulty,
  //   context (explicación del mundo real),
  //   automata (definición JSON cargable),
  //   testCases (cadenas para probar),
  //   explanation (cómo interpretar el autómata)
  // ══════════════════════════════════════════════════════════════════════════

  const CATALOG = [

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORÍA 1: PROGRAMACIÓN — Análisis Léxico
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'prog_identifier',
      category: 'Programación',
      icon: '💻',
      title: 'Identificadores válidos (variables)',
      difficulty: 'Básico',
      description: 'Reconoce identificadores válidos en lenguajes como Python, Java o C.',
      context: `En cualquier compilador, el ANALIZADOR LÉXICO debe identificar si una 
secuencia de caracteres es un nombre de variable válido.

Reglas de identificadores (simplificado con letras a-z):
  ✓ Deben comenzar con letra (a-z)
  ✓ Pueden continuar con letras o dígitos (0-1 simplificado)
  ✗ No pueden empezar con número
  ✗ No pueden estar vacíos

Ejemplos reales: int, contador, variable1, x, nombreUsuario`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'q0', name: 'inicio',   is_initial: true,  is_final: false },
          { id: 'q1', name: 'válido',   is_initial: false, is_final: true  },
          { id: 'q2', name: 'inválido', is_initial: false, is_final: false },
        ],
        transitions: [
          // q0: letra → válido, dígito → inválido
          { from: 'q0', symbol: 'a', to: 'q1' },
          { from: 'q0', symbol: 'b', to: 'q1' },
          { from: 'q0', symbol: 'c', to: 'q1' },
          { from: 'q0', symbol: '0', to: 'q2' },
          { from: 'q0', symbol: '1', to: 'q2' },
          // q1: letra o dígito → sigue válido
          { from: 'q1', symbol: 'a', to: 'q1' },
          { from: 'q1', symbol: 'b', to: 'q1' },
          { from: 'q1', symbol: 'c', to: 'q1' },
          { from: 'q1', symbol: '0', to: 'q1' },
          { from: 'q1', symbol: '1', to: 'q1' },
          // q2: estado trampa
          { from: 'q2', symbol: 'a', to: 'q2' },
          { from: 'q2', symbol: 'b', to: 'q2' },
          { from: 'q2', symbol: '0', to: 'q2' },
          { from: 'q2', symbol: '1', to: 'q2' },
        ],
        initial: 'q0',
        finals: ['q1']
      },
      testCases: [
        { string: 'abc',  expected: true,  label: 'variable "abc"' },
        { string: 'a1b',  expected: true,  label: 'variable "a1b"' },
        { string: '1ab',  expected: false, label: 'empieza con número "1ab"' },
        { string: 'a',    expected: true,  label: 'variable de una letra' },
        { string: '0',    expected: false, label: 'solo un número' },
      ]
    },

    {
      id: 'prog_binary',
      category: 'Programación',
      icon: '💻',
      title: 'Número binario par (divisible entre 2)',
      difficulty: 'Básico',
      description: 'Detecta si un número binario es par. Usado en arquitectura de computadores y operaciones bit a bit.',
      context: `En programación de sistemas y arquitectura de computadores,
frecuentemente se necesita determinar propiedades de números en binario.

Un número binario es PAR si su último bit es 0.
  ✓ 0, 10, 100, 110, 1000 → pares
  ✗ 1, 11, 101, 111       → impares

Aplicación real: verificar alineación de memoria en Assembly,
operaciones de desplazamiento de bits (bit shifting).`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'par',   name: 'par',   is_initial: true,  is_final: true  },
          { id: 'impar', name: 'impar', is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'par',   symbol: '0', to: 'par'   },
          { from: 'par',   symbol: '1', to: 'impar' },
          { from: 'impar', symbol: '0', to: 'par'   },
          { from: 'impar', symbol: '1', to: 'impar' },
        ],
        initial: 'par',
        finals: ['par']
      },
      testCases: [
        { string: '0',    expected: true,  label: '0 (par)' },
        { string: '10',   expected: true,  label: '2 en binario (par)' },
        { string: '110',  expected: true,  label: '6 en binario (par)' },
        { string: '1',    expected: false, label: '1 (impar)' },
        { string: '101',  expected: false, label: '5 en binario (impar)' },
        { string: '1110', expected: true,  label: '14 en binario (par)' },
      ]
    },

    {
      id: 'prog_comment',
      category: 'Programación',
      icon: '💻',
      title: 'Comentario de una línea (//) en código',
      difficulty: 'Intermedio',
      description: 'Reconoce comentarios de una línea estilo C++/Java/JavaScript.',
      context: `El analizador léxico de compiladores como GCC, Javac o V8 (Node.js)
debe reconocer y descartar comentarios durante la fase de tokenización.

Formato: // seguido de cualquier contenido (a, b, c)
  ✓ //
  ✓ //abc
  ✓ //comentario aqui
  ✗ /solo-uno
  ✗ abc

Este autómata modela la parte del léxico que detecta el inicio
de un comentario de una sola línea.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'q0', name: 'inicio',    is_initial: true,  is_final: false },
          { id: 'q1', name: 'primer /',  is_initial: false, is_final: false },
          { id: 'q2', name: 'comentario',is_initial: false, is_final: true  },
          { id: 'qe', name: 'error',     is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'q0', symbol: '/', to: 'q1' },
          { from: 'q0', symbol: 'a', to: 'qe' },
          { from: 'q0', symbol: 'b', to: 'qe' },
          { from: 'q1', symbol: '/', to: 'q2' },
          { from: 'q1', symbol: 'a', to: 'qe' },
          { from: 'q1', symbol: 'b', to: 'qe' },
          { from: 'q2', symbol: 'a', to: 'q2' },
          { from: 'q2', symbol: 'b', to: 'q2' },
          { from: 'q2', symbol: '/', to: 'q2' },
          { from: 'qe', symbol: 'a', to: 'qe' },
          { from: 'qe', symbol: 'b', to: 'qe' },
          { from: 'qe', symbol: '/', to: 'qe' },
        ],
        initial: 'q0',
        finals: ['q2']
      },
      testCases: [
        { string: '//',    expected: true,  label: 'comentario vacío //' },
        { string: '//ab',  expected: true,  label: 'comentario //ab' },
        { string: '/a',    expected: false, label: 'slash solo /a' },
        { string: 'ab',    expected: false, label: 'no empieza con //' },
      ]
    },

    {
      id: 'prog_divisible3',
      category: 'Programación',
      icon: '💻',
      title: 'Número binario divisible entre 3',
      difficulty: 'Avanzado',
      description: 'Verifica si un número binario es divisible entre 3. Clásico de diseño de circuitos digitales.',
      context: `Este es un ejemplo CLÁSICO de diseño de hardware digital y teoría
de autómatas. Los estados representan el RESIDUO de dividir entre 3.

El residuo de (número_actual × 2 + bit_leído) mod 3 determina el estado.
  Estado r0: residuo 0 → DIVISIBLE (estado final)
  Estado r1: residuo 1
  Estado r2: residuo 2

Aplicación real: circuitos verificadores en FPGAs, validación de
checksums, detección de errores en transmisiones digitales.

Prueba con 110 = 6 decimal → divisible entre 3 ✓
Prueba con 11  = 3 decimal → divisible entre 3 ✓
Prueba con 1   = 1 decimal → NO divisible entre 3 ✗`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'r0', name: 'r≡0', is_initial: true,  is_final: true  },
          { id: 'r1', name: 'r≡1', is_initial: false, is_final: false },
          { id: 'r2', name: 'r≡2', is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'r0', symbol: '0', to: 'r0' },
          { from: 'r0', symbol: '1', to: 'r1' },
          { from: 'r1', symbol: '0', to: 'r2' },
          { from: 'r1', symbol: '1', to: 'r0' },
          { from: 'r2', symbol: '0', to: 'r1' },
          { from: 'r2', symbol: '1', to: 'r2' },
        ],
        initial: 'r0',
        finals: ['r0']
      },
      testCases: [
        { string: '0',   expected: true,  label: '0 ÷ 3 = 0' },
        { string: '11',  expected: true,  label: '3 ÷ 3 = 1 ✓' },
        { string: '110', expected: true,  label: '6 ÷ 3 = 2 ✓' },
        { string: '1001',expected: true,  label: '9 ÷ 3 = 3 ✓' },
        { string: '1',   expected: false, label: '1 no divisible entre 3' },
        { string: '10',  expected: false, label: '2 no divisible entre 3' },
        { string: '100', expected: false, label: '4 no divisible entre 3' },
      ]
    },

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORÍA 2: REDES
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'net_protocol',
      category: 'Redes',
      icon: '🌐',
      title: 'Protocolo de handshake TCP (simplificado)',
      difficulty: 'Intermedio',
      description: 'Modela los estados del proceso de conexión TCP three-way handshake.',
      context: `TCP (Transmission Control Protocol) usa un HANDSHAKE DE TRES PASOS
para establecer una conexión confiable entre cliente y servidor.

Símbolos:
  S = SYN     (cliente solicita conexión)
  A = ACK     (confirmación)
  F = FIN     (solicitar cierre)

Flujo normal:
  CERRADO → enviar S → ESPERA_SYN_ACK → recibir A → ESTABLECIDA
  → enviar F → ESPERA_FIN_ACK → recibir A → CERRADA

Este modelo es la base del diseño de firewalls y sistemas de
detección de intrusiones (IDS) que verifican el estado de las conexiones.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'CLOSED',      name: 'CLOSED',      is_initial: true,  is_final: false },
          { id: 'SYN_SENT',    name: 'SYN_SENT',    is_initial: false, is_final: false },
          { id: 'ESTABLISHED', name: 'ESTABLISHED', is_initial: false, is_final: false },
          { id: 'FIN_WAIT',    name: 'FIN_WAIT',    is_initial: false, is_final: false },
          { id: 'DONE',        name: 'DONE',        is_initial: false, is_final: true  },
        ],
        transitions: [
          { from: 'CLOSED',      symbol: 'S', to: 'SYN_SENT'    },
          { from: 'SYN_SENT',    symbol: 'A', to: 'ESTABLISHED'  },
          { from: 'ESTABLISHED', symbol: 'F', to: 'FIN_WAIT'     },
          { from: 'FIN_WAIT',    symbol: 'A', to: 'DONE'         },
        ],
        initial: 'CLOSED',
        finals: ['DONE']
      },
      testCases: [
        { string: 'SAFA', expected: true,  label: 'Handshake completo S→A→F→A' },
        { string: 'SA',   expected: false, label: 'Conexión sin cerrar' },
        { string: 'S',    expected: false, label: 'Solo SYN enviado' },
        { string: 'A',    expected: false, label: 'ACK sin SYN previo' },
      ]
    },

    {
      id: 'net_packet',
      category: 'Redes',
      icon: '🌐',
      title: 'Validación de paquete de red (cabecera)',
      difficulty: 'Intermedio',
      description: 'Verifica el formato de una cabecera de paquete simplificada: debe comenzar con preámbulo y terminar con checksum.',
      context: `En protocolos de red como Ethernet, los paquetes tienen un formato
estricto que los switches y routers deben verificar al recibirlos.

Formato simplificado del paquete:
  P = Preámbulo (inicio del paquete)
  D = Datos (uno o más bytes de datos)
  C = Checksum (verificación de integridad al final)

Regla: P seguido de D+ seguido de C
  ✓ PDC, PDDC, PDDDC → paquetes válidos
  ✗ DC, PC, PDDC sin C final → inválidos

Aplicación: validación en la capa de enlace de datos (Layer 2),
análisis de paquetes con Wireshark, firewalls de capa de red.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'q0', name: 'inicio',    is_initial: true,  is_final: false },
          { id: 'q1', name: 'preámbulo', is_initial: false, is_final: false },
          { id: 'q2', name: 'datos',     is_initial: false, is_final: false },
          { id: 'q3', name: 'válido',    is_initial: false, is_final: true  },
          { id: 'qe', name: 'error',     is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'q0', symbol: 'P', to: 'q1' },
          { from: 'q0', symbol: 'D', to: 'qe' },
          { from: 'q0', symbol: 'C', to: 'qe' },
          { from: 'q1', symbol: 'D', to: 'q2' },
          { from: 'q1', symbol: 'P', to: 'qe' },
          { from: 'q1', symbol: 'C', to: 'qe' },
          { from: 'q2', symbol: 'D', to: 'q2' },
          { from: 'q2', symbol: 'C', to: 'q3' },
          { from: 'q2', symbol: 'P', to: 'qe' },
          { from: 'q3', symbol: 'P', to: 'qe' },
          { from: 'q3', symbol: 'D', to: 'qe' },
          { from: 'q3', symbol: 'C', to: 'qe' },
          { from: 'qe', symbol: 'P', to: 'qe' },
          { from: 'qe', symbol: 'D', to: 'qe' },
          { from: 'qe', symbol: 'C', to: 'qe' },
        ],
        initial: 'q0',
        finals: ['q3']
      },
      testCases: [
        { string: 'PDC',   expected: true,  label: 'Paquete mínimo válido' },
        { string: 'PDDC',  expected: true,  label: 'Paquete con 2 bytes de datos' },
        { string: 'PDDDC', expected: true,  label: 'Paquete con 3 bytes de datos' },
        { string: 'PC',    expected: false, label: 'Sin datos' },
        { string: 'DC',    expected: false, label: 'Sin preámbulo' },
        { string: 'PDD',   expected: false, label: 'Sin checksum' },
      ]
    },

    {
      id: 'net_wifi_auth',
      category: 'Redes',
      icon: '🌐',
      title: 'Autenticación WiFi WPA (estados de asociación)',
      difficulty: 'Avanzado',
      description: 'Modela el proceso de asociación a una red WiFi con autenticación WPA.',
      context: `Cuando tu dispositivo se conecta a una red WiFi, pasa por varios
estados definidos por el estándar IEEE 802.11 (WiFi).

Símbolos:
  P = Probe Request   (buscar redes disponibles)
  A = Auth Request    (solicitar autenticación)
  R = Auth Response   (respuesta del AP)
  J = Join/Associate  (unirse a la red)
  K = Key Exchange    (intercambio de claves WPA)

El Access Point (router) implementa este autómata para decidir
si acepta o rechaza cada dispositivo que intenta conectarse.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 's0', name: 'desconectado', is_initial: true,  is_final: false },
          { id: 's1', name: 'buscando',     is_initial: false, is_final: false },
          { id: 's2', name: 'autenticando', is_initial: false, is_final: false },
          { id: 's3', name: 'autenticado',  is_initial: false, is_final: false },
          { id: 's4', name: 'asociado',     is_initial: false, is_final: false },
          { id: 's5', name: 'conectado',    is_initial: false, is_final: true  },
        ],
        transitions: [
          { from: 's0', symbol: 'P', to: 's1' },
          { from: 's1', symbol: 'A', to: 's2' },
          { from: 's2', symbol: 'R', to: 's3' },
          { from: 's3', symbol: 'J', to: 's4' },
          { from: 's4', symbol: 'K', to: 's5' },
        ],
        initial: 's0',
        finals: ['s5']
      },
      testCases: [
        { string: 'PARJK',  expected: true,  label: 'Conexión WiFi exitosa' },
        { string: 'PAR',    expected: false, label: 'Autenticado pero no asociado' },
        { string: 'PA',     expected: false, label: 'Autenticación incompleta' },
        { string: 'PARK',   expected: false, label: 'Saltó el paso de Join' },
      ]
    },

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORÍA 3: INGENIERÍA DE SISTEMAS
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'sys_process',
      category: 'Ing. Sistemas',
      icon: '⚙️',
      title: 'Ciclo de vida de un proceso (SO)',
      difficulty: 'Intermedio',
      description: 'Modela los estados de un proceso en un sistema operativo (como Linux o Windows).',
      context: `En sistemas operativos como Linux, Windows o macOS, cada proceso
pasa por estados bien definidos. El kernel del SO mantiene un
autómata de estados para cada proceso en ejecución.

Símbolos (eventos que cambian el estado):
  C = create   (proceso creado/fork)
  R = run      (scheduler lo ejecuta)
  W = wait     (espera I/O o recurso)
  D = done     (espera terminó, listo de nuevo)
  E = exit     (proceso termina)

Aplicación real: así funciona el scheduler de Linux (CFS),
la syscall fork(), y herramientas como ps, top, htop.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'new',     name: 'NEW',     is_initial: true,  is_final: false },
          { id: 'ready',   name: 'READY',   is_initial: false, is_final: false },
          { id: 'running', name: 'RUNNING', is_initial: false, is_final: false },
          { id: 'waiting', name: 'WAITING', is_initial: false, is_final: false },
          { id: 'term',    name: 'TERM',    is_initial: false, is_final: true  },
        ],
        transitions: [
          { from: 'new',     symbol: 'C', to: 'ready'   },
          { from: 'ready',   symbol: 'R', to: 'running' },
          { from: 'running', symbol: 'W', to: 'waiting' },
          { from: 'running', symbol: 'E', to: 'term'    },
          { from: 'waiting', symbol: 'D', to: 'ready'   },
        ],
        initial: 'new',
        finals: ['term']
      },
      testCases: [
        { string: 'CRE',    expected: true,  label: 'Proceso termina sin esperar' },
        { string: 'CRWDRE', expected: true,  label: 'Proceso con una espera I/O' },
        { string: 'CRWDRWDRE', expected: true, label: 'Proceso con dos esperas' },
        { string: 'CR',     expected: false, label: 'Proceso en ejecución (no terminó)' },
        { string: 'CRW',    expected: false, label: 'Proceso esperando (bloqueado)' },
        { string: 'E',      expected: false, label: 'No se puede terminar sin crear' },
      ]
    },

    {
      id: 'sys_mutex',
      category: 'Ing. Sistemas',
      icon: '⚙️',
      title: 'Mutex / Semáforo binario (sincronización)',
      difficulty: 'Básico',
      description: 'Modela el comportamiento de un mutex para controlar acceso a sección crítica.',
      context: `Un MUTEX (Mutual Exclusion) es el mecanismo más básico de
sincronización en sistemas operativos y programación concurrente.

Se usa en: pthreads (C/C++), synchronized (Java), lock (Python),
Mutex (Rust), threading.Lock (Python).

Símbolos:
  L = lock    (adquirir el mutex / entrar a sección crítica)
  U = unlock  (liberar el mutex / salir de sección crítica)

Regla fundamental: no se puede hacer lock dos veces seguidas
(deadlock), ni unlock sin lock previo.

Aplicación: base de Java synchronized, Python threading.Lock,
semáforos del kernel Linux.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'libre',  name: 'LIBRE',  is_initial: true,  is_final: true  },
          { id: 'ocupado',name: 'OCUPADO',is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'libre',   symbol: 'L', to: 'ocupado' },
          { from: 'ocupado', symbol: 'U', to: 'libre'   },
        ],
        initial: 'libre',
        finals: ['libre']
      },
      testCases: [
        { string: 'LU',     expected: true,  label: 'Lock → Unlock (correcto)' },
        { string: 'LULU',   expected: true,  label: 'Dos ciclos lock/unlock' },
        { string: 'LULULU', expected: true,  label: 'Tres ciclos lock/unlock' },
        { string: 'L',      expected: false, label: 'Mutex bloqueado (no liberado)' },
        { string: 'U',      expected: false, label: 'Unlock sin lock previo' },
        { string: 'LLU',    expected: false, label: 'Doble lock = deadlock' },
      ]
    },

    {
      id: 'sys_cache',
      category: 'Ing. Sistemas',
      icon: '⚙️',
      title: 'Política de caché: Hit / Miss / Evict',
      difficulty: 'Avanzado',
      description: 'Modela los estados de una línea de caché CPU (MESI simplificado).',
      context: `Los procesadores modernos (Intel, AMD, ARM) tienen cachés L1/L2/L3
que usan protocolos de coherencia como MESI para mantener consistencia.

Versión simplificada de 3 estados:
  I = Invalid  → la línea no tiene datos válidos
  C = Clean    → datos válidos, iguales a memoria RAM
  D = Dirty    → datos válidos, DIFERENTES a RAM (modificados)

Transiciones:
  R = Read    (proceso lee la dirección)
  W = Write   (proceso escribe en la dirección)
  F = Flush   (línea escrita de vuelta a RAM y liberada)

Aplicación: diseño de CPUs, optimización de algoritmos para
aprovechar la localidad de caché, análisis de cache misses.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'I', name: 'Invalid', is_initial: true,  is_final: false },
          { id: 'C', name: 'Clean',   is_initial: false, is_final: true  },
          { id: 'D', name: 'Dirty',   is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'I', symbol: 'R', to: 'C' },
          { from: 'I', symbol: 'W', to: 'D' },
          { from: 'C', symbol: 'W', to: 'D' },
          { from: 'C', symbol: 'R', to: 'C' },
          { from: 'C', symbol: 'F', to: 'I' },
          { from: 'D', symbol: 'R', to: 'D' },
          { from: 'D', symbol: 'W', to: 'D' },
          { from: 'D', symbol: 'F', to: 'I' },
        ],
        initial: 'I',
        finals: ['C']
      },
      testCases: [
        { string: 'R',    expected: true,  label: 'Read → Clean (cache hit)' },
        { string: 'RR',   expected: true,  label: 'Doble read, sigue clean' },
        { string: 'W',    expected: false, label: 'Write → Dirty (no clean)' },
        { string: 'WFR',  expected: true,  label: 'Write, flush, read → clean' },
        { string: 'RWF',  expected: false, label: 'Flush → Invalid (no aceptado)' },
      ]
    },

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORÍA 4: COTIDIANOS
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'daily_traffic',
      category: 'Cotidianos',
      icon: '🚦',
      title: 'Semáforo de tráfico',
      difficulty: 'Básico',
      description: 'El ciclo de un semáforo vehicular: Verde → Amarillo → Rojo → Verde.',
      context: `Un semáforo es uno de los autómatas más conocidos en la vida real.
El controlador electrónico del semáforo es literalmente un AFD
implementado en hardware o software embebido.

Símbolos (eventos de temporización):
  t = tick (señal del temporizador interno)

El semáforo acepta exactamente cuando completa un ciclo completo
(vuelve a verde después de pasar por todos los estados).

Aplicación real: microcontroladores Arduino, PLC industriales,
sistemas de control de tráfico urbano (SCOOT, SCATS).`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'verde',    name: '🟢 Verde',    is_initial: true,  is_final: true  },
          { id: 'amarillo', name: '🟡 Amarillo', is_initial: false, is_final: false },
          { id: 'rojo',     name: '🔴 Rojo',     is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'verde',    symbol: 't', to: 'amarillo' },
          { from: 'amarillo', symbol: 't', to: 'rojo'     },
          { from: 'rojo',     symbol: 't', to: 'verde'    },
        ],
        initial: 'verde',
        finals: ['verde']
      },
      testCases: [
        { string: 'ttt',       expected: true,  label: '1 ciclo completo' },
        { string: 'tttttt',    expected: true,  label: '2 ciclos completos' },
        { string: 'tt',        expected: false, label: 'Semáforo en rojo (incompleto)' },
        { string: 't',         expected: false, label: 'Semáforo en amarillo' },
        { string: 'tttttttt', expected: false,  label: '2 ciclos + en amarillo' },
      ]
    },

    {
      id: 'daily_atm',
      category: 'Cotidianos',
      icon: '🏧',
      title: 'Cajero automático (ATM)',
      difficulty: 'Intermedio',
      description: 'Modela el flujo de una transacción en un cajero automático.',
      context: `El software de un cajero automático (ATM) es un sistema de estados
bien definido. Los bancos lo implementan para garantizar seguridad
y consistencia en cada transacción.

Símbolos:
  C = card    (insertar tarjeta)
  P = pin     (ingresar PIN correcto)
  S = select  (seleccionar operación: retiro, consulta)
  M = money   (retirar el dinero / completar operación)
  X = exit    (retirar tarjeta y finalizar)

La cadena CPSMX representa una transacción exitosa completa.
Si el PIN es incorrecto (no representado aquí), el autómata
va a un estado de error y bloquea la tarjeta.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'idle',    name: 'Inactivo', is_initial: true,  is_final: true  },
          { id: 'card',    name: 'Tarjeta',  is_initial: false, is_final: false },
          { id: 'auth',    name: 'Autenticado',is_initial: false,is_final: false },
          { id: 'menu',    name: 'Menú',     is_initial: false, is_final: false },
          { id: 'done',    name: 'Operado',  is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'idle', symbol: 'C', to: 'card'  },
          { from: 'card', symbol: 'P', to: 'auth'  },
          { from: 'auth', symbol: 'S', to: 'menu'  },
          { from: 'menu', symbol: 'M', to: 'done'  },
          { from: 'done', symbol: 'X', to: 'idle'  },
        ],
        initial: 'idle',
        finals: ['idle']
      },
      testCases: [
        { string: 'CPSMX', expected: true,  label: 'Transacción completa exitosa' },
        { string: 'CPSM',  expected: false, label: 'Sin retirar tarjeta' },
        { string: 'CP',    expected: false, label: 'Autenticado sin operar' },
        { string: 'C',     expected: false, label: 'Tarjeta insertada sin PIN' },
        { string: 'CPSMXCPSMX', expected: true, label: '2 transacciones seguidas' },
      ]
    },

    {
      id: 'daily_vending',
      category: 'Cotidianos',
      icon: '🥤',
      title: 'Máquina expendedora (vending machine)',
      difficulty: 'Intermedio',
      description: 'Modela una máquina expendedora que acepta monedas de 1 y 2 unidades para comprar un producto de 3 unidades.',
      context: `Las máquinas expendedoras (Coca-Cola, snacks, café) son autómatas
finitos implementados en microcontroladores.

Esta máquina vende un producto que cuesta 3 monedas.
Acepta monedas de valor 1 (símbolo "a") o valor 2 (símbolo "b").

Los estados representan el TOTAL acumulado de monedas:
  q0 = $0 (sin monedas)
  q1 = $1 acumulado
  q2 = $2 acumulado
  q3 = $3 → DISPENSA el producto ✓

Si metes $4+ (sobrepago), el autómata también acepta
porque tienes suficiente (da cambio en la práctica).`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'q0', name: '$0', is_initial: true,  is_final: false },
          { id: 'q1', name: '$1', is_initial: false, is_final: false },
          { id: 'q2', name: '$2', is_initial: false, is_final: false },
          { id: 'q3', name: '$3+', is_initial: false, is_final: true  },
        ],
        transitions: [
          { from: 'q0', symbol: 'a', to: 'q1' },
          { from: 'q0', symbol: 'b', to: 'q2' },
          { from: 'q1', symbol: 'a', to: 'q2' },
          { from: 'q1', symbol: 'b', to: 'q3' },
          { from: 'q2', symbol: 'a', to: 'q3' },
          { from: 'q2', symbol: 'b', to: 'q3' },
          { from: 'q3', symbol: 'a', to: 'q3' },
          { from: 'q3', symbol: 'b', to: 'q3' },
        ],
        initial: 'q0',
        finals: ['q3']
      },
      testCases: [
        { string: 'aaa',  expected: true,  label: '3×$1 = $3 ✓ dispensar' },
        { string: 'ab',   expected: true,  label: '$1+$2 = $3 ✓ dispensar' },
        { string: 'ba',   expected: true,  label: '$2+$1 = $3 ✓ dispensar' },
        { string: 'bb',   expected: true,  label: '$2+$2 = $4 ✓ dispensar (sobrepago)' },
        { string: 'aa',   expected: false, label: '$1+$1 = $2, falta dinero' },
        { string: 'a',    expected: false, label: 'Solo $1, insuficiente' },
        { string: 'b',    expected: false, label: 'Solo $2, insuficiente' },
      ]
    },

    {
      id: 'daily_door',
      category: 'Cotidianos',
      icon: '🚪',
      title: 'Puerta con código de seguridad',
      difficulty: 'Básico',
      description: 'Puerta que se abre solo con la secuencia correcta: a→b→a (código "aba").',
      context: `Las puertas con teclado de seguridad (oficinas, apartamentos, laboratorios)
implementan autómatas finitos para verificar el código de acceso.

Secuencia correcta: a → b → a (código simplificado "aba")
Cualquier error envía al estado de rechazo.

Aplicación real: cerraduras electrónicas, sistemas de control de acceso,
teclados de seguridad, cajas fuertes digitales, alarmas.

En la práctica, si la secuencia falla se puede:
  - Activar una alarma
  - Bloquear intentos por X segundos
  - Enviar notificación al administrador`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'q0', name: 'inicio', is_initial: true,  is_final: false },
          { id: 'q1', name: 'a',      is_initial: false, is_final: false },
          { id: 'q2', name: 'ab',     is_initial: false, is_final: false },
          { id: 'q3', name: 'ABIERTA',is_initial: false, is_final: true  },
          { id: 'qe', name: 'ERROR',  is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'q0', symbol: 'a', to: 'q1' },
          { from: 'q0', symbol: 'b', to: 'qe' },
          { from: 'q1', symbol: 'b', to: 'q2' },
          { from: 'q1', symbol: 'a', to: 'qe' },
          { from: 'q2', symbol: 'a', to: 'q3' },
          { from: 'q2', symbol: 'b', to: 'qe' },
          { from: 'q3', symbol: 'a', to: 'qe' },
          { from: 'q3', symbol: 'b', to: 'qe' },
          { from: 'qe', symbol: 'a', to: 'qe' },
          { from: 'qe', symbol: 'b', to: 'qe' },
        ],
        initial: 'q0',
        finals: ['q3']
      },
      testCases: [
        { string: 'aba',  expected: true,  label: 'Código correcto "aba" ✓' },
        { string: 'ab',   expected: false, label: 'Código incompleto' },
        { string: 'aab',  expected: false, label: 'Código incorrecto "aab"' },
        { string: 'bba',  expected: false, label: 'Código incorrecto "bba"' },
        { string: 'abab', expected: false, label: 'Código correcto + dígito extra' },
      ]
    },

    // ════════════════════════════════════════════════════════════════════════
    // CATEGORÍA 5: TEORÍA CLÁSICA (ejemplos de clase)
    // ════════════════════════════════════════════════════════════════════════

    {
      id: 'theory_abb',
      category: 'Teoría Clásica',
      icon: '📐',
      title: '(a|b)*abb — El ejemplo clásico de clase',
      difficulty: 'Básico',
      description: 'Reconoce todas las cadenas sobre {a,b} que terminan en "abb". El ejemplo más enseñado en teoría de autómatas.',
      context: `Este es el autómata más famoso de los libros de texto (aparece en
Aho, Sethi & Ullman "Compilers: Principles, Techniques, and Tools").

Acepta cualquier cadena sobre {a, b} que termine en "abb":
  ✓ abb, aabb, babb, aaabb, abababb
  ✗ ab, a, b, abba, abbb

Aplicación en compiladores reales: los generadores de analizadores
léxicos como LEX/FLEX convierten expresiones regulares como
(a|b)*abb en AFDs usando exactamente este proceso (Thompson → Subconjuntos).`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'q0', name: 'q0', is_initial: true,  is_final: false },
          { id: 'q1', name: 'q1', is_initial: false, is_final: false },
          { id: 'q2', name: 'q2', is_initial: false, is_final: false },
          { id: 'q3', name: 'q3', is_initial: false, is_final: true  },
        ],
        transitions: [
          { from: 'q0', symbol: 'a', to: 'q1' },
          { from: 'q0', symbol: 'b', to: 'q0' },
          { from: 'q1', symbol: 'a', to: 'q1' },
          { from: 'q1', symbol: 'b', to: 'q2' },
          { from: 'q2', symbol: 'a', to: 'q1' },
          { from: 'q2', symbol: 'b', to: 'q3' },
          { from: 'q3', symbol: 'a', to: 'q1' },
          { from: 'q3', symbol: 'b', to: 'q0' },
        ],
        initial: 'q0',
        finals: ['q3']
      },
      testCases: [
        { string: 'abb',     expected: true,  label: 'abb ✓' },
        { string: 'aabb',    expected: true,  label: 'aabb ✓' },
        { string: 'babb',    expected: true,  label: 'babb ✓' },
        { string: 'abababb', expected: true,  label: 'abababb ✓' },
        { string: 'ab',      expected: false, label: 'ab ✗' },
        { string: 'abba',    expected: false, label: 'abba ✗' },
      ]
    },

    {
      id: 'theory_even_as',
      category: 'Teoría Clásica',
      icon: '📐',
      title: 'Número par de "a" en la cadena',
      difficulty: 'Básico',
      description: 'Acepta cadenas sobre {a,b} que contienen un número par de letras "a".',
      context: `Ejemplo fundamental de la teoría: demostrar que la propiedad
"número par de a" es regular (reconocible por AFD).

Los estados representan la PARIDAD del conteo de "a":
  par   = número par de "a" vistas hasta ahora (0, 2, 4...)
  impar = número impar de "a" vistas (1, 3, 5...)

La cadena vacía ε tiene 0 "a" → 0 es par → ACEPTADA.

Aplicación: detección de errores por paridad (el bit de paridad
funciona exactamente con este principio), checksums simples,
codificación de datos en telecomunicaciones.`,
      automata: {
        type: 'AFD',
        states: [
          { id: 'par',   name: 'par a',   is_initial: true,  is_final: true  },
          { id: 'impar', name: 'impar a', is_initial: false, is_final: false },
        ],
        transitions: [
          { from: 'par',   symbol: 'a', to: 'impar' },
          { from: 'par',   symbol: 'b', to: 'par'   },
          { from: 'impar', symbol: 'a', to: 'par'   },
          { from: 'impar', symbol: 'b', to: 'impar' },
        ],
        initial: 'par',
        finals: ['par']
      },
      testCases: [
        { string: '',      expected: true,  label: 'ε (0 "a" → par)' },
        { string: 'b',     expected: true,  label: '"b" sin a' },
        { string: 'aa',    expected: true,  label: '2 a → par' },
        { string: 'aabb',  expected: true,  label: '2 a, 2 b → par' },
        { string: 'a',     expected: false, label: '1 a → impar' },
        { string: 'aba',   expected: false, label: '2 a pero termina raro... no, sí son 2 → par. ¡Pruébalo!' },
        { string: 'aab',   expected: true,  label: '2 a → par' },
      ]
    },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // UI DEL PANEL DE EJEMPLOS
  // ════════════════════════════════════════════════════════════════════════════

  const CATEGORIES = ['Todos', 'Programación', 'Redes', 'Ing. Sistemas', 'Cotidianos', 'Teoría Clásica'];
  const DIFF_COLOR = { 'Básico': '#00C97B', 'Intermedio': '#FFB000', 'Avanzado': '#FF3366' };

  let _activeCategory = 'Todos';
  let _selectedExample = null;

  function _injectStyles() {
    if (document.getElementById('ex-styles')) return;
    const s = document.createElement('style');
    s.id = 'ex-styles';
    s.textContent = `
      /* ── Botón de ejemplos en el header ──────────────────────────── */
      #btn-examples {
        margin-left: 4px; padding: 3px 10px;
        background: rgba(0,207,255,0.08);
        border: 1px solid rgba(0,207,255,0.3);
        color: #00CFFF;
        font-family: 'Orbitron', sans-serif; font-size: 9px;
        letter-spacing: 1px; cursor: pointer; transition: all 0.15s;
      }
      #btn-examples:hover { background: rgba(0,207,255,0.18); box-shadow: 0 0 10px rgba(0,207,255,0.2); }

      /* ── Backdrop ─────────────────────────────────────────────────── */
      #ex-backdrop {
        position: fixed; inset: 0; background: rgba(0,0,0,0.88);
        z-index: 800; display: none; align-items: center; justify-content: center;
      }
      #ex-backdrop.open { display: flex; }

      /* ── Panel principal ──────────────────────────────────────────── */
      #ex-panel {
        background: #080d08; border: 1px solid rgba(0,255,156,0.3);
        box-shadow: 0 0 60px rgba(0,255,156,0.1);
        width: 980px; max-width: 96vw; height: 88vh;
        display: flex; flex-direction: column; overflow: hidden;
        animation: ex-in 0.3s ease;
      }
      @keyframes ex-in {
        from { opacity:0; transform:scale(0.96) translateY(10px); }
        to   { opacity:1; transform:scale(1)    translateY(0);    }
      }

      /* Header del panel */
      #ex-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 18px; border-bottom: 1px solid rgba(0,255,156,0.15);
        background: rgba(0,255,156,0.04); flex-shrink: 0;
      }
      #ex-title {
        font-family: 'Orbitron', sans-serif; font-size: 13px;
        color: #00FF9C; letter-spacing: 2px;
        text-shadow: 0 0 10px rgba(0,255,156,0.4);
      }
      #ex-close {
        background: transparent; border: 1px solid rgba(255,51,102,0.3);
        color: #FF3366; font-family: 'Share Tech Mono', monospace;
        font-size: 12px; padding: 4px 10px; cursor: pointer; transition: all 0.15s;
      }
      #ex-close:hover { background: rgba(255,51,102,0.1); }

      /* Filtros de categoría */
      #ex-filters {
        display: flex; gap: 6px; padding: 10px 18px;
        border-bottom: 1px solid rgba(0,255,156,0.08); flex-shrink: 0;
        overflow-x: auto;
      }
      .ex-filter-btn {
        padding: 4px 12px; font-family: 'Orbitron', sans-serif;
        font-size: 9px; letter-spacing: 1px; cursor: pointer;
        border: 1px solid rgba(0,255,156,0.15); background: transparent;
        color: #3a6645; white-space: nowrap; transition: all 0.15s;
      }
      .ex-filter-btn:hover { color: #6aff9e; border-color: rgba(0,255,156,0.3); }
      .ex-filter-btn.active {
        color: #00FF9C; border-color: rgba(0,255,156,0.5);
        background: rgba(0,255,156,0.06);
      }

      /* Layout de 2 columnas */
      #ex-body {
        display: grid; grid-template-columns: 340px 1fr;
        flex: 1; overflow: hidden;
      }

      /* Lista de ejemplos */
      #ex-list {
        border-right: 1px solid rgba(0,255,156,0.1);
        overflow-y: auto; padding: 8px;
      }
      #ex-list::-webkit-scrollbar { width: 3px; }
      #ex-list::-webkit-scrollbar-thumb { background: #3a6645; }

      .ex-card {
        padding: 10px 12px; margin-bottom: 6px; cursor: pointer;
        border: 1px solid rgba(0,255,156,0.1); background: transparent;
        transition: all 0.15s;
      }
      .ex-card:hover { background: rgba(0,255,156,0.04); border-color: rgba(0,255,156,0.25); }
      .ex-card.active { background: rgba(0,255,156,0.08); border-color: rgba(0,255,156,0.4); }

      .ex-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
      .ex-card-icon { font-size: 16px; }
      .ex-card-title {
        font-family: 'Share Tech Mono', monospace; font-size: 12px;
        color: #c8ffd4; line-height: 1.3;
      }
      .ex-card.active .ex-card-title { color: #00FF9C; }
      .ex-card-meta { display: flex; gap: 6px; align-items: center; }
      .ex-diff-badge {
        font-size: 9px; padding: 1px 5px; border: 1px solid;
        font-family: 'Orbitron', sans-serif; letter-spacing: 0.5px;
      }
      .ex-cat-label { font-size: 9px; color: #3a6645; letter-spacing: 0.5px; }
      .ex-card-desc { font-size: 10px; color: #3a6645; margin-top: 4px; line-height: 1.5; }

      /* Panel de detalle */
      #ex-detail {
        overflow-y: auto; padding: 20px;
        display: flex; flex-direction: column; gap: 16px;
      }
      #ex-detail::-webkit-scrollbar { width: 3px; }
      #ex-detail::-webkit-scrollbar-thumb { background: #3a6645; }

      .ex-detail-empty {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        color: #3a6645; font-size: 12px; letter-spacing: 1px; gap: 10px;
      }
      .ex-detail-empty .icon { font-size: 40px; opacity: 0.3; }

      /* Sección de detalle */
      .ex-section { margin-bottom: 14px; }
      .ex-section-title {
        font-family: 'Orbitron', sans-serif; font-size: 9px;
        color: #3a6645; letter-spacing: 2px; text-transform: uppercase;
        margin-bottom: 8px; padding-bottom: 5px;
        border-bottom: 1px solid rgba(0,255,156,0.1);
        display: flex; align-items: center; gap: 6px;
      }
      .ex-section-title::before {
        content: ''; display: block; width: 3px; height: 10px;
        background: #00C97B; box-shadow: 0 0 4px #00C97B;
      }

      /* Contexto del mundo real */
      .ex-context {
        background: rgba(0,0,0,0.3); border: 1px solid rgba(0,255,156,0.08);
        padding: 12px 14px; font-size: 11px; color: #6aff9e;
        line-height: 1.8; font-family: 'Share Tech Mono', monospace;
        white-space: pre-wrap;
      }

      /* Casos de prueba */
      .ex-test-cases { display: flex; flex-direction: column; gap: 5px; }
      .ex-test-row {
        display: flex; align-items: center; gap: 10px;
        padding: 6px 10px; font-size: 11px;
        border: 1px solid rgba(255,255,255,0.04);
        cursor: pointer; transition: all 0.12s;
        font-family: 'Share Tech Mono', monospace;
      }
      .ex-test-row:hover { background: rgba(0,255,156,0.04); border-color: rgba(0,255,156,0.2); }
      .ex-test-string {
        font-family: 'VT323', monospace; font-size: 18px;
        letter-spacing: 2px; min-width: 80px;
        color: #00FF9C;
      }
      .ex-test-string.empty { color: #3a6645; font-size: 14px; }
      .ex-test-label { flex: 1; color: #6aff9e; }
      .ex-test-expected {
        font-family: 'Orbitron', sans-serif; font-size: 9px;
        letter-spacing: 1px; padding: 2px 7px; border: 1px solid;
      }
      .ex-test-expected.acc { color: #00FF9C; border-color: rgba(0,255,156,0.4); }
      .ex-test-expected.rej { color: #FF3366; border-color: rgba(255,51,102,0.4); }
      .ex-test-play {
        background: transparent; border: 1px solid rgba(0,255,156,0.2);
        color: #3a6645; font-size: 10px; padding: 2px 7px; cursor: pointer;
        font-family: 'Share Tech Mono', monospace; transition: all 0.12s;
      }
      .ex-test-play:hover { color: #00FF9C; border-color: rgba(0,255,156,0.5); }

      /* Botones de acción */
      .ex-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
      .ex-load-btn {
        background: rgba(0,255,156,0.08); border: 1px solid rgba(0,255,156,0.4);
        color: #00FF9C; font-family: 'Orbitron', sans-serif;
        font-size: 10px; letter-spacing: 1px; padding: 8px 16px;
        cursor: pointer; transition: all 0.15s;
      }
      .ex-load-btn:hover { background: rgba(0,255,156,0.15); box-shadow: 0 0 14px rgba(0,255,156,0.2); }
      .ex-secondary-btn {
        background: transparent; border: 1px solid rgba(0,255,156,0.2);
        color: #6aff9e; font-family: 'Share Tech Mono', monospace;
        font-size: 11px; padding: 7px 14px; cursor: pointer; transition: all 0.15s;
      }
      .ex-secondary-btn:hover { background: rgba(0,255,156,0.06); }

      /* Stats del autómata */
      .ex-stats-row {
        display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        margin-bottom: 10px;
      }
      .ex-stat-box {
        background: #0a0f0a; border: 1px solid rgba(0,255,156,0.1);
        padding: 8px; text-align: center;
      }
      .ex-stat-val {
        font-family: 'VT323', monospace; font-size: 28px;
        color: #00FF9C; line-height: 1;
      }
      .ex-stat-lbl { font-size: 9px; color: #3a6645; letter-spacing: 1px; margin-top: 2px; }

      @media (max-width: 700px) {
        #ex-body { grid-template-columns: 1fr; grid-template-rows: 200px 1fr; }
        #ex-list { border-right: none; border-bottom: 1px solid rgba(0,255,156,0.1); }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Construir el panel ─────────────────────────────────────────────────────
  function _buildPanel() {
    if (document.getElementById('ex-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'ex-backdrop';
    backdrop.innerHTML = `
      <div id="ex-panel">
        <div id="ex-header">
          <span id="ex-title">📚 LIBRERÍA DE EJEMPLOS — Autómatas Finitos en la Práctica</span>
          <button id="ex-close">✕ CERRAR</button>
        </div>
        <div id="ex-filters"></div>
        <div id="ex-body">
          <div id="ex-list"></div>
          <div id="ex-detail">
            <div class="ex-detail-empty">
              <div class="icon">📖</div>
              <div>Selecciona un ejemplo de la lista</div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    // Cerrar
    document.getElementById('ex-close').addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    _renderFilters();
    _renderList();
  }

  function _renderFilters() {
    const el = document.getElementById('ex-filters');
    if (!el) return;
    el.innerHTML = CATEGORIES.map(cat => `
      <button class="ex-filter-btn ${cat === _activeCategory ? 'active' : ''}"
              data-cat="${cat}">${cat}</button>
    `).join('');
    el.querySelectorAll('.ex-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeCategory = btn.dataset.cat;
        _renderFilters();
        _renderList();
      });
    });
  }

  function _renderList() {
    const el = document.getElementById('ex-list');
    if (!el) return;
    const filtered = _activeCategory === 'Todos'
      ? CATALOG
      : CATALOG.filter(e => e.category === _activeCategory);

    el.innerHTML = filtered.map(ex => `
      <div class="ex-card ${_selectedExample?.id === ex.id ? 'active' : ''}"
           data-id="${ex.id}">
        <div class="ex-card-header">
          <span class="ex-card-icon">${ex.icon}</span>
          <span class="ex-card-title">${ex.title}</span>
        </div>
        <div class="ex-card-meta">
          <span class="ex-diff-badge" style="color:${DIFF_COLOR[ex.difficulty]};border-color:${DIFF_COLOR[ex.difficulty]}44;">
            ${ex.difficulty}
          </span>
          <span class="ex-cat-label">${ex.category}</span>
        </div>
        <div class="ex-card-desc">${ex.description}</div>
      </div>
    `).join('') || '<div style="color:#3a6645;font-size:11px;padding:20px;text-align:center;">Sin ejemplos en esta categoría</div>';

    el.querySelectorAll('.ex-card').forEach(card => {
      card.addEventListener('click', () => {
        const ex = CATALOG.find(e => e.id === card.dataset.id);
        if (ex) _selectExample(ex);
      });
    });
  }

  function _selectExample(ex) {
    _selectedExample = ex;
    _renderList(); // Update active state

    const el = document.getElementById('ex-detail');
    if (!el) return;

    const a = ex.automata;
    const statesCount = a.states.length;
    const transCount  = a.transitions.length;
    const alphabet    = [...new Set(a.transitions.map(t => t.symbol))].sort();
    const finalsCount = a.finals.length;

    el.innerHTML = `
      <!-- Título y descripción -->
      <div>
        <div style="font-family:'Orbitron',sans-serif;font-size:14px;color:#00FF9C;
                    text-shadow:0 0 10px rgba(0,255,156,0.4);margin-bottom:6px;">
          ${ex.icon} ${ex.title}
        </div>
        <div style="font-size:11px;color:#6aff9e;margin-bottom:10px;">${ex.description}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <span style="font-size:9px;padding:2px 8px;border:1px solid ${DIFF_COLOR[ex.difficulty]}44;
                color:${DIFF_COLOR[ex.difficulty]};font-family:'Orbitron',sans-serif;letter-spacing:1px;">
            ${ex.difficulty}
          </span>
          <span style="font-size:10px;color:#3a6645;">${ex.category}</span>
          <span style="font-size:10px;color:#3a6645;">${a.type}</span>
        </div>
      </div>

      <!-- Stats rápidas -->
      <div class="ex-stats-row">
        <div class="ex-stat-box"><div class="ex-stat-val">${statesCount}</div><div class="ex-stat-lbl">Estados |Q|</div></div>
        <div class="ex-stat-box"><div class="ex-stat-val" style="color:#FFB000;">${transCount}</div><div class="ex-stat-lbl">Transiciones</div></div>
        <div class="ex-stat-box"><div class="ex-stat-val" style="color:#00CFFF;">${alphabet.length}</div><div class="ex-stat-lbl">Alfabeto |Σ|</div></div>
        <div class="ex-stat-box"><div class="ex-stat-val">${finalsCount}</div><div class="ex-stat-lbl">Finales |F|</div></div>
      </div>

      <!-- Acciones principales -->
      <div class="ex-actions">
        <button class="ex-load-btn" id="ex-btn-load">⊕ Cargar en el simulador</button>
        <button class="ex-secondary-btn" id="ex-btn-load-debug">🔍 Cargar y depurar</button>
      </div>

      <!-- Contexto del mundo real -->
      <div class="ex-section">
        <div class="ex-section-title">Contexto del mundo real</div>
        <div class="ex-context">${ex.context}</div>
      </div>

      <!-- Casos de prueba -->
      <div class="ex-section">
        <div class="ex-section-title">Casos de prueba — haz clic para simular</div>
        <div class="ex-test-cases">
          ${ex.testCases.map(tc => `
            <div class="ex-test-row" data-string="${tc.string}" data-expected="${tc.expected}">
              <span class="ex-test-string ${!tc.string ? 'empty' : ''}">${tc.string || 'ε'}</span>
              <span class="ex-test-label">${tc.label}</span>
              <span class="ex-test-expected ${tc.expected ? 'acc' : 'rej'}">${tc.expected ? '✓ ACEPTA' : '✗ RECHAZA'}</span>
              <button class="ex-test-play">▶ PROBAR</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Alfabeto -->
      <div class="ex-section">
        <div class="ex-section-title">Alfabeto Σ = { ${alphabet.map(a => a || 'ε').join(', ')} }</div>
        <div style="font-size:11px;color:#6aff9e;line-height:1.8;">
          ${a.states.map(s => `
            <span style="color:${s.is_initial?'#00FF9C':s.is_final?'#FFB000':'#3a6645'}">
              ${s.is_initial?'▶ ':''}${s.name}${s.is_final?' ◉':''}
            </span>
          `).join('  ')}
        </div>
      </div>
    `;

    // Botón: cargar en el simulador
    document.getElementById('ex-btn-load').addEventListener('click', async () => {
      await _loadExample(ex);
      close();
    });

    // Botón: cargar y abrir debugger
    document.getElementById('ex-btn-load-debug').addEventListener('click', async () => {
      await _loadExample(ex);
      close();
      if (typeof Debugger !== 'undefined') {
        setTimeout(() => Debugger.start(ex.testCases[0]?.string || ''), 500);
      }
    });

    // Casos de prueba: clic en fila o en botón ▶
    el.querySelectorAll('.ex-test-row').forEach(row => {
      const run = async () => {
        await _loadExample(ex);
        const str = row.dataset.string;
        const inp = document.getElementById('validate-input');
        if (inp) inp.value = str;
        close();
        // Trigger validation after a short delay
        setTimeout(() => {
          if (inp) inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }, 400);
      };
      row.querySelector('.ex-test-play').addEventListener('click', e => { e.stopPropagation(); run(); });
      row.addEventListener('click', run);
    });
  }

  async function _loadExample(ex) {
    await Simulator.importJSON(ex.automata);
    const automata = await Simulator.getAutomata();
    if (typeof Graph !== 'undefined') Graph.render(automata);
    if (typeof UI !== 'undefined') {
      UI.log('ok', `Ejemplo cargado: "${ex.title}"`);
      UI.log('info', `Tipo: ${ex.automata.type} · ${ex.automata.states.length} estados · ${ex.automata.transitions.length} transiciones`);
    }
  }

  // ── Inyectar botón en el header ────────────────────────────────────────────
  function _injectHeaderButton() {
    if (document.getElementById('btn-examples')) return;
    const header = document.getElementById('header');
    if (!header) return;
    const btn = document.createElement('button');
    btn.id = 'btn-examples';
    btn.textContent = '📚 EJEMPLOS';
    btn.title = 'Librería de ejemplos prácticos';
    btn.addEventListener('click', open);
    const algoBtn = document.getElementById('btn-algo-panel');
    if (algoBtn) algoBtn.parentNode.insertBefore(btn, algoBtn.nextSibling);
    else header.appendChild(btn);
  }

  // ── API pública ────────────────────────────────────────────────────────────
  function open() {
    _injectStyles();
    _buildPanel();
    document.getElementById('ex-backdrop').classList.add('open');
  }

  function close() {
    const el = document.getElementById('ex-backdrop');
    if (el) el.classList.remove('open');
  }

  function init() {
    _injectStyles();
    _injectHeaderButton();
  }

  return { init, open, close, catalog: CATALOG };

})();
