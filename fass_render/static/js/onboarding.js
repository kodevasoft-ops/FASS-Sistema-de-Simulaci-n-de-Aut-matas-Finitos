/**
 * FASS v3 — Onboarding actualizado con 14 pasos
 * Cubre: AFD/AFN, estados, transiciones, alfabeto Σ, validación,
 * grafo, debugger, algoritmos formales, Thompson, subconjuntos+hopcroft,
 * consola, exportación múltiple, y flujo final recomendado.
 */
const Onboarding = (() => {
  let _step=0,_total=0,_active=false,_spotlight=null,_card=null,_overlay=null,_skipBtn=null;

  const STEPS = [
    {
      title:'👾 Bienvenido a FASS v3',
      text:`<p><strong>FASS v3</strong> es el simulador más completo de <em>Autómatas Finitos</em> para <strong>Teoría de Compiladores</strong>.</p>
      <div class="ob-compare" style="margin-top:10px;">
        <div class="ob-compare-item ob-green"><div class="ob-compare-title">Lo que puedes hacer</div>
          <div style="font-size:10px;line-height:1.9;">✓ Simular AFD y AFN<br>✓ Thompson · Subconjuntos · Hopcroft<br>✓ Debugger paso a paso<br>✓ Exportar PNG/SVG/CSV/TXT<br>✓ Verificar equivalencia</div>
        </div>
        <div class="ob-compare-item ob-amber"><div class="ob-compare-title">Atajos de teclado</div>
          <div style="font-size:10px;line-height:1.9;"><kbd class="ob-kbd">Enter</kbd> Validar cadena<br><kbd class="ob-kbd">Esc</kbd> Cancelar/cerrar<br><kbd class="ob-kbd">← →</kbd> Navegar debug<br><kbd class="ob-kbd">F5</kbd> Auto-play debug<br><kbd class="ob-kbd">F8</kbd> Breakpoint</div>
        </div>
      </div>
      <div class="ob-tip">💡 Puedes relanzar este recorrido en cualquier momento con el botón <strong>?</strong> del header.</div>`,
      target:null,position:'center',highlight:false
    },
    {
      title:'⚙️ Tipo de Autómata',
      text:`<div class="ob-compare">
        <div class="ob-compare-item ob-green"><div class="ob-compare-title">AFD</div><div>Determinista. Cada par (estado, símbolo) tiene <strong>exactamente un</strong> destino.</div></div>
        <div class="ob-compare-item ob-amber"><div class="ob-compare-title">AFN</div><div>No Determinista. Un par puede tener <strong>varios destinos</strong>. Permite transiciones <strong>ε</strong>.</div></div>
      </div>
      <div class="ob-tip">💡 Ambos reconocen los mismos lenguajes regulares. El AFN suele ser más fácil de diseñar.</div>`,
      target:'btn-type-afd',position:'right',highlight:true
    },
    {
      title:'🔵 Crear Estados',
      text:`<ul class="ob-list">
        <li><span class="ob-badge ob-green">▶ Inicial</span> — Punto de partida. Solo puede existir uno.</li>
        <li><span class="ob-badge ob-amber">◉ Final</span> — Si el autómata termina aquí, la cadena es <strong>ACEPTADA</strong>.</li>
      </ul>
      <div class="ob-example"><span class="ob-state">▶ q0</span><span class="ob-arrow"> ──a──▶ </span><span class="ob-state">q1 ◉</span></div>
      <div class="ob-tip">💡 El primer estado que crees se marca como <strong>inicial automáticamente</strong>.</div>`,
      target:'btn-add-state',position:'right',highlight:true,action:()=>_pulse('btn-add-state')
    },
    {
      title:'🟡 Crear Transiciones',
      text:`<p>Formato: <code class="ob-code">δ(estado, símbolo) → destino</code></p>
      <div class="ob-example"><span class="ob-state">q0</span><span class="ob-arrow"> ──a──▶ </span><span class="ob-state">q1</span></div>
      <ul class="ob-list" style="margin-top:8px;">
        <li>En <strong>AFD</strong>: un solo destino por (estado, símbolo).</li>
        <li>En <strong>AFN</strong>: múltiples destinos permitidos.</li>
        <li>Símbolo <strong>vacío</strong> en AFN = transición épsilon (ε).</li>
      </ul>
      <div class="ob-tip">💡 El sistema valida automáticamente que no haya duplicados en modo AFD.</div>`,
      target:'btn-add-trans',position:'right',highlight:true,action:()=>_pulse('btn-add-trans')
    },
    {
      title:'📐 Editor de Alfabeto Σ — NUEVO v3',
      text:`<p>El <strong>alfabeto Σ</strong> es el conjunto de símbolos que el autómata puede leer. En teoría formal se define <em>antes</em> que las transiciones.</p>
      <div class="ob-steps-list" style="margin:10px 0;">
        <div class="ob-step-item"><div class="ob-step-num">1</div><div>Define Σ explícitamente (ej: {a, b})</div></div>
        <div class="ob-step-item"><div class="ob-step-num">2</div><div>El sistema detecta <strong>huecos</strong>: pares (q, a) sin transición</div></div>
        <div class="ob-step-item"><div class="ob-step-num">3</div><div>Usa <strong>"Completar AFD"</strong> para agregar el estado trampa ∅</div></div>
      </div>
      <div class="ob-tip">💡 Un AFD incompleto puede causar comportamientos inesperados en simulación.</div>`,
      target:'btn-alphabet',position:'right',highlight:true
    },
    {
      title:'▶ Validar Cadenas',
      text:`<p>Escribe una cadena y presiona <kbd class="ob-kbd">Enter</kbd>. El autómata la procesa <strong>símbolo a símbolo</strong> con animación.</p>
      <div class="ob-results"><div class="ob-result-ok">✓ ACEPTADA</div><div class="ob-result-rej">✗ RECHAZADA</div></div>
      <ul class="ob-list" style="margin-top:8px;">
        <li>El símbolo activo se <strong>resalta</strong> en la barra.</li>
        <li>Las transiciones se <strong>iluminan</strong> en el grafo.</li>
        <li>Ajusta la velocidad con el slider <strong>SPD</strong>.</li>
      </ul>
      <div class="ob-tip">💡 La cadena vacía (Enter sin escribir) representa la cadena épsilon <strong>ε</strong>.</div>`,
      target:'validate-bar',position:'top',highlight:true
    },
    {
      title:'🕸️ Área del Grafo',
      text:`<div class="ob-symbols">
        <div><span class="ob-sym-init">▶ q0</span> Estado inicial</div>
        <div><span class="ob-sym-final">q3 ◉</span> Estado final (borde punteado)</div>
        <div><span class="ob-sym-active">q1</span> Estado activo en simulación</div>
      </div>
      <ul class="ob-list" style="margin-top:10px;">
        <li>🖱️ <strong>Arrastra nodos</strong> para reorganizar</li>
        <li>🔍 <strong>Scroll</strong> para hacer zoom</li>
        <li>⊡ <strong>"Ajustar Grafo"</strong> para centrar la vista</li>
      </ul>`,
      target:'canvas-area',position:'center',highlight:false
    },
    {
      title:'🔍 Debugger Paso a Paso — NUEVO v3',
      text:`<p>Controla la simulación <strong>manualmente</strong>, sin animación automática.</p>
      <div class="ob-steps-list" style="margin:10px 0;">
        <div class="ob-step-item"><div class="ob-step-num">◀</div><div><strong>PREV</strong> — Retroceder un paso</div></div>
        <div class="ob-step-item"><div class="ob-step-num">▶</div><div><strong>NEXT</strong> — Avanzar un paso</div></div>
        <div class="ob-step-item"><div class="ob-step-num">▶▶</div><div><strong>AUTO</strong> — Reproducción automática</div></div>
        <div class="ob-step-item"><div class="ob-step-num">⬤</div><div><strong>Breakpoint</strong> — Pausa automática al llegar al estado</div></div>
      </div>
      <div class="ob-tip" style="border-left-color:#FFB000;">⌨️ <kbd class="ob-kbd">← →</kbd> navegar · <kbd class="ob-kbd">F5</kbd> auto-play · <kbd class="ob-kbd">F8</kbd> breakpoint</div>`,
      target:'btn-debugger',position:'right',highlight:true,action:()=>_pulse('btn-debugger')
    },
    {
      title:'⚗ Panel de Algoritmos Formales',
      text:`<p>Contiene <strong>6 herramientas</strong> de teoría de autómatas y compiladores:</p>
      <ul class="ob-list">
        <li><span class="ob-badge ob-green">①</span> <strong>Thompson</strong> — Regex → AFN-ε</li>
        <li><span class="ob-badge ob-amber">②</span> <strong>Subconjuntos</strong> — AFN → AFD</li>
        <li><span class="ob-badge ob-blue">③</span> <strong>Hopcroft</strong> — AFD → AFD mínimo</li>
        <li><span class="ob-badge ob-green">④</span> <strong>Pipeline</strong> — Regex → AFD mínimo de una vez</li>
        <li><span class="ob-badge ob-amber">⑤</span> <strong>Equivalencia</strong> — ¿Dos autómatas = mismo lenguaje?</li>
        <li><span class="ob-badge ob-blue">⑥</span> <strong>Generar cadena</strong> — Cadena más corta aceptada (BFS)</li>
      </ul>`,
      target:'btn-algo-panel',position:'bottom',highlight:true,action:()=>_pulse('btn-algo-panel')
    },
    {
      title:'① Construcción de Thompson',
      text:`<p><strong>Thompson (1968)</strong> convierte cualquier expresión regular en un AFN-ε.</p>
      <div class="ob-demo-box">
        <div class="ob-demo-title">Pipeline completo de compiladores</div>
        <div class="ob-demo-desc" style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#FFB000;letter-spacing:1px;">Regex → AFN → AFD → AFD mínimo</div>
      </div>
      <div style="margin-top:8px;font-size:11px;">Operadores: <code class="ob-code">a</code> <code class="ob-code">ab</code> <code class="ob-code">a|b</code> <code class="ob-code">a*</code> <code class="ob-code">a+</code> <code class="ob-code">a?</code> <code class="ob-code">()</code> <code class="ob-code">ε</code></div>
      <div class="ob-tip">💡 Después de generar el AFN, usa <strong>② Subconjuntos</strong> para convertirlo a AFD determinista.</div>`,
      target:'btn-algo-panel',position:'bottom',highlight:true
    },
    {
      title:'② Subconjuntos  +  ③ Hopcroft',
      text:`<div class="ob-compare">
        <div class="ob-compare-item ob-green"><div class="ob-compare-title">② Subconjuntos</div>
          <div style="font-size:10px;">AFN → AFD. Cada estado del AFD = subconjunto de estados del AFN. Muestra la <strong>tabla de subconjuntos</strong> completa.</div>
        </div>
        <div class="ob-compare-item ob-amber"><div class="ob-compare-title">③ Hopcroft</div>
          <div style="font-size:10px;">AFD → AFD mínimo. Elimina estados <strong>equivalentes</strong> (redundantes). Muestra los <strong>grupos de Myhill-Nerode</strong>.</div>
        </div>
      </div>
      <div class="ob-tip">💡 Usa el <strong>④ Pipeline</strong> para ejecutar los tres pasos en un solo clic.</div>`,
      target:'btn-algo-panel',position:'bottom',highlight:true
    },
    {
      title:'📟 Consola Técnica',
      text:`<p>5 pestañas con información del sistema:</p>
      <ul class="ob-list">
        <li><span class="ob-badge ob-green">LOG</span> Registro de todas las acciones.</li>
        <li><span class="ob-badge ob-amber">TRACE</span> Traza paso a paso de la última simulación.</li>
        <li><span class="ob-badge ob-blue">TABLE</span> Tabla de transiciones δ en formato matricial.</li>
        <li><span class="ob-badge ob-green">STATS</span> Estadísticas: |Q|, |Σ|, completitud, propiedades.</li>
        <li><span class="ob-badge ob-amber">HIST</span> Historial de validaciones. Clic para repetir.</li>
      </ul>`,
      target:'console',position:'left',highlight:true
    },
    {
      title:'💾 Exportación Múltiple — NUEVO v3',
      text:`<p>Exporta tu trabajo en múltiples formatos:</p>
      <ul class="ob-list">
        <li><span class="ob-badge ob-green">PNG</span> Imagen del grafo para entregar en clase.</li>
        <li><span class="ob-badge ob-blue">SVG</span> Gráfico vectorial escalable (ideal para informes).</li>
        <li><span class="ob-badge ob-amber">CSV</span> Tabla de transiciones para Excel / Google Sheets.</li>
        <li><span class="ob-badge" style="color:#c8ffd4;border-color:rgba(200,255,212,0.3);">TXT</span> Definición formal M=(Q,Σ,δ,q0,F) en texto plano.</li>
        <li><span class="ob-badge ob-green">JSON</span> Formato FASS para importar y continuar después.</li>
      </ul>
      <div class="ob-tip">💡 Usa el menú expandido de <strong>↓ Exportar</strong> en el sidebar para acceder a todos los formatos.</div>`,
      target:'btn-export',position:'right',highlight:true,action:()=>_pulse('btn-export')
    },
    {
      title:'🚀 ¡Listo para empezar!',
      text:`<p>Ya conoces <strong>todo lo que FASS v3 puede hacer</strong>.</p>
      <div class="ob-steps-list">
        <div class="ob-step-item"><div class="ob-step-num">1</div><div>Selecciona <strong>AFD</strong> o <strong>AFN</strong></div></div>
        <div class="ob-step-item"><div class="ob-step-num">2</div><div>Define el <strong>alfabeto Σ</strong> explícitamente</div></div>
        <div class="ob-step-item"><div class="ob-step-num">3</div><div>Crea los <strong>estados</strong> (al menos uno inicial y uno final)</div></div>
        <div class="ob-step-item"><div class="ob-step-num">4</div><div>Agrega las <strong>transiciones</strong></div></div>
        <div class="ob-step-item"><div class="ob-step-num">5</div><div>Valida cadenas o usa el <strong>debugger</strong></div></div>
        <div class="ob-step-item"><div class="ob-step-num">6</div><div>Usa <strong>⚗ ALGORITMOS</strong> para conversiones formales</div></div>
        <div class="ob-step-item"><div class="ob-step-num">7</div><div><strong>Exporta</strong> en el formato que necesites</div></div>
      </div>
      <div class="ob-tip" style="margin-top:12px;">⚡ O haz clic en <strong>"Cargar Demo"</strong> para ver un ejemplo funcionando ahora mismo.</div>`,
      target:null,position:'center',highlight:false
    },
  ];

  function _injectStyles(){
    if(document.getElementById('ob-styles'))return;
    const s=document.createElement('style');s.id='ob-styles';
    s.textContent=`
      #ob-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:2000;pointer-events:none;transition:opacity 0.3s ease;opacity:0;}
      #ob-overlay.visible{opacity:1;}
      #ob-spotlight{position:fixed;z-index:2001;border:2px solid rgba(0,255,156,0.6);box-shadow:0 0 0 9999px rgba(0,0,0,0.72),0 0 30px rgba(0,255,156,0.4);border-radius:4px;pointer-events:none;transition:all 0.4s cubic-bezier(0.4,0,0.2,1);animation:ob-sp 2s ease-in-out infinite;}
      @keyframes ob-sp{0%,100%{border-color:rgba(0,255,156,0.6);}50%{border-color:rgba(0,255,156,1);box-shadow:0 0 0 9999px rgba(0,0,0,0.72),0 0 50px rgba(0,255,156,0.6);}}
      #ob-card{position:fixed;z-index:2100;width:380px;max-width:calc(100vw - 32px);background:#080d08;border:1px solid rgba(0,255,156,0.35);box-shadow:0 0 40px rgba(0,255,156,0.15),0 20px 60px rgba(0,0,0,0.8);font-family:'Share Tech Mono',monospace;animation:ob-in 0.35s cubic-bezier(0.34,1.56,0.64,1);overflow:hidden;}
      @keyframes ob-in{from{opacity:0;transform:scale(0.92) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}
      #ob-card-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 10px;border-bottom:1px solid rgba(0,255,156,0.15);background:rgba(0,255,156,0.04);}
      #ob-card-title{font-family:'Orbitron',sans-serif;font-size:13px;font-weight:700;color:#00FF9C;text-shadow:0 0 12px rgba(0,255,156,0.5);letter-spacing:1px;}
      #ob-card-step-badge{font-size:10px;color:#3a6645;letter-spacing:1px;}
      #ob-card-body{padding:14px 16px;color:#c8ffd4;font-size:12px;line-height:1.7;max-height:360px;overflow-y:auto;}
      #ob-card-body::-webkit-scrollbar{width:3px;}#ob-card-body::-webkit-scrollbar-thumb{background:#3a6645;}
      #ob-card-body p{margin-bottom:8px;}#ob-card-body strong{color:#00FF9C;}#ob-card-body em{color:#FFB000;font-style:normal;}
      #ob-card-body code,.ob-code{color:#00C97B;background:rgba(0,255,156,0.08);padding:1px 5px;border-radius:2px;font-family:'Share Tech Mono',monospace;}
      #ob-card-footer{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-top:1px solid rgba(0,255,156,0.1);background:rgba(0,0,0,0.3);gap:8px;}
      #ob-progress-bar{flex:1;height:2px;background:rgba(0,255,156,0.1);border-radius:2px;overflow:hidden;}
      #ob-progress-fill{height:100%;background:#00FF9C;box-shadow:0 0 6px #00FF9C;transition:width 0.4s ease;}
      .ob-nav-btn{background:transparent;border:1px solid rgba(0,255,156,0.25);color:#6aff9e;font-family:'Share Tech Mono',monospace;font-size:11px;padding:5px 12px;cursor:pointer;letter-spacing:1px;transition:all 0.15s;white-space:nowrap;}
      .ob-nav-btn:hover{background:rgba(0,255,156,0.08);border-color:rgba(0,255,156,0.5);color:#00FF9C;}
      .ob-nav-btn.ob-primary{border-color:rgba(0,255,156,0.5);color:#00FF9C;background:rgba(0,255,156,0.06);}
      .ob-nav-btn.ob-primary:hover{background:rgba(0,255,156,0.14);}
      .ob-nav-btn:disabled{opacity:0.3;cursor:not-allowed;}
      #ob-skip-btn{position:fixed;top:50px;right:16px;z-index:2200;background:rgba(5,5,5,0.9);border:1px solid rgba(255,51,102,0.3);color:rgba(255,51,102,0.7);font-family:'Share Tech Mono',monospace;font-size:10px;padding:5px 12px;cursor:pointer;letter-spacing:1px;transition:all 0.15s;}
      #ob-skip-btn:hover{border-color:#FF3366;color:#FF3366;}
      #ob-help-btn{margin-left:8px;width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,255,156,0.35);background:transparent;color:#00C97B;font-family:'Orbitron',sans-serif;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0;}
      #ob-help-btn:hover{background:rgba(0,255,156,0.1);border-color:#00FF9C;color:#00FF9C;box-shadow:0 0 10px rgba(0,255,156,0.3);}
      #ob-dots{display:flex;gap:5px;align-items:center;}
      .ob-dot{width:5px;height:5px;border-radius:50%;background:rgba(0,255,156,0.2);transition:all 0.2s;}
      .ob-dot.active{background:#00FF9C;box-shadow:0 0 6px #00FF9C;width:12px;border-radius:3px;}
      .ob-tip{margin-top:10px;padding:8px 10px;background:rgba(0,255,156,0.05);border-left:2px solid #00C97B;font-size:11px;color:#6aff9e;line-height:1.6;}
      .ob-compare{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0;}
      .ob-compare-item{padding:8px;border:1px solid;font-size:11px;line-height:1.6;}
      .ob-compare-item.ob-green{border-color:rgba(0,255,156,0.3);background:rgba(0,255,156,0.04);}
      .ob-compare-item.ob-amber{border-color:rgba(255,176,0,0.3);background:rgba(255,176,0,0.04);}
      .ob-compare-title{font-family:'Orbitron',sans-serif;font-size:12px;font-weight:700;margin-bottom:5px;}
      .ob-compare-item.ob-green .ob-compare-title{color:#00FF9C;}.ob-compare-item.ob-amber .ob-compare-title{color:#FFB000;}
      .ob-list{list-style:none;margin:8px 0;padding:0;}
      .ob-list li{padding:4px 0;padding-left:12px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;line-height:1.6;position:relative;}
      .ob-list li::before{content:'›';position:absolute;left:0;color:#00C97B;}
      .ob-badge{display:inline-block;padding:1px 6px;font-size:10px;border:1px solid;margin-right:4px;letter-spacing:0.5px;font-family:'Orbitron',sans-serif;}
      .ob-badge.ob-green{color:#00C97B;border-color:rgba(0,201,123,0.4);}
      .ob-badge.ob-amber{color:#FFB000;border-color:rgba(255,176,0,0.4);}
      .ob-badge.ob-blue{color:#00CFFF;border-color:rgba(0,207,255,0.4);}
      .ob-example{display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(0,0,0,0.4);border:1px solid rgba(0,255,156,0.1);margin:8px 0;font-family:'VT323',monospace;font-size:20px;}
      .ob-state{color:#00FF9C;padding:2px 8px;border:1px solid rgba(0,255,156,0.3);}
      .ob-arrow{color:#FFB000;margin:0 4px;}
      .ob-results{display:flex;gap:8px;margin:8px 0;}
      .ob-result-ok{flex:1;text-align:center;padding:6px;font-family:'Orbitron',sans-serif;font-size:11px;color:#00FF9C;border:1px solid rgba(0,255,156,0.4);background:rgba(0,255,156,0.06);letter-spacing:2px;}
      .ob-result-rej{flex:1;text-align:center;padding:6px;font-family:'Orbitron',sans-serif;font-size:11px;color:#FF3366;border:1px solid rgba(255,51,102,0.4);background:rgba(255,51,102,0.06);letter-spacing:2px;}
      .ob-kbd{display:inline-block;padding:2px 6px;border:1px solid #3a6645;background:#0d1a0d;color:#00C97B;font-size:10px;border-radius:3px;font-family:'Share Tech Mono',monospace;}
      .ob-symbols{display:flex;flex-direction:column;gap:5px;margin:8px 0;padding:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(0,255,156,0.08);font-size:11px;}
      .ob-symbols>div{display:flex;align-items:center;gap:8px;}
      .ob-sym-init{color:#00FF9C;font-size:13px;text-shadow:0 0 8px rgba(0,255,156,0.5);}
      .ob-sym-final{color:#00C97B;border:1px dashed rgba(0,201,123,0.5);padding:1px 6px;font-size:12px;}
      .ob-sym-active{color:#050505;background:#00FF9C;padding:1px 6px;font-size:12px;}
      .ob-demo-box{border:1px solid rgba(255,176,0,0.25);background:rgba(255,176,0,0.04);padding:10px 12px;margin:8px 0;}
      .ob-demo-title{font-family:'Orbitron',sans-serif;font-size:11px;color:#FFB000;letter-spacing:1px;margin-bottom:5px;}
      .ob-demo-desc{font-size:11px;color:#c8ffd4;}
      .ob-steps-list{display:flex;flex-direction:column;gap:6px;margin:8px 0;}
      .ob-step-item{display:flex;align-items:flex-start;gap:10px;font-size:11px;}
      .ob-step-num{min-width:20px;height:20px;background:rgba(0,255,156,0.1);border:1px solid rgba(0,255,156,0.3);color:#00FF9C;font-family:'Orbitron',sans-serif;font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      @keyframes ob-pulse-btn{0%{box-shadow:0 0 0 0 rgba(0,255,156,0.4);}70%{box-shadow:0 0 0 10px rgba(0,255,156,0);}100%{box-shadow:0 0 0 0 rgba(0,255,156,0);}}
      .ob-pulse-ring{animation:ob-pulse-btn 1s ease 3;outline:2px solid rgba(0,255,156,0.6);outline-offset:3px;}
      @media(max-width:500px){#ob-card{width:calc(100vw - 24px);}.ob-compare{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(s);
  }

  function _pulse(id){const el=document.getElementById(id);if(!el)return;el.classList.add('ob-pulse-ring');setTimeout(()=>el.classList.remove('ob-pulse-ring'),3000);}

  function _buildDOM(){
    _overlay=document.createElement('div');_overlay.id='ob-overlay';document.body.appendChild(_overlay);
    requestAnimationFrame(()=>_overlay.classList.add('visible'));
    _spotlight=document.createElement('div');_spotlight.id='ob-spotlight';_spotlight.style.display='none';document.body.appendChild(_spotlight);
    _card=document.createElement('div');_card.id='ob-card';
    _card.innerHTML=`<div id="ob-card-header"><span id="ob-card-title"></span><span id="ob-card-step-badge"></span></div>
      <div id="ob-card-body"></div>
      <div id="ob-card-footer">
        <button class="ob-nav-btn" id="ob-btn-prev">← Anterior</button>
        <div id="ob-dots"></div>
        <div id="ob-progress-bar"><div id="ob-progress-fill"></div></div>
        <button class="ob-nav-btn ob-primary" id="ob-btn-next">Siguiente →</button>
      </div>`;
    document.body.appendChild(_card);
    _skipBtn=document.createElement('button');_skipBtn.id='ob-skip-btn';_skipBtn.textContent='SALTAR ✕';document.body.appendChild(_skipBtn);
    document.getElementById('ob-btn-prev').addEventListener('click',prev);
    document.getElementById('ob-btn-next').addEventListener('click',next);
    _skipBtn.addEventListener('click',finish);
    document.addEventListener('keydown',_onKey);
  }

  function _onKey(e){if(!_active)return;if(e.key==='ArrowRight'){e.preventDefault();next();}if(e.key==='ArrowLeft'){e.preventDefault();prev();}if(e.key==='Escape'){e.preventDefault();finish();}}

  function _showStep(i){
    _step=i;const s=STEPS[i];
    document.getElementById('ob-card-title').textContent=s.title;
    document.getElementById('ob-card-step-badge').textContent=`${i+1} / ${_total}`;
    document.getElementById('ob-card-body').innerHTML=s.text;
    document.getElementById('ob-progress-fill').style.width=`${Math.round((i+1)/_total*100)}%`;
    const dots=document.getElementById('ob-dots');dots.innerHTML='';
    for(let j=0;j<_total;j++){const d=document.createElement('div');d.className=`ob-dot${j===i?' active':''}`;dots.appendChild(d);}
    document.getElementById('ob-btn-prev').disabled=i===0;
    document.getElementById('ob-btn-next').textContent=i===_total-1?'¡Empezar! ✓':'Siguiente →';
    if(s.target&&s.highlight){const el=document.getElementById(s.target);if(el){_posSpotlight(el);_posCard(el,s.position);_spotlight.style.display='block';}else{_centerCard();_spotlight.style.display='none';}}
    else{_spotlight.style.display='none';_posCard(null,s.position);}
    if(typeof s.action==='function')setTimeout(s.action,400);
    document.getElementById('ob-card-body').scrollTop=0;
  }

  function _posSpotlight(el){const r=el.getBoundingClientRect(),p=8;Object.assign(_spotlight.style,{left:`${r.left-p}px`,top:`${r.top-p}px`,width:`${r.width+p*2}px`,height:`${r.height+p*2}px`});}
  function _posCard(el,pos){
    const W=380,M=16,vw=window.innerWidth,vh=window.innerHeight;
    if(!el||pos==='center'){_centerCard();return;}
    const r=el.getBoundingClientRect();let left,top;
    if(pos==='right'){left=r.right+M;top=Math.max(M,r.top+r.height/2-200);}
    if(pos==='left'){left=r.left-W-M;top=Math.max(M,r.top+r.height/2-200);}
    if(pos==='top'){left=Math.max(M,r.left+r.width/2-W/2);top=r.top-M-450;}
    if(pos==='bottom'){left=Math.max(M,r.left+r.width/2-W/2);top=r.bottom+M;}
    left=Math.max(M,Math.min(left,vw-W-M));top=Math.max(M+40,Math.min(top,vh-500));
    Object.assign(_card.style,{left:`${left}px`,top:`${top}px`,transform:'none',right:'auto',bottom:'auto'});
  }
  function _centerCard(){Object.assign(_card.style,{left:'50%',top:'50%',transform:'translate(-50%,-50%)',right:'auto',bottom:'auto'});}

  function start(){if(_active)return;_active=true;_step=0;_total=STEPS.length;_buildDOM();_showStep(0);}
  function next(){if(_step<_total-1)_showStep(_step+1);else finish();}
  function prev(){if(_step>0)_showStep(_step-1);}
  function finish(){
    if(!_active)return;_active=false;
    if(_card)_card.style.animation='ob-in 0.25s ease reverse forwards';
    if(_overlay)_overlay.style.opacity='0';
    if(_spotlight)_spotlight.style.opacity='0';
    if(_skipBtn)_skipBtn.style.opacity='0';
    setTimeout(()=>{[_card,_overlay,_spotlight,_skipBtn].forEach(e=>e?.remove());_card=_overlay=_spotlight=_skipBtn=null;},300);
    document.removeEventListener('keydown',_onKey);
    try{localStorage.setItem('fass_onboarding_v3_done','1');}catch{}
    if(typeof UI!=='undefined'&&UI.log)UI.log('ok','Recorrido completado — ¡a construir autómatas!');
  }

  function _injectHelpButton(){
    if(document.getElementById('ob-help-btn'))return;
    const header=document.getElementById('header');if(!header)return;
    const btn=document.createElement('button');btn.id='ob-help-btn';btn.textContent='?';btn.title='Ver recorrido de bienvenida';
    btn.addEventListener('click',start);
    const clock=document.getElementById('header-clock');
    clock?header.insertBefore(btn,clock):header.appendChild(btn);
  }

  function init(force=false){
    _injectStyles();_injectHelpButton();
    let seen=false;try{seen=localStorage.getItem('fass_onboarding_v3_done')==='1';}catch{}
    if(force||!seen)setTimeout(start,900);
  }

  return{init,start,next,prev,finish};
})();
