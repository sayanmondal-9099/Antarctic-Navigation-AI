import math
from datetime import datetime, timedelta, timezone
from typing import List, Tuple
from app.models.schemas import Position
from app.models.data_models import NormalizedIceberg, NormalizedSeaIce

# Mean Earth radius in Nautical Miles
EARTH_RADIUS_NM = 3440.065

def calculate_new_position(lat: float, lon: float, distance_nm: float, bearing_deg: float) -> Position:
    """
    Calculate new lat/lon given a distance in NM and bearing in degrees.
    """
    bearing_rad = math.radians(bearing_deg)
    lat_rad = math.radians(lat)
    lon_rad = math.radians(lon)
    
    angular_distance = distance_nm / EARTH_RADIUS_NM
    
    new_lat_rad = math.asin(
        math.sin(lat_rad) * math.cos(angular_distance) +
        math.cos(lat_rad) * math.sin(angular_distance) * math.cos(bearing_rad)
    )
    
    new_lon_rad = lon_rad + math.atan2(
        math.sin(bearing_rad) * math.sin(angular_distance) * math.cos(lat_rad),
        math.cos(angular_distance) - math.sin(lat_rad) * math.sin(new_lat_rad)
    )
    
    return Position(
        lat=round(math.degrees(new_lat_rad), 6),
        lon=round(math.degrees(new_lon_rad), 6)
    )

class BaselineIcebergModel:
    """
    Deterministic baseline for iceberg drift using linear extrapolation based on
    current speed and heading.
    """
    def __init__(self):
        self.version = "baseline_v1"
        self.name = "LinearExtrapolation"

    def predict(self, iceberg: NormalizedIceberg, horizon_hours: float, steps: int = 4) -> Tuple[Position, List[Position]]:
        """
        Predicts future iceberg position and track based on linear extrapolation.
        Returns the final position and a list of waypoints representing the track.
        """
        # Distance = Speed * Time
        total_distance_nm = iceberg.drift_speed_knots * horizon_hours
        
        track = []
        current_pos = Position(lat=iceberg.latitude, lon=iceberg.longitude)
        track.append(current_pos)
        
        step_distance = total_distance_nm / steps if steps > 0 else total_distance_nm
        
        for i in range(steps):
            next_pos = calculate_new_position(
                track[-1].lat,
                track[-1].lon,
                step_distance,
                iceberg.drift_heading_degrees
            )
            track.append(next_pos)
            
        return track[-1], track


class BaselineSeaIceModel:
    """
    Deterministic baseline for sea ice using persistence (recent temporal average/current value).
    """
    def __init__(self):
        self.version = "baseline_v1"
        self.name = "Persistence"

    def predict(self, current_ice: NormalizedSeaIce, horizon_hours: float) -> float:
        """
        Predicts future sea ice concentration based on persistence.
        For baseline, we assume the ice concentration remains the same.
        Could incorporate a small seasonal heuristic, but persistence is standard.
        """
        return current_ice.concentration_tenths
