/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         FASS — Módulo de Animaciones y Efectos Visuales                 ║
 * ║                     Archivo: animations.js                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  ¿Para qué sirve este módulo?                                            ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  Centraliza TODOS los efectos visuales de la aplicación:                ║
 * ║    • Secuencia de arranque tipo BIOS (boot sequence)                    ║
 * ║    • Efecto de escritura animada caracter por caracter (typing)         ║
 * ║    • Partículas digitales flotantes en el canvas del grafo              ║
 * ║    • Parpadeo de pantalla CRT retro (flicker)                           ║
 * ║    • Overlay de resultado ACCEPTED / REJECTED con flash                 ║
 * ║    • Highlight de símbolo activo en la cadena validada                  ║
 * ║                                                                          ║
 * ║  Patrón de diseño: Módulo IIFE (Immediately Invoked Function Expression) ║
 * ║  ────────────────────────────────────────────────────────────────────   ║
 * ║  Todo el código está envuelto en (() => { ... })() para crear un        ║
 * ║  ámbito privado. Solo las funciones en el objeto `return` son           ║
 * ║  accesibles desde afuera (API pública del módulo).                      ║
 * ║  Esto evita contaminar el espacio de nombres global y conflictos        ║
 * ║  entre módulos.                                                          ║
 * ║                                                                          ║
 * ║  Dependencias: ninguna (vanilla JS + Canvas API)                        ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const Animations = (() => {

  // ── Líneas de la secuencia de arranque ──────────────────────────────────
  // Estas líneas simulan el proceso de inicio de un sistema operativo antiguo.
  // Cada línea tiene: texto a mostrar, clase CSS para el color, y delay en ms.
  //
  // Clases CSS disponibles:
  //   ''     → color gris (texto normal de sistema)
  //   'ok'   → color verde (módulo cargado correctamente)
  //   'warn' → color ámbar (advertencia no crítica)
  //   'err'  → color rojo  (error)
  const BOOT_LINES = [
    { text: 'FASS v1.0.0 — Inicializando módulos del kernel...', cls: '',     delay: 0    },
    { text: 'Cargando motor de autómatas.....................',    cls: '',     delay: 200  },
    { text: '[ OK ] Módulo AFD cargado',                         cls: 'ok',   delay: 400  },
    { text: '[ OK ] Módulo AFN cargado',                         cls: 'ok',   delay: 550  },
    { text: 'Montando motor de renderizado vis.js............',  cls: '',     delay: 700  },
    { text: '[ OK ] Renderizador de grafos inicializado',        cls: 'ok',   delay: 900  },
    { text: 'Verificando conexión al backend (localhost:5000)',   cls: '',     delay: 1100 },
    { text: '[ WARN ] Backend opcional — modo local disponible', cls: 'warn', delay: 1300 },
    { text: '[ OK ] Núcleo de simulación listo',                 cls: 'ok',   delay: 1550 },
    { text: 'FASS LISTO — Esperando entrada...',                 cls: 'ok',   delay: 1700 },
  ];

  // ── typeText ─────────────────────────────────────────────────────────────
  /**
   * Escribe texto caracter por caracter en un elemento HTML (efecto máquina de escribir).
   *
   * ¿Por qué se usa?
   * ─────────────────────────────────────────────────────────────────────────
   * Da la sensación de que el sistema está "procesando" y generando texto
   * en tiempo real, como una terminal antigua. Mejora la percepción de
   * que la aplicación es un sistema técnico real.
   *
   * Implementación:
   * Usa setInterval para agregar un caracter cada `speed` milisegundos.
   * Retorna una Promise que se resuelve cuando el texto está completo,
   * permitiendo usar await para esperar a que termine antes de continuar.
   *
   * @param {HTMLElement} el    - Elemento donde se escribe el texto
   * @param {string}      text  - Texto a escribir caracter por caracter
   * @param {number}      speed - Milisegundos entre cada caracter (default: 30ms)
   * @returns {Promise}         - Se resuelve al terminar de escribir
   *
   * Ejemplo de uso:
   *   await Animations.typeText(miDiv, "Hola mundo", 40);
   *   // El texto aparece letra por letra, una cada 40ms
   */
  function typeText(el, text, speed = 30) {
    return new Promise(resolve => {
      el.textContent = '';  // Limpiar contenido previo
      let i = 0;

      const interval = setInterval(() => {
        el.textContent += text[i++];  // Agregar siguiente caracter

        if (i >= text.length) {
          clearInterval(interval);  // Detener cuando se acabó el texto
          resolve();                // Notificar que terminó
        }
      }, speed);
    });
  }

  // ── typeLine ──────────────────────────────────────────────────────────────
  /**
   * Agrega una línea con timestamp y efecto typing al panel de log de la consola.
   *
   * ¿Para qué sirve?
   * ─────────────────────────────────────────────────────────────────────────
   * Crea una nueva entrada en la consola técnica derecha con:
   *   - Timestamp [HH:MM:SS] al inicio
   *   - El mensaje con efecto de escritura animada
   *   - Color según el tipo (ok=verde, warn=ámbar, err=rojo, info=azul)
   *
   * @param {HTMLElement} container - Contenedor del log (panel-log)
   * @param {string}      text      - Mensaje a mostrar
   * @param {string}      cls       - Clase CSS: 'ok', 'warn', 'err', 'info', ''
   * @param {number}      speed     - Velocidad del typing en ms por caracter
   * @returns {Promise<HTMLElement>} - La línea creada
   */
  async function typeLine(container, text, cls = '', speed = 18) {
    // Crear el elemento de la línea
    const line = document.createElement('div');
    line.className = `log-entry ${cls}`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;  // Scroll al final

    // Agregar el timestamp [HH:MM:SS]
    const ts = document.createElement('span');
    ts.className   = 'ts';
    ts.textContent = _timestamp();
    line.appendChild(ts);

    // Agregar el mensaje con efecto typing
    const msg = document.createElement('span');
    msg.className = 'msg';
    line.appendChild(msg);

    await typeText(msg, text, speed);
    container.scrollTop = container.scrollHeight;  // Scroll de nuevo al final
    return line;
  }

  // ── runBoot ───────────────────────────────────────────────────────────────
  /**
   * Ejecuta la secuencia de arranque tipo BIOS en la pantalla inicial.
   *
   * ¿Qué hace?
   * ─────────────────────────────────────────────────────────────────────────
   * Muestra las líneas de BOOT_LINES una por una con sus delays configurados,
   * actualizando la barra de progreso en cada paso.
   * Simula el arranque de un sistema operativo de los años 80/90.
   *
   * Proceso:
   *   1. Para cada línea, espera el delay calculado desde la anterior.
   *   2. Crea el elemento DOM con la clase CSS correspondiente.
   *   3. Lo hace visible (simula aparición progresiva).
   *   4. Actualiza la barra de progreso proporcional al avance.
   *
   * @param {HTMLElement} logContainer  - Div donde aparecen las líneas del boot
   * @param {HTMLElement} progressBar   - Div de la barra de carga (se ancha con width%)
   * @returns {Promise}                 - Se resuelve al terminar todas las líneas
   */
  async function runBoot(logContainer, progressBar) {
    const total = BOOT_LINES.length;

    for (let i = 0; i < total; i++) {
      const item = BOOT_LINES[i];

      // Esperar el tiempo entre líneas (diferencia de delays)
      const waitTime = item.delay - (i > 0 ? BOOT_LINES[i - 1].delay : 0);
      await _wait(waitTime);

      // Crear la línea en el DOM
      const line = document.createElement('div');
      line.className = `line ${item.cls}`;
      line.textContent = item.text;
      logContainer.appendChild(line);

      // Pequeña pausa antes de mostrarla (simula aparición)
      await _wait(20);
      line.classList.add('visible');

      // Actualizar barra de progreso: porcentaje completado
      const pct = Math.round(((i + 1) / total) * 100);
      progressBar.style.width = `${pct}%`;

      logContainer.scrollTop = logContainer.scrollHeight;
    }

    await _wait(300);  // Pausa final antes de mostrar la app
  }

  // ── showResult ────────────────────────────────────────────────────────────
  /**
   * Muestra el overlay de resultado ACCEPTED / REJECTED sobre el grafo.
   *
   * ¿Qué hace?
   * ─────────────────────────────────────────────────────────────────────────
   * 1. Cambia la clase CSS del overlay para mostrar el texto y color correcto.
   * 2. Crea un flash de fondo temporal (verde o rojo según resultado).
   * 3. Auto-oculta el overlay después de 3.5 segundos.
   *
   * El flash de fondo da retroalimentación inmediata e impactante al usuario,
   * reforzando si la cadena fue aceptada o rechazada.
   *
   * @param {HTMLElement} overlayEl - El div #result-overlay del HTML
   * @param {boolean}     accepted  - True = ACCEPTED (verde), False = REJECTED (rojo)
   */
  function showResult(overlayEl, accepted) {
    // Cambiar clase y texto del overlay
    overlayEl.className   = accepted ? 'accepted' : 'rejected';
    overlayEl.textContent = accepted ? '✓ ACEPTADA' : '✗ RECHAZADA';

    // ── Flash de fondo ────────────────────────────────────────────────────
    // Crea un div temporal que cubre toda la pantalla con color semi-transparente
    // y se desvanece con animación CSS.
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed; inset:0; pointer-events:none; z-index:50;
      background:${accepted ? 'rgba(0,255,156,0.06)' : 'rgba(255,51,102,0.06)'};
      animation: flash-fade 0.5s ease forwards;
    `;
    document.body.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove());  // Limpiar al terminar

    // Auto-ocultar el overlay después de 3.5 segundos
    setTimeout(() => {
      overlayEl.className   = '';
      overlayEl.textContent = '';
    }, 3500);
  }

  // ── initParticles ─────────────────────────────────────────────────────────
  /**
   * Crea el canvas de partículas digitales flotantes sobre el área del grafo.
   *
   * ¿Qué son las partículas?
   * ─────────────────────────────────────────────────────────────────────────
   * Son pequeños puntos (círculos) de color verde o ámbar que se mueven
   * lentamente por el fondo del área del grafo, dando una sensación de
   * "ambiente digital" sin distraer del grafo principal.
   *
   * Implementación con Canvas API:
   * ─────────────────────────────────────────────────────────────────────────
   * Usa el elemento <canvas> de HTML5 y su API 2D para dibujar y animar
   * los puntos. requestAnimationFrame llama a la función draw() ~60 veces
   * por segundo para una animación fluida.
   *
   * Cada partícula tiene:
   *   x, y   → Posición actual
   *   vx, vy → Velocidad (dirección y rapidez del movimiento)
   *   size   → Radio del punto
   *   alpha  → Opacidad (transparencia)
   *   color  → Verde fósforo o ámbar digital
   *
   * Rebote en los bordes: cuando una partícula llega al borde del canvas,
   * su velocidad se invierte (como una pelota rebotando).
   *
   * @param {string}      canvasId  - ID para el canvas creado
   * @param {HTMLElement} parentEl  - Elemento padre donde insertar el canvas
   * @returns {HTMLCanvasElement}   - El canvas creado
   */
  function initParticles(canvasId, parentEl) {
    // Crear el elemento canvas y posicionarlo sobre el área del grafo
    const canvas = document.createElement('canvas');
    canvas.id = canvasId;
    canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;opacity:0.35;';
    parentEl.appendChild(canvas);

    let w = canvas.width  = parentEl.clientWidth;
    let h = canvas.height = parentEl.clientHeight;
    const ctx = canvas.getContext('2d');

    // Crear 35 partículas con propiedades aleatorias iniciales
    const particles = Array.from({ length: 35 }, () => _makeParticle(w, h));

    /**
     * Genera una partícula con posición y velocidad aleatoria.
     * @param {number} w - Ancho del canvas
     * @param {number} h - Alto del canvas
     */
    function _makeParticle(w, h) {
      return {
        x:     Math.random() * w,                      // Posición X aleatoria
        y:     Math.random() * h,                      // Posición Y aleatoria
        vx:    (Math.random() - 0.5) * 0.4,            // Velocidad X (-0.2 a +0.2)
        vy:    (Math.random() - 0.5) * 0.4,            // Velocidad Y (-0.2 a +0.2)
        size:  Math.random() * 1.5 + 0.3,              // Tamaño (0.3 a 1.8 px)
        alpha: Math.random() * 0.6 + 0.1,              // Opacidad (0.1 a 0.7)
        color: Math.random() > 0.7 ? '#FFB000' : '#00FF9C',  // 30% ámbar, 70% verde
      };
    }

    /**
     * Función principal de animación: se llama ~60 veces por segundo.
     * Limpia el canvas y redibuja todas las partículas en su nueva posición.
     */
    function draw() {
      ctx.clearRect(0, 0, w, h);  // Limpiar frame anterior

      particles.forEach(p => {
        // Dibujar la partícula como un círculo relleno
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle   = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;  // Restaurar opacidad para siguiente partícula

        // Mover la partícula según su velocidad
        p.x += p.vx;
        p.y += p.vy;

        // Rebotar al llegar a los bordes del canvas
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });

      requestAnimationFrame(draw);  // Programar siguiente frame
    }

    draw();  // Iniciar el loop de animación

    // Redimensionar el canvas si el panel cambia de tamaño (responsive)
    const ro = new ResizeObserver(() => {
      w = canvas.width  = parentEl.clientWidth;
      h = canvas.height = parentEl.clientHeight;
    });
    ro.observe(parentEl);

    return canvas;
  }

  // ── startCRTFlicker ───────────────────────────────────────────────────────
  /**
   * Activa el parpadeo sutil de pantalla CRT (Cathode Ray Tube).
   *
   * ¿Qué es el efecto CRT?
   * ─────────────────────────────────────────────────────────────────────────
   * Los monitores de tubo de rayos catódicos (CRT) de los años 70-90
   * tenían un parpadeo natural debido a la frecuencia de refresco.
   * Este efecto simula ese comportamiento de forma muy sutil (3% de probabilidad
   * cada 2 segundos) para reforzar la estética retro sin ser molesto.
   *
   * Implementación:
   * Usa setInterval para revisar cada 2 segundos si debe parpadear.
   * Con 3% de probabilidad, baja brevemente el brillo de toda la página
   * por 80ms usando CSS filter: brightness().
   */
  function startCRTFlicker() {
    setInterval(() => {
      if (Math.random() > 0.97) {            // 3% de probabilidad de parpadeo
        document.body.style.filter = 'brightness(0.92)';
        setTimeout(() => {
          document.body.style.filter = '';   // Restaurar brillo normal
        }, 80);
      }
    }, 2000);
  }

  // ── renderStringHighlight ─────────────────────────────────────────────────
  /**
   * Renderiza la cadena en proceso con el símbolo actual resaltado.
   *
   * ¿Para qué sirve?
   * ─────────────────────────────────────────────────────────────────────────
   * Durante la animación de validación, muestra visualmente qué símbolo
   * de la cadena se está procesando en este momento:
   *   - Símbolos YA procesados: color gris tenue
   *   - Símbolo ACTUAL: fondo verde brillante (resaltado)
   *   - Símbolos pendientes: color verde normal
   *
   * Esto ayuda al usuario a seguir el progreso de la simulación
   * en sincronía con el movimiento en el grafo.
   *
   * @param {HTMLElement} el     - Contenedor donde renderizar la cadena
   * @param {string}      string - La cadena completa que se está validando
   * @param {number}      index  - Índice del símbolo actualmente activo (0-based)
   *
   * Ejemplo visual para string="abc" e index=1 (procesando 'b'):
   *   [a] [B] [c]
   *   gris  VERDE  verde
   */
  function renderStringHighlight(el, string, index) {
    el.innerHTML = string.split('').map((ch, i) => {
      if (i === index) {
        // Símbolo activo: resaltado con fondo verde brillante
        return `<span style="
          color:#050505; background:#00FF9C;
          padding:0 3px; font-weight:bold;
          box-shadow:0 0 12px rgba(0,255,156,0.8);
          border-radius:2px;
        ">${ch}</span>`;
      }
      if (i < index) {
        // Símbolo ya procesado: color gris tenue
        return `<span style="color:#3a6645;">${ch}</span>`;
      }
      // Símbolo pendiente: color verde normal
      return `<span style="color:#6aff9e;">${ch}</span>`;
    }).join('');
  }

  // ── Utilidades privadas ───────────────────────────────────────────────────

  /**
   * Promesa de espera: pausa la ejecución async por `ms` milisegundos.
   * Equivalente a sleep() en otros lenguajes.
   * @param {number} ms - Milisegundos a esperar
   */
  function _wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Genera el timestamp actual en formato [HH:MM:SS].
   * Usado en los logs de la consola técnica.
   * @returns {string} - Ej: "[14:35:07]"
   */
  function _timestamp() {
    const now = new Date();
    const h   = String(now.getHours()).padStart(2, '0');
    const m   = String(now.getMinutes()).padStart(2, '0');
    const s   = String(now.getSeconds()).padStart(2, '0');
    return `[${h}:${m}:${s}]`;
  }

  // ── Inyectar keyframe de flash al cargar el módulo ────────────────────────
  // Se ejecuta una sola vez al iniciar el módulo.
  // Inyecta la animación CSS necesaria para el efecto de flash en el DOM.
  (function _injectFlashKeyframe() {
    if (document.getElementById('flash-kf')) return;  // Evitar duplicados
    const style = document.createElement('style');
    style.id = 'flash-kf';
    style.textContent = `
      @keyframes flash-fade {
        0%   { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  })();

  // ── API pública del módulo ────────────────────────────────────────────────
  // Solo estas funciones son accesibles desde otros módulos.
  // Las funciones privadas (_wait, _timestamp, _makeParticle) permanecen
  // encapsuladas dentro del módulo IIFE.
  return {
    typeText,
    typeLine,
    runBoot,
    showResult,
    initParticles,
    startCRTFlicker,
    renderStringHighlight,
  };

})();  // ← El módulo IIFE se ejecuta inmediatamente al cargar el archivo
