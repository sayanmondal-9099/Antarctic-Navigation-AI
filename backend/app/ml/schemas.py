from datetime import datetime, timezone
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from app.models.schemas import Position

class ForecastRequest(BaseModel):
    horizon_hours: int = Field(default=24, ge=1, le=168, description="Forecast horizon in hours")
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    item_id: Optional[str] = None

class SeaIceForecastResponse(BaseModel):
    latitude: float
    longitude: float
    forecast_time: str
    predicted_concentration: float
    confidence: str # "HIGH", "MODERATE", "LOW"
    model_version: str

class IcebergForecastResponse(BaseModel):
    iceberg_id: str
    current_position: Position
    predicted_position: Position
    predicted_track: List[Position]
    forecast_time: str
    confidence: str # "HIGH", "MODERATE", "LOW"
    model_version: str

class ModelMetadata(BaseModel):
    model_name: str
    model_version: str
    training_data_range: str
    features: List[str]
    training_timestamp: str
    metrics: Dict[str, float]
    status: str # "ready", "experimental", "fallback_only", "unavailable"

class ModelStatusResponse(BaseModel):
    sea_ice_model: ModelMetadata
    iceberg_model: ModelMetadata
    fallback_enabled: bool
