# Builder API

Servicio que recibe bundles del CMS, los publica de forma atómica en el volumen persistente `published_sites` y los sirve a las páginas estáticas.

- Salud: `GET /health`
- Publicación CMS: `POST /api/v1/builds` (JWT de servicio `builds:write`)
- Bundle público: `GET /api/v1/sites/{slug}`

El panel admin ejecuta `POST /api/build`; para cada espacio seleccionado pulsa **Publicar sitio**. Después, `LandingPage/` lee `landing-isaias` y `Blog/` lee `codigo-teoremas`. Los eventos publicados no incluyen borradores.

Se configura mediante `JWT_SECRET`, `OUTPUT_DIR` y `CORS_ORIGINS`. Para el stack local ejecuta `docker compose up --build` desde `cms-api/`; el servicio escucha en `http://localhost:8013`.
