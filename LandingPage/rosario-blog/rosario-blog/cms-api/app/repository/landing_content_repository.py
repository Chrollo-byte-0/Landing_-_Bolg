from sqlalchemy import select

from ..models import LandingContent
from .base import BaseRepository


class LandingContentRepository(BaseRepository[LandingContent]):
    model = LandingContent

    def get_for_blog(self, blog_id: int) -> LandingContent | None:
        query = select(LandingContent).where(LandingContent.blog_id == blog_id)
        return self.db.scalar(query)
