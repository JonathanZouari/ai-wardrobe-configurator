from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.schemas.response import ApiResponse

router = APIRouter()


class HealthStatus(BaseModel):
    status: str
    environment: str


@router.get("/health", response_model=ApiResponse[HealthStatus])
def health(request: Request) -> ApiResponse[HealthStatus]:
    environment = request.app.state.settings.environment
    return ApiResponse(success=True, data=HealthStatus(status="ok", environment=environment))
