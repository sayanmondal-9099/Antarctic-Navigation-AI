from typing import List, Dict, Any, Optional
from app.models.data_models import NormalizedIceberg, NormalizedSeaIce, NormalizedEnvironmentalSnapshot

def extract_iceberg_features(iceberg: NormalizedIceberg, snapshot: NormalizedEnvironmentalSnapshot) -> List[float]:
    """
    Extract features for iceberg ML model.
    """
    features = [
        iceberg.latitude,
        iceberg.longitude,
        iceberg.drift_speed_knots,
        iceberg.drift_heading_degrees,
        iceberg.hazard_radius_nm
    ]
    
    # Add ocean current feature if available
    nearby_currents = [c for c in snapshot.ocean_currents if 
                       abs(c.latitude - iceberg.latitude) < 1.0 and 
                       abs(c.longitude - iceberg.longitude) < 1.0]
    
    if nearby_currents:
        c = nearby_currents[0]
        features.extend([c.current_speed_knots, c.current_direction_deg])
    else:
        # Default or imputation
        features.extend([0.0, 0.0])
        
    return features

def extract_sea_ice_features(sea_ice: NormalizedSeaIce, snapshot: NormalizedEnvironmentalSnapshot) -> List[float]:
    """
    Extract features for sea ice ML model.
    """
    features = [
        sea_ice.latitude,
        sea_ice.longitude,
        sea_ice.concentration_tenths,
        sea_ice.thickness_meters if sea_ice.thickness_meters else 0.8
    ]
    
    # Add weather feature if available
    if snapshot.weather:
        features.extend([
            snapshot.weather.temperature_c,
            snapshot.weather.wind_speed_knots,
            snapshot.weather.freezing_rate_cm_day
        ])
    else:
        features.extend([-15.0, 10.0, 2.5]) # default reasonable values
        
    return features
