/* ==========================================================
   SeñaPuente · frase.js
   Mensaje del paciente (RF-10, RF-12):
   1. El paciente toca señas rápidas (y, en la siguiente capa,
      la cámara agregará las señas reconocidas) → bandeja.
   2. La bandeja se convierte en una frase en español con reglas
      simples (redactar), sin inventar contenido.
   3. "Enviar" la escribe en el historial con su glosa y la lee
      en voz alta para el profesional.

   API para otros módulos: SenaPuente.frase.agregar(id, extra),
   .quitarUltima(), .borrar(), .enviar(origen), .redactar(señas).
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SenaPuente;
  var V = SP.vocabulario;
  var $ = function (id) { return document.getElementById(id); };

  var tray = $('frase-tray');
  var vacia = $('frase-vacia');
  var preview = $('frase-preview');
  var enviarBtn = $('frase-enviar');
  var borrarBtn = $('frase-borrar');
  var rapidas = $('senas-rapidas');

  var senas = []; // [{ id, cantidad?, unidad? }]

  /* ---------- De señas a frase en español ---------- */
  function listaY(items) {
    if (items.length < 2) return items[0] || '';
    return items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1];
  }
  function unicos(items) {
    return items.filter(function (x, i) { return items.indexOf(x) === i; });
  }
  function conArticulo(p) { return p.articulo + ' ' + p.texto; }
  function mayuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  function textoTiempo(s) {
    var u = V.unidades[s.unidad];
    if (!u || !s.cantidad) return '';
    return 'desde hace ' + (s.cantidad === 1 ? u.uno : s.cantidad + ' ' + u.varios);
  }

  // Reglas:
  //   DOLOR + partes          → "tengo dolor de cabeza y de espalda"
  //   síntomas seguidos       → "tengo fiebre, tos y mareo"
  //   ME-DUELE + partes       → "me duele la cabeza" / "me duelen …"
  //   parte suelta            → "es en el pecho"
  //   DESDE-HACE tras malestar→ se une: "tengo fiebre desde hace 2 días"
  //   SÍ / NO / NO-ENTENDER / REPETIR → frase propia
  function redactar(lista) {
    var oraciones = [];
    var sintomas = [];
    var ultimaEsMalestar = false;

    function cerrarSintomas() {
      if (!sintomas.length) return;
      oraciones.push('tengo ' + listaY(unicos(sintomas)));
      sintomas = [];
      ultimaEsMalestar = true;
    }
    function tomarPartes(i) {
      var partes = [];
      while (i + 1 < lista.length) {
        var sig = V.buscar(lista[i + 1].id);
        if (!sig || sig.clase !== 'parte') break;
        partes.push(sig);
        i++;
      }
      return { partes: partes, i: i };
    }

    for (var i = 0; i < lista.length; i++) {
      var s = V.buscar(lista[i].id);
      if (!s) continue;
      var r;

      switch (s.clase) {
        case 'sintoma':
          if (s.id === 'dolor') {
            r = tomarPartes(i); i = r.i;
            sintomas.push(r.partes.length
              ? 'dolor de ' + r.partes.map(function (p) { return p.texto; }).join(' y de ')
              : 'dolor');
          } else {
            sintomas.push(s.texto);
          }
          break;

        case 'me-duele':
          cerrarSintomas();
          r = tomarPartes(i); i = r.i;
          oraciones.push(r.partes.length
            ? (r.partes.length > 1 ? 'me duelen ' : 'me duele ') + listaY(r.partes.map(conArticulo))
            : 'me duele');
          ultimaEsMalestar = true;
          break;

        case 'parte':
          cerrarSintomas();
          r = tomarPartes(i); i = r.i;
          oraciones.push('es en ' + listaY([s].concat(r.partes).map(conArticulo)));
          ultimaEsMalestar = true;
          break;

        case 'tiempo':
          cerrarSintomas();
          var t = textoTiempo(lista[i]);
          if (!t) break;
          if (ultimaEsMalestar && oraciones.length) oraciones[oraciones.length - 1] += ' ' + t;
          else oraciones.push(t);
          ultimaEsMalestar = false;
          break;

        case 'respuesta':
          cerrarSintomas();
          oraciones.push(s.frase);
          ultimaEsMalestar = false;
          break;
      }
    }
    cerrarSintomas();

    return oraciones.map(function (o) {
      o = mayuscula(o);
      return /[.?!]$/.test(o) ? o : o + '.';
    }).join(' ');
  }

  function glosaDe(s) {
    var sena = V.buscar(s.id);
    if (!sena) return '';
    if (sena.clase === 'tiempo' && s.cantidad) return sena.glosa + ' ' + s.cantidad + ' ' + V.unidades[s.unidad].glosa;
    return sena.glosa;
  }
  function etiquetaDe(s) {
    var sena = V.buscar(s.id);
    if (sena.clase === 'tiempo') return mayuscula(textoTiempo(s));
    return sena.nombre;
  }

  /* ---------- Bandeja ---------- */
  function pintar() {
    tray.textContent = '';
    senas.forEach(function (s, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'token';
      b.setAttribute('aria-label', 'Quitar ' + etiquetaDe(s));
      b.appendChild(document.createTextNode(etiquetaDe(s)));
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'ic ic--xs');
      svg.setAttribute('aria-hidden', 'true');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#i-x');
      svg.appendChild(use);
      b.appendChild(svg);
      b.addEventListener('click', function () { quitar(i); });
      li.appendChild(b);
      tray.appendChild(li);
    });

    var texto = redactar(senas);
    var hay = senas.length > 0;
    tray.hidden = !hay;
    vacia.hidden = hay;
    borrarBtn.hidden = !hay;
    preview.hidden = !texto;
    preview.textContent = texto ? '«' + texto + '»' : '';
    enviarBtn.disabled = !texto;
  }

  function agregar(id, extra) {
    if (!V.buscar(id)) return;
    var s = { id: id };
    if (extra) { s.cantidad = extra.cantidad; s.unidad = extra.unidad; }
    senas.push(s);
    pintar();
  }
  function quitar(i) {
    senas.splice(i, 1);
    pintar();
    // Mantiene el foco dentro de la bandeja al quitar con teclado.
    var botones = tray.querySelectorAll('.token');
    if (botones.length) botones[Math.min(i, botones.length - 1)].focus();
    else rapidas.querySelector('.chip').focus();
  }
  function borrar() {
    senas = [];
    pintar();
  }
  function enviar(origen) {
    var texto = redactar(senas);
    if (!texto) return;
    SP.chat.agregarSena({
      glosa: senas.map(glosaDe).join(' · '),
      texto: texto,
      origen: origen || 'botones'
    });
    if (SP.voz) SP.voz.hablar(texto);
    borrar();
  }

  enviarBtn.addEventListener('click', function () { enviar('botones'); });
  borrarBtn.addEventListener('click', function () { borrar(); rapidas.querySelector('.chip').focus(); });
  document.addEventListener('sp:finalizar', borrar);

  /* ---------- Señas rápidas por categoría ---------- */
  V.tipos.forEach(function (tipo, n) {
    var grupo = document.createElement('div');
    grupo.className = 'quick__group';
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-labelledby', 'qg-' + n);
    var titulo = document.createElement('span');
    titulo.className = 'quick__title';
    titulo.id = 'qg-' + n;
    titulo.textContent = tipo;
    var chips = document.createElement('div');
    chips.className = 'chips';

    V.senas.filter(function (s) { return s.tipo === tipo; }).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.sena = s.id;
      b.textContent = s.nombre;
      b.addEventListener('click', function () {
        if (s.clase === 'tiempo') pedirDuracion();
        else agregar(s.id);
      });
      chips.appendChild(b);
    });

    grupo.appendChild(titulo);
    grupo.appendChild(chips);
    rapidas.appendChild(grupo);
  });

  /* ---------- Diálogo "Desde hace…" ---------- */
  var dlg = $('duracion-dialog');
  var valor = $('dur-valor');
  var vista = $('dur-preview');
  var MAX = 30;
  var cantidad = 1;

  function unidad() {
    return document.querySelector('input[name="dur-unidad"]:checked').value;
  }
  function pintarDuracion() {
    valor.textContent = String(cantidad);
    $('dur-menos').disabled = cantidad <= 1;
    $('dur-mas').disabled = cantidad >= MAX;
    vista.textContent = mayuscula(textoTiempo({ cantidad: cantidad, unidad: unidad() }));
  }
  function pedirDuracion() {
    cantidad = 1;
    pintarDuracion();
    if (typeof dlg.showModal === 'function') {
      dlg.returnValue = '';
      dlg.showModal();
    } else {
      agregar('desde-hace', { cantidad: 1, unidad: 'dias' });
    }
  }
  $('dur-menos').addEventListener('click', function () { cantidad = Math.max(1, cantidad - 1); pintarDuracion(); });
  $('dur-mas').addEventListener('click', function () { cantidad = Math.min(MAX, cantidad + 1); pintarDuracion(); });
  document.querySelectorAll('input[name="dur-unidad"]').forEach(function (r) {
    r.addEventListener('change', pintarDuracion);
  });
  dlg.addEventListener('close', function () {
    if (dlg.returnValue === 'agregar') agregar('desde-hace', { cantidad: cantidad, unidad: unidad() });
  });

  SP.frase = {
    agregar: agregar,
    quitarUltima: function () { if (senas.length) quitar(senas.length - 1); },
    borrar: borrar,
    enviar: enviar,
    redactar: redactar
  };

  pintar();
})();
