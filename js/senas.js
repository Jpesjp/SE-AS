/* ==========================================================
   SeñaPuente · senas.js
   Guía de señas clínicas (RF-11): tarjetas, búsqueda y filtro
   por tipo. Los datos vienen de vocabulario.js (Anexo A); para
   añadir una seña se edita ese archivo, no este.
   ========================================================== */
(function () {
  'use strict';

  var SENAS = window.SenaPuente.vocabulario.senas;

  var grid = document.getElementById('sign-grid');
  var plantilla = document.getElementById('tpl-sign');
  var info = grid.querySelector('.practice');
  var buscador = document.getElementById('dict-search');
  var botones = document.querySelectorAll('[data-cat]');
  var contador = document.getElementById('dict-count');
  var vacio = document.getElementById('dict-empty');
  var filtro = 'Todas';

  // Quita tildes y mayúsculas para que "nauseas" encuentre "Náuseas".
  function normalizar(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  var tarjetas = SENAS.map(function (s) {
    var t = plantilla.content.firstElementChild.cloneNode(true);
    t.querySelector('h3').textContent = s.nombre;
    t.querySelector('.tag').textContent = s.tipo;
    t.querySelector('p').textContent = s.uso;
    t.dataset.cat = s.tipo;
    t.dataset.texto = normalizar(s.nombre + ' ' + s.tipo + ' ' + s.uso);
    grid.insertBefore(t, info);
    return t;
  });

  function aplicarFiltros() {
    var q = normalizar(buscador.value.trim());
    var visibles = 0;
    tarjetas.forEach(function (t) {
      var ok = (filtro === 'Todas' || t.dataset.cat === filtro) && (!q || t.dataset.texto.indexOf(q) >= 0);
      t.hidden = !ok;
      if (ok) visibles++;
    });
    info.hidden = filtro !== 'Todas' || q !== '';
    vacio.hidden = visibles > 0;
    contador.textContent = visibles === 1 ? '1 seña' : visibles + ' señas';
  }

  botones.forEach(function (b) {
    b.addEventListener('click', function () {
      filtro = b.dataset.cat;
      botones.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      aplicarFiltros();
    });
  });
  buscador.addEventListener('input', aplicarFiltros);

  aplicarFiltros();
})();
