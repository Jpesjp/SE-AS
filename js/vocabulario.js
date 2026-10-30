/* ==========================================================
   SeñaPuente · vocabulario.js
   Fuente única del vocabulario de señas clínicas (Anexo A de la
   propuesta). La usan la guía de señas, las señas rápidas del
   paciente y, más adelante, el reconocimiento por cámara.

   Para añadir una seña (RNF-06) basta con agregar un objeto a la
   lista. Campos:
     id       identificador único, sin tildes ni espacios. Es la
              etiqueta que usará el modelo de reconocimiento.
     nombre   texto del botón y de la guía.
     glosa    cómo se escribe la seña en mayúsculas (convención LSC).
     tipo     categoría del Anexo A.
     clase    cómo entra en la frase en español:
                sintoma   → "Tengo …"
                parte     → "dolor de …" / "Me duele …"
                me-duele  → "Me duele …"
                respuesta → frase propia (campo "frase")
                tiempo    → "desde hace N días/horas"
     texto    palabra que se usa dentro de la frase.
     articulo artículo de las partes del cuerpo (la cabeza, el pecho).
     uso      explicación corta para la guía.
   ========================================================== */
(function () {
  'use strict';

  var SP = window.SenaPuente = window.SenaPuente || {};

  var TIPOS = ['Síntomas', 'Partes del cuerpo', 'Expresiones del paciente'];

  var SENAS = [
    // Síntomas
    { id: 'dolor', nombre: 'Dolor', glosa: 'DOLOR', tipo: 'Síntomas', clase: 'sintoma', texto: 'dolor',
      uso: 'Indica que algo duele. Si después se señala una parte del cuerpo, se entiende «dolor de…».' },
    { id: 'mareo', nombre: 'Mareo', glosa: 'MAREO', tipo: 'Síntomas', clase: 'sintoma', texto: 'mareo',
      uso: 'Sensación de inestabilidad o de que todo da vueltas.' },
    { id: 'migrana', nombre: 'Migraña', glosa: 'MIGRAÑA', tipo: 'Síntomas', clase: 'sintoma', texto: 'migraña',
      uso: 'Dolor de cabeza fuerte, a veces con molestia a la luz o al ruido.' },
    { id: 'dolor-cabeza', nombre: 'Dolor de cabeza', glosa: 'DOLOR-CABEZA', tipo: 'Síntomas', clase: 'sintoma', texto: 'dolor de cabeza',
      uso: 'Dolor en la cabeza expresado con una sola seña.' },
    { id: 'fiebre', nombre: 'Fiebre', glosa: 'FIEBRE', tipo: 'Síntomas', clase: 'sintoma', texto: 'fiebre',
      uso: 'Temperatura alta o sensación de calor en el cuerpo.' },
    { id: 'nauseas', nombre: 'Náuseas', glosa: 'NÁUSEAS', tipo: 'Síntomas', clase: 'sintoma', texto: 'náuseas',
      uso: 'Ganas de vomitar o malestar en el estómago.' },
    { id: 'vomito', nombre: 'Vómito', glosa: 'VÓMITO', tipo: 'Síntomas', clase: 'sintoma', texto: 'vómito',
      uso: 'El paciente ha vomitado.' },
    { id: 'tos', nombre: 'Tos', glosa: 'TOS', tipo: 'Síntomas', clase: 'sintoma', texto: 'tos',
      uso: 'Tos seca o con flema. Puede acompañarse del tiempo que lleva.' },

    // Partes del cuerpo
    { id: 'cabeza', nombre: 'Cabeza', glosa: 'CABEZA', tipo: 'Partes del cuerpo', clase: 'parte', texto: 'cabeza', articulo: 'la',
      uso: 'Ubica un síntoma en la cabeza.' },
    { id: 'estomago', nombre: 'Estómago', glosa: 'ESTÓMAGO', tipo: 'Partes del cuerpo', clase: 'parte', texto: 'estómago', articulo: 'el',
      uso: 'Ubica un síntoma en el estómago o el abdomen.' },
    { id: 'espalda', nombre: 'Espalda', glosa: 'ESPALDA', tipo: 'Partes del cuerpo', clase: 'parte', texto: 'espalda', articulo: 'la',
      uso: 'Ubica un síntoma en la espalda.' },
    { id: 'pecho', nombre: 'Pecho', glosa: 'PECHO', tipo: 'Partes del cuerpo', clase: 'parte', texto: 'pecho', articulo: 'el',
      uso: 'Ubica un síntoma en el pecho, como dolor o presión.' },
    { id: 'garganta', nombre: 'Garganta', glosa: 'GARGANTA', tipo: 'Partes del cuerpo', clase: 'parte', texto: 'garganta', articulo: 'la',
      uso: 'Ubica un síntoma en la garganta, como dolor o ardor al tragar.' },
    { id: 'oido', nombre: 'Oído', glosa: 'OÍDO', tipo: 'Partes del cuerpo', clase: 'parte', texto: 'oído', articulo: 'el',
      uso: 'Ubica un síntoma en el oído.' },

    // Expresiones del paciente
    { id: 'me-duele', nombre: 'Me duele', glosa: 'ME-DUELE', tipo: 'Expresiones del paciente', clase: 'me-duele',
      uso: 'Se combina con una parte del cuerpo: «Me duele la espalda».' },
    { id: 'desde-hace', nombre: 'Desde hace…', glosa: 'DESDE-HACE', tipo: 'Expresiones del paciente', clase: 'tiempo',
      uso: 'Indica cuánto tiempo lleva el síntoma, en horas o días.' },
    { id: 'si', nombre: 'Sí', glosa: 'SÍ', tipo: 'Expresiones del paciente', clase: 'respuesta', frase: 'Sí',
      uso: 'Respuesta afirmativa a una pregunta del profesional.' },
    { id: 'no', nombre: 'No', glosa: 'NO', tipo: 'Expresiones del paciente', clase: 'respuesta', frase: 'No',
      uso: 'Respuesta negativa a una pregunta del profesional.' },
    { id: 'no-entiendo', nombre: 'No entiendo', glosa: 'NO-ENTENDER', tipo: 'Expresiones del paciente', clase: 'respuesta', frase: 'No entiendo',
      uso: 'El paciente no comprendió la indicación y necesita que se explique de otra forma.' },
    { id: 'repetir', nombre: 'Repetir', glosa: 'REPETIR', tipo: 'Expresiones del paciente', clase: 'respuesta', frase: '¿Puede repetirlo, por favor?',
      uso: 'Pide al profesional que repita lo que acaba de decir.' }
  ];

  // Unidades para «Desde hace…».
  var UNIDADES = {
    horas: { uno: 'una hora', varios: 'horas', glosa: 'HORA' },
    dias: { uno: 'un día', varios: 'días', glosa: 'DÍA' }
  };

  var porId = {};
  SENAS.forEach(function (s) { porId[s.id] = s; });

  SP.vocabulario = {
    tipos: TIPOS,
    senas: SENAS,
    unidades: UNIDADES,
    buscar: function (id) { return porId[id] || null; }
  };
})();
