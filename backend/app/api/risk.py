"""
FastAPI Router for Maritime Risk Engine Endpoints.
Prefix: /api/risk
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from app.core.supabase.auth import require_role, UserIdentity
from app.models.schemas import VesselRiskAssessment, AreaRiskAssessment, EvaluateRiskRequest
from app.models.data_models import NormalizedVessel
from app.risk.engine import evaluate_vessel_by_id, evaluate_area_risk
from app.risk.calculator import RiskCalculator, RiskConfig
from app.data.providers import DemoDataProvider

router = APIRouter(prefix="/risk", tags=["Risk Engine"])


@router.get("/vessel/{vessel_id}", response_model=VesselRiskAssessment)
def get_vessel_risk(vessel_id: str, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """
    Evaluates standardized multivariable situational risk for a specific vessel.
    Returns overall score, risk level, contributor breakdown, and human-readable explanation.
    """
    assessment = evaluate_vessel_by_id(vessel_id)
    if assessment is None:
        raise HTTPException(
            status_code=404,
            detail=f"Vessel with ID '{vessel_id}' not found in active telemetry.",
        )
    return assessment


@router.get("/area", response_model=AreaRiskAssessment)
def get_area_risk(
    min_lat: float = Query(-62.0, ge=-90.0, le=90.0, description="Minimum latitude"),
    max_lat: float = Query(-59.0, ge=-90.0, le=90.0, description="Maximum latitude"),
    min_lon: float = Query(-47.0, ge=-180.0, le=180.0, description="Minimum longitude"),
    max_lon: float = Query(-38.0, ge=-180.0, le=180.0, description="Maximum longitude"),
    grid_step: float = Query(0.5, gt=0.05, le=2.0, description="Sampling resolution step"),
    user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))
):
    """
    Evaluates spatial risk density across a geographic bounding box.
    """
    if min_lat >= max_lat:
        raise HTTPException(status_code=422, detail="min_lat must be strictly less than max_lat")
    if min_lon >= max_lon:
        raise HTTPException(status_code=422, detail="min_lon must be strictly less than max_lon")

    return evaluate_area_risk(
        min_lat=min_lat,
        max_lat=max_lat,
        min_lon=min_lon,
        max_lon=max_lon,
        grid_step=grid_step,
    )


@router.post("/evaluate", response_model=VesselRiskAssessment)
def evaluate_custom_point(req: EvaluateRiskRequest, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """
    Evaluates arbitrary coordinates or dynamic ship waypoint with optional custom weights.
    """
    custom_config = None
    if req.weights:
        custom_config = RiskConfig(
            iceberg_weight=req.weights.get("iceberg_weight", 0.35),
            ice_weight=req.weights.get("ice_weight", 0.25),
            vessel_weight=req.weights.get("vessel_weight", 0.20),
            weather_weight=req.weights.get("weather_weight", 0.15),
            current_weight=req.weights.get("current_weight", 0.05),
        )

    calculator = RiskCalculator(config=custom_config)
    provider = DemoDataProvider()
    snapshot = provider.get_snapshot()

    synthetic_vessel = NormalizedVessel(
        id=req.vessel_id or "custom-point",
        name=f"Tactical Point ({req.latitude:.2f}°S, {req.longitude:.2f}°W)",
        latitude=req.latitude,
        longitude=req.longitude,
        speed_knots=req.speed_knots or 12.0,
        heading_degrees=req.heading_degrees or 0.0,
        status="evaluating",
        destination="Target Berth",
        source="DYNAMIC_REQUEST",
    )

    return calculator.evaluate_vessel_risk(synthetic_vessel, snapshot)
