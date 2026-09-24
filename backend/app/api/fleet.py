from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import (
    FleetVessel, ConflictDetection, ConvoyRequest, ConvoyResponse,
    RendezvousRequest, RendezvousResponse, RouteResponse
)
from app.core.supabase.auth import require_role, UserIdentity
from app.fleet.fleet_manager import fleet_manager
from app.fleet.conflict_engine import conflict_engine
from app.fleet.convoy_planner import convoy_planner
from app.fleet.rendezvous_planner import rendezvous_planner

router = APIRouter()

@router.get("/", response_model=List[FleetVessel])
def get_fleet(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN"]))) -> List[FleetVessel]:
    """Retrieve all active vessels in the fleet registry."""
    return fleet_manager.get_all_vessels()

@router.get("/conflicts", response_model=List[ConflictDetection])
def get_all_conflicts(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN"]))) -> List[ConflictDetection]:
    """Retrieve conflicts for all vessels (prototype stub)."""
    # For this prototype, we don't have stored active routes, so we return empty list.
    return []

@router.post("/conflicts/analyze", response_model=List[ConflictDetection])
def analyze_conflicts(vessel_id: str, planned_route: RouteResponse, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN"]))) -> List[ConflictDetection]:
    """Analyze a planned route for proximity conflicts against the fleet."""
    conflicts = conflict_engine.analyze_conflicts(vessel_id, planned_route)
    return conflicts

@router.post("/convoy", response_model=ConvoyResponse)
async def plan_convoy(request: ConvoyRequest, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "CAPTAIN"]))) -> ConvoyResponse:
    """Generate a shared corridor for a multi-vessel convoy."""
    try:
        response = await convoy_planner.plan_convoy(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rendezvous", response_model=RendezvousResponse)
async def plan_rendezvous(request: RendezvousRequest, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "CAPTAIN"]))) -> RendezvousResponse:
    """Calculate rendezvous meeting point and routes for two vessels."""
    try:
        response = await rendezvous_planner.plan_rendezvous(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
