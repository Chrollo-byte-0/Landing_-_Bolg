# Despliegue en Vercel y Render

La configuración separa los sitios estáticos (Vercel) de las APIs y PostgreSQL (Render). Los archivos de configuración no crean recursos por sí solos.

## Alcance actual: solo sitios estáticos

Con el límite de 0 USD, despliega únicamente `LandingPage` y `Blog` como proyectos estáticos gratuitos en Vercel. El contenido del CMS público se guarda en archivos JSON del repositorio mediante Pages CMS; Vercel vuelve a publicar ambos sitios después de cada cambio. No crees servicios de Render ni apliques `render.yaml`: sus servicios persistentes requieren planes de pago. Las APIs y métricas locales no se despliegan, y el formulario se reemplaza por un aviso con el correo directo ya disponible en la página.

## Render (solo si después se autoriza presupuesto)

1. En Render, crea un Blueprint desde este repositorio y selecciona `render.yaml`.
2. Revisa los recursos y sus cargos antes de confirmar. La configuración incluye cuatro servicios web, PostgreSQL y discos persistentes para cargas del CMS y publicaciones del Builder; requiere planes de pago para conservar esos datos.
3. Define `ADMIN_EMAIL` y `ADMIN_PASSWORD` cuando Render los solicite. `JWT_SECRET` se genera en Render y se comparte únicamente entre los servicios que lo necesitan.
4. Comprueba los estados de salud de CMS (`/api/health`), GraphQL (`/health`), métricas (`/health`) y Builder (`/health`).

Los nombres del Blueprint generan estas direcciones públicas esperadas:

- CMS: `https://landing-rosario-cms.onrender.com/admin/`
- GraphQL: `https://landing-rosario-graphql.onrender.com/graphql`
- Métricas: `https://landing-rosario-metrics.onrender.com`
- Builder: `https://landing-rosario-builder.onrender.com`

Si Render asigna otro subdominio, actualiza `GRAPHQL_URL` y `BUILDER_PUBLIC_URL` en CMS, además de las variables de Vercel indicadas abajo.

## Vercel

Los dos proyectos ya están conectados al repositorio de GitHub y configurados para publicar desde estos directorios:

| Proyecto | Root Directory | URL de producción |
|---|---|---|
| `landing-rosario` | `LandingPage` | https://landing-rosario-seven.vercel.app |
| `codigo-teoremas-rosario` | `Blog` | https://codigo-teoremas-rosario.vercel.app |

Cada proyecto usa el framework **Other**, conserva el directorio de salida `dist` y ejecuta el comando estático de su `vercel.json`. En el proyecto Landing se excluye también la carpeta `api` para no desplegar la función de contacto.

El argumento `--static-only` conserva el cargador del CMS y los archivos JSON, pero omite las métricas y la función de contacto. El build del Blog incluye la plantilla de detalle y DOMPurify para sanear el HTML de las publicaciones.

## Pages CMS y publicación de contenido

1. Abre [app.pagescms.org](https://app.pagescms.org), inicia sesión con GitHub y autoriza Pages CMS para acceder al repositorio `Chrollo-byte-0/Landing_-_Bolg`.
2. Selecciona la rama `main`. Pages CMS detecta la configuración `.pages.yml` de la raíz del repositorio.
3. Edita **Landing** para cambiar los textos y enlaces de la landing, o **Blog** para editar publicaciones, borradores y datos del sitio.
4. Guarda los cambios en GitHub. Cada publicación genera un commit y Vercel crea automáticamente un despliegue nuevo.

Los archivos editables son `LandingPage/content/landing.json` y `Blog/content/site.json`. El CMS no necesita un servidor, una base de datos ni una API pública. Si el repositorio se hace privado, confirma que tanto Pages CMS como la integración Git de Vercel mantengan acceso al repositorio.

## CORS (solo para el futuro despliegue de APIs)

Después de crear los dos proyectos Vercel, copia sus dominios de producción exactos y configúralos como `CORS_ORIGINS` en los servicios `landing-rosario-metrics` y `landing-rosario-builder`, separados por comas. Los valores incluidos en `render.yaml` son nombres esperados; cámbialos si Vercel asigna otros dominios. Luego vuelve a desplegar ambos servicios.

No guardes contraseñas ni claves en el repositorio. La conexión de GitHub con Render/Vercel y la aplicación del Blueprint requieren iniciar sesión en las cuentas correspondientes.
