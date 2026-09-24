from typing import List, Optional
from fastapi import APIRouter, Query, Depends
from app.core.supabase.auth import require_role, UserIdentity
from pydantic import BaseModel

from app.models.schemas import Position, RouteRequest, RouteResponse, RiskEvaluationResponse, RoutingResponse
from app.services.data_service import data_service
from app.routing.astar import calculate_deterministic_route

from app.routing.deconfliction import DeconflictionEngine
from app.risk.engine import evaluate_situational_risk
from app.risk.grid import RiskGridEngine
from app.services.forecast import TemporalForecastService

router = APIRouter()
forecast_service = TemporalForecastService()

class OptimizeRouteRequest(BaseModel):
    origin: Position
    destination: Position
    vessel_id: Optional[str] = "vessel-A"
    risk_tolerance: Optional[str] = "balanced"
    economic_speed_knots: Optional[float] = 12.0

class DeconflictRequest(BaseModel):
    vessel_a_id: Optional[str] = "vessel-A"
    vessel_b_id: Optional[str] = "vessel-B"

# ── 1. Static & Fallback Demo Route ──────────────────────────────────────────

@router.get("/demo-route", response_model=RouteResponse)
def get_demo_route(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN"]))):
    """Returns the Step 18 deterministic demo route from Ship A to Demo Station."""
    origin = Position(lat=-60.2, lon=-45.3)
    destination = Position(lat=-60.4, lon=-38.5)
    icebergs = data_service.get_icebergs()
    return calculate_deterministic_route(origin, destination, icebergs, speed_knots=12.0)

# ── 2. Risk Map & Spatial Grid ────────────────────────────────────────────────

@router.get("/risk-grid")
def get_risk_grid(resolution_deg: float = Query(0.25, ge=0.1, le=1.0), user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """Computes a 2D multi-layer spatial risk grid across the Antarctic sector."""
    icebergs = data_service.get_icebergs()
    engine = RiskGridEngine(grid_step=resolution_deg)
    return engine.compute_grid(icebergs)

@router.get("/risk-evaluation", response_model=RiskEvaluationResponse)
def get_risk_evaluation(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """Returns situational risk evaluation across all active targets."""
    icebergs = data_service.get_icebergs()
    vessels = data_service.get_vessels()
    return evaluate_situational_risk(icebergs, vessels)

# ── 3. A* Graph Optimization ──────────────────────────────────────────────────

@router.post("/optimize", response_model=RoutingResponse)
def optimize_route(request: OptimizeRouteRequest, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN"]))):
    """Executes lattice A* graph pathfinding with polar risk penalties."""
    from app.routing.astar_grid import RiskAwareRouter
    from app.models.data_models import NormalizedVessel
    from app.data.providers import DemoDataProvider
    from app.ml.gate import forecast_gate
    
    provider = DemoDataProvider()
    snapshot = provider.get_snapshot()
    target_vessel = next((v for v in snapshot.vessels if v.id == request.vessel_id), None)
    if target_vessel is None:
        target_vessel = NormalizedVessel(
            id=request.vessel_id or "vessel-A",
            name="Unknown Vessel",
            latitude=request.origin.lat,
            longitude=request.origin.lon,
            speed_knots=request.economic_speed_knots,
            heading_degrees=0.0
        )
        
    # Generate 24h forecasts for all tracked icebergs to avoid future conflicts
    forecast_hazards = []
    for berg in snapshot.icebergs:
        try:
            fc = forecast_gate.get_iceberg_forecast(berg, snapshot, horizon_hours=24)
            forecast_hazards.append(fc)
        except Exception as e:
            print(f"Failed to generate forecast for {berg.id}: {e}")
            
    router_engine = RiskAwareRouter(snapshot, target_vessel, forecast_hazards=forecast_hazards)
    return router_engine.optimize_routes(
        origin=request.origin,
        destination=request.destination,
        requested_mode=request.risk_tolerance or "balanced",
        economic_speed_knots=request.economic_speed_knots or 12.0
    )

@router.post("/calculate", response_model=RouteResponse)
def calculate_route(request: RouteRequest, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN"]))):
    """Calculates deterministic safe route."""
    icebergs = data_service.get_icebergs()
    return calculate_deterministic_route(request.origin, request.destination, icebergs)

# ── 4. Multi-Vessel Deconfliction (COLREGS) ───────────────────────────────────

@router.post("/deconflict")
def evaluate_deconfliction(request: Optional[DeconflictRequest] = None, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN"]))):
    """Evaluates CPA/TCPA encounter and returns 3 COLREGS-compliant evasion corridors."""
    vessels = data_service.get_vessels()
    icebergs = data_service.get_icebergs()
    
    v_a = next((v for v in vessels if v["id"] == "vessel-A"), vessels[0] if vessels else {})
    v_b = next((v for v in vessels if v["id"] == "vessel-B"), vessels[1] if len(vessels) > 1 else {})

    engine = DeconflictionEngine(icebergs)
    return engine.evaluate_encounter(v_a, v_b)

# ── 5. Temporal Forecast & Drift Simulation ───────────────────────────────────

@router.get("/forecast/temporal")
def get_temporal_forecast(hours: float = Query(24.0, ge=0.0, le=72.0), user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """Projects iceberg positions and metocean conditions forward in time."""
    icebergs = data_service.get_icebergs()
    projected_ice = forecast_service.project_icebergs(icebergs, hours_forward=hours)
    metocean = forecast_service.get_metocean_forecast(hours_forward=hours)
    return {
        "hours_forward": hours,
        "metocean": metocean,
        "projected_icebergs_count": len(projected_ice),
        "icebergs": projected_ice
    }

# ── 6. Source Pipeline Health ─────────────────────────────────────────────────

@router.get("/sources/status")
def get_sources_status(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """Returns data connectivity health and fallback pipeline status."""
    return data_service.get_system_source_status()
