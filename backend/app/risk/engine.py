"""
Integrated Situational Risk Assessment Engine.
Connects Normalized Providers and the Standalone RiskCalculator to produce
situational risk evaluations and spatial risk assessments.
"""

from typing import List, Dict, Any, Optional
from app.models.schemas import RiskEvaluationResponse, RiskFactor, VesselRiskAssessment, AreaRiskAssessment
from app.models.data_models import NormalizedVessel, NormalizedIceberg, NormalizedEnvironmentalSnapshot
from app.data.providers import DemoDataProvider, BaseDataProvider
from app.risk.calculator import RiskCalculator, RiskConfig, haversine_distance_nm


def evaluate_situational_risk(
    icebergs_data: List[Dict[str, Any]],
    vessels_data: List[Dict[str, Any]],
    vessel_id: str = "vessel-A"
) -> RiskEvaluationResponse:
    """
    Deterministic multi-factor risk assessment (Backward-compatible schema).
    Calculates safety scores, threat levels, and advisories based on iceberg density and traffic.
    """
    provider = DemoDataProvider()
    snapshot = provider.get_snapshot()
    calculator = RiskCalculator()

    # Find the target vessel in normalized vessels or fallback
    target_vessel = next((v for v in snapshot.vessels if v.id == vessel_id), None)
    if target_vessel is None and snapshot.vessels:
        target_vessel = snapshot.vessels[0]

    if target_vessel:
        assessment = calculator.evaluate_vessel_risk(target_vessel, snapshot)
        icebergs_count = len(snapshot.icebergs)
        nearby_vessels_count = max(0, len(snapshot.vessels) - 1)

        factors = [
            RiskFactor(
                category=c.category.title(),
                score_percent=int(c.score * 100),
                rating=c.level.title(),
                details=c.details,
                trend="stable",
            )
            for c in assessment.contributors
        ]

        return RiskEvaluationResponse(
            overall_safety_score=assessment.safety_score_percent,
            threat_status="SECURE" if assessment.risk_level in ["LOW", "MODERATE"] else "ELEVATED",
            risk_level=assessment.risk_level,
            icebergs_count=icebergs_count,
            nearby_vessels_count=nearby_vessels_count,
            factors=factors,
            advisories=assessment.explanation,
        )

    # Fallback response
    return RiskEvaluationResponse(
        overall_safety_score=76,
        threat_status="SECURE",
        risk_level="MEDIUM",
        icebergs_count=len(icebergs_data),
        nearby_vessels_count=max(0, len(vessels_data) - 1),
        factors=[
            RiskFactor(
                category="Iceberg",
                score_percent=60,
                rating="Moderate",
                details="Tabular fragments drifting SW",
                trend="stable",
            )
        ],
        advisories=["Situational baseline nominal."],
    )


def evaluate_vessel_by_id(
    vessel_id: str,
    provider: Optional[BaseDataProvider] = None,
    config: Optional[RiskConfig] = None
) -> Optional[VesselRiskAssessment]:
    """
    Evaluates standardized VesselRiskAssessment for a given vessel ID.
    """
    prov = provider or DemoDataProvider()
    snapshot = prov.get_snapshot()
    calculator = RiskCalculator(config=config)

    vessel = next((v for v in snapshot.vessels if v.id == vessel_id), None)
    if vessel is None:
        return None

    return calculator.evaluate_vessel_risk(vessel, snapshot)


def evaluate_area_risk(
    min_lat: float = -62.0,
    max_lat: float = -59.0,
    min_lon: float = -47.0,
    max_lon: float = -38.0,
    grid_step: float = 0.5,
    provider: Optional[BaseDataProvider] = None,
    config: Optional[RiskConfig] = None
) -> AreaRiskAssessment:
    """
    Evaluates risk distribution across a spatial bounding box.
    """
    prov = provider or DemoDataProvider()
    snapshot = prov.get_snapshot()
    calculator = RiskCalculator(config=config)

    grid_scores = []
    lat_cur = min_lat
    while lat_cur <= max_lat:
        lon_cur = min_lon
        while lon_cur <= max_lon:
            # Evaluate synthetic point
            berg_score, _, _, _, _ = calculator.calculate_iceberg_proximity_risk(lat_cur, lon_cur, snapshot.icebergs)
            ice_score, _, _ = calculator.calculate_sea_ice_risk(lat_cur, lon_cur, snapshot.sea_ice)
            weather_score, _, _ = calculator.calculate_weather_risk(snapshot.weather)

            pt_score = (
                berg_score * calculator.config.iceberg_weight +
                ice_score * calculator.config.ice_weight +
                weather_score * calculator.config.weather_weight
            ) / (calculator.config.iceberg_weight + calculator.config.ice_weight + calculator.config.weather_weight)

            grid_scores.append(pt_score)
            lon_cur += grid_step
        lat_cur += grid_step

    total_pts = len(grid_scores)
    avg_risk = round(sum(grid_scores) / total_pts, 3) if total_pts > 0 else 0.0
    max_risk = round(max(grid_scores), 3) if total_pts > 0 else 0.0
    crit_count = sum(1 for s in grid_scores if s >= calculator.config.high_threshold)
    high_count = sum(1 for s in grid_scores if calculator.config.moderate_threshold <= s < calculator.config.high_threshold)

    return AreaRiskAssessment(
        bounds={"min_lat": min_lat, "max_lat": max_lat, "min_lon": min_lon, "max_lon": max_lon},
        total_grid_points=total_pts,
        average_risk=avg_risk,
        max_risk=max_risk,
        critical_zones_count=crit_count,
        high_risk_zones_count=high_count,
        icebergs_detected=len(snapshot.icebergs),
    )
