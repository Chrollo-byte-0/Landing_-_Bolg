import os

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from graphql import GraphQLError, build_schema, graphql
from pydantic import BaseModel, ConfigDict, Field

CMS_API_URL = os.getenv("CMS_API_URL", "http://localhost:8000").rstrip("/")
METRICS_API_URL = os.getenv("METRICS_API_URL", "http://localhost:8012").rstrip("/")
BUILDER_API_URL = os.getenv("BUILDER_API_URL", "http://localhost:8013").rstrip("/")

schema = build_schema(
    """
    type Blog { id: Int!, name: String!, slug: String!, description: String }
    type Page { id: Int!, blogId: Int!, type: String!, slug: String!, title: String!, content: String!, status: String! }
    type Post {
      id: Int!, blogId: Int!, categoryId: Int, slug: String!, title: String!,
      excerpt: String, content: String, coverUrl: String, status: String!,
      publishedAt: String, createdAt: String!, updatedAt: String!
    }
    type Metrics { visitas: Int!, visitantesUnicos: Int!, simulated: Boolean! }
    type ServiceHealth { cms: Boolean!, metrics: Boolean!, builder: Boolean! }
    input BlogInput { name: String!, slug: String, description: String }
    input PageInput { title: String!, slug: String, type: String!, content: String!, status: String! }
    input PostInput {
      title: String!, slug: String, excerpt: String, content: String!,
      coverUrl: String, categoryId: Int, status: String!
    }
    type Query {
      blogs: [Blog!]!
      pages(blogId: Int!): [Page!]!
      posts(blogId: Int!): [Post!]!
      post(blogId: Int!, postId: Int!): Post!
      metrics(blogId: Int!): Metrics!
      serviceHealth: ServiceHealth!
    }
    type Mutation {
      createBlog(input: BlogInput!): Blog!
      createPage(blogId: Int!, input: PageInput!): Page!
      updatePage(blogId: Int!, pageId: Int!, input: PageInput!): Page!
      deletePage(blogId: Int!, pageId: Int!): Boolean!
      createPost(blogId: Int!, input: PostInput!): Post!
      updatePost(blogId: Int!, postId: Int!, input: PostInput!): Post!
      deletePost(blogId: Int!, postId: Int!): Boolean!
    }
    """
)


class GraphQLRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(min_length=1)
    variables: dict | None = None
    operation_name: str | None = Field(default=None, alias="operationName")


def _authorization(info) -> str:
    value = info.context["authorization"]
    if not value.startswith("Bearer "):
        raise GraphQLError("Inicia sesión para consultar el CMS")
    return value


async def _cms(info, method: str, path: str, body=None, params=None):
    authorization = _authorization(info)
    async with httpx.AsyncClient(base_url=CMS_API_URL, timeout=10) as client:
        response = await client.request(
            method,
            path,
            headers={"Authorization": authorization},
            json=body,
            params=params,
        )
    response.raise_for_status()
    return response.json() if response.status_code != 204 else None


async def _probe(url: str, path: str) -> bool:
    try:
        async with httpx.AsyncClient(base_url=url, timeout=3) as client:
            response = await client.get(path)
        return response.is_success
    except httpx.HTTPError:
        return False


async def resolve_blogs(info):
    return await _cms(info, "GET", "/api/blogs")


async def resolve_pages(info, blogId):
    return await _cms(info, "GET", f"/api/blogs/{blogId}/pages")


async def resolve_posts(info, blogId):
    result = await _cms(info, "GET", f"/api/blogs/{blogId}/posts", params={"limit": 100})
    return result["items"]


async def resolve_post(info, blogId, postId):
    return await _cms(info, "GET", f"/api/blogs/{blogId}/posts/{postId}")


async def resolve_metrics(info, blogId):
    return await _cms(info, "GET", f"/api/blogs/{blogId}/metrics")


async def resolve_service_health(info):
    _authorization(info)
    cms_ok = await _probe(CMS_API_URL, "/api/health")
    metrics_ok = await _probe(METRICS_API_URL, "/health")
    builder_ok = await _probe(BUILDER_API_URL, "/health")
    return {"cms": cms_ok, "metrics": metrics_ok, "builder": builder_ok}


async def create_blog(info, input):
    return await _cms(info, "POST", "/api/blogs", input)


async def create_page(info, blogId, input):
    return await _cms(info, "POST", f"/api/blogs/{blogId}/pages", input)


async def update_page(info, blogId, pageId, input):
    return await _cms(info, "PUT", f"/api/blogs/{blogId}/pages/{pageId}", input)


async def delete_page(info, blogId, pageId):
    await _cms(info, "DELETE", f"/api/blogs/{blogId}/pages/{pageId}")
    return True


async def create_post(info, blogId, input):
    return await _cms(info, "POST", f"/api/blogs/{blogId}/posts", input)


async def update_post(info, blogId, postId, input):
    return await _cms(info, "PUT", f"/api/blogs/{blogId}/posts/{postId}", input)


async def delete_post(info, blogId, postId):
    await _cms(info, "DELETE", f"/api/blogs/{blogId}/posts/{postId}")
    return True


root_resolvers = {
    "blogs": resolve_blogs,
    "pages": resolve_pages,
    "posts": resolve_posts,
    "post": resolve_post,
    "metrics": resolve_metrics,
    "serviceHealth": resolve_service_health,
    "createBlog": create_blog,
    "createPage": create_page,
    "updatePage": update_page,
    "deletePage": delete_page,
    "createPost": create_post,
    "updatePost": update_post,
    "deletePost": delete_post,
}

app = FastAPI(title="GraphQL para el CMS", version="1.0.0")
origins = [origin.strip() for origin in os.getenv(
    "CORS_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000"
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": "graphql"}


@app.post("/graphql", tags=["graphql"])
async def graphql_endpoint(payload: GraphQLRequest, request: Request):
    result = await graphql(
        schema,
        payload.query,
        root_value=root_resolvers,
        context_value={"authorization": request.headers.get("authorization", "")},
        variable_values=payload.variables,
        operation_name=payload.operation_name,
    )
    return JSONResponse(content=result.formatted)
