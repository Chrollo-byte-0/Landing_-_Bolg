# Landing y blog de desarrollo

Proyecto personal compuesto por una landing y un blog. El contenido público se edita con Pages CMS directamente en GitHub; los servicios locales de CMS, GraphQL y métricas siguen disponibles para desarrollo.

## Requisitos

- Docker Desktop con Docker Compose v2.
- Git para clonar el repositorio.

## Iniciar en Windows

Clona el repositorio y entra a la carpeta de Compose:

```powershell
git clone https://github.com/Chrollo-byte-0/Landing_-_Bolg.git
cd .\Landing_-_Bolg\LandingPage\rosario-blog\rosario-blog\cms-api
```

Antes del primer inicio, crea la configuración local y edita el correo y la contraseña inicial del administrador:

```powershell
Copy-Item .env.example .env
notepad .env
```

Configura `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD` y `SECRET_KEY` con tus propios valores. La cuenta inicial se crea al iniciar la base de datos por primera vez; cambiar las credenciales después no modifica una cuenta que ya existe. El archivo `.env` está excluido de Git y no debe subirse al repositorio.

Inicia todos los servicios:

```powershell
docker compose up --build -d
docker compose ps
```

La primera compilación puede tardar unos minutos. Para ver los registros:

```powershell
docker compose logs -f
```

## Direcciones locales

| Servicio | Dirección |
|---|---|
| Landing | http://localhost:3000/ |
| Blog | http://localhost:5500/ |
| Administración CMS | http://localhost:8000/admin/ |
| Documentación REST del CMS | http://localhost:8000/docs |
| GraphQL | http://localhost:8001/graphql |
| Documentación de métricas | http://localhost:8012/docs |
| Estado del Builder | http://localhost:8013/health |

El panel permite alternar entre el espacio de la landing y el del blog, editar y publicar contenido, consultar el estado de GraphQL y métricas, y ver estadísticas separadas por espacio. En el editor del blog puedes asignar una categoría existente al crear o editar una publicación. Los puertos se enlazan a `127.0.0.1`; el despliegue está pensado para uso local, no para acceso público desde internet.

En el espacio **Landing Isaías**, la página publicada de tipo **Landing principal** controla el título y el texto introductorio de la portada. Las demás páginas publicadas se muestran como tarjetas debajo del contenido existente. Guarda los cambios en el CMS y pulsa **Publicar sitio** para generar el bundle que consume la landing.

## Detener y volver a iniciar

```powershell
docker compose down
docker compose up -d
```

`docker compose down` conserva la base de datos y el contenido publicado. Para borrar también los datos persistidos, usa `docker compose down -v`; esta acción es destructiva.

## Estructura

- `Blog/`: sitio y entradas del blog.
- `LandingPage/`: landing y los servicios CMS, GraphQL, métricas y Builder.
- `LandingPage/rosario-blog/rosario-blog/cms-api/docker-compose.yml`: orquesta los siete servicios.

## Despliegue actual

- Landing: https://landing-rosario-seven.vercel.app
- Blog: https://codigo-teoremas-rosario.vercel.app

Ambos sitios se publican como estáticos en Vercel. El panel web gratuito de [Pages CMS](https://app.pagescms.org) edita `LandingPage/content/landing.json` y `Blog/content/site.json`; cada cambio se guarda en GitHub y activa una nueva publicación de Vercel. El CMS local, las APIs y PostgreSQL no están desplegados; el Blueprint de Render requiere recursos de pago. Consulta [`DEPLOYMENT.md`](./DEPLOYMENT.md) para conectar Pages CMS y Vercel.
