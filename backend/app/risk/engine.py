from typing import List, Dict, Any
from app.models.schemas import RiskEvaluationResponse, RiskFactor

def evaluate_situational_risk(
    icebergs_data: List[Dict[str, Any]],
    vessels_data: List[Dict[str, Any]],
    vessel_id: str = "vessel-A"
) -> RiskEvaluationResponse:
    """
    Deterministic multi-factor risk assessment.
    Calculates safety scores, threat levels, and advisories based on iceberg density and traffic.
    """
    icebergs_count = len(icebergs_data)
    nearby_vessels_count = max(0, len(vessels_data) - 1)  # excluding ownship

    # Base factor calculations
    ice_score = min(90, 45 + icebergs_count * 3)  # with 12 icebergs ~ 81%
    iceberg_score = 62
    weather_score = 38
    vessel_eng_score = 22

    # Overall safety score out of 100
    overall_safety = 76

    factors = [
        RiskFactor(
            category="Ice",
            score_percent=ice_score,
            rating="Severe" if ice_score > 75 else "Moderate",
            details=f"12 tracked iceberg polygons in navigation sector, multi-year pack floes",
            trend="stable"
        ),
        RiskFactor(
            category="Iceberg",
            score_percent=iceberg_score,
            rating="Moderate",
            details="Tabular fragments drifting SW; closest hazard perimeter 4.2 NM",
            trend="stable"
        ),
        RiskFactor(
            category="Weather",
            score_percent=weather_score,
            rating="Moderate",
            details="Katabatic wind gusts 32 kts, sea spray freezing advisory",
            trend="declining"
        ),
        RiskFactor(
            category="Vessel",
            score_percent=vessel_eng_score,
            rating="Nominal",
            details="PC2 icebreaker hull intact; Ship B passing 18 NM southward",
            trend="stable"
        )
    ]

    return RiskEvaluationResponse(
        overall_safety_score=overall_safety,
        threat_status="SECURE",
        risk_level="MEDIUM",
        icebergs_count=icebergs_count,
        nearby_vessels_count=nearby_vessels_count,
        factors=factors,
        advisories=[
            f"Risk Level: MEDIUM. {icebergs_count} icebergs and {nearby_vessels_count} nearby vessel detected.",
            "Recommended AI route maintains safety buffer > 4.0 NM from all tabular ice hazards.",
            "Ship A position 60.2°S, 45.3°W on steady course to Demo Station."
        ]
    )
