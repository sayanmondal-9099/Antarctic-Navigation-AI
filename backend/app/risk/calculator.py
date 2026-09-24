"""
Standalone Mathematical Maritime Risk Engine for Antarctic Maritime Navigation Decision-Support System.
Implements geodetic Haversine calculations, multi-factor risk weighting, classification,
and explainable decision-support telemetry.
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from app.models.data_models import (
    NormalizedVessel,
    NormalizedIceberg,
    NormalizedSeaIce,
    NormalizedWeather,
    NormalizedOceanCurrent,
    NormalizedEnvironmentalSnapshot,
)
from app.models.schemas import RiskContributor, VesselRiskAssessment, Position


# Mean Earth radius in Nautical Miles (1 NM = 1.852 km; 6371.0088 km / 1.852 = 3440.065 NM)
EARTH_RADIUS_NM = 3440.065


def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes geodetic great-circle distance between two WGS-84 coordinates in Nautical Miles.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_NM * c, 2)


class RiskConfig:
    """
    Configurable Risk Weights and Classification Thresholds.
    """
    def __init__(
        self,
        iceberg_weight: float = 0.35,
        ice_weight: float = 0.25,
        vessel_weight: float = 0.20,
        weather_weight: float = 0.15,
        current_weight: float = 0.05,
        low_threshold: float = 0.25,
        moderate_threshold: float = 0.50,
        high_threshold: float = 0.75,
    ):
        # Normalize weights to sum to 1.0
        total = iceberg_weight + ice_weight + vessel_weight + weather_weight + current_weight
        if total <= 0:
            total = 1.0
        self.iceberg_weight = iceberg_weight / total
        self.ice_weight = ice_weight / total
        self.vessel_weight = vessel_weight / total
        self.weather_weight = weather_weight / total
        self.current_weight = current_weight / total

        self.low_threshold = low_threshold
        self.moderate_threshold = moderate_threshold
        self.high_threshold = high_threshold

    def classify_score(self, score: float) -> str:
        """Classifies numerical risk [0.0, 1.0] into standardized levels."""
        if score < self.low_threshold:
            return "LOW"
        elif score < self.moderate_threshold:
            return "MODERATE"
        elif score < self.high_threshold:
            return "HIGH"
        else:
            return "CRITICAL"


class RiskCalculator:
    """
    Standalone Maritime Risk Calculator.
    """

    def __init__(self, config: Optional[RiskConfig] = None):
        self.config = config or RiskConfig()

    def calculate_iceberg_proximity_risk(
        self,
        lat: float,
        lon: float,
        icebergs: List[NormalizedIceberg]
    ) -> Tuple[float, Optional[float], Optional[str], str, str]:
        """
        Evaluates iceberg proximity risk.
        Returns (score, closest_dist_nm, closest_iceberg_name, level, details).
        """
        if not icebergs:
            return 0.05, None, None, "LOW", "No tracked icebergs in local navigation sector."

        closest_dist = float("inf")
        closest_berg: Optional[NormalizedIceberg] = None

        for berg in icebergs:
            dist = haversine_distance_nm(lat, lon, berg.latitude, berg.longitude)
            if dist < closest_dist:
                closest_dist = dist
                closest_berg = berg

        if closest_berg is None:
            return 0.05, None, None, "LOW", "No ice hazards detected."

        buf = closest_berg.hazard_radius_nm
        threat_multiplier = 1.0 if closest_berg.threat_level in ["critical", "high"] else 0.75 if closest_berg.threat_level == "medium" else 0.5

        # Distance-based risk calculation
        if closest_dist <= buf:
            raw_score = 1.0
        elif closest_dist <= buf * 3.0:
            # Linear decay from 1.0 to 0.15 between buf and 3*buf
            fraction = (closest_dist - buf) / (2.0 * buf)
            raw_score = 1.0 - (fraction * 0.85)
        elif closest_dist <= 15.0:
            raw_score = max(0.1, 0.35 * (1.0 - (closest_dist - buf * 3.0) / 15.0))
        else:
            raw_score = 0.05

        score = min(1.0, max(0.0, round(raw_score * threat_multiplier, 3)))
        level = self.config.classify_score(score)
        
        details = (
            f"Closest iceberg '{closest_berg.name or closest_berg.id}' is {closest_dist} NM away "
            f"({closest_berg.threat_level.upper()} threat, safety buffer {buf} NM)."
        )
        return score, closest_dist, (closest_berg.name or closest_berg.id), level, details

    def calculate_vessel_proximity_risk(
        self,
        ownship: NormalizedVessel,
        all_vessels: List[NormalizedVessel]
    ) -> Tuple[float, Optional[float], Optional[str], str, str]:
        """
        Evaluates multi-vessel traffic proximity risk.
        Returns (score, nearest_dist_nm, nearest_vessel_name, level, details).
        """
        other_vessels = [v for v in all_vessels if v.id != ownship.id]
        if not other_vessels:
            return 0.0, None, None, "LOW", "No other vessels operating within AIS reception range."

        nearest_dist = float("inf")
        nearest_vessel: Optional[NormalizedVessel] = None

        for v in other_vessels:
            dist = haversine_distance_nm(ownship.latitude, ownship.longitude, v.latitude, v.longitude)
            if dist < nearest_dist:
                nearest_dist = dist
                nearest_vessel = v

        if nearest_vessel is None:
            return 0.0, None, None, "LOW", "Clear AIS traffic corridor."

        safety_rad = ownship.safety_radius_nm

        # Proximity evaluation
        if nearest_dist <= safety_rad:
            score = 0.95
        elif nearest_dist <= safety_rad * 2.0:
            score = 0.65
        elif nearest_dist <= safety_rad * 4.0:
            score = 0.30
        elif nearest_dist <= 20.0:
            score = 0.10
        else:
            score = 0.02

        score = min(1.0, max(0.0, round(score, 3)))
        level = self.config.classify_score(score)
        details = (
            f"Nearest vessel '{nearest_vessel.name}' is {nearest_dist} NM away "
            f"(Heading {nearest_vessel.heading_degrees}°, Speed {nearest_vessel.speed_knots} kts)."
        )
        return score, nearest_dist, nearest_vessel.name, level, details

    def calculate_sea_ice_risk(
        self,
        lat: float,
        lon: float,
        sea_ice_grid: List[NormalizedSeaIce]
    ) -> Tuple[float, str, str]:
        """
        Evaluates sea-ice concentration risk at coordinates.
        Returns (score, level, details).
        """
        if not sea_ice_grid:
            return 0.20, "LOW", "Sea-ice concentration benchmark baseline (2/10 open drift ice)."

        # Find closest grid sample
        closest_ice = min(sea_ice_grid, key=lambda p: haversine_distance_nm(lat, lon, p.latitude, p.longitude))
        conc = closest_ice.concentration_tenths  # [0.0, 10.0]

        # Convert tenths to [0.0, 1.0] risk curve
        if conc >= 8.0:
            score = 0.90
        elif conc >= 6.0:
            score = 0.65
        elif conc >= 4.0:
            score = 0.40
        elif conc >= 2.0:
            score = 0.20
        else:
            score = 0.05

        level = self.config.classify_score(score)
        details = f"Pack ice concentration {conc:.1f}/10 ({level} pack density at {closest_ice.thickness_meters or 0.8}m thickness)."
        return score, level, details

    def calculate_weather_risk(
        self,
        weather: Optional[NormalizedWeather]
    ) -> Tuple[float, str, str]:
        """
        Evaluates meteorological risk.
        Returns (score, level, details).
        """
        if weather is None:
            return 0.15, "LOW", "Standard polar maritime weather conditions."

        wind_spd = weather.wind_speed_knots
        temp = weather.temperature_c
        vis = weather.visibility_nm

        # Wind component [0.0, 0.5]
        wind_risk = min(0.5, (wind_spd / 50.0) * 0.5) if wind_spd > 15.0 else 0.05
        # Temperature / Freezing Spray component [0.0, 0.3]
        icing_risk = 0.3 if temp < -15.0 else 0.15 if temp < -5.0 else 0.0
        # Visibility component [0.0, 0.2]
        vis_risk = 0.2 if vis < 1.0 else 0.1 if vis < 3.0 else 0.0

        total_weather = min(1.0, round(wind_risk + icing_risk + vis_risk, 3))
        level = self.config.classify_score(total_weather)
        details = (
            f"Wind {wind_spd} kts ({weather.wind_direction_deg}°), "
            f"Temp {temp}°C, Visibility {vis} NM, Freezing rate {weather.freezing_rate_cm_day} cm/d."
        )
        return total_weather, level, details

    def calculate_ocean_current_risk(
        self,
        currents: List[NormalizedOceanCurrent]
    ) -> Tuple[float, str, str]:
        """
        Evaluates hydrodynamic current risk.
        """
        if not currents:
            return 0.05, "LOW", "Normal Weddell Sea gyre circulation."

        max_speed = max((c.current_speed_knots for c in currents), default=0.6)
        score = min(1.0, round(max_speed / 3.0, 3))
        level = self.config.classify_score(score)
        details = f"Maximum surface drift current {max_speed} kts."
        return score, level, details

    def evaluate_vessel_risk(
        self,
        vessel: NormalizedVessel,
        snapshot: NormalizedEnvironmentalSnapshot
    ) -> VesselRiskAssessment:
        """
        Performs full multivariable weighted risk assessment for a specific vessel.
        """
        # 1. Iceberg proximity
        berg_score, closest_berg_nm, closest_berg_name, berg_level, berg_details = self.calculate_iceberg_proximity_risk(
            vessel.latitude, vessel.longitude, snapshot.icebergs
        )

        # 2. Sea Ice
        ice_score, ice_level, ice_details = self.calculate_sea_ice_risk(
            vessel.latitude, vessel.longitude, snapshot.sea_ice
        )

        # 3. Vessel Traffic proximity
        vessel_score, nearest_vessel_nm, nearest_vessel_name, traffic_level, vessel_details = self.calculate_vessel_proximity_risk(
            vessel, snapshot.vessels
        )

        # 4. Weather
        weather_score, weather_level, weather_details = self.calculate_weather_risk(snapshot.weather)

        # 5. Currents
        current_score, current_level, current_details = self.calculate_ocean_current_risk(snapshot.ocean_currents)

        # Multi-factor weighted score calculation
        w_berg = self.config.iceberg_weight
        w_ice = self.config.ice_weight
        w_vessel = self.config.vessel_weight
        w_weather = self.config.weather_weight
        w_current = self.config.current_weight

        overall_score = round(
            berg_score * w_berg +
            ice_score * w_ice +
            vessel_score * w_vessel +
            weather_score * w_weather +
            current_score * w_current,
            3
        )
        overall_level = self.config.classify_score(overall_score)
        safety_percent = max(0, min(100, int((1.0 - overall_score) * 100)))

        contributors = [
            RiskContributor(
                name="Iceberg Proximity",
                category="iceberg",
                score=berg_score,
                level=berg_level,
                weight=round(w_berg, 2),
                weighted_score=round(berg_score * w_berg, 3),
                details=berg_details,
            ),
            RiskContributor(
                name="Sea Ice Concentration",
                category="sea_ice",
                score=ice_score,
                level=ice_level,
                weight=round(w_ice, 2),
                weighted_score=round(ice_score * w_ice, 3),
                details=ice_details,
            ),
            RiskContributor(
                name="Nearby Vessel Traffic",
                category="vessel",
                score=vessel_score,
                level=traffic_level,
                weight=round(w_vessel, 2),
                weighted_score=round(vessel_score * w_vessel, 3),
                details=vessel_details,
            ),
            RiskContributor(
                name="Weather & Wind",
                category="weather",
                score=weather_score,
                level=weather_level,
                weight=round(w_weather, 2),
                weighted_score=round(weather_score * w_weather, 3),
                details=weather_details,
            ),
            RiskContributor(
                name="Ocean Current Drift",
                category="current",
                score=current_score,
                level=current_level,
                weight=round(w_current, 2),
                weighted_score=round(current_score * w_current, 3),
                details=current_details,
            ),
        ]

        # Generate human-readable explanation and recommendations
        explanation = [
            f"Overall Situational Risk: {overall_level} ({overall_score * 100:.1f}% risk index, Safety Rating {safety_percent}%).",
        ]
        if closest_berg_nm is not None:
            explanation.append(f"• Iceberg Threat: {berg_level} — Closest hazard '{closest_berg_name}' at {closest_berg_nm} NM.")
        if ice_score > 0.4:
            explanation.append(f"• Sea Ice Threat: {ice_level} — Significant pack ice density in navigation sector.")
        if nearest_vessel_nm is not None:
            explanation.append(f"• Traffic Threat: {traffic_level} — Nearest AIS vessel '{nearest_vessel_name}' at {nearest_vessel_nm} NM.")
        if weather_score > 0.4:
            explanation.append(f"• Weather Advisory: {weather_level} — Heavy wind and freezing spray advisory in effect.")

        return VesselRiskAssessment(
            vessel_id=vessel.id,
            vessel_name=vessel.name,
            position=Position(lat=vessel.latitude, lon=vessel.longitude),
            overall_score=overall_score,
            risk_level=overall_level,
            safety_score_percent=safety_percent,
            closest_iceberg_nm=closest_berg_nm,
            nearest_vessel_nm=nearest_dist_nm if 'nearest_dist_nm' in locals() else nearest_vessel_nm,
            contributors=contributors,
            explanation=explanation,
        )
