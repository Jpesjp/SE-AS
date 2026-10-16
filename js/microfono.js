/* ==========================================================
   SeñaPuente · microfono.js
   Módulo de reconocimiento de voz (RF-04 a RF-07).
   - Captura el audio del profesional (RF-04).
   - Lo transcribe con la Web Speech API del navegador (RF-05).
   - Escribe el texto EN EL HISTORIAL mientras se habla: una
     burbuja "en vivo" se llena con el texto parcial y se confirma
     cuando termina la frase (RF-06).
   - Marca los mensajes con confianza baja (RF-07, en consulta.js).
   Necesita Chrome o Edge e internet.
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

  var rec = null, escuchando = false, stream = null, audioCtx = null, analyser = null, raf = 0;
  var burbuja = null;      // burbuja en vivo que se está llenando
  var textoParcial = '';   // último texto parcial recibido

  var ERRORES = {
    'not-allowed': 'No hay permiso para usar el micrófono. Actívalo en la configuración del navegador y vuelve a intentarlo.',
    'service-not-allowed': 'Este navegador o esta vista no permite usar el micrófono. Abre la página en Chrome o Edge.',
    'audio-capture': 'No se encontró un micrófono conectado.',
    'network': 'La transcripción necesita conexión a internet.',
    'language-not-supported': 'Este idioma no está disponible en tu navegador. Prueba con otra variante de español.'
  };

  /* ---------- Interfaz ---------- */
  function mostrarAviso(msg) { avisoTexto.textContent = msg || ''; aviso.hidden = !msg; }

  function actualizarUI() {
    micBtn.setAttribute('aria-pressed', escuchando ? 'true' : 'false');
    micBtn.setAttribute('aria-label', escuchando ? 'Pausar micrófono' : 'Activar micrófono');
    micLabel.textContent = escuchando ? 'Escuchando… toca para pausar' : 'Toca para hablar';
    micHint.textContent = escuchando
      ? 'Habla con naturalidad. El texto se escribe en el historial.'
      : 'El texto aparecerá en el historial mientras hablas.';
    estado.classList.toggle('is-live', escuchando);
    estadoTexto.textContent = escuchando ? 'Transcribiendo' : 'Micrófono apagado';
  }

  /* ---------- Burbuja en vivo ---------- */
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
  async function iniciar() {
    mostrarAviso('');
    if (!Reconocimiento) {
      mostrarAviso('Este navegador no puede transcribir voz. Abre la página en Chrome o Edge.');
      return;
    }
    escuchando = true;
    actualizarUI();

    // Se pide el micrófono también para dibujar la onda de audio.
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        iniciarOnda(stream);
      } catch (err) {
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
          mostrarAviso('No se pudo usar el micrófono. Permite el acceso para este sitio en Chrome o Edge y vuelve a intentarlo.');
          detener();
          return;
        }
      }
    }
    if (!escuchando) return;

    asegurarBurbuja(); // muestra de inmediato la burbuja "Habla ahora…"

    rec = new Reconocimiento();
    rec.lang = idioma.value || 'es-CO';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = function (ev) {
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

    rec.onerror = function (ev) {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      mostrarAviso(ERRORES[ev.error] || ('No se pudo usar el micrófono (' + ev.error + ').'));
      detener();
    };

    // Chrome corta el reconocimiento tras un silencio: se reanuda.
    rec.onend = function () {
      if (escuchando) { try { rec.start(); } catch (e) {} }
    };

    try { rec.start(); }
    catch (e) { mostrarAviso('No se pudo iniciar el micrófono.'); detener(); }
  }

  function detener() {
    escuchando = false;
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
    if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; analyser = null; }
    cancelAnimationFrame(raf);
    actualizarUI();
    dibujarReposo();
  }

  micBtn.addEventListener('click', function () { escuchando ? detener() : iniciar(); });
  idioma.addEventListener('change', function () { if (escuchando) { detener(); iniciar(); } });

  /* ---------- Onda de audio ---------- */
  var lienzo = $('wave'), ctx = lienzo.getContext('2d'), BARRAS = 24;
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
  function dibujarReposo() { dibujarBarras(REPOSO.map(function (v) { return v * .6; }), .4); }

  function iniciarOnda(s) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = .75;
    audioCtx.createMediaStreamSource(s).connect(analyser);
    var datos = new Uint8Array(analyser.frequencyBinCount);
    (function ciclo() {
      if (!analyser) return;
      analyser.getByteFrequencyData(datos);
      var niveles = [];
      for (var i = 0; i < BARRAS; i++) {
        var a = datos[2 + i * 2] || 0, b = datos[3 + i * 2] || 0;
        niveles.push(((a + b) / 2) / 200 + .08);
      }
      dibujarBarras(niveles, 1);
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

  actualizarUI();
})();
