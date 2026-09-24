from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.schemas import Vessel, Iceberg
from app.core.supabase.auth import require_role, UserIdentity
from app.services.data_service import data_service

router = APIRouter()

@router.get("/vessels", response_model=List[Vessel])
def get_vessels(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))) -> List[Vessel]:
    """Retrieve all simulated demo vessels in the Antarctic operating sector."""
    return [Vessel(**v) for v in data_service.get_vessels()]

@router.get("/vessels/{vessel_id}", response_model=Vessel)
def get_vessel(vessel_id: str, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))) -> Vessel:
    """Retrieve telemetry for a specific simulated vessel."""
    vessels = data_service.get_vessels()
    target = next((v for v in vessels if v["id"] == vessel_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vessel '{vessel_id}' not found in telemetry registry."
        )
    return Vessel(**target)

@router.get("/icebergs", response_model=List[Iceberg])
def get_icebergs(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))) -> List[Iceberg]:
    """Retrieve all tracked iceberg polygon hazards."""
    return [Iceberg(**i) for i in data_service.get_icebergs()]
