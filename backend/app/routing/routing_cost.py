"""
Centralized routing cost component.
Translates multi-factor risk levels into A* graph edge penalties.
"""
import math
from typing import Dict, Any, Tuple, Optional
from app.models.schemas import RiskBreakdown
from app.models.data_models import NormalizedEnvironmentalSnapshot, NormalizedVessel
from app.risk.calculator import RiskCalculator, RiskConfig, haversine_distance_nm

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dLon = math.radians(lon2 - lon1)
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    x = math.sin(dLon) * math.cos(lat2_rad)
    y = math.cos(lat1_rad) * math.sin(lat2_rad) - (math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(dLon))
    bearing = math.atan2(x, y)
    return (math.degrees(bearing) + 360) % 360

class RoutingCostEvaluator:
    def __init__(self, risk_config: RiskConfig):
        self.risk_calculator = RiskCalculator(config=risk_config)
        self.risk_config = risk_config
        
    def evaluate_edge_cost(
        self,
        lat: float,
        lon: float,
        distance_nm: float,
        snapshot: NormalizedEnvironmentalSnapshot,
        ownship: NormalizedVessel,
        prev_lat: Optional[float] = None,
        prev_lon: Optional[float] = None,
        forecast_hazards: Optional[list] = None
    ) -> Tuple[float, RiskBreakdown, bool, float, float]:
        """
        Calculates penalty cost for an edge traversing into (lat, lon).
        Returns:
            - total cost of edge (distance + risk penalty)
            - RiskBreakdown scores for UI analysis
            - is_blocked flag if risk is too critical to traverse
            - total risk score (0.0 to 1.0)
            - effective_speed_knots (to calculate accurate ETAs)
        """
        temp_vessel = NormalizedVessel(
            id=ownship.id,
            name=ownship.name,
            latitude=lat,
            longitude=lon,
            speed_knots=ownship.speed_knots,
            heading_degrees=0.0
        )
        
        # 1. Fetch closest weather and current (to calculate speed modifier)
        weather = None
        if snapshot.weather:
            # We assume a single weather snapshot or global for demo. In a real system, you'd find nearest.
            weather = snapshot.weather
            
        current = None
        if snapshot.ocean_currents:
            current = min(snapshot.ocean_currents, key=lambda c: haversine_distance_nm(lat, lon, c.latitude, c.longitude))

        # Determine travel bearing
        bearing = 0.0
        if prev_lat is not None and prev_lon is not None:
            bearing = calculate_bearing(prev_lat, prev_lon, lat, lon)
            temp_vessel.heading_degrees = bearing

        # Vector math for speed adjustment
        effective_speed_knots = ownship.speed_knots
        env_cost_modifier = 1.0
        
        if prev_lat is not None and prev_lon is not None:
            # Weather effect (wind)
            if weather:
                # difference between travel bearing and wind direction
                wind_angle_diff = math.radians(bearing - weather.wind_direction_deg)
                # Headwind slows down (-), tailwind speeds up (+)
                # Wind direction is where it's blowing TO or FROM? Meteorological wind is where it comes FROM.
                # So if traveling North (0) and wind is Northerly (0), it's a headwind. cos(0 - 0) = 1.
                wind_impact = math.cos(wind_angle_diff) * (weather.wind_speed_knots * 0.05) # 5% transfer
                effective_speed_knots -= wind_impact
                
                if wind_impact > 0:
                    env_cost_modifier += 0.2  # Penalty for headwind
                elif wind_impact < 0:
                    env_cost_modifier -= 0.1  # Bonus for tailwind

            # Current effect
            if current:
                # Ocean current direction is where it is flowing TO.
                # So if traveling North (0) and current is flowing North (0), it's a tailcurrent.
                current_angle_diff = math.radians(bearing - current.current_direction_deg)
                current_impact = math.cos(current_angle_diff) * current.current_speed_knots
                effective_speed_knots += current_impact
                
                if current_impact < 0:
                    env_cost_modifier += 0.3  # Penalty for adverse current
                elif current_impact > 0:
                    env_cost_modifier -= 0.15 # Bonus for favorable current

        effective_speed_knots = max(1.0, effective_speed_knots) # Cannot have negative speed

        # Evaluate using RiskCalculator
        assessment = self.risk_calculator.evaluate_vessel_risk(temp_vessel, snapshot)
        
        breakdown = RiskBreakdown(ice=0.0, iceberg=0.0, weather=0.0, current=0.0, vessel=0.0)
        risk_penalty = 0.0
        is_blocked = False
        
        for contributor in assessment.contributors:
            val = contributor.weighted_score
            if contributor.category == "iceberg":
                breakdown.iceberg = val
                if contributor.level == "CRITICAL":
                    is_blocked = True
            elif contributor.category == "sea_ice":
                breakdown.ice = val
                if contributor.level == "CRITICAL":
                    is_blocked = True
            elif contributor.category == "vessel":
                breakdown.vessel = val
            elif contributor.category == "weather":
                breakdown.weather = val
            elif contributor.category == "current":
                breakdown.current = val
                
            risk_penalty += val
            
        # Cost formula incorporates physical distance, environmental resistance (wind/current), and risk penalty
        cost = (distance_nm * env_cost_modifier) * (1.0 + (risk_penalty * 15.0))
        
        # Forecast Penalty
        if forecast_hazards:
            for hazard in forecast_hazards:
                # Hazard is an IcebergForecastResponse
                # If we are within 5 NM of a predicted future position of an iceberg, massive penalty
                d = haversine_distance_nm(lat, lon, hazard.predicted_position.lat, hazard.predicted_position.lon)
                if d < 5.0:
                    cost += 5000.0 # High penalty to avoid
                    is_blocked = True
        
        return cost, breakdown, is_blocked, assessment.overall_score, effective_speed_knots
