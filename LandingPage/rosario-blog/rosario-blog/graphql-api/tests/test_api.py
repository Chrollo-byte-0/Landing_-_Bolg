from fastapi.testclient import TestClient

import app as graphql_app


class FakeResponse:
    status_code = 200
    is_success = True

    def json(self):
        return {
            "id": 9,
            "blogId": 7,
            "type": "landing",
            "slug": "inicio",
            "title": "Inicio",
            "content": "Bienvenido",
            "status": "published",
        } if self.status_code == 201 else [
            {"id": 7, "name": "Landing", "slug": "landing-isaias", "description": None}
        ]

    def raise_for_status(self):
        return None


class FakeAsyncClient:
    requests = []

    def __init__(self, base_url, timeout):
        self.base_url = base_url

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def request(self, method, path, headers, json=None, params=None):
        self.requests.append((method, path, headers, json, params))
        if method == "POST":
            response = FakeResponse()
            response.status_code = 201
            return response
        return FakeResponse()


def test_graphql_forwards_auth_to_cms(monkeypatch):
    FakeAsyncClient.requests = []
    monkeypatch.setattr(graphql_app.httpx, "AsyncClient", FakeAsyncClient)
    client = TestClient(graphql_app.app)

    response = client.post(
        "/graphql",
        json={"query": "{ blogs { id name slug } }"},
        headers={"Authorization": "Bearer user-token"},
    )

    assert response.status_code == 200
    assert response.json()["data"]["blogs"][0]["slug"] == "landing-isaias"
    assert FakeAsyncClient.requests[0][1] == "/api/blogs"
    assert FakeAsyncClient.requests[0][2]["Authorization"] == "Bearer user-token"


def test_graphql_rejects_missing_authentication():
    response = TestClient(graphql_app.app).post(
        "/graphql", json={"query": "{ blogs { id } }"}
    )

    assert response.status_code == 200
    assert response.json()["errors"][0]["message"] == "Inicia sesión para consultar el CMS"


def test_graphql_mutation_forwards_input_to_cms(monkeypatch):
    FakeAsyncClient.requests = []
    monkeypatch.setattr(graphql_app.httpx, "AsyncClient", FakeAsyncClient)
    client = TestClient(graphql_app.app)

    response = client.post(
        "/graphql",
        json={
            "query": "mutation($blog: Int!, $input: PageInput!) { createPage(blogId: $blog, input: $input) { id slug } }",
            "variables": {
                "blog": 7,
                "input": {
                    "title": "Inicio",
                    "type": "landing",
                    "content": "Bienvenido",
                    "status": "published",
                },
            },
        },
        headers={"Authorization": "Bearer user-token"},
    )

    assert response.json()["data"]["createPage"] == {"id": 9, "slug": "inicio"}
    request = FakeAsyncClient.requests[0]
    assert request[0:2] == ("POST", "/api/blogs/7/pages")
    assert request[3]["title"] == "Inicio"
