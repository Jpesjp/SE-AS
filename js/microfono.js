/* ==========================================================
   SeñaPuente · microfono.js
   Transcribe la voz del profesional y la escribe en el historial.
   Usa el reconocimiento de voz de Chrome o Edge (Web Speech API).
   Se pausa solo mientras voz.js lee en voz alta un mensaje del
   paciente, para no transcribir la voz del parlante.

   IMPORTANTE: Chrome no permite el reconocimiento de voz si abres
   index.html con doble clic (dirección file://). Ábrelo desde
   GitHub Pages o con la extensión Live Server de VS Code.
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SenaPuente;
  var Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;

  var $ = function (id) { return document.getElementById(id); };
  var micBtn = $('mic'), micLabel = $('mic-label'), micHint = $('mic-hint');
  var aviso = $('mic-notice'), avisoTexto = $('mic-notice-text');
  var estado = $('mic-status'), estadoTexto = $('mic-status-text');
  var idioma = $('mic-lang');

  var rec = null;
  var escuchando = false;
  var hablando = false;     // el navegador detecta voz en este momento
  var enPausa = false;      // pausado mientras se lee un mensaje del paciente
  var burbuja = null;       // burbuja del historial que se está llenando
  var textoParcial = '';    // último texto parcial reconocido

  var ERRORES = {
    'not-allowed': 'El navegador bloqueó el micrófono. Haz clic en el candado junto a la dirección de la página, permite el micrófono y vuelve a intentarlo.',
    'service-not-allowed': 'El navegador bloqueó el reconocimiento de voz. Usa Chrome o Edge y abre la página desde GitHub Pages o Live Server.',
    'audio-capture': 'No se encontró un micrófono. Revisa que esté conectado y seleccionado en la configuración del equipo.',
    'network': 'No se pudo conectar con el servicio de reconocimiento de voz. Revisa tu conexión a internet. Si usas Brave u Opera, cambia a Chrome o Edge.',
    'language-not-supported': 'Este idioma no está disponible en tu navegador. Elige otra variante de español.'
  };

  /* ---------- Interfaz ---------- */
  function mostrarAviso(msg) {
    avisoTexto.textContent = msg || '';
    aviso.hidden = !msg;
  }

  function actualizarUI() {
    micBtn.setAttribute('aria-pressed', escuchando ? 'true' : 'false');
    micBtn.setAttribute('aria-label', escuchando ? 'Pausar micrófono' : 'Activar micrófono');
    if (escuchando && enPausa) {
      micLabel.textContent = 'En pausa…';
      micHint.textContent = 'Se está leyendo en voz alta el mensaje del paciente. Sigue al terminar.';
    } else {
      micLabel.textContent = escuchando ? 'Escuchando… toca para pausar' : 'Toca para hablar';
      micHint.textContent = escuchando
        ? 'Habla con naturalidad. El texto se escribe en el historial.'
        : 'El texto aparecerá en el historial mientras hablas.';
    }
    estado.classList.toggle('is-live', escuchando && !enPausa);
    estadoTexto.textContent = !escuchando ? 'Micrófono apagado'
      : enPausa ? 'En pausa · leyendo al paciente' : 'Transcribiendo';
  }

  // Revisa, antes de empezar, si el navegador puede transcribir.
  function problemaDeEntorno() {
    if (location.protocol === 'file:') {
      return 'Abriste el archivo con doble clic. Chrome no permite reconocer voz así: abre la página desde GitHub Pages o con Live Server en VS Code.';
    }
    if (!Reconocimiento) {
      return 'Este navegador no puede transcribir voz. Abre la página en Google Chrome o Microsoft Edge.';
    }
    return '';
  }

  /* ---------- Burbuja del historial ---------- */
  function asegurarBurbuja() {
    if (!burbuja) burbuja = SP.chat.nuevaBurbujaVoz();
    return burbuja;
  }
  function cerrarBurbuja(texto, confianza) {
    asegurarBurbuja();
    SP.chat.confirmar(burbuja, texto, confianza);
    burbuja = null;
    textoParcial = '';
  }

  /* ---------- Reconocimiento de voz ---------- */
  function iniciar() {
    var problema = problemaDeEntorno();
    if (problema) { mostrarAviso(problema); return; }
    mostrarAviso('');

    rec = new Reconocimiento();
    rec.lang = idioma.value || 'es-CO';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = function (ev) {
      if (enPausa) return;
      var parcial = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var resultado = ev.results[i];
        var alternativa = resultado[0];
        if (resultado.isFinal) {
          var final = alternativa.transcript.trim();
          if (final) cerrarBurbuja(final, alternativa.confidence);
        } else {
          parcial += alternativa.transcript;
        }
      }
      textoParcial = parcial.trim();
      if (textoParcial) SP.chat.escribir(asegurarBurbuja(), textoParcial + '…');
      else if (escuchando) asegurarBurbuja();
    };

    rec.onspeechstart = function () { hablando = true; };
    rec.onspeechend = function () { hablando = false; };

    rec.onerror = function (ev) {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      mostrarAviso(ERRORES[ev.error] || ('No se pudo usar el micrófono (' + ev.error + ').'));
      detener();
    };

    // Chrome corta el reconocimiento tras unos segundos de silencio: se reanuda.
    rec.onend = function () {
      hablando = false;
      if (escuchando && !enPausa) {
        try { rec.start(); } catch (e) { /* ya estaba iniciado */ }
      }
    };

    try {
      rec.start();
    } catch (e) {
      mostrarAviso('No se pudo iniciar el micrófono. Recarga la página e inténtalo de nuevo.');
      rec = null;
      return;
    }

    escuchando = true;
    actualizarUI();
    asegurarBurbuja();
    animarOnda();
  }

  function detener() {
    escuchando = false;
    hablando = false;
    enPausa = false;
    if (rec) {
      rec.onend = null;
      rec.onresult = null;
      try { rec.abort(); } catch (e) {}
      rec = null;
    }
    // Lo que se alcanzó a decir queda en el historial; una burbuja vacía se quita.
    if (burbuja) {
      if (textoParcial) cerrarBurbuja(textoParcial);
      else { SP.chat.descartar(burbuja); burbuja = null; }
    }
    actualizarUI();
  }

  /* ---------- Pausa mientras se lee al paciente ---------- */
  function pausar() {
    if (!escuchando || enPausa) return;
    enPausa = true;
    hablando = false;
    // Lo que el profesional alcanzó a decir se conserva.
    if (burbuja && textoParcial) cerrarBurbuja(textoParcial);
    try { rec.abort(); } catch (e) {}
    actualizarUI();
  }
  function reanudar() {
    if (!escuchando || !enPausa) return;
    enPausa = false;
    actualizarUI();
    // Pequeña espera para que el parlante termine de sonar.
    setTimeout(function () {
      if (!escuchando || enPausa || !rec) return;
      try { rec.start(); } catch (e) { /* sigue activo: onend lo reinicia */ }
    }, 300);
  }
  document.addEventListener('sp:voz', function (e) {
    if (e.detail.hablando) pausar(); else reanudar();
  });

  micBtn.addEventListener('click', function () { escuchando ? detener() : iniciar(); });
  idioma.addEventListener('change', function () { if (escuchando) { detener(); iniciar(); } });

  /* ---------- Onda decorativa ---------- */
  // Se mueve cuando el navegador detecta voz. No usa el micrófono
  // directamente, para no competir con el reconocimiento de voz.
  var lienzo = $('wave'), ctx = lienzo.getContext('2d'), BARRAS = 24, raf = 0;
  var REPOSO = [.25, .4, .6, .35, .7, .5, .3, .55, .35, .65, .25, .45, .3, .5, .2, .4, .3, .55, .25, .35, .2, .3, .2, .15];

  function colorVoz() {
    return getComputedStyle(document.documentElement).getPropertyValue('--voice').trim() || '#B4530F';
  }
  function ajustarLienzo() {
    var r = lienzo.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if (!r.width) return;
    lienzo.width = Math.round(r.width * d);
    lienzo.height = Math.round(r.height * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function dibujarBarras(niveles, alfa) {
    var r = lienzo.getBoundingClientRect(), w = r.width, h = r.height;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = colorVoz();
    var gap = 4, ancho = Math.max(2, (w - gap * (niveles.length - 1)) / niveles.length);
    niveles.forEach(function (v, i) {
      var alto = Math.max(4, Math.min(1, v) * h), x = i * (ancho + gap), y = (h - alto) / 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, ancho, alto, ancho / 2); else ctx.rect(x, y, ancho, alto);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  function dibujarReposo() {
    dibujarBarras(REPOSO.map(function (v) { return v * .6; }), .4);
  }
  function animarOnda() {
    cancelAnimationFrame(raf);
    (function ciclo(t) {
      if (!escuchando) { dibujarReposo(); return; }
      var niveles = REPOSO.map(function (v, i) {
        if (!hablando) return v * .35 + .05;
        return .2 + Math.abs(Math.sin((t || 0) / 180 + i * .7)) * v * 1.2;
      });
      dibujarBarras(niveles, hablando ? 1 : .6);
      raf = requestAnimationFrame(ciclo);
    })();
  }

  if (window.ResizeObserver) {
    new ResizeObserver(function () { ajustarLienzo(); if (!escuchando) dibujarReposo(); }).observe(lienzo);
  }
  document.addEventListener('sp:tema', function () { if (!escuchando) dibujarReposo(); });
  document.addEventListener('sp:finalizar', function () { if (escuchando) detener(); });

  // Al salir de la consulta se apaga el micrófono.
  document.addEventListener('sp:vista', function (e) {
    if (e.detail === 'consulta') { ajustarLienzo(); dibujarReposo(); }
    else if (escuchando) { detener(); }
  });

  // Si el entorno no permite transcribir, se avisa desde el principio.
  mostrarAviso(problemaDeEntorno());
  actualizarUI();
})();
