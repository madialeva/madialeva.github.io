# AGENTS.md — Instrucciones para agentes de IA

## Resumen del proyecto

Este es el sitio web personal desplegado en **GitHub Pages** (https://madialeva.github.io, repositorio `madialeva/madialeva.github.io`). El código fuente está en `src/` y la versión de producción (desplegada) se genera en `docs/` mediante el script `deploy.sh`. El botón GAME de la portada abre el juego **Xantar**, que se desarrolla en su propio repositorio (`madialeva/xantar`) y se publica aquí ya compilado en `src/js/xantar/`.

## Convenio de idioma

- **Todos los ficheros `.md` del proyecto deben estar escritos en español.**
- Se exceptúan las palabras reservadas necesarias en ficheros de especificaciones técnicas, skills, y otros ficheros usados por agentes de IA que requieran términos en inglés por compatibilidad (ej: nombres de herramientas, flags de comandos, claves de configuración, etc.).

## Estructura del proyecto

```
.
├── AGENTS.md          ← Este fichero (instrucciones para IA)
├── deploy.sh          ← Script de despliegue: copia src/ → docs/ y elimina comentarios JS
├── .gitignore
├── src/               ← Código fuente (editado durante el desarrollo)
│   ├── CNAME          ← Dominio personalizado para GitHub Pages
│   ├── index.html     ← Página principal (portada con el texto 3D y el botón GAME)
│   ├── css/           ← Hojas de estilo
│   ├── js/            ← JavaScript del frontend (cliente, portada, librerías en 3rd/)
│   │   └── xantar/    ← Juego Xantar compilado (NO EDITAR A MANO — se genera desde su repositorio)
│   └── fonts/         ← Tipografías
└── docs/              ← Código desplegado (NO EDITAR A MANO — se genera con deploy.sh)
```

## Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript (ES2022+)
- **Portada**: three.js (texto 3D), sin dependencias de CDN
- **Juego**: Xantar (TypeScript, Phaser 4 y Vite en su propio repositorio); aquí solo está su build
- **Despliegue**: GitHub Pages (carpeta `docs/`)
- **Scripting**: Bash (`deploy.sh`), Node.js (para el stripper de comentarios JS)

## Comandos disponibles

| Comando       | Descripción                                          |
|---------------|------------------------------------------------------|
| `./deploy.sh` | Compila y despliega: copia `src/` → `docs/` y elimina comentarios de los `.js` (salvo `js/3rd/` y `js/xantar/`) |
| `npm run publish:site` (en el repositorio de Xantar) | Compila Xantar, sustituye `src/js/xantar/` por su build y ejecuta `./deploy.sh` |

## Convenciones de código

- Todo el código y los comentarios en los ficheros fuente (`src/`) se escriben en **español**.
- Nombres de variables y funciones: se puede usar español o inglés, pero se prefiere el español para mantener coherencia.
- Se usa el estándar **ES2022** (campos y métodos privados con `#`, etc.).
- Los ficheros de la carpeta `docs/` no se editan manualmente: son regenerados por `deploy.sh`.
- `src/js/xantar/` tampoco se edita a mano: es el build de Xantar y se sustituye entero en cada publicación. Cualquier cambio del juego se hace en su repositorio.
- `deploy.sh` no debe pasar el quitacomentarios por código minificado (`js/3rd/`, `js/xantar/`): no reconoce las expresiones regulares y lo rompe.

## Flujo de trabajo típico

1. Editar los ficheros fuente en `src/`.
2. Ejecutar `./deploy.sh` para generar la versión de producción en `docs/`.
3. Hacer commit de los cambios en `src/` **y** en `docs/`.
4. Subir a `main` para que GitHub Pages despliegue automáticamente desde `docs/`.

Para publicar una versión nueva de Xantar, ejecutar `npm run publish:site` en su repositorio (hace los pasos 1 y 2 para `src/js/xantar/`) y seguir con los pasos 3 y 4 aquí.

## Notas adicionales

- El backend de eco está alojado en Render (`backend-arume.onrender.com`). No forma parte de este repositorio.
- El fichero `CNAME` contiene el dominio personalizado y debe existir tanto en `src/` como en `docs/`.
