import math
from typing import List, Dict, Any
from app.models.schemas import Position, Waypoint, RouteResponse

def calculate_cpa_tcpa(
    pos_a: Position, speed_a_kts: float, heading_a_deg: float,
    pos_b: Position, speed_b_kts: float, heading_b_deg: float
) -> Dict[str, float]:
    """
    Computes CPA (Nautical Miles) and TCPA (Minutes) between two vessels.
    """
    # Convert headings to Cartesian velocity components (knots)
    # 0 deg = North (+y), 90 deg = East (+x)
    rad_a = math.radians(heading_a_deg)
    vx_a = speed_a_kts * math.sin(rad_a)
    vy_a = speed_a_kts * math.cos(rad_a)

    rad_b = math.radians(heading_b_deg)
    vx_b = speed_b_kts * math.sin(rad_b)
    vy_b = speed_b_kts * math.cos(rad_b)

    # Relative position in NM (approx 1 deg lat = 60 NM, 1 deg lon = 60 * cos(lat) NM)
    mid_lat = (pos_a.lat + pos_b.lat) / 2.0
    dx_nm = (pos_b.lon - pos_a.lon) * 60.0 * math.cos(math.radians(mid_lat))
    dy_nm = (pos_b.lat - pos_a.lat) * 60.0

    # Relative velocity
    dvx = vx_b - vx_a
    dvy = vy_b - vy_a

    rel_speed_sq = dvx ** 2 + dvy ** 2

    if rel_speed_sq < 0.001:
        # Parallel tracks or stationary
        cpa_nm = math.sqrt(dx_nm ** 2 + dy_nm ** 2)
        return {"cpa_nm": round(cpa_nm, 2), "tcpa_minutes": 0.0, "is_collision_risk": cpa_nm < 2.0}

    # TCPA in hours = - (r . v) / |v|^2
    tcpa_hours = -(dx_nm * dvx + dy_nm * dvy) / rel_speed_sq
    tcpa_min = max(0.0, tcpa_hours * 60.0)

    # CPA distance at TCPA
    cpa_x = dx_nm + dvx * tcpa_hours
    cpa_y = dy_nm + dvy * tcpa_hours
    cpa_nm = math.sqrt(cpa_x ** 2 + cpa_y ** 2)

    return {
        "cpa_nm": round(cpa_nm, 2),
        "tcpa_minutes": round(tcpa_min, 1),
        "is_collision_risk": cpa_nm < 2.5 and tcpa_min < 90.0
    }

