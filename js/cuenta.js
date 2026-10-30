/* ==========================================================
   SeñaPuente · cuenta.js
   Cuentas de usuario con Firebase (RF-01, RF-02, RF-03):
   - Registro con nombre, correo, contraseña, rol y autorización
     de tratamiento de datos (Ley 1581 de 2012).
   - Inicio de sesión con correo y contraseña, recuperar
     contraseña y cerrar sesión.
   - El perfil (nombre y rol) se guarda en Firestore, en
     usuarios/{uid}. La conversación NUNCA se guarda.
   - La consulta solo se abre con sesión iniciada; el rol de la
     cuenta decide la vista inicial.
   - La sesión dura lo que dure la pestaña (equipos compartidos
     en el consultorio).

   Usa el SDK "compat" de Firebase con scripts clásicos, igual
   que el resto del proyecto.
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SenaPuente;
  var $ = function (id) { return document.getElementById(id); };

  var VERSION_AUTORIZACION = '1.0';
  var ROLES = { profesional: 'Profesional de salud', paciente: 'Paciente' };

  var cfg = SP.firebaseConfig || {};
  var configurado = !!(cfg.apiKey && cfg.apiKey !== 'PEGA_AQUI' && cfg.projectId);
  var hayLibreria = !!(window.firebase && firebase.initializeApp && firebase.auth && firebase.firestore);

  // cargando | sin-sesion | con-sesion | desactivado (modo demostración) | error
  var estado = 'cargando';
  var perfil = null;        // { nombre, rol }
  var pendiente = '';       // vista a la que se quería ir antes de iniciar sesión
  var registrando = false;  // evita leer el perfil antes de crearlo
  var errorGeneral = '';    // error que debe seguir visible aunque cambie el estado
  var auth = null, db = null;

  /* ---------- Mensajes de error en español ---------- */
  var ERRORES = {
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/invalid-login-credentials': 'El correo o la contraseña no son correctos.',
    'auth/wrong-password': 'El correo o la contraseña no son correctos.',
    'auth/user-not-found': 'El correo o la contraseña no son correctos.',
    'auth/invalid-email': 'Escribe un correo electrónico válido.',
    'auth/missing-password': 'Escribe tu contraseña.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese correo. Inicia sesión.',
    'auth/weak-password': 'La contraseña es muy débil. Usa al menos 8 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
    'auth/network-request-failed': 'No hay conexión con el servidor. Revisa tu internet.',
    'auth/user-disabled': 'Esta cuenta está desactivada.',
    'auth/operation-not-allowed': 'El registro con correo no está activado en Firebase.',
    'auth/unauthorized-domain': 'Este sitio no está autorizado en Firebase (Dominios autorizados).',
    'permission-denied': 'Firebase rechazó la operación. Revisa las reglas de Firestore.',
    'unavailable': 'No hay conexión con la base de datos. Revisa tu internet.'
  };
  function mensajeError(err) {
    var codigo = err && err.code ? String(err.code) : '';
    return ERRORES[codigo] || ERRORES[codigo.replace(/^firestore\//, '')] ||
      ('Ocurrió un error inesperado' + (codigo ? ' (' + codigo + ')' : '') + '. Inténtalo de nuevo.');
  }

  /* ---------- Elementos ---------- */
  var aviso = $('auth-aviso'), avisoTexto = $('auth-aviso-texto');
  var tabs = document.querySelectorAll('[data-auth-tab]');
  var formIngreso = $('login-form'), formRegistro = $('registro-form');
  var errIngreso = $('login-error'), errRegistro = $('reg-error');
  var tarjetaSesion = $('auth-sesion'), tarjetaForms = $('auth-forms');
  var cuentaCab = $('account'), linkIngresar = $('nav-ingresar');

  function mostrarAviso(texto, tipo) {
    avisoTexto.textContent = texto || '';
    aviso.hidden = !texto;
    aviso.classList.toggle('notice--soft', tipo !== 'error');
  }
  function fallar(texto) {
    errorGeneral = texto;
    mostrarAviso(texto, 'error');
  }
  function mostrarError(el, texto) {
    el.textContent = texto || '';
    el.hidden = !texto;
  }
  function ocupado(form, si, texto) {
    var b = form.querySelector('button[type="submit"]');
    if (!b.dataset.texto) b.dataset.texto = b.lastChild.textContent;
    b.disabled = si;
    b.lastChild.textContent = si ? texto : b.dataset.texto;
  }

  /* ---------- Pestañas Iniciar sesión / Crear cuenta ---------- */
  function elegirPestana(nombre) {
    tabs.forEach(function (t) {
      var activa = t.dataset.authTab === nombre;
      t.setAttribute('aria-selected', String(activa));
      t.tabIndex = activa ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !activa;
    });
    mostrarError(errIngreso, '');
    mostrarError(errRegistro, '');
    if (estado !== 'error') errorGeneral = '';
    pintar();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { elegirPestana(t.dataset.authTab); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var otra = tabs[(i + 1) % tabs.length];
      elegirPestana(otra.dataset.authTab);
      otra.focus();
    });
  });

  /* ---------- Cabecera y vista Ingresar según el estado ---------- */
  function primerNombre(nombre) { return String(nombre || '').trim().split(/\s+/)[0]; }

  function pintar() {
    var conSesion = estado === 'con-sesion';
    cuentaCab.hidden = !conSesion;
    linkIngresar.hidden = conSesion;
    tarjetaSesion.hidden = !conSesion;
    tarjetaForms.hidden = conSesion;

    if (conSesion) {
      $('account-nombre').textContent = primerNombre(perfil.nombre);
      $('account-rol').textContent = ROLES[perfil.rol] || '';
      $('sesion-nombre').textContent = perfil.nombre;
      $('sesion-rol').textContent = ROLES[perfil.rol] || '';
    }

    var desactivar = estado === 'cargando' || estado === 'error' || estado === 'desactivado';
    [formIngreso, formRegistro].forEach(function (f) {
      f.querySelectorAll('input, button').forEach(function (el) { el.disabled = desactivar; });
    });

    if (errorGeneral) {
      mostrarAviso(errorGeneral, 'error');
    } else if (estado === 'desactivado') {
      mostrarAviso('Las cuentas aún no están configuradas (falta pegar los datos de Firebase en js/firebase-config.js). Por ahora puedes entrar a la consulta sin iniciar sesión.');
    } else if (estado === 'cargando') {
      mostrarAviso('Verificando tu sesión…');
    } else if (estado === 'sin-sesion' && pendiente === 'consulta') {
      mostrarAviso('Inicia sesión o crea una cuenta para empezar la consulta.');
    } else {
      mostrarAviso('');
    }
  }

  function cambiarEstado(nuevo) {
    var antes = estado;
    estado = nuevo;
    pintar();
    document.dispatchEvent(new CustomEvent('sp:cuenta', { detail: { estado: estado, perfil: perfil } }));

    // Al iniciar sesión, se sigue a donde se quería ir (o a la consulta).
    var enIngresar = (location.hash || '#inicio') === '#ingresar';
    if (nuevo === 'con-sesion' && antes !== 'con-sesion') {
      SP.aplicarVista(perfil.rol); // RF-03: la vista inicial depende del rol
      if (enIngresar && (pendiente || antes !== 'cargando')) {
        location.hash = pendiente || 'consulta';
      }
      pendiente = '';
    }
    // Si se cierra la sesión dentro de la consulta, se vuelve a Ingresar.
    if (nuevo === 'sin-sesion' && location.hash === '#consulta') location.hash = 'ingresar';
  }

  /* ---------- API usada por app.js ---------- */
  SP.cuenta = {
    estado: function () { return estado; },
    perfil: function () { return perfil; },
    // La consulta exige sesión (RF-02), salvo en modo demostración.
    puedeVer: function (vista) {
      if (vista !== 'consulta') return true;
      return estado === 'con-sesion' || estado === 'desactivado';
    },
    recordar: function (vista) { pendiente = vista; pintar(); }
  };

  /* ---------- Sin Firebase: modo demostración o error ---------- */
  if (!configurado) {
    estado = 'desactivado';
    pintar();
    return;
  }
  if (!hayLibreria) {
    estado = 'error';
    errorGeneral = 'No se pudo cargar Firebase. Revisa tu conexión a internet y recarga la página.';
    pintar();
    return;
  }

  /* ---------- Firebase ---------- */
  firebase.initializeApp(cfg);
  auth = firebase.auth();
  db = firebase.firestore();
  auth.languageCode = 'es';

  var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (SP.usarEmuladores && local) {
    auth.useEmulator('http://127.0.0.1:9099');
    db.useEmulator('127.0.0.1', 8080);
  }

  // La sesión se borra al cerrar la pestaña.
  var listo = auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(function () {});

  function perfilRef(uid) { return db.collection('usuarios').doc(uid); }

  auth.onAuthStateChanged(function (u) {
    if (registrando) return; // registrar() termina el proceso
    if (!u) {
      perfil = null;
      cambiarEstado('sin-sesion');
      return;
    }
    perfilRef(u.uid).get().then(function (doc) {
      if (!doc.exists) {
        // Cuenta sin perfil (registro incompleto): no se deja entrar.
        fallar('Tu cuenta no tiene un perfil completo. Escribe al equipo del proyecto para revisarla.');
        return auth.signOut();
      }
      var d = doc.data();
      perfil = { nombre: d.nombre, rol: d.rol };
      cambiarEstado('con-sesion');
    }).catch(function (err) {
      fallar('No se pudo leer tu perfil. ' + mensajeError(err));
      auth.signOut();
    });
  });

  /* ---------- Iniciar sesión (RF-02) ---------- */
  formIngreso.addEventListener('submit', function (e) {
    e.preventDefault();
    var correo = $('login-email').value.trim();
    var clave = $('login-pass').value;
    if (!correo || !clave) { mostrarError(errIngreso, 'Escribe tu correo y tu contraseña.'); return; }

    mostrarError(errIngreso, '');
    errorGeneral = '';
    mostrarAviso('');
    ocupado(formIngreso, true, 'Ingresando…');
    listo.then(function () {
      return auth.signInWithEmailAndPassword(correo, clave);
    }).then(function () {
      formIngreso.reset();
    }).catch(function (err) {
      mostrarError(errIngreso, mensajeError(err));
    }).then(function () {
      ocupado(formIngreso, false);
    });
  });

  /* ---------- Recuperar contraseña ---------- */
  $('login-olvido').addEventListener('click', function () {
    var correo = $('login-email').value.trim();
    if (!correo) {
      mostrarError(errIngreso, 'Escribe tu correo arriba y vuelve a tocar «¿Olvidaste tu contraseña?».');
      $('login-email').focus();
      return;
    }
    mostrarError(errIngreso, '');
    auth.sendPasswordResetEmail(correo).then(function () {
      // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
      mostrarAviso('Si ese correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva.');
    }).catch(function (err) {
      if (err && err.code === 'auth/user-not-found') {
        mostrarAviso('Si ese correo tiene una cuenta, te enviamos un enlace para crear una contraseña nueva.');
      } else {
        mostrarError(errIngreso, mensajeError(err));
      }
    });
  });

  /* ---------- Registro (RF-01) ---------- */
  formRegistro.addEventListener('submit', function (e) {
    e.preventDefault();
    var rolEl = formRegistro.querySelector('input[name="rol"]:checked');
    var nombre = $('reg-nombre').value.trim().replace(/\s+/g, ' ');
    var correo = $('reg-email').value.trim();
    var clave = $('reg-pass').value;
    var clave2 = $('reg-pass2').value;

    var problema =
      !rolEl ? 'Elige si eres profesional de salud o paciente.' :
      nombre.length < 3 ? 'Escribe tu nombre completo.' :
      nombre.length > 100 ? 'El nombre es demasiado largo.' :
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? 'Escribe un correo electrónico válido.' :
      clave.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.' :
      clave !== clave2 ? 'Las contraseñas no coinciden.' :
      !$('reg-consent').checked ? 'Para crear la cuenta debes autorizar el tratamiento de tus datos.' : '';
    if (problema) { mostrarError(errRegistro, problema); return; }

    var rol = rolEl.value;
    var ahora = firebase.firestore.FieldValue.serverTimestamp();
    mostrarError(errRegistro, '');
    errorGeneral = '';
    mostrarAviso('');
    ocupado(formRegistro, true, 'Creando cuenta…');
    registrando = true;

    listo.then(function () {
      return auth.createUserWithEmailAndPassword(correo, clave);
    }).then(function (cred) {
      var u = cred.user;
      return perfilRef(u.uid).set({
        nombre: nombre,
        rol: rol,
        consentimiento: { aceptado: true, version: VERSION_AUTORIZACION, fecha: ahora },
        creado: ahora
      }).then(function () {
        return u.updateProfile({ displayName: nombre }).catch(function () {});
      }).catch(function (err) {
        // Si no se pudo guardar el perfil, se borra la cuenta recién creada.
        return u.delete().catch(function () {}).then(function () { throw err; });
      });
    }).then(function () {
      registrando = false;
      perfil = { nombre: nombre, rol: rol };
      formRegistro.reset();
      if (SP.toast) SP.toast('Cuenta creada. ¡Bienvenido, ' + primerNombre(nombre) + '!');
      cambiarEstado('con-sesion');
    }).catch(function (err) {
      registrando = false;
      mostrarError(errRegistro, mensajeError(err));
    }).then(function () {
      ocupado(formRegistro, false);
    });
  });

  /* ---------- Cerrar sesión ---------- */
  function salir() {
    // Antes de salir se cierra la consulta: se apaga el micrófono y se borra el historial.
    document.dispatchEvent(new CustomEvent('sp:finalizar'));
    if (SP.chat) SP.chat.borrarTodo();
    auth.signOut().then(function () {
      if (SP.toast) SP.toast('Cerraste sesión. El historial de la consulta se borró.');
    });
  }
  document.querySelectorAll('[data-salir]').forEach(function (b) { b.addEventListener('click', salir); });

  pintar();
})();
