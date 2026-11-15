# CMS API + panel de administración

CMS en Python, FastAPI y SQLAlchemy para gestionar blogs, páginas de landing, publicaciones, categorías, imágenes y builds.

## Desplegar todo el stack
Desde esta carpeta:
```bash
docker compose up --build
```
El stack incluye PostgreSQL, CMS, GraphQL, métricas, Builder y los servidores estáticos de landing y blog. Accesos: landing http://localhost:3000/, blog http://localhost:5500/, panel http://localhost:8000/admin/, REST http://localhost:8000/docs, GraphQL http://localhost:8001/graphql, métricas http://localhost:8012/docs y Builder http://localhost:8013/health.

Al iniciar se crean, si faltan, los espacios **Landing Isaías** (`landing-isaias`) y **Código & Teoremas** (`codigo-teoremas`). El panel permite cambiar entre ellos, crear/editar/eliminar páginas o publicaciones, asignar categorías existentes a las publicaciones del blog, consultar las métricas por separado y pulsar **Publicar sitio**. Cada publicación genera un bundle en el Builder. La primera página publicada de tipo `landing` controla el título y el texto principal de la landing; el blog muestra los posts publicados del CMS. Las seis entradas estáticas existentes se migraron al CMS.

Compose sirve la landing en `http://localhost:3000` y el blog en `http://localhost:5500`. El Builder publica JSON; no reemplaza los archivos HTML ni el diseño existente.

Todos los puertos publicados se enlazan a `127.0.0.1` para uso local. Antes de un despliegue público, configura `SECRET_KEY` (32+ caracteres aleatorios), `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, `GRAPHQL_PUBLIC_URL`, `BUILDER_PUBLIC_URL`, `METRICS_CORS_ORIGINS` y `BUILDER_CORS_ORIGINS`. Los valores predeterminados son solo para desarrollo. Las páginas estáticas reportan visitas a `http://localhost:8012` y consultan los bundles en `http://localhost:8013`; cambia los atributos `data-api-url` y `data-builder-url` del HTML para usar otros hosts. Agrega también los dominios reales a las listas CORS.

## Arrancar solo el CMS en desarrollo
```bash
python -m venv .venv && .venv/Scripts/activate     # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
El acceso predeterminado local es `admin@example.com` / `admin123`. Base de datos local: SQLite (`cms.db`).

## Integraciones
- **GraphQL** (`graphql-api/`): gateway autenticado que reenvía consultas y mutaciones al CMS REST.
- **Métricas** (`metricas-api/`): recibe eventos con `site_id` y expone estadísticas. El CMS solicita métricas con el slug de cada espacio, de modo que landing y blog no se mezclan.
- **Builder** (`builder-api/`): `POST /api/build` envía el contenido publicado al generador; el panel activa este endpoint y los sitios recuperan el bundle público en `/api/v1/sites/{slug}`.

CMS y métricas comparten la misma clave para validar el token de servicio. Si `BUILDER_URL` o `METRICS_URL` están vacías, la respuesta correspondiente se simula.

Las capas del CMS son `controllers → services → repository → models`; `tests/` contiene pruebas del flujo y de arquitectura (`pytest`).
