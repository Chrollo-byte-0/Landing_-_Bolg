# Métricas API

API que **recibe y cuenta las visitas** de la landing y del blog. Es un servicio aparte del CMS (puerto 8012); los eventos se separan por `site_id` (`landing-isaias` y `codigo-teoremas`).
Capas: `metricas/controllers` → `services` → `repository` → `models`.

## Arrancar
```bash
python -m venv .venv && .venv\Scripts\activate      # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn metricas.main:create_app --factory --port 8012
```
Documentación: http://localhost:8012/docs

## Rutas (`/api/v1`)
| Ruta | Quién la usa | Token |
|---|---|---|
| `POST /events` | el script del sitio publicado (cada visita manda un evento con `site_id`) | no |
| `GET /metrics/overview?site_id=landing-isaias` | resumen de un sitio | sí, permiso `metrics:read` |
| `GET /metrics/pages?site_id=codigo-teoremas` | páginas más vistas por sitio | sí |
| `GET /metrics/timeseries?site_id=codigo-teoremas` | vistas por día y sitio | sí |

Pruebas: `pytest`. Al arrancar sobre una base existente, se agrega automáticamente la columna `site_id`; los eventos previos no tienen atribución de sitio y solo aparecen en consultas globales sin filtro.
