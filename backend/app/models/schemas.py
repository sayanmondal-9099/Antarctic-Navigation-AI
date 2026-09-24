from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# ── Health & Version ─────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "antarctic-navigation-api"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VersionResponse(BaseModel):
    version: str = "0.1.0"
    service: str = "antarctic-navigation-api"

# ── Core Geospatial & Vessel Telemetry ────────────────────────────────────────

class Position(BaseModel):
    lat: float
    lon: float

class Vessel(BaseModel):
    id: str
    name: str
    type: Optional[str] = "research"
    position: Position
    heading: float
    speed_knots: float
    destination: str
    status: Optional[str] = "cruising"

class Iceberg(BaseModel):
    id: str
    name: Optional[str] = None
    size_class: str
    threat_level: Optional[str] = "medium"
    polygon: List[Position]

# ── Waypoints, Routing & Alerts ───────────────────────────────────────────────

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
    risk_tolerance: Optional[str] = "balanced"

class RiskBreakdown(BaseModel):
    ice: float
    iceberg: float
    weather: float
    current: float
    vessel: float

class RouteResponse(BaseModel):
    id: str
    name: str
    type: str
    total_distance_nm: float
    estimated_duration_hours: float
    average_risk_score: float
    risk_level: str
    routing_mode: str
    risk_breakdown: RiskBreakdown
    waypoints: List[Waypoint]
    advisories: List[str]

class RoutingResponse(BaseModel):
    recommended_route: RouteResponse
    alternative_routes: List[RouteResponse] = []
    warnings: List[str] = []

class RiskScore(BaseModel):
    score: float
    level: str  # "low" | "medium" | "high" | "critical"
    factor: str
    description: str

class Alert(BaseModel):
    id: str
    severity: str  # "info" | "warning" | "critical"
    category: str
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

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

# ── Standalone Risk Engine API Models ────────────────────────────────────────

class RiskContributor(BaseModel):
    name: str  # e.g., "Iceberg Proximity", "Sea Ice Concentration", "Weather & Wind", "Nearby Vessels"
    category: str
    score: float  # [0.0, 1.0]
    level: str  # "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
    weight: float
    weighted_score: float
    details: str

class VesselRiskAssessment(BaseModel):
    vessel_id: str
    vessel_name: str
    position: Position
    overall_score: float  # [0.0, 1.0]
    risk_level: str  # "LOW" | "MODERATE" | "HIGH" | "CRITICAL"
    safety_score_percent: int  # [0, 100]
    closest_iceberg_nm: Optional[float] = None
    nearest_vessel_nm: Optional[float] = None
    contributors: List[RiskContributor]
    explanation: List[str]
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AreaRiskAssessment(BaseModel):
    bounds: Dict[str, float]  # min_lat, max_lat, min_lon, max_lon
    total_grid_points: int
    average_risk: float
    max_risk: float
    critical_zones_count: int
    high_risk_zones_count: int
    icebergs_detected: int
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EvaluateRiskRequest(BaseModel):
    latitude: float
    longitude: float
    speed_knots: Optional[float] = 12.0
    heading_degrees: Optional[float] = 0.0
    vessel_id: Optional[str] = None
    weights: Optional[Dict[str, float]] = None

# ── Multi-Vessel Fleet Intelligence Models ──────────────────────────────────────

class FleetVessel(Vessel):
    country: Optional[str] = "International"
    mission: Optional[str] = "Routine Transit"
    priority: Optional[str] = "Normal"  # e.g. "Emergency", "Scientific Mission", "Supply Mission", "Routine Transit"
    safety_radius_nm: Optional[float] = 5.0
    # Additional fields specific to fleet dashboard
    eta_destination: Optional[str] = None
    current_risk: Optional[str] = "LOW"

class ConflictDetection(BaseModel):
    vessel_a_id: str
    vessel_b_id: str
    cpa_nm: float
    tcpa_minutes: float
    severity: str  # "LOW", "MODERATE", "HIGH", "CRITICAL"
    conflict_location: Position

class ConvoyRequest(BaseModel):
    lead_vessel_id: str
    support_vessel_ids: List[str]
    origin: Position
    destination: Position
    spacing_nm: Optional[float] = 1.0

class ConvoyResponse(BaseModel):
    convoy_id: str
    shared_corridor: RouteResponse
    vessel_routes: Dict[str, RouteResponse]
    estimated_formation_time: str
    advisories: List[str]

class RendezvousRequest(BaseModel):
    vessel_a_id: str
    vessel_b_id: str
    meeting_point: Optional[Position] = None  # If none, planner calculates midpoint
    target_time: Optional[str] = None

class RendezvousResponse(BaseModel):
    meeting_point: Position
    vessel_a_route: RouteResponse
    vessel_b_route: RouteResponse
    vessel_a_eta: str
    vessel_b_eta: str
    waiting_time_minutes: float
    advisories: List[str]

# ── Environmental Intelligence Models ──────────────────────────────────────────

class EnvironmentSummaryRequest(BaseModel):
    latitude: float
    longitude: float

class EnvironmentSummaryResponse(BaseModel):
    weather: Optional[Any] = None  # Using Any to dodge strict circular dep with NormalizedWeather if needed, or we can use dict
    ocean_current: Optional[Any] = None
    sea_ice_concentration: Optional[float] = None
    environmental_risk_level: str
    advisories: List[str]
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
