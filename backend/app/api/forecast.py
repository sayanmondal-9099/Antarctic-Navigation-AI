from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from app.core.supabase.auth import require_role, UserIdentity
from app.ml.schemas import (
    ForecastRequest, 
    SeaIceForecastResponse, 
    IcebergForecastResponse, 
    ModelStatusResponse,
    ModelMetadata
)
from app.ml.gate import forecast_gate
from app.ml.registry import model_registry
from app.data.providers import DemoDataProvider

router = APIRouter(tags=["forecast"])
provider = DemoDataProvider()

@router.get("/models/status", response_model=ModelStatusResponse)
async def get_model_status(user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """
    Get the current status of the ML models.
    """
    sea_ice_meta = model_registry.get_model_metadata("sea_ice_model")
    iceberg_meta = model_registry.get_model_metadata("iceberg_model")
    
    # Fallback to defaults if missing
    if not sea_ice_meta:
        sea_ice_meta = ModelMetadata(
            model_name="SeaIceBaseline", model_version="v0.0.0",
            training_data_range="N/A", features=[], training_timestamp="N/A",
            metrics={}, status="unavailable"
        )
    if not iceberg_meta:
        iceberg_meta = ModelMetadata(
            model_name="IcebergBaseline", model_version="v0.0.0",
            training_data_range="N/A", features=[], training_timestamp="N/A",
            metrics={}, status="unavailable"
        )

    return ModelStatusResponse(
        sea_ice_model=sea_ice_meta,
        iceberg_model=iceberg_meta,
        fallback_enabled=True
    )

@router.post("/sea-ice", response_model=SeaIceForecastResponse)
async def forecast_sea_ice(request: ForecastRequest, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """
    Predict future sea ice concentration.
    """
    snapshot = provider.get_snapshot()
    
    # Find closest sea ice reading
    if request.latitude is not None and request.longitude is not None:
        if not snapshot.sea_ice:
            raise HTTPException(status_code=404, detail="No sea ice data available")
            
        import math
        def dist(si): return math.hypot(si.latitude - request.latitude, si.longitude - request.longitude)
        closest_ice = min(snapshot.sea_ice, key=dist)
    else:
        raise HTTPException(status_code=400, detail="Must provide latitude and longitude")

    return forecast_gate.get_sea_ice_forecast(closest_ice, snapshot, request.horizon_hours)

@router.post("/iceberg", response_model=IcebergForecastResponse)
async def forecast_iceberg(request: ForecastRequest, user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))):
    """
    Predict future iceberg drift.
    """
    snapshot = provider.get_snapshot()
    
    if not request.item_id:
        raise HTTPException(status_code=400, detail="Must provide iceberg item_id")
        
    iceberg = next((b for b in snapshot.icebergs if b.id == request.item_id), None)
    if not iceberg:
        raise HTTPException(status_code=404, detail=f"Iceberg {request.item_id} not found")

    return forecast_gate.get_iceberg_forecast(iceberg, snapshot, request.horizon_hours)
