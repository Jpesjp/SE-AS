# SeñaPuente

Aplicación web de comunicación bidireccional basada en reconocimiento de voz y procesamiento de video para personas con discapacidad auditiva y profesionales de salud en consultas médicas.

Trabajo de grado · Ingeniería de Software · Universidad Manuela Beltrán · Bogotá, 2026.

**Autores:** Alejandro David Rodríguez Ávila, Juan Pablo Rojas Fernández, Paula Valentina Román Yepes.
**Docente:** Olga Lucía Roa Bohórquez.

> SeñaPuente es un apoyo inicial para un conjunto acotado de expresiones clínicas. No reemplaza a los intérpretes de Lengua de Señas Colombiana (LSC) certificados.

## Cómo abrirlo

Abre `index.html` en **Google Chrome** o **Microsoft Edge**. Para usar el micrófono hace falta internet y aceptar el permiso del navegador.

Si el navegador no deja usar el micrófono al abrir el archivo directamente, sirve la carpeta con un servidor local y entra a `http://localhost:8000`:

```bash
python -m http.server 8000
```

## Estructura

```
senapuente/
├── index.html        Vistas: Inicio, Ingresar, Consulta y Guía de señas
├── css/
│   └── styles.css    Estilos (los colores están en las variables del inicio)
└── js/
    ├── senas.js      Guía de señas clínicas: datos, búsqueda y filtros (RF-11)
    ├── consulta.js   Historial, vista paciente/profesional, ingreso y fin de consulta
    ├── microfono.js  Reconocimiento de voz que escribe en el historial (RF-04 a RF-07)
    └── app.js        Navegación entre vistas, menú móvil y modo claro/oscuro
```

Los scripts son clásicos (no módulos ES) para que funcionen al abrir el archivo sin servidor. Se cargan con `defer` en este orden: `senas.js`, `consulta.js`, `microfono.js`, `app.js`.

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
| RF-10 | Traducción de señas a texto/voz | Pendiente |
| RF-11 | Guía de señas disponibles | Funciona con una lista preliminar |
| RF-12 | Comunicación bidireccional en tiempo real | Parcial: solo el sentido voz → texto |
| RF-13 | Historial de conversación | Funciona durante la sesión |
| RF-14 | Finalización de sesión | Funciona: borra el historial temporal |
| RF-15 | Configuración de accesibilidad | Parcial: modo oscuro y texto ampliado en la vista paciente |

### Notas sobre requerimientos no funcionales

- **RNF-03 (WCAG 2.1 AA):** contraste revisado en modo claro y oscuro, navegación con teclado y etiquetas en todos los controles.
- **RNF-05 (Chrome, Edge y Firefox):** Firefox no incluye la Web Speech API. Para cumplirlo habrá que integrar otro motor de reconocimiento de voz.
- **RNF-06 (mantenibilidad):** cada módulo está en su propio archivo; agregar una seña a la guía es añadir un objeto en `js/senas.js`.

## Próximos pasos

1. Captura de video y reconocimiento de señas con MediaPipe (RF-08 a RF-10).
2. Lectura en voz alta de las señas traducidas con síntesis de voz (TTS).
3. Registro e inicio de sesión con Firebase (RF-01, RF-02).
