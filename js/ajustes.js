/* ==========================================================
   SeñaPuente · ajustes.js
   Configuración de accesibilidad (RF-15): tamaño del texto,
   contraste y lectura en voz alta (activar, velocidad y voz).
   Los valores se guardan en este navegador (localStorage) y se
   aplican como atributos en <html>: data-texto y data-contraste.
   Otros módulos leen los valores con SenaPuente.ajustes.get().
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SenaPuente;
  var root = document.documentElement;
  var CLAVE = 'sp-ajustes';

  var DEFECTO = {
    texto: 'normal',        // normal | grande | muy-grande
    contraste: 'normal',    // normal | alto
    vozActiva: true,        // leer en voz alta los mensajes del paciente
    vozVelocidad: 1,        // 0.5 a 1.5
    vozNombre: ''           // '' = elegir automáticamente una voz en español
  };

  var valores = {};
  Object.keys(DEFECTO).forEach(function (k) { valores[k] = DEFECTO[k]; });

  try {
    var guardado = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    Object.keys(DEFECTO).forEach(function (k) {
      if (guardado && typeof guardado[k] === typeof DEFECTO[k]) valores[k] = guardado[k];
    });
  } catch (e) { /* sin almacenamiento: se usan los valores por defecto */ }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(valores)); } catch (e) {}
  }

  function aplicar() {
    root.dataset.texto = valores.texto;
    root.dataset.contraste = valores.contraste;
  }

  SP.ajustes = {
    get: function (k) { return valores[k]; },
    set: function (k, v) {
      if (!(k in DEFECTO) || valores[k] === v) return;
      valores[k] = v;
      guardar();
      aplicar();
      document.dispatchEvent(new CustomEvent('sp:ajustes', { detail: { clave: k, valor: v } }));
    }
  };

  aplicar();

  /* ---------- Diálogo de accesibilidad ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var dialogo = $('a11y-dialog');
  var boton = $('a11y-btn');
  var vozCheck = $('a11y-voz');
  var vel = $('a11y-vel');
  var velOut = $('a11y-vel-out');
  var vozSelect = $('a11y-voz-nombre');
  var probar = $('a11y-probar');
  var grupoVoz = $('a11y-voz-grupo');
  var sinVoz = $('a11y-sin-voz');

  function textoVelocidad(v) {
    return v.toFixed(1).replace('.', ',') + '×';
  }

  function llenarVoces() {
    var voces = (SP.voz && SP.voz.voces()) || [];
    var actual = valores.vozNombre;
    while (vozSelect.options.length > 1) vozSelect.remove(1);
    voces.forEach(function (v) {
      var op = document.createElement('option');
      op.value = v.name;
      op.textContent = v.name + ' (' + v.lang + ')';
      vozSelect.appendChild(op);
    });
    vozSelect.value = voces.some(function (v) { return v.name === actual; }) ? actual : '';
  }

  function pintar() {
    var t = document.querySelector('input[name="a11y-texto"][value="' + valores.texto + '"]');
    var c = document.querySelector('input[name="a11y-contraste"][value="' + valores.contraste + '"]');
    if (t) t.checked = true;
    if (c) c.checked = true;
    vozCheck.checked = valores.vozActiva;
    vel.value = String(valores.vozVelocidad);
    velOut.textContent = textoVelocidad(valores.vozVelocidad);

    var hayVoz = !!(SP.voz && SP.voz.disponible);
    grupoVoz.hidden = !hayVoz;
    sinVoz.hidden = hayVoz;
    if (hayVoz) llenarVoces();
  }

  document.querySelectorAll('input[name="a11y-texto"]').forEach(function (r) {
    r.addEventListener('change', function () { SP.ajustes.set('texto', r.value); });
  });
  document.querySelectorAll('input[name="a11y-contraste"]').forEach(function (r) {
    r.addEventListener('change', function () { SP.ajustes.set('contraste', r.value); });
  });
  vozCheck.addEventListener('change', function () {
    SP.ajustes.set('vozActiva', vozCheck.checked);
    if (!vozCheck.checked && SP.voz) SP.voz.callar();
  });
  vel.addEventListener('input', function () {
    var v = Math.round(parseFloat(vel.value) * 10) / 10;
    velOut.textContent = textoVelocidad(v);
    SP.ajustes.set('vozVelocidad', v);
  });
  vozSelect.addEventListener('change', function () { SP.ajustes.set('vozNombre', vozSelect.value); });
  probar.addEventListener('click', function () {
    if (SP.voz) SP.voz.hablar('Hola. Así se escucharán los mensajes del paciente.', { forzar: true });
  });

  // Las voces del navegador pueden cargar después de abrir la página.
  document.addEventListener('sp:voces', function () { if (dialogo.open) llenarVoces(); });

  boton.addEventListener('click', function () {
    pintar();
    if (typeof dialogo.showModal === 'function') dialogo.showModal();
  });
})();
