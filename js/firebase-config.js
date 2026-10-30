/* ==========================================================
   SeñaPuente · firebase-config.js
   Datos del proyecto de Firebase (consola de Firebase →
   Configuración del proyecto → Tus apps → app web).

   Estos valores NO son secretos: en una app web siempre quedan
   visibles en el navegador. Lo que protege la información son
   las reglas de Firestore (archivo firestore.rules).

   Mientras apiKey diga "PEGA_AQUI", la app funciona en modo
   demostración: se puede entrar a la consulta sin cuenta.
   ========================================================== */
window.SenaPuente = window.SenaPuente || {};

window.SenaPuente.firebaseConfig = {
  apiKey: 'PEGA_AQUI',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: ''
};

// Solo para pruebas en el computador con los emuladores de Firebase
// (firebase emulators:start). Se ignora fuera de localhost.
window.SenaPuente.usarEmuladores = false;
