# Landing y blog de desarrollo

Proyecto personal compuesto por una landing y un blog, administrados desde un CMS local. El panel también integra GraphQL, métricas y publicación de contenido.

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

Para publicar el proyecto en internet hacen falta, además, configuración de dominio y HTTPS, secretos fuertes, orígenes CORS adecuados y una estrategia de despliegue; estos pasos no están incluidos en el entorno local.
