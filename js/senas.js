/* ==========================================================
   SeñaPuente · senas.js
   Guía de señas clínicas (RF-11): datos, tarjetas, búsqueda
   y filtro por tipo. Para añadir una seña, agrega un objeto a
   la lista SENAS. La lista es preliminar: el conjunto final se
   definirá con entrevistas (objetivo específico 1).
   ========================================================== */
(function () {
  'use strict';

  var SENAS = [
    { nombre: 'Sí', tipo: 'Respuestas', uso: 'Respuesta afirmativa a una pregunta del profesional.' },
    { nombre: 'No', tipo: 'Respuestas', uso: 'Respuesta negativa a una pregunta del profesional.' },
    { nombre: 'No entiendo', tipo: 'Respuestas', uso: 'El paciente no comprendió la indicación y necesita que se explique de otra forma.' },
    { nombre: 'Repetir', tipo: 'Respuestas', uso: 'Pide al profesional que repita lo que acaba de decir.' },
    { nombre: 'Dolor', tipo: 'Síntomas', uso: 'Indica que algo duele. Se combina con la parte del cuerpo afectada.' },
    { nombre: 'Fiebre', tipo: 'Síntomas', uso: 'Temperatura alta o sensación de calor en el cuerpo.' },
    { nombre: 'Mareo', tipo: 'Síntomas', uso: 'Sensación de inestabilidad o de que todo da vueltas.' },
    { nombre: 'Náuseas', tipo: 'Síntomas', uso: 'Ganas de vomitar o malestar en el estómago.' },
    { nombre: 'Tos', tipo: 'Síntomas', uso: 'Tos seca o con flema. Puede acompañarse del tiempo que lleva.' },
    { nombre: 'Cabeza', tipo: 'Partes del cuerpo', uso: 'Ubica un síntoma en la cabeza, por ejemplo, dolor de cabeza.' },
    { nombre: 'Estómago', tipo: 'Partes del cuerpo', uso: 'Ubica un síntoma en el estómago o el abdomen.' },
    { nombre: 'Pecho', tipo: 'Partes del cuerpo', uso: 'Ubica un síntoma en el pecho, como dolor o presión.' },
    { nombre: 'Garganta', tipo: 'Partes del cuerpo', uso: 'Ubica un síntoma en la garganta, como dolor o ardor al tragar.' },
    { nombre: 'Ayuda', tipo: 'Necesidades', uso: 'Pide asistencia inmediata.' },
    { nombre: 'Medicamento', tipo: 'Necesidades', uso: 'Pregunta por un medicamento o indica que toma alguno.' }
  ];

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
