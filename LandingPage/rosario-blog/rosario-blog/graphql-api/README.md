# GraphQL API

Gateway GraphQL para el CMS. Reenvía al CMS REST las operaciones autenticadas y no mantiene una base de datos propia.

- Endpoint: `POST /graphql`
- Salud: `GET /health`
- CORS: configura `CORS_ORIGINS` con el origen desde el que se sirve el panel.

Las operaciones requieren el token `Bearer` obtenido con `POST /api/auth/login` en el CMS. El esquema permite consultar blogs, páginas, publicaciones, métricas y el estado del CMS, Builder y métricas, además de crear, editar y borrar páginas y publicaciones.

Para desplegar todo el stack y PostgreSQL, desde `cms-api/` ejecuta `docker compose up --build`. La URL GraphQL pública que consume el panel se define con `GRAPHQL_PUBLIC_URL`.
