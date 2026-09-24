"""
Internal Normalized Geographic Data Models for Antarctic Maritime Navigation Decision-Support System.
Provides strict Pydantic validation, coordinate boundary checks, and normalized units (WGS-84, Knots, UTC).
"""

from datetime import datetime, timezone
import math
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator


class Coordinate(BaseModel):
    """
    Validated WGS-84 Geographic Coordinate.
    Latitude: [-90.0, 90.0]
    Longitude: [-180.0, 180.0]
    """
    latitude: float = Field(..., description="Latitude in decimal degrees [-90.0, 90.0]")
    longitude: float = Field(..., description="Longitude in decimal degrees [-180.0, 180.0]")
    label: Optional[str] = None

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if math.isnan(v) or math.isinf(v):
            raise ValueError("Latitude cannot be NaN or Infinite")
        if not (-90.0 <= v <= 90.0):
            raise ValueError(f"Latitude {v} must be within [-90.0, 90.0]")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if math.isnan(v) or math.isinf(v):
            raise ValueError("Longitude cannot be NaN or Infinite")
        if not (-180.0 <= v <= 180.0):
            raise ValueError(f"Longitude {v} must be within [-180.0, 180.0]")
        return round(v, 6)


class NormalizedVessel(BaseModel):
    """
    Validated Vessel Telemetry Model.
    """
    id: str = Field(..., min_length=1, description="Unique vessel identifier")
    name: str = Field(..., min_length=1, description="Vessel display name")
    latitude: float
    longitude: float
    speed_knots: float = Field(..., ge=0.0, le=60.0, description="Speed over ground in knots [0.0, 60.0]")
    heading_degrees: float = Field(..., ge=0.0, le=360.0, description="True gyro heading in degrees [0.0, 360.0]")
    status: str = Field(default="cruising", description="Operational status: cruising, icebreaking, anchored, stopped")
    destination: str = Field(default="Demo Station", description="Voyage destination port/station")
    ice_class: Optional[str] = Field(default="PC2", description="Polar ice class rating (e.g. PC1, PC2, PC3)")
    source: str = Field(default="AIS_SIMULATED", description="Data source provider identifier")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    safety_radius_nm: float = Field(default=2.5, ge=0.5, le=20.0, description="Minimum safety clearance radius in NM")

    @field_validator("latitude")
    @classmethod
    def validate_vessel_lat(cls, v: float) -> float:
        if math.isnan(v) or not (-90.0 <= v <= 90.0):
            raise ValueError(f"Invalid vessel latitude: {v}")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_vessel_lon(cls, v: float) -> float:
        if math.isnan(v) or not (-180.0 <= v <= 180.0):
            raise ValueError(f"Invalid vessel longitude: {v}")
        return round(v, 6)


class NormalizedIceberg(BaseModel):
    """
    Validated Iceberg Hazard Model.
    """
    id: str = Field(..., min_length=1, description="Unique iceberg identifier (e.g. A-81, B-15)")
    name: Optional[str] = Field(default=None, description="Designation name")
    latitude: float
    longitude: float
    polygon: List[Coordinate] = Field(default_factory=list, description="Perimeter boundary polygon vertices")
    size_class: Literal["giant", "large", "medium", "small", "growler"] = Field(
        default="medium", description="Size category"
    )
    threat_level: Literal["critical", "high", "medium", "low"] = Field(
        default="medium", description="Hazard threat level"
    )
    drift_speed_knots: float = Field(default=1.0, ge=0.0, le=15.0, description="Kinematic drift speed in knots")
    drift_heading_degrees: float = Field(default=215.0, ge=0.0, le=360.0, description="Kinematic drift heading")
    hazard_radius_nm: float = Field(default=3.0, ge=0.2, le=30.0, description="Exclusion hazard buffer in NM")
    source: str = Field(default="BYU_NIC_DEMO", description="Data provider tag")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("latitude")
    @classmethod
    def validate_iceberg_lat(cls, v: float) -> float:
        if math.isnan(v) or not (-90.0 <= v <= 90.0):
            raise ValueError(f"Invalid iceberg latitude: {v}")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_iceberg_lon(cls, v: float) -> float:
        if math.isnan(v) or not (-180.0 <= v <= 180.0):
            raise ValueError(f"Invalid iceberg longitude: {v}")
        return round(v, 6)


