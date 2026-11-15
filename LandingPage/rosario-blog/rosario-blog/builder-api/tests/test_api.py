import json
import time

import jwt
from fastapi.testclient import TestClient

import app as builder

SECRET = "dev-secret-solo-para-desarrollo-cambialo"


def token(kind="service", sub="cms", scope="builds:write"):
    return jwt.encode(
        {"sub": sub, "scope": scope, "kind": kind, "iss": "devblog", "exp": int(time.time()) + 60},
        SECRET,
        algorithm="HS256",
    )


def bundle(slug="codigo-teoremas"):
    return {
        "blog": {"id": 2, "slug": slug, "name": "Código & Teoremas"},
        "pages": [{"slug": "borrador", "title": "Borrador", "status": "draft"}],
        "posts": [
            {"slug": "entrada", "title": "Entrada", "status": "published"},
            {"slug": "borrador", "title": "Borrador", "status": "draft"},
        ],
        "categories": [],
    }


def test_publish_build_and_serve_published_bundle(tmp_path, monkeypatch):
    monkeypatch.setattr(builder, "OUTPUT_DIR", tmp_path)
    client = TestClient(builder.app)

    response = client.post(
        "/api/v1/builds",
        headers={"Authorization": f"Bearer {token()}"},
        json={"reason": "cms", "bundle": bundle()},
    )

    assert response.status_code == 200
    assert response.json()["simulated"] is False
    assert response.json()["posts"] == 1
    published = client.get("/api/v1/sites/codigo-teoremas")
    assert published.status_code == 200
    assert published.json()["posts"][0]["slug"] == "entrada"
    assert len(published.json()["posts"]) == 1
    assert published.json()["pages"] == []
    assert json.loads((tmp_path / "codigo-teoremas.json").read_text(encoding="utf-8"))["blog"]["id"] == 2


def test_publishing_requires_cms_service_token():
    client = TestClient(builder.app)
    response = client.post(
        "/api/v1/builds",
        headers={"Authorization": f"Bearer {token(kind='user', sub='1')}"},
        json={"reason": "cms", "bundle": bundle()},
    )
    assert response.status_code == 403


def test_public_site_rejects_missing_or_invalid_slug(tmp_path, monkeypatch):
    monkeypatch.setattr(builder, "OUTPUT_DIR", tmp_path)
    client = TestClient(builder.app)
    assert client.get("/api/v1/sites/missing-site").status_code == 404
    assert client.get("/api/v1/sites/../secret").status_code == 404
