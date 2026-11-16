"""Arranque del CMS:   uvicorn app.main:app --reload     (documentación en http://localhost:8000/docs)"""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .controllers import (
    auth_controller,
    blog_controller,
    build_controller,
    category_controller,
    landing_content_controller,
    media_controller,
    metrics_controller,
    page_controller,
    post_controller,
)
from .database import Base, SessionLocal, engine
from .exceptions import AppError
from .models import Blog
from .repository.blog_repository import BlogRepository
from .repository.user_repository import UserRepository
from .services.auth_service import AuthService


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:  # crea el administrador inicial si no existe
        AuthService(UserRepository(db)).ensure_admin(settings.admin_email, settings.admin_password)
        admin = UserRepository(db).get_by_email(settings.admin_email.lower())
        blogs = BlogRepository(db)
        if admin:
            for name, slug, description in (
                ("Landing Isaías", "landing-isaias", "Contenido para la landing personal."),
                ("Código & Teoremas", "codigo-teoremas", "Publicaciones del blog de desarrollo."),
            ):
                if not blogs.slug_exists(slug):
                    blogs.save(Blog(owner_id=admin.id, name=name, slug=slug, description=description))
    yield


Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="CMS de Blogs", version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    """Traduce los errores de negocio de las capas internas a respuestas HTTP."""
    detail = exc.detail
    body = {"error": exc.code, "message": detail if isinstance(detail, str) else detail.get("message", "Error")}
    if isinstance(detail, dict):
        body["details"] = detail
    return JSONResponse(status_code=exc.status_code, content=body, headers=exc.headers)


for controller in (
    auth_controller,
    blog_controller,
    page_controller,
    post_controller,
    category_controller,
    landing_content_controller,
    media_controller,
    build_controller,
    metrics_controller,
):
    app.include_router(controller.router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
app.mount(
    "/admin",
    StaticFiles(directory=str(Path(__file__).parent / "static" / "admin"), html=True),
    name="admin",
)


@app.get("/api/admin-config", tags=["admin"])
def admin_config():
    return {"graphqlUrl": settings.graphql_url, "builderUrl": settings.builder_public_url}


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
