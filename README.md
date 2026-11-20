# MentAtlas React

Recreación editorial del atlas en React 19, Vite y Tailwind CSS 4. Incluye navegación por secciones, explorador de países, filtros, ficha por país, comparador, políticas públicas, metodología y edición local de fichas.

## Requisitos

Node.js 20.19+ o 22.12+.

## Ejecutar

```powershell
npm install
npm run dev
```

Para generar la versión estática de producción: `npm run build`.

## Datos y límites

- `public/world.geojson` contiene los polígonos simplificados de Natural Earth 1:110m. `npm run dev` y `npm run build` lo regeneran desde TopoJSON, evitando geometrías incompletas y reduciendo la descarga del mapa.
- `src/data.js` conserva las fichas y valores del código facilitado. Las series por año y grupo se generan como aproximaciones exploratorias; no son observaciones oficiales desagregadas. La metodología de la interfaz lo indica.
- Las políticas que se editen se guardan en `localStorage` en el navegador actual. El panel no tiene autenticación ni almacenamiento de servidor.
- El mapa y la aplicación no dependen del logo original. Las fuentes tipográficas usan sustitutos de sistema para poder abrir la página sin conexión.

## Estructura

- `index.html`: punto de entrada de Vite.
- `src/main.jsx`: interfaz React y comportamiento.
- `src/data.js`: datos de países y políticas.
- `src/styles.css`: Tailwind, tokens del diseño y estilos específicos del mapa.
- `public/world.geojson`: geometrías del mapa.
# PageLove
