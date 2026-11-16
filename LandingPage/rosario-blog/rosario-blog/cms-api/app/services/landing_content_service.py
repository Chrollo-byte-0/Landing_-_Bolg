from ..exceptions import NotFoundError
from ..models import LandingContent, User
from ..models.schemas import LandingContentIn
from ..repository.landing_content_repository import LandingContentRepository
from .blog_service import BlogService
from .landing_content_defaults import DEFAULT_LANDING_CONTENT


class LandingContentService:
    def __init__(self, content: LandingContentRepository, blogs: BlogService):
        self.content = content
        self.blogs = blogs

    def get(self, blog_id: int, user: User) -> LandingContent | dict:
        blog = self.blogs.get_owned(blog_id, user)
        self._require_landing(blog.slug)
        return self.content.get_for_blog(blog.id) or {
            "blog_id": blog.id,
            "content": DEFAULT_LANDING_CONTENT,
        }

    def update(self, blog_id: int, data: LandingContentIn, user: User) -> LandingContent:
        blog = self.blogs.get_owned(blog_id, user)
        self._require_landing(blog.slug)
        current = self.content.get_for_blog(blog.id)
        if current is None:
            current = LandingContent(blog_id=blog.id, content=data.content.model_dump(by_alias=True))
        else:
            current.content = data.content.model_dump(by_alias=True)
        return self.content.save(current)

    @staticmethod
    def _require_landing(slug: str) -> None:
        if slug != "landing-isaias":
            raise NotFoundError("Contenido de landing no encontrado")
