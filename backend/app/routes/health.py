from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:
    """Return a simple health status for the API."""
    return {
        "status": "ok",
        "service": "antarctic-navigation-ai",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
