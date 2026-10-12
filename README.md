# madialeva.github.io

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-desplegado-brightgreen)](https://madialeva.github.io)
[![Xantar](https://img.shields.io/badge/juego-Xantar-orange)](https://madialeva.github.io/js/xantar/)
[![ES2022](https://img.shields.io/badge/JavaScript-ES2022-yellow)](#)

Sitio web personal desplegado en **GitHub Pages**. Desde la portada se juega a
**Xantar**, un arcade inspirado en BurgerTime que se desarrolla en su propio
repositorio ([madialeva/xantar](https://github.com/madialeva/xantar)).

## Estructura del proyecto

```
.
├── AGENTS.md          ← Instrucciones para agentes de IA
├── deploy.sh          ← Script de despliegue (src/ → docs/)
├── .gitignore
├── src/               ← Código fuente (editado durante el desarrollo)
│   ├── CNAME          ← Dominio personalizado
│   ├── index.html     ← Página principal
│   ├── css/           ← Hojas de estilo (styles.css, fonts.css)
│   ├── js/            ← JavaScript del frontend
│   │   ├── client.js  ← Lógica de la página principal
│   │   ├── vagalume.js ← Texto 3D de la portada (three.js)
│   │   ├── starfield.js ← Animación de estrellas 3D (ya no se usa en la portada)
│   │   ├── 3rd/       ← Librerías externas (three.js)
│   │   └── xantar/    ← Build de Xantar (generado desde su repositorio, no editar)
│   └── fonts/         ← Tipografías (brocha-regular, optimer-bold)
└── docs/              ← Código de producción (generado por deploy.sh, no editar)
```

**Dónde editar**: Todo el desarrollo de la web se hace en `src/`. La carpeta `docs/` se regenera automáticamente con `./deploy.sh` y **no debe editarse manualmente**. Tampoco `src/js/xantar/`: es el build del juego y se sustituye entero desde el repositorio de Xantar.

## Tecnologías

| Tecnología | Uso |
|-----------|-----|
| **HTML5** | Estructura de las páginas |
| **CSS3** | Estilos, animaciones, diseño responsive |
| **JavaScript (ES2022)** | Lógica del frontend y del juego (clases con campos `#privados`) |
| **Xantar** | Juego publicado en `js/xantar/` (TypeScript, Phaser 4 y Vite en su repositorio; aquí solo el build) |
| **three.js r169** | Texto 3D de la página principal (WebGL) |
| **GitHub Pages** | Despliegue desde la carpeta `docs/` |
| **Bash + Node.js** | Script `deploy.sh` que sincroniza archivos y elimina comentarios JS |

## La página principal (index.html)

`index.html` es la landing page del sitio. Contiene:

- **Texto 3D "vagalume"**: Palabra en 3D con reflejo, basada en el ejemplo [webgl_geometry_text](https://threejs.org/examples/webgl_geometry_text.html) de three.js (`js/vagalume.js`). Se gira arrastrando con el ratón o el dedo, y un toque cambia el color de la luz.
- **Detección de navegador**: Identifica Chrome, Firefox, Safari, Edge, Opera e Internet Explorer (`client.js`).
- **Detección de dispositivo**: Determina si es móvil/tablet o PC/escritorio.
- **Eco del backend**: Muestra un mensaje obtenido desde `backend-arume.onrender.com/backend/echo`.
- **Fecha actual**: Formateada según la configuración regional del navegador.

## El juego (Xantar)

El botón **GAME** de la portada abre `js/xantar/index.html` en la misma pestaña.
Es el build web de [Xantar](https://github.com/madialeva/xantar): no se edita
aquí, se genera en su repositorio y se copia con su comando de publicación.

- La pantalla de título espera un clic, un toque o una tecla; entonces pide
  pantalla completa y arranca la música.
- En el menú principal, **SALIR** devuelve a la portada (solo aparece cuando
  el juego se abre desde una página de este sitio).
- Usa rutas relativas, así que funciona en la subruta `js/xantar/` sin
  configuración, y lleva su propia política de seguridad de contenidos (CSP).

### Publicar una versión nueva del juego

En el repositorio de Xantar (por defecto, hermano de este: `../xantar`):

```bash
npm run publish:site
```

El comando compila el juego, sustituye `src/js/xantar/` por el build y ejecuta
`./deploy.sh` aquí. Después se revisa en local y se hace commit y push de este
repositorio como siempre.

## Assets

| Recurso | Ubicación | Descripción |
|---------|-----------|-------------|
| **Brocha Regular** | `src/fonts/brocha-regular/` | Tipografía decorativa |
| **Optimer Bold** | `src/fonts/optimer-bold/` | Fuente *typeface* de three.js para el texto 3D (licencia MgOpen en `LICENSE`) |

Los gráficos, la música y los efectos de Xantar van dentro de su build
(`src/js/xantar/`).

## Desarrollo local

### Requisitos previos

- **Node.js** (necesario para que `deploy.sh` pueda eliminar comentarios de los JS; si no está disponible, la copia de archivos se hace igual pero se salta ese paso)
- Navegador moderno con soporte para ES2022

### Flujo de trabajo

1. Editar los ficheros fuente en `src/`.
2. Ejecutar `./deploy.sh` para generar `docs/`.
3. Hacer commit de los cambios en `src/` **y** en `docs/`.
4. Subir a `main` → GitHub Pages despliega automáticamente desde `docs/`.

Para probar en local la web completa, juego incluido, hay que servirla: Xantar
es un módulo ES y carga su audio con peticiones, cosas que el navegador bloquea
con `file://`.

```bash
python3 -m http.server -d docs   # http://localhost:8000
```

### Despliegue

El script `deploy.sh` realiza dos pasos:

1. **Sincronización**: Copia todo el contenido de `src/` a `docs/` con `rsync`.
2. **Strip de comentarios JS**: Elimina comentarios de los `.js` en `docs/` usando una máquina de estados en Node.js que respeta strings y template literals. Se excluyen `js/3rd/` y `js/xantar/`: las librerías de terceros y el build de Xantar ya vienen minificados y sin comentarios, y el stripper, que no reconoce las expresiones regulares, los rompería.

### Librerías de terceros sin CDN

La portada no depende de ningún servidor externo, para que funcione también abriendo `index.html` con doble clic (`file://`). Firefox y Chrome bloquean ahí los módulos ES y las peticiones `fetch` a ficheros locales, así que todo se carga con `<script>` clásicos:

- `src/js/3rd/three.min.js`: three.js r169 junto con `FontLoader` y `TextGeometry`, empaquetado como IIFE que expone el global `THREE`.
- `src/fonts/optimer-bold/optimer_bold.typeface.js`: la fuente `optimer_bold.typeface.json` de three.js envuelta como `window.FUENTE_OPTIMER_BOLD = {...};`.

Para regenerar `three.min.js` (por ejemplo, al cambiar de versión), en un directorio temporal:

```bash
npm install three@0.169.0 esbuild@0.24.0
printf '%s\n' \
  "export * from 'three';" \
  "export { FontLoader, Font } from 'three/addons/loaders/FontLoader.js';" \
  "export { TextGeometry } from 'three/addons/geometries/TextGeometry.js';" > entrada.js
npx esbuild entrada.js --bundle --format=iife --global-name=THREE --minify \
  --target=es2020 --legal-comments=none --outfile=three.min.js
```

## Para colaboradores

- Las convenciones de código y el flujo de trabajo detallado para agentes de IA están en [`AGENTS.md`](AGENTS.md).
- Todo el código, comentarios y documentación (`.md`) se escribe en **español**.
- Se usa el estándar **ES2022** (campos y métodos privados con `#`).
- El backend de eco está alojado en Render (`backend-arume.onrender.com`) y no forma parte de este repositorio.