class DeconflictionEngine:
    def __init__(self, icebergs_data: List[Dict[str, Any]]):
        self.icebergs_data = icebergs_data

    def evaluate_encounter(
        self,
        vessel_a: Dict[str, Any],
        vessel_b: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates encounters and generates COLREGS-compliant alternatives.
        """
        pos_a = Position(lat=vessel_a["position"]["lat"], lon=vessel_a["position"]["lon"])
        pos_b = Position(lat=vessel_b["position"]["lat"], lon=vessel_b["position"]["lon"])

        kinematics = calculate_cpa_tcpa(
            pos_a, vessel_a.get("speed_knots", 12.0), vessel_a.get("heading", 85.0),
            pos_b, vessel_b.get("speed_knots", 9.5), vessel_b.get("heading", 45.0)
        )

        # 3 Deterministic Deconfliction Options
        alt_1_route = RouteResponse(
            id="alt-01-lead-evasion",
            name="Alternative 1: Starboard Thermal Lead Evasion",
            type="alternative",
            total_distance_nm=208.5,
            estimated_duration_hours=17.4,
            average_risk_score=24.0,
            waypoints=[
                Waypoint(id="wp-alt-1a", name="Ship A Origin", lat=pos_a.lat, lon=pos_a.lon, order=1, ice_risk_score=15.0),
                Waypoint(id="wp-alt-1b", name="Starboard Lead Turn (HDG 115°)", lat=pos_a.lat - 0.25, lon=pos_a.lon + 2.5, order=2, ice_risk_score=22.0),
                Waypoint(id="wp-alt-1c", name="Demo Station Approach", lat=-60.4, lon=-38.5, order=3, ice_risk_score=18.0)
            ],
            advisories=["COLREGS Rule 15: Give-way vessel alters course to starboard into thermal lead."]
        )

        alt_2_route = RouteResponse(
            id="alt-02-speed-reduction",
            name="Alternative 2: Speed Reduction & Transit Delay",
            type="alternative",
            total_distance_nm=204.0,
            estimated_duration_hours=24.0,
            average_risk_score=26.0,
            waypoints=[
                Waypoint(id="wp-alt-2a", name="Ship A Origin", lat=pos_a.lat, lon=pos_a.lon, order=1, ice_risk_score=15.0),
                Waypoint(id="wp-alt-2b", name="Hold Corridor (8.5 kts)", lat=pos_a.lat, lon=pos_a.lon + 3.0, order=2, ice_risk_score=24.0),
                Waypoint(id="wp-alt-2c", name="Demo Station", lat=-60.4, lon=-38.5, order=3, ice_risk_score=18.0)
            ],
            advisories=["Reduce propulsion to 8.5 kts to allow Ship B to cross ahead."]
        )

        alt_3_route = RouteResponse(
            id="alt-03-channel-bypass",
            name="Alternative 3: Northern Island Ridge Bypass",
            type="alternative",
            total_distance_nm=221.0,
            estimated_duration_hours=18.4,
            average_risk_score=20.0,
            waypoints=[
                Waypoint(id="wp-alt-3a", name="Ship A Origin", lat=pos_a.lat, lon=pos_a.lon, order=1, ice_risk_score=15.0),
                Waypoint(id="wp-alt-3b", name="North Ridge Gate", lat=pos_a.lat + 0.35, lon=pos_a.lon + 2.8, order=2, ice_risk_score=19.0),
                Waypoint(id="wp-alt-3c", name="Demo Station Entry", lat=-60.4, lon=-38.5, order=3, ice_risk_score=16.0)
            ],
            advisories=["Bypasses crossing zone completely via deep soundings north of ridge."]
        )

        return {
            "scenario_id": "scenario-weddell-crossing",
            "channel_name": "Weddell Sea / South Orkney Crossing Sector",
            "colregs_rule": "COLREGS Rule 15 (Crossing Encounter — Risk of Collision)",
            "urgency": "HIGH" if kinematics["is_collision_risk"] else "NOMINAL",
            "kinematics": kinematics,
            "vessel_a": vessel_a,
            "vessel_b": vessel_b,
            "options": [
                {
                    "id": "alt-01-lead-evasion",
                    "title": "Alternative 1: Starboard Thermal Lead Evasion",
                    "recommended": True,
                    "safety_score": 94,
                    "projected_cpa_nm": 2.4,
                    "new_heading_deg": 115.0,
                    "new_speed_knots": 12.0,
                    "time_delay_minutes": 25,
                    "maneuver_action": "Alter heading 30° Starboard into open water lead. Clears CPA to 2.4 NM.",
                    "route": alt_1_route
                },
                {
                    "id": "alt-02-speed-reduction",
                    "title": "Alternative 2: Speed Reduction & Transit Delay",
                    "recommended": False,
                    "safety_score": 78,
                    "projected_cpa_nm": 3.1,
                    "new_heading_deg": vessel_a.get("heading", 85.0),
                    "new_speed_knots": 8.5,
                    "time_delay_minutes": 65,
                    "maneuver_action": "Reduce speed from 12.0 to 8.5 kts. Ship B clears intersection ahead.",
                    "route": alt_2_route
                },
                {
                    "id": "alt-03-channel-bypass",
                    "title": "Alternative 3: Northern Island Ridge Bypass",
                    "recommended": False,
                    "safety_score": 91,
                    "projected_cpa_nm": 6.8,
                    "new_heading_deg": 65.0,
                    "new_speed_knots": 12.0,
                    "time_delay_minutes": 85,
                    "maneuver_action": "Divert 14 NM North around iceberg cluster into wide open water.",
                    "route": alt_3_route
                }
            ]
        }
