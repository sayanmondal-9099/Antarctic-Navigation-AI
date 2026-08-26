from typing import List, Optional
from pydantic import BaseModel

class Position(BaseModel):
    lat: float
    lon: float

class Vessel(BaseModel):
    id: str
    name: str
    type: str
    position: Position
    heading: float
    speed_knots: float
    destination: str

class Iceberg(BaseModel):
    id: str
    name: Optional[str] = None
    size_class: str
    threat_level: Optional[str] = "medium"
    polygon: List[Position]

class Waypoint(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    order: int
    ice_risk_score: float
    notes: Optional[str] = None

class RouteRequest(BaseModel):
    origin: Position
    destination: Position
    vessel_id: Optional[str] = "vessel-A"
    risk_tolerance: Optional[str] = "medium"

class RouteResponse(BaseModel):
    id: str
    name: str
    type: str
    total_distance_nm: float
    estimated_duration_hours: float
    average_risk_score: float
    waypoints: List[Waypoint]
    advisories: List[str]

class RiskFactor(BaseModel):
    category: str
    score_percent: int
    rating: str
    details: str
    trend: str

class RiskEvaluationResponse(BaseModel):
    overall_safety_score: int
    threat_status: str
    risk_level: str
    icebergs_count: int
    nearby_vessels_count: int
    factors: List[RiskFactor]
    advisories: List[str]
