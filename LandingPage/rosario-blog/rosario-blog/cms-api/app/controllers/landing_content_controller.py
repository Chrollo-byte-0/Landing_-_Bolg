from fastapi import APIRouter, Depends

from ..dependencies import get_current_user, get_landing_content_service
from ..models import User
from ..models.schemas import LandingContentIn, LandingContentOut
from ..services.landing_content_service import LandingContentService

router = APIRouter(prefix="/blogs/{blog_id}/landing-content", tags=["landing"])


@router.get("", response_model=LandingContentOut)
def read_landing_content(
    blog_id: int,
    service: LandingContentService = Depends(get_landing_content_service),
    user: User = Depends(get_current_user),
):
    return service.get(blog_id, user)


@router.put("", response_model=LandingContentOut)
def update_landing_content(
    blog_id: int,
    body: LandingContentIn,
    service: LandingContentService = Depends(get_landing_content_service),
    user: User = Depends(get_current_user),
):
    return service.update(blog_id, body, user)
