from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.health import router as health_router
from app.api.telemetry import router as telemetry_router
from app.api.routing import router as routing_router
from app.api.risk import router as risk_router
from app.api.fleet import router as fleet_router
from app.api.environment import router as environment_router
from app.api.forecast import router as forecast_router
from app.api.satellite import router as satellite_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for the Antarctic Maritime Navigation Decision-Support System.",
)

# ---------------------------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes with /api base prefix
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(telemetry_router, prefix=settings.API_V1_PREFIX)
app.include_router(telemetry_router, prefix=f"{settings.API_V1_PREFIX}/telemetry")
app.include_router(routing_router, prefix=f"{settings.API_V1_PREFIX}/routing")
app.include_router(risk_router, prefix=settings.API_V1_PREFIX)
app.include_router(fleet_router, prefix=f"{settings.API_V1_PREFIX}/fleet")
app.include_router(environment_router, prefix=f"{settings.API_V1_PREFIX}/environment")
app.include_router(forecast_router, prefix=f"{settings.API_V1_PREFIX}/forecast")
app.include_router(satellite_router, prefix=f"{settings.API_V1_PREFIX}/satellite")
