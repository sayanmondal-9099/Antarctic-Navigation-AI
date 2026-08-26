from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.api.telemetry import router as telemetry_router
from app.api.routing import router as routing_router

app = FastAPI(
    title="Antarctic Navigation AI",
    version="0.1.0",
    description="Backend API for the Antarctic Navigation AI project.",
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server (port 5173) during local development.
# Tighten origins before deploying to production.
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(telemetry_router, prefix="/api/telemetry")
app.include_router(routing_router, prefix="/api/routing")
