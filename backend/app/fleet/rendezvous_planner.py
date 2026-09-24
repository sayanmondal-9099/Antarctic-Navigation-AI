import uuid
from typing import List
from app.models.schemas import RendezvousRequest, RendezvousResponse, Position, RouteResponse, Waypoint
from app.routing.astar_grid import RiskAwareRouter
from app.services.data_service import data_service
from app.fleet.fleet_manager import fleet_manager

class RendezvousPlanner:
    """Manages multi-vessel rendezvous point calculations and routing."""
    
    def __init__(self):
        pass

    async def plan_rendezvous(self, request: RendezvousRequest) -> RendezvousResponse:
        vessel_a = fleet_manager.get_vessel(request.vessel_a_id)
        vessel_b = fleet_manager.get_vessel(request.vessel_b_id)
        
        # Determine the meeting point
        meeting_point = request.meeting_point
        if not meeting_point:
            # Simple midpoint calculation if none provided
            lat_a = vessel_a.position.lat if vessel_a else -63.0
            lon_a = vessel_a.position.lon if vessel_a else -60.0
            lat_b = vessel_b.position.lat if vessel_b else -64.0
            lon_b = vessel_b.position.lon if vessel_b else -58.0
            meeting_point = Position(
                lat=(lat_a + lat_b) / 2.0,
                lon=(lon_a + lon_b) / 2.0
            )

        snapshot = {
            "icebergs": data_service.get_icebergs(),
            "vessels": [v.model_dump() for v in fleet_manager.get_all_vessels()]
        }
        
        from app.models.data_models import NormalizedEnvironmentalSnapshot, NormalizedVessel
        
        norm_icebergs = []
        for ib in snapshot["icebergs"]:
            norm_ib = dict(ib)
            norm_ib["latitude"] = norm_ib.pop("lat", -60.0)
            norm_ib["longitude"] = norm_ib.pop("lon", -60.0)
            norm_ib["polygon"] = [{"latitude": p["lat"], "longitude": p["lon"]} for p in norm_ib.get("polygon", [])]
            norm_icebergs.append(norm_ib)
            
        env_snapshot = NormalizedEnvironmentalSnapshot(icebergs=norm_icebergs, vessels=[])
        
        # Route Vessel A to meeting point
        va_dict = vessel_a.model_dump() if vessel_a else {"id": request.vessel_a_id, "name": "Vessel A", "type": "Research"}
        ownship_a = NormalizedVessel(
            id=va_dict["id"], 
            name=va_dict.get("name", "Vessel A"),
            latitude=va_dict.get("position", {}).get("lat", -60.0),
            longitude=va_dict.get("position", {}).get("lon", -60.0),
            speed_knots=va_dict.get("speed_knots", 12.0),
            heading_degrees=va_dict.get("heading", 0.0),
            ice_class="PC3"
        )
        router_a = RiskAwareRouter(snapshot=env_snapshot, ownship=ownship_a)
        
        base_route_a = router_a._build_and_solve_graph(
            origin=vessel_a.position if vessel_a else Position(lat=-63.0, lon=-60.0),
            destination=meeting_point,
            mode="fastest",
            economic_speed_knots=12.0
        )
        
        route_a = RouteResponse(
            id=base_route_a.id,
            name=f"Rendezvous Leg - {request.vessel_a_id}",
            type="rendezvous_leg",
            total_distance_nm=base_route_a.total_distance_nm,
            estimated_duration_hours=base_route_a.estimated_duration_hours,
            average_risk_score=base_route_a.average_risk_score,
            risk_level=base_route_a.risk_level,
            routing_mode=base_route_a.routing_mode,
            risk_breakdown=base_route_a.risk_breakdown,
            waypoints=base_route_a.waypoints,
            advisories=[]
        )
        
        # Route Vessel B to meeting point
        vb_dict = vessel_b.model_dump() if vessel_b else {"id": request.vessel_b_id, "name": "Vessel B", "type": "Icebreaker"}
        ownship_b = NormalizedVessel(
            id=vb_dict["id"], 
            name=vb_dict.get("name", "Vessel B"),
            latitude=vb_dict.get("position", {}).get("lat", -60.0),
            longitude=vb_dict.get("position", {}).get("lon", -60.0),
            speed_knots=vb_dict.get("speed_knots", 12.0),
            heading_degrees=vb_dict.get("heading", 0.0),
            ice_class="PC3"
        )
        router_b = RiskAwareRouter(snapshot=env_snapshot, ownship=ownship_b)
        
        base_route_b = router_b._build_and_solve_graph(
            origin=vessel_b.position if vessel_b else Position(lat=-64.0, lon=-58.0),
            destination=meeting_point,
            mode="fastest",
            economic_speed_knots=12.0
        )
        
        route_b = RouteResponse(
            id=base_route_b.id,
            name=f"Rendezvous Leg - {request.vessel_b_id}",
            type="rendezvous_leg",
            total_distance_nm=base_route_b.total_distance_nm,
            estimated_duration_hours=base_route_b.estimated_duration_hours,
            average_risk_score=base_route_b.average_risk_score,
            risk_level=base_route_b.risk_level,
            routing_mode=base_route_b.routing_mode,
            risk_breakdown=base_route_b.risk_breakdown,
            waypoints=base_route_b.waypoints,
            advisories=[]
        )
        
        # Calculate ETAs and wait times
        eta_a = base_route_a.estimated_duration_hours
        eta_b = base_route_b.estimated_duration_hours
        waiting_time = abs(eta_a - eta_b) * 60.0  # minutes
        
        return RendezvousResponse(
            meeting_point=meeting_point,
            vessel_a_route=route_a,
            vessel_b_route=route_b,
            vessel_a_eta=f"+{eta_a:.1f}h",
            vessel_b_eta=f"+{eta_b:.1f}h",
            waiting_time_minutes=round(waiting_time, 1),
            advisories=[f"Wait time at rendezvous: {round(waiting_time)} minutes."]
        )

rendezvous_planner = RendezvousPlanner()
