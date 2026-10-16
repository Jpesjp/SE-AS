/* ==========================================================
   SeñaPuente · app.js
   Navegación entre vistas, menú móvil, tema claro/oscuro.
   Las vistas son: #inicio, #ingresar, #consulta y #senas. Cualquier otro
   enlace con # (por ejemplo #modulos) abre la vista que lo
   contiene y baja hasta esa sección.
   ========================================================== */
(function () {
  'use strict';

  var VISTAS = ['inicio', 'ingresar', 'consulta', 'senas'];
  var TITULOS = {
    inicio: 'SeñaPuente',
    ingresar: 'Ingresar · SeñaPuente',
    consulta: 'Consulta · SeñaPuente',
    senas: 'Guía de señas · SeñaPuente'
  };

  var root = document.documentElement;
  var topbar = document.getElementById('topbar');
  var nav = document.getElementById('site-nav');
  var menuBtn = document.getElementById('menu-btn');
  var themeBtn = document.getElementById('theme-btn');

  /* ---------- Vistas ---------- */
  function mostrarVista(nombre) {
    document.querySelectorAll('[data-view]').forEach(function (v) {
      v.hidden = v.dataset.view !== nombre;
    });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.dataset.nav === nombre) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = TITULOS[nombre];
    document.dispatchEvent(new CustomEvent('sp:vista', { detail: nombre }));
  }

  function subirAlInicio() {
    try { window.scrollTo({ top: 0, behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, 0); }
  }

  function enrutar() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    cerrarMenu();

    if (!id || VISTAS.indexOf(id) >= 0) {
      mostrarVista(id || 'inicio');
      subirAlInicio();
      return;
    }

    var destino = document.getElementById(id);
    if (!destino) { mostrarVista('inicio'); subirAlInicio(); return; }

    var vista = destino.closest('[data-view]');
    if (vista) mostrarVista(vista.dataset.view);
    destino.scrollIntoView({ block: 'start' });
  }

  window.addEventListener('hashchange', enrutar);

  // Si se toca un enlace al mismo # en el que ya estamos, el navegador
  // no dispara "hashchange"; lo resolvemos a mano.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    if (a.getAttribute('href') === location.hash) { e.preventDefault(); enrutar(); }
  });

  /* ---------- Menú móvil ---------- */
  function cerrarMenu() {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menú');
  }
  menuBtn.addEventListener('click', function () {
    var abierto = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', abierto);
    menuBtn.setAttribute('aria-expanded', String(abierto));
    menuBtn.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });

  /* ---------- Sombra del encabezado al hacer scroll ---------- */
  window.addEventListener('scroll', function () {
    topbar.classList.toggle('is-scrolled', window.scrollY > 4);
  }, { passive: true });

  /* ---------- Tema claro / oscuro ---------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function temaActual() {
    return root.dataset.theme || (mq && mq.matches ? 'dark' : 'light');
  }
  function pintarBotonTema() {
    var oscuro = temaActual() === 'dark';
    themeBtn.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeBtn.querySelector('use').setAttribute('href', oscuro ? '#i-sun' : '#i-moon');
  }
  try {
    var guardado = localStorage.getItem('sp-tema');
    if (guardado === 'dark' || guardado === 'light') root.dataset.theme = guardado;
  } catch (e) { /* sin almacenamiento: se usa el tema del sistema */ }

  themeBtn.addEventListener('click', function () {
    var siguiente = temaActual() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = siguiente;
    try { localStorage.setItem('sp-tema', siguiente); } catch (e) {}
    pintarBotonTema();
    document.dispatchEvent(new CustomEvent('sp:tema'));
  });
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () {
      pintarBotonTema();
      document.dispatchEvent(new CustomEvent('sp:tema'));
    });
  }

  /* ---------- Año del pie de página ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Arranque ---------- */
  pintarBotonTema();
  enrutar();
})();
