/* ==========================================================
   SeñaPuente · firebase-config.js
   Datos del proyecto de Firebase (consola de Firebase →
   Configuración del proyecto → Tus apps → app web).

   Estos valores NO son secretos: en una app web siempre quedan
   visibles en el navegador. Lo que protege la información son
   las reglas de Firestore (archivo firestore.rules).

   Si apiKey dice "PEGA_AQUI", la app funciona en modo
   demostración: se puede entrar a la consulta sin cuenta.
   ========================================================== */
window.SenaPuente = window.SenaPuente || {};

window.SenaPuente.firebaseConfig = {
  apiKey: 'AIzaSyAyPxonpzTKFhSPUsvEZ-e0cM81WWQupTo',
  authDomain: 'senapuente-b2cc4.firebaseapp.com',
  projectId: 'senapuente-b2cc4',
  storageBucket: 'senapuente-b2cc4.firebasestorage.app',
  messagingSenderId: '432253660682',
  appId: '1:432253660682:web:53d8268bfe275e67d079f3'
  // measurementId no se incluye: la app no carga Google Analytics.
};

// Solo para pruebas en el computador con los emuladores de Firebase
// (firebase emulators:start). Se ignora fuera de localhost.
window.SenaPuente.usarEmuladores = false;