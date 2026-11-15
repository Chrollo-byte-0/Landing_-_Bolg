# Rosario Blog — CMS + GraphQL + Métricas

CMS para la landing y el blog, con un gateway GraphQL y un servicio de métricas:

| Carpeta | Qué es | Puerto | Arranque |
|---|---|---|---|
| `cms-api/` | CMS y panel de administración para páginas y publicaciones. | 8000 | Docker Compose |
| `graphql-api/` | Gateway autenticado de consultas y mutaciones. | 8001 | Docker Compose |
| `metricas-api/` | Recolección y reportes de visitas separados por sitio. | 8012 | Docker Compose |
| `builder-api/` | Publica y sirve los bundles generados para la landing y el blog. | 8013 | Docker Compose |
| `landing-site` | Sitio estático de la landing, solo accesible localmente. | 3000 | Docker Compose |
| `blog-site` | Sitio estático del blog, solo accesible localmente. | 5500 | Docker Compose |

## Despliegue
Desde `cms-api/`:
```bash
docker compose up --build -d
```
Accesos: [landing](http://localhost:3000/), [blog](http://localhost:5500/), [panel CMS](http://localhost:8000/admin/), [REST CMS](http://localhost:8000/docs), [GraphQL](http://localhost:8001/graphql), [documentación de métricas](http://localhost:8012/docs) y [estado del Builder](http://localhost:8013/health).

Al iniciar se crean los espacios `landing-isaias` y `codigo-teoremas` si faltan. Desde el panel puedes seleccionarlos, administrar contenido, asignar categorías existentes a las publicaciones del blog, ver métricas independientes y pulsar **Publicar sitio**. La primera página publicada de tipo `landing` controla el título y el texto introductorio de la portada; las demás páginas publicadas se muestran como contenido adicional. El blog toma sus entradas publicadas del CMS después de publicar; si nunca se publicó un bundle, conserva la lista estática como respaldo. Las seis entradas existentes se migraron al CMS y sus versiones estáticas originales siguen disponibles para las demostraciones interactivas.

Los servicios `landing-site` y `blog-site` sirven las páginas en los puertos 3000 y 5500. Las páginas envían visitas al servicio en `http://localhost:8012` y leen bundles en `http://localhost:8013`.

Todos los puertos publicados por Compose se enlazan a `127.0.0.1` para uso local. Para publicar fuera de desarrollo, define una clave aleatoria de 32+ caracteres, cambia la contraseña del administrador y de PostgreSQL, configura `GRAPHQL_PUBLIC_URL`/`BUILDER_PUBLIC_URL` y los orígenes permitidos en `METRICS_CORS_ORIGINS` y `BUILDER_CORS_ORIGINS`. Actualiza los atributos `data-api-url` y `data-builder-url` de los HTML para el host público.
