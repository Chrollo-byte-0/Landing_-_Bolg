import json
import os
import re
import tempfile
from pathlib import Path

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SECRET = os.getenv("JWT_SECRET", "dev-secret-solo-para-desarrollo-cambialo")
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "./published"))
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
app = FastAPI(title="Site Builder", version="1.0.0")
origins = [origin.strip() for origin in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500",
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class BuildRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=80)
    bundle: dict


def require_builder(authorization: str = Header(default="")) -> None:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Falta el token Bearer")
    try:
        payload = jwt.decode(
            token,
            SECRET,
            algorithms=["HS256"],
            issuer="devblog",
            options={"require": ["exp", "iss", "sub"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado") from None
    scopes = str(payload.get("scope", "")).split()
    if payload.get("kind") != "service" or payload.get("sub") != "cms" or "builds:write" not in scopes:
        raise HTTPException(status_code=403, detail="Se requiere builds:write del CMS")


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "builder"}


@app.post("/api/v1/builds", dependencies=[Depends(require_builder)], tags=["build"])
def publish_build(request: BuildRequest):
    blog = request.bundle.get("blog")
    if not isinstance(blog, dict) or not isinstance(blog.get("slug"), str) or not SLUG_PATTERN.fullmatch(blog["slug"]):
        raise HTTPException(status_code=422, detail="El bundle debe incluir un slug válido en blog.slug")
    for collection in ("pages", "posts", "categories"):
        if not isinstance(request.bundle.get(collection), list):
            raise HTTPException(status_code=422, detail=f"El bundle debe incluir una lista {collection}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT_DIR / f"{blog['slug']}.json"
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=OUTPUT_DIR, suffix=".tmp", delete=False
        ) as temporary:
            temporary_path = Path(temporary.name)
            json.dump(request.bundle, temporary, ensure_ascii=False, separators=(",", ":"))
        os.replace(temporary_path, destination)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()

    return {
        "simulated": False,
        "site": blog["slug"],
        "publishedAt": destination.stat().st_mtime,
        "url": f"/api/v1/sites/{blog['slug']}",
        "pages": sum(page.get("status") == "published" for page in request.bundle["pages"]),
        "posts": sum(post.get("status") == "published" for post in request.bundle["posts"]),
    }


@app.get("/api/v1/sites/{site_slug}", tags=["sites"])
def read_published_site(site_slug: str):
    if not SLUG_PATTERN.fullmatch(site_slug):
        raise HTTPException(status_code=404, detail="Sitio no encontrado")
    destination = OUTPUT_DIR / f"{site_slug}.json"
    try:
        with destination.open(encoding="utf-8") as published:
            bundle = json.load(published)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Aún no se ha publicado este sitio") from None
    return {
        **bundle,
        "pages": [page for page in bundle["pages"] if page.get("status") == "published"],
        "posts": [post for post in bundle["posts"] if post.get("status") == "published"],
    }
