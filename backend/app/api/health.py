from fastapi import APIRouter
from app.models.schemas import HealthResponse, VersionResponse
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return system operational health status."""
    return HealthResponse(
        status="ok",
        service=settings.SERVICE_NAME
    )

@router.get("/version", response_model=VersionResponse)
async def get_version() -> VersionResponse:
    """Return current API version."""
    return VersionResponse(
        version=settings.VERSION,
        service=settings.SERVICE_NAME
    )