class NormalizedSeaIce(BaseModel):
    """
    Validated Sea Ice Observation / Grid Cell Model.
    Concentration: [0.0, 10.0] in tenths (e.g., 6.5/10) or fractional [0.0, 1.0].
    """
    latitude: float
    longitude: float
    concentration_tenths: float = Field(..., ge=0.0, le=10.0, description="Sea ice concentration in tenths [0.0, 10.0]")
    thickness_meters: Optional[float] = Field(default=0.8, ge=0.0, le=10.0, description="Estimated ice thickness in meters")
    stage_of_development: Optional[str] = Field(default="first_year_ice", description="Ice development classification")
    source: str = Field(default="NSIDC_DEMO", description="Source provider identifier")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("latitude")
    @classmethod
    def validate_sea_ice_lat(cls, v: float) -> float:
        if math.isnan(v) or not (-90.0 <= v <= 90.0):
            raise ValueError(f"Invalid sea ice latitude: {v}")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_sea_ice_lon(cls, v: float) -> float:
        if math.isnan(v) or not (-180.0 <= v <= 180.0):
            raise ValueError(f"Invalid sea ice longitude: {v}")
        return round(v, 6)


class NormalizedWeather(BaseModel):
    """
    Validated Meteorological Observation Model.
    """
    latitude: float
    longitude: float
    wind_speed_knots: float = Field(..., ge=0.0, le=150.0, description="Sustained wind speed in knots")
    wind_direction_deg: float = Field(..., ge=0.0, le=360.0, description="True wind direction degrees [0.0, 360.0]")
    temperature_c: float = Field(default=-15.0, ge=-80.0, le=40.0, description="Air temperature in Celsius")
    visibility_nm: float = Field(default=5.0, ge=0.0, le=50.0, description="Nautical surface visibility in NM")
    pressure_hpa: Optional[float] = Field(default=1013.25, ge=870.0, le=1085.0, description="Atmospheric pressure in hPa")
    freezing_rate_cm_day: float = Field(default=2.5, ge=0.0, le=25.0, description="Estimated freezing rate cm/day")
    source: str = Field(default="ERA5_DEMO", description="Source provider identifier")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("latitude")
    @classmethod
    def validate_weather_lat(cls, v: float) -> float:
        if math.isnan(v) or not (-90.0 <= v <= 90.0):
            raise ValueError(f"Invalid weather latitude: {v}")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_weather_lon(cls, v: float) -> float:
        if math.isnan(v) or not (-180.0 <= v <= 180.0):
            raise ValueError(f"Invalid weather longitude: {v}")
        return round(v, 6)


class NormalizedOceanCurrent(BaseModel):
    """
    Validated Ocean Hydrodynamic Current Model.
    """
    latitude: float
    longitude: float
    current_speed_knots: float = Field(..., ge=0.0, le=10.0, description="Surface current velocity in knots")
    current_direction_deg: float = Field(..., ge=0.0, le=360.0, description="True current drift direction degrees")
    source: str = Field(default="COPERNICUS_DEMO", description="Source provider identifier")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("latitude")
    @classmethod
    def validate_current_lat(cls, v: float) -> float:
        if math.isnan(v) or not (-90.0 <= v <= 90.0):
            raise ValueError(f"Invalid current latitude: {v}")
        return round(v, 6)

    @field_validator("longitude")
    @classmethod
    def validate_current_lon(cls, v: float) -> float:
        if math.isnan(v) or not (-180.0 <= v <= 180.0):
            raise ValueError(f"Invalid current longitude: {v}")
        return round(v, 6)


class NormalizedEnvironmentalSnapshot(BaseModel):
    """
    Consolidated Multi-Source Environmental State Snapshot.
    """
    vessels: List[NormalizedVessel] = Field(default_factory=list)
    icebergs: List[NormalizedIceberg] = Field(default_factory=list)
    sea_ice: List[NormalizedSeaIce] = Field(default_factory=list)
    weather: Optional[NormalizedWeather] = None
    ocean_currents: List[NormalizedOceanCurrent] = Field(default_factory=list)
    source: str = Field(default="COMPOSITE_PROVIDER")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
