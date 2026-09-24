import math
from typing import List, Dict, Optional
from app.models.schemas import RouteResponse, ConflictDetection, Position
from app.fleet.fleet_manager import fleet_manager

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3440.065  # Radius of Earth in nautical miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

class ConflictEngine:
    """Independent service to detect route conflicts in a multi-vessel fleet."""

    def __init__(self):
        self.conflict_threshold_nm = 5.0

    def analyze_conflicts(self, vessel_id: str, planned_route: RouteResponse) -> List[ConflictDetection]:
        """Analyzes a planned route against all other active vessels."""
        conflicts = []
        vessel = fleet_manager.get_vessel(vessel_id)
        if not vessel:
            return conflicts

        all_vessels = fleet_manager.get_all_vessels()
        
        # We simplify the conflict detection for this decision support prototype:
        # We check if the route passes too close to the *current* position of other vessels,
        # or if their route paths would intersect (if we had the other vessels' routes).
        # For this prototype, we check distance between the route's waypoints and 
        # other vessels' current positions or projected linear drift.
        
        for other_vessel in all_vessels:
            if other_vessel.id == vessel_id:
                continue
                
            # Basic CPA check against static waypoints (simplified TCPA)
            for i, wp in enumerate(planned_route.waypoints):
                dist = haversine_distance(wp.lat, wp.lon, other_vessel.position.lat, other_vessel.position.lon)
                
                # Combine safety radii
                combined_safety = vessel.safety_radius_nm + other_vessel.safety_radius_nm
                
                if dist < combined_safety:
                    # Found a conflict
                    # Estimate TCPA based on waypoint order (assume 2 hours per waypoint for demo)
                    tcpa = i * 120.0
                    
                    # Determine severity
                    if dist < 1.0:
                        severity = "CRITICAL"
                    elif dist < 3.0:
                        severity = "HIGH"
                    elif dist < combined_safety * 0.8:
                        severity = "MODERATE"
                    else:
                        severity = "LOW"
                        
                    conflict = ConflictDetection(
                        vessel_a_id=vessel_id,
                        vessel_b_id=other_vessel.id,
                        cpa_nm=round(dist, 2),
                        tcpa_minutes=tcpa,
                        severity=severity,
                        conflict_location=Position(lat=wp.lat, lon=wp.lon)
                    )
                    conflicts.append(conflict)
                    break # Just report the first conflict with this vessel
                    
        return conflicts

conflict_engine = ConflictEngine()
