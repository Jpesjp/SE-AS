# SeñaPuente

Aplicación web de comunicación bidireccional basada en reconocimiento de voz y procesamiento de video para personas con discapacidad auditiva y profesionales de salud en consultas médicas.

Trabajo de grado · Ingeniería de Software · Universidad Manuela Beltrán · Bogotá, 2026.

**Autores:** Alejandro David Rodríguez Ávila, Juan Pablo Rojas Fernández, Paula Valentina Román Yepes.
**Docente:** Olga Lucía Roa Bohórquez.

> SeñaPuente es un apoyo inicial para un conjunto acotado de expresiones clínicas. No reemplaza a los intérpretes de Lengua de Señas Colombiana (LSC) certificados.

## Cómo abrirlo

El reconocimiento de voz **no funciona si abres `index.html` con doble clic** (dirección `file://`). Usa una de estas opciones en **Google Chrome** o **Microsoft Edge**:

- **GitHub Pages:** en el repositorio, *Settings → Pages → Deploy from a branch → main / (root)*. La página queda en `https://jpesjp.github.io/SE-AS/`.
- **Live Server en VS Code:** instala la extensión *Live Server*, abre la carpeta, clic derecho en `index.html` → *Open with Live Server*.
- **Servidor local con Python:** `python -m http.server 8000` y abre `http://localhost:8000`.

La primera vez, el navegador pedirá permiso para usar el micrófono. Hace falta internet.

## Estructura

```
senapuente/
├── index.html        Vistas: Inicio, Ingresar, Consulta y Guía de señas
├── css/
│   └── styles.css    Estilos (los colores están en las variables del inicio)
└── js/
    ├── vocabulario.js  Vocabulario de señas clínicas (Anexo A): fuente única de datos
    ├── senas.js        Guía de señas: tarjetas, búsqueda y filtros (RF-11)
    ├── consulta.js     Historial, vista paciente/profesional, ingreso y fin de consulta
    ├── ajustes.js      Accesibilidad: tamaño de texto, contraste y voz (RF-15)
    ├── voz.js          Lectura en voz alta de los mensajes del paciente (TTS, RF-10)
    ├── frase.js        Mensaje del paciente: señas → frase en español → historial (RF-10, RF-12)
    ├── microfono.js    Reconocimiento de voz que escribe en el historial (RF-04 a RF-07)
    └── app.js          Navegación entre vistas, menú móvil y modo claro/oscuro
```

Los scripts son clásicos (no módulos ES) para que funcionen al abrir el archivo sin servidor. Se cargan con `defer` en este orden: `vocabulario.js`, `senas.js`, `consulta.js`, `ajustes.js`, `voz.js`, `frase.js`, `microfono.js`, `app.js`.

### Cómo se arma el mensaje del paciente

El paciente toca señas del vocabulario y la aplicación las convierte en una frase con reglas simples (`redactar` en `js/frase.js`), sin inventar contenido. En el historial se muestran la glosa y la frase:

| Señas | Frase |
|---|---|
| DOLOR · CABEZA · FIEBRE | Tengo dolor de cabeza y fiebre. |
| ME-DUELE · ESPALDA · DESDE-HACE 3 DÍA | Me duele la espalda desde hace 3 días. |
| SÍ · DOLOR · PECHO | Sí. Tengo dolor de pecho. |
| REPETIR | ¿Puede repetirlo, por favor? |

La misma bandeja recibirá las señas que reconozca la cámara (`SenaPuente.frase.agregar(id)`), así que el texto y la voz no cambian cuando llegue ese módulo.

Como paciente y profesional usan el mismo equipo, el micrófono se pausa mientras se lee un mensaje en voz alta, para no transcribir el sonido del parlante.

## Estado frente al SRS v1.1

| ID | Requerimiento | Estado en el prototipo |
|---|---|---|
| RF-01 | Registro de usuarios | Interfaz pendiente (se conectará con Firebase) |
| RF-02 | Inicio de sesión | Interfaz lista, sin validar credenciales |
| RF-03 | Selección de rol | Funciona: vista profesional y vista paciente |
| RF-04 | Captura de audio | Funciona |
| RF-05 | Reconocimiento de voz | Funciona (Web Speech API, español) |
| RF-06 | Visualización del texto transcrito | Funciona: el texto aparece en el historial mientras se habla |
| RF-07 | Indicador de confianza | Funciona: se muestra el % y se marca si es menor a 60 % |
| RF-08 | Captura de video | Pendiente |
| RF-09 | Reconocimiento de señas | Pendiente (MediaPipe, OpenCV, TensorFlow) |
| RF-10 | Traducción de señas a texto/voz | Parcial: las señas elegidas con botones se convierten en texto y voz; falta que lleguen desde la cámara |
| RF-11 | Guía de señas disponibles | Funciona con el vocabulario del Anexo A (20 señas) |
| RF-12 | Comunicación bidireccional en tiempo real | Funciona en ambos sentidos: voz → texto y señas (botones) → texto + voz |
| RF-13 | Historial de conversación | Funciona durante la sesión |
| RF-14 | Finalización de sesión | Funciona: borra el historial temporal |
| RF-15 | Configuración de accesibilidad | Funciona: tamaño de texto, contraste alto, lectura en voz alta, velocidad y voz |

### Notas sobre requerimientos no funcionales

- **RNF-03 (WCAG 2.1 AA):** contraste revisado en modo claro y oscuro, navegación con teclado y etiquetas en todos los controles.
- **RNF-05 (Chrome, Edge y Firefox):** Firefox no incluye la Web Speech API. Para cumplirlo habrá que integrar otro motor de reconocimiento de voz.
- **RNF-06 (mantenibilidad):** cada módulo está en su propio archivo; agregar una seña es añadir un objeto en `js/vocabulario.js` y aparece en la guía y en las señas rápidas.

## Próximos pasos

1. Captura de video con la cámara y puntos de la mano con MediaPipe (RF-08).
2. Herramienta para grabar muestras de cada seña y entrenar el modelo.
3. Reconocimiento de señas conectado a la bandeja del paciente (RF-09, RF-10).
4. Registro e inicio de sesión con Firebase (RF-01, RF-02).
