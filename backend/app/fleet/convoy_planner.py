import uuid
from typing import List, Dict, Any
from app.models.schemas import ConvoyRequest, ConvoyResponse, RouteResponse, Position, Waypoint
from app.routing.astar_grid import RiskAwareRouter
from app.services.data_service import data_service
from app.fleet.fleet_manager import fleet_manager

class ConvoyPlanner:
    """Manages multi-vessel shared corridor planning for convoy operations."""
    
    def __init__(self):
        pass

    async def plan_convoy(self, request: ConvoyRequest) -> ConvoyResponse:
        lead_vessel = fleet_manager.get_vessel(request.lead_vessel_id)
        
        # Generate the shared corridor using the lead vessel's profile
        # Use safest routing mode for convoys
        snapshot = {
            "icebergs": data_service.get_icebergs(),
            "vessels": [v.model_dump() for v in fleet_manager.get_all_vessels()]
        }
        
        vessel_dict = lead_vessel.model_dump() if lead_vessel else {"id": request.lead_vessel_id, "name": "Convoy Lead", "type": "Icebreaker"}
        
        from app.models.data_models import NormalizedEnvironmentalSnapshot, NormalizedVessel
        
        norm_icebergs = []
        for ib in snapshot["icebergs"]:
            norm_ib = dict(ib)
            norm_ib["latitude"] = norm_ib.pop("lat", -60.0)
            norm_ib["longitude"] = norm_ib.pop("lon", -60.0)
            norm_ib["polygon"] = [{"latitude": p["lat"], "longitude": p["lon"]} for p in norm_ib.get("polygon", [])]
            norm_icebergs.append(norm_ib)
            
        env_snapshot = NormalizedEnvironmentalSnapshot(icebergs=norm_icebergs, vessels=[])
        ownship = NormalizedVessel(
            id=vessel_dict["id"], 
            name=vessel_dict.get("name", "Vessel"),
            latitude=vessel_dict.get("position", {}).get("lat", -60.0),
            longitude=vessel_dict.get("position", {}).get("lon", -60.0),
            speed_knots=vessel_dict.get("speed_knots", 12.0),
            heading_degrees=vessel_dict.get("heading", 0.0),
            ice_class="PC3"
        )
        router = RiskAwareRouter(snapshot=env_snapshot, ownship=ownship)
        
        # A* Routing for the shared corridor
        base_route = router._build_and_solve_graph(
            origin=request.origin,
            destination=request.destination,
            mode="safest",
            economic_speed_knots=12.0
        )
        
        # Map the base_route to a RouteResponse
        shared_corridor = RouteResponse(
            id=base_route.id,
            name=f"Convoy Route - {request.lead_vessel_id}",
            type="convoy_shared_corridor",
            total_distance_nm=base_route.total_distance_nm,
            estimated_duration_hours=base_route.estimated_duration_hours,
            average_risk_score=base_route.average_risk_score,
            risk_level=base_route.risk_level,
            routing_mode=base_route.routing_mode,
            risk_breakdown=base_route.risk_breakdown,
            waypoints=base_route.waypoints,
            advisories=["Convoy formation required.", "Maintain spacing offsets."]
        )
        
        vessel_routes = {}
        vessel_routes[request.lead_vessel_id] = shared_corridor
        
        # Offset trailing vessels (conceptually the same route but slightly delayed/shifted)
        # For this prototype, we assign the same shared corridor with a specific advisory
        for idx, support_id in enumerate(request.support_vessel_ids):
            offset_dist = request.spacing_nm * (idx + 1)
            offset_route = shared_corridor.model_copy(deep=True)
            offset_route.id = str(uuid.uuid4())
            offset_route.name = f"Convoy Support - {support_id}"
            offset_route.advisories = [f"Maintain {offset_dist} NM trailing offset from Lead."]
            vessel_routes[support_id] = offset_route
            
        return ConvoyResponse(
            convoy_id=str(uuid.uuid4()),
            shared_corridor=shared_corridor,
            vessel_routes=vessel_routes,
            estimated_formation_time="+1h 30m",
            advisories=["Convoy operations authorized.", "Commence forming up at origin."]
        )

convoy_planner = ConvoyPlanner()
