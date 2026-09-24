import math
from typing import Dict, List, Optional
from app.models.schemas import FleetVessel, Position
from app.services.data_service import data_service

class FleetManager:
    """Centralized in-memory registry holding the active mock fleet."""
    def __init__(self):
        self._fleet: Dict[str, FleetVessel] = {}
        self._initialize_fleet()

    def _initialize_fleet(self):
        vessels = data_service.get_vessels()
        for v in vessels:
            fleet_vessel = FleetVessel(
                id=v["id"],
                name=v["name"],
                type=v.get("type", "Research Vessel"),
                position=Position(**v["position"]),
                heading=v.get("heading", 0.0),
                speed_knots=v.get("speed_knots", 0.0),
                destination=v.get("destination", "Unknown"),
                status=v.get("status", "Active"),
                mission=self._assign_mock_mission(v.get("type", "")),
                priority=self._assign_mock_priority(v.get("type", "")),
                safety_radius_nm=self._assign_mock_safety_radius(v.get("type", "")),
                eta_destination=v.get("eta_destination", "TBD"),
                current_risk="LOW"
            )
            self._fleet[v["id"]] = fleet_vessel

    def _assign_mock_mission(self, vessel_type: str) -> str:
        t = vessel_type.lower()
        if "research" in t:
            return "Scientific Mission"
        if "supply" in t:
            return "Supply Mission"
        if "icebreaker" in t or "escort" in t:
            return "Icebreaker Escort"
        if "patrol" in t:
            return "Standby"
        return "Routine Transit"

    def _assign_mock_priority(self, vessel_type: str) -> str:
        t = vessel_type.lower()
        if "research" in t:
            return "Scientific Mission"
        if "supply" in t:
            return "Supply Mission"
        if "icebreaker" in t:
            return "Emergency"
        return "Routine Transit"

    def _assign_mock_safety_radius(self, vessel_type: str) -> float:
        t = vessel_type.lower()
        if "icebreaker" in t:
            return 2.0
        if "research" in t:
            return 5.0
        if "supply" in t:
            return 6.0
        return 4.0

    def get_all_vessels(self) -> List[FleetVessel]:
        return list(self._fleet.values())

    def get_vessel(self, vessel_id: str) -> Optional[FleetVessel]:
        return self._fleet.get(vessel_id)

    def update_vessel_position(self, vessel_id: str, new_position: Position, heading: float, speed: float):
        if vessel_id in self._fleet:
            v = self._fleet[vessel_id]
            v.position = new_position
            v.heading = heading
            v.speed_knots = speed
            # In a real system, you'd calculate current_risk based on the risk engine.

fleet_manager = FleetManager()
