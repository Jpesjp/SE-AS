/* ==========================================================
   SeñaPuente · consulta.js
   - Historial de la consulta (RF-13): API SenaPuente.chat que
     usa microfono.js para escribir los mensajes en vivo.
   - Indicador de confianza baja (RF-07).
   - Vista profesional / paciente (RF-03).
   - Formulario de ingreso (RF-01, RF-02: interfaz, sin backend).
   - Finalizar consulta y borrar el historial (RF-14).
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SenaPuente = window.SenaPuente || {};

  var app = document.getElementById('app');
  var chat = document.getElementById('chat');
  var vacio = document.getElementById('chat-empty');
  var plantillaVoz = document.getElementById('tpl-voice');
  var toastEl = document.getElementById('toast');

  var UMBRAL_CONFIANZA = 0.6; // por debajo de 60 % se pide repetir (RF-07)
  var consultaEnVivo = false;
  var timerToast = 0;

  /* ---------- Utilidades ---------- */
  function hora() {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  function icono(nombre) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ic ic--xs');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + nombre);
    svg.appendChild(use);
    return svg;
  }
  function cercaDelFinal() {
    return chat.scrollHeight - chat.scrollTop - chat.clientHeight < 140;
  }
  function bajar(forzar) {
    if (forzar || cercaDelFinal()) chat.scrollTop = chat.scrollHeight;
  }
  function actualizarVacio() {
    vacio.hidden = chat.querySelector('.row') !== null;
  }
  function toast(texto) {
    toastEl.textContent = texto;
    toastEl.hidden = false;
    clearTimeout(timerToast);
    timerToast = setTimeout(function () { toastEl.hidden = true; }, 3500);
  }
  SP.toast = toast;

  // La primera vez que se usa el micrófono se quita la conversación
  // de ejemplo y se marca el inicio de la consulta en vivo.
  function iniciarConsultaEnVivo() {
    if (consultaEnVivo) return;
    chat.querySelectorAll('[data-ejemplo]').forEach(function (n) { n.remove(); });
    var separador = document.createElement('p');
    separador.className = 'chat-divider';
    separador.textContent = 'Consulta en vivo · ' + hora();
    chat.appendChild(separador);
    consultaEnVivo = true;
  }

  /* ---------- API del historial ---------- */
  SP.chat = {
    // Crea una burbuja del profesional que se irá llenando mientras habla.
    nuevaBurbujaVoz: function () {
      iniciarConsultaEnVivo();
      var fila = plantillaVoz.content.firstElementChild.cloneNode(true);
      chat.appendChild(fila);
      actualizarVacio();
      bajar(true);
      return fila;
    },

    // Texto parcial (todavía se está reconociendo).
    escribir: function (fila, texto) {
      fila.querySelector('p').textContent = texto;
      bajar();
    },

    // Texto final: fija la hora y muestra la confianza del reconocimiento.
    confirmar: function (fila, texto, confianza) {
      var burbuja = fila.querySelector('.bubble');
      texto = texto.trim();
      texto = texto.charAt(0).toUpperCase() + texto.slice(1);
      burbuja.classList.remove('is-live');
      fila.querySelector('p').textContent = texto;
      fila.querySelector('time').textContent = hora();

      // Chrome entrega la confianza entre 0 y 1; 0 significa "sin dato".
      if (typeof confianza === 'number' && confianza > 0) {
        var pct = Math.round(confianza * 100);
        var etiqueta = document.createElement('span');
        etiqueta.className = 'conf';
        etiqueta.textContent = 'Confianza ' + pct + '%';
        burbuja.querySelector('.bubble__meta').appendChild(etiqueta);

        if (confianza < UMBRAL_CONFIANZA) {
          burbuja.classList.add('is-low');
          var aviso = document.createElement('p');
          aviso.className = 'bubble__warn';
          aviso.appendChild(icono('alert'));
          aviso.appendChild(document.createTextNode('Confianza baja. Repite la indicación para confirmar.'));
          burbuja.appendChild(aviso);
        }
      }
      bajar();
      return texto;
    },

    descartar: function (fila) {
      fila.remove();
      actualizarVacio();
    },

    borrarTodo: function () {
      chat.querySelectorAll('.row, .chat-divider').forEach(function (n) { n.remove(); });
      consultaEnVivo = false;
      actualizarVacio();
    }
  };

  /* ---------- Vista profesional / paciente (RF-03) ---------- */
  function aplicarVista(vista) {
    var paciente = vista === 'paciente';
    app.classList.toggle('is-paciente', paciente);
    document.getElementById(paciente ? 'vista-pac' : 'vista-pro').checked = true;
  }
  document.querySelectorAll('input[name="vista"]').forEach(function (r) {
    r.addEventListener('change', function () { aplicarVista(r.value); });
  });
  SP.aplicarVista = aplicarVista;

  /* ---------- Ingreso (interfaz de RF-01 y RF-02) ---------- */
  var formIngreso = document.getElementById('login-form');
  formIngreso.addEventListener('submit', function (e) {
    e.preventDefault();
    var rol = formIngreso.querySelector('input[name="rol"]:checked').value;
    aplicarVista(rol);
    location.hash = 'consulta';
    toast(rol === 'paciente' ? 'Ingresaste como paciente.' : 'Ingresaste como profesional de salud.');
  });

  /* ---------- Finalizar consulta (RF-14) ---------- */
  var dialogo = document.getElementById('end-dialog');
  function finalizar() {
    document.dispatchEvent(new CustomEvent('sp:finalizar'));
    SP.chat.borrarTodo();
    toast('Consulta finalizada. El historial se borró.');
  }
  document.getElementById('end-btn').addEventListener('click', function () {
    if (typeof dialogo.showModal === 'function') {
      dialogo.returnValue = '';
      dialogo.showModal();
    } else {
      finalizar();
    }
  });
  dialogo.addEventListener('close', function () {
    if (dialogo.returnValue === 'finalizar') finalizar();
  });

  actualizarVacio();
})();
