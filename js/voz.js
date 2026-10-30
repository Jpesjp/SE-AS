/* ==========================================================
   SeñaPuente · voz.js
   Lectura en voz alta de los mensajes del paciente (RF-10, TTS)
   con la síntesis de voz del navegador (speechSynthesis).

   Mientras habla avisa con el evento "sp:voz" ({ hablando }),
   para que microfono.js se pause y no transcriba su propio eco:
   paciente y profesional usan el mismo equipo.
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SenaPuente;
  var synth = window.speechSynthesis;
  var disponible = !!(synth && window.SpeechSynthesisUtterance);

  // Preferencia de variantes de español cuando no se elige una voz.
  var PREFERENCIA = ['es-CO', 'es-419', 'es-US', 'es-MX', 'es-ES'];

  var voces = [];
  var actual = null;    // enunciado que se está leyendo
  var hablando = false;
  var seguro = 0;       // temporizador por si el navegador no avisa el final

  function cargarVoces() {
    if (!disponible) return;
    voces = synth.getVoices()
      .filter(function (v) { return /^es([-_]|$)/i.test(v.lang); })
      .sort(function (a, b) { return rango(a) - rango(b) || a.name.localeCompare(b.name); });
    document.dispatchEvent(new CustomEvent('sp:voces'));
  }
  function rango(v) {
    var lang = v.lang.replace('_', '-');
    var i = PREFERENCIA.indexOf(lang);
    return i < 0 ? PREFERENCIA.length : i;
  }

  function elegirVoz() {
    var nombre = SP.ajustes.get('vozNombre');
    if (nombre) {
      for (var i = 0; i < voces.length; i++) if (voces[i].name === nombre) return voces[i];
    }
    return voces[0] || null;
  }

  function marcar(valor) {
    if (hablando === valor) return;
    hablando = valor;
    document.dispatchEvent(new CustomEvent('sp:voz', { detail: { hablando: valor } }));
  }

  function terminar(u) {
    if (u !== actual) return; // un enunciado anterior cancelado
    actual = null;
    clearTimeout(seguro);
    marcar(false);
  }

  // opciones.forzar: leer aunque la lectura automática esté apagada
  // (botón "Escuchar" de una burbuja o "Probar voz").
  function hablar(texto, opciones) {
    if (!disponible || !texto) return false;
    var forzar = opciones && opciones.forzar;
    if (!forzar && !SP.ajustes.get('vozActiva')) return false;

    var u = new SpeechSynthesisUtterance(texto);
    var voz = elegirVoz();
    if (voz) u.voice = voz;
    u.lang = voz ? voz.lang : 'es-CO';
    u.rate = SP.ajustes.get('vozVelocidad') || 1;
    u.onend = function () { terminar(u); };
    u.onerror = function () { terminar(u); };

    actual = u;
    synth.cancel();
    marcar(true); // antes de que suene, para pausar el micrófono a tiempo
    synth.speak(u);

    // Algunos navegadores no disparan "end": se libera el micrófono
    // pasado un tiempo prudente según la longitud del texto.
    clearTimeout(seguro);
    seguro = setTimeout(function () { terminar(u); }, 4000 + texto.length * 110 / u.rate);
    return true;
  }

  function callar() {
    if (!disponible) return;
    var u = actual;
    synth.cancel();
    if (u) terminar(u);
  }

  SP.voz = {
    disponible: disponible,
    hablar: hablar,
    callar: callar,
    voces: function () { return voces.slice(); },
    estaHablando: function () { return hablando; }
  };

  if (disponible) {
    cargarVoces();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', cargarVoces);
    else synth.onvoiceschanged = cargarVoces;
  }

  document.addEventListener('sp:finalizar', callar);
  document.addEventListener('sp:vista', function (e) { if (e.detail !== 'consulta') callar(); });
})();
