import pytest
import asyncio
from app.models.schemas import (
    ConvoyRequest, RendezvousRequest, Position, FleetVessel, RouteResponse, Waypoint, RiskBreakdown
)
from app.fleet.conflict_engine import ConflictEngine
from app.fleet.convoy_planner import ConvoyPlanner
from app.fleet.rendezvous_planner import RendezvousPlanner

@pytest.fixture
def mock_fleet_manager(monkeypatch):
    v1 = FleetVessel(
        id="vessel-a", name="Ship A", type="Research Vessel", 
        position=Position(lat=-63.0, lon=-60.0), heading=180, speed_knots=10, 
        destination="Base", safety_radius_nm=5.0
    )
    v2 = FleetVessel(
        id="vessel-b", name="Ship B", type="Supply Ship", 
        position=Position(lat=-63.05, lon=-60.05), heading=0, speed_knots=12, 
        destination="Base", safety_radius_nm=6.0
    )
    
    class MockFleetManager:
        def get_all_vessels(self): return [v1, v2]
        def get_vessel(self, vid): return v1 if vid == "vessel-a" else v2
        
    monkeypatch.setattr("app.fleet.conflict_engine.fleet_manager", MockFleetManager())
    return MockFleetManager()

@pytest.fixture
def mock_fleet_manager_for_planners(monkeypatch):
    v1 = FleetVessel(
        id="vessel-a", name="Ship A", type="Research Vessel", 
        position=Position(lat=-63.0, lon=-60.0), heading=180, speed_knots=10, 
        destination="Base", safety_radius_nm=5.0
    )
    v2 = FleetVessel(
        id="vessel-b", name="Ship B", type="Supply Ship", 
        position=Position(lat=-64.0, lon=-58.0), heading=0, speed_knots=12, 
        destination="Base", safety_radius_nm=6.0
    )
    
    class MockFleetManager:
        def get_all_vessels(self): return [v1, v2]
        def get_vessel(self, vid): return v1 if vid == "vessel-a" else (v2 if vid == "vessel-b" else None)
        
    fm = MockFleetManager()
    monkeypatch.setattr("app.fleet.convoy_planner.fleet_manager", fm)
    monkeypatch.setattr("app.fleet.rendezvous_planner.fleet_manager", fm)
    
    return fm

def test_conflict_detection(mock_fleet_manager):
    engine = ConflictEngine()
    
    # Create a route that passes very close to vessel-b (-63.05, -60.05)
    route = RouteResponse(
        id="route-1", name="Test Route", type="test",
        total_distance_nm=10.0, estimated_duration_hours=1.0,
        average_risk_score=0.1, risk_level="LOW", routing_mode="fastest",
        risk_breakdown=RiskBreakdown(ice=0, iceberg=0, weather=0, current=0, vessel=0),
        waypoints=[
            Waypoint(id="wp1", name="wp1", lat=-63.0, lon=-60.0, order=0, ice_risk_score=0.0),
            Waypoint(id="wp2", name="wp2", lat=-63.04, lon=-60.04, order=1, ice_risk_score=0.0)
        ],
        advisories=[]
    )
    
    conflicts = engine.analyze_conflicts("vessel-a", route)
    assert len(conflicts) > 0
    assert conflicts[0].vessel_b_id == "vessel-b"
    assert conflicts[0].cpa_nm < 11.0 # (5+6)

def test_convoy_planning(mock_fleet_manager_for_planners):
    planner = ConvoyPlanner()
    request = ConvoyRequest(
        lead_vessel_id="vessel-a",
        support_vessel_ids=["vessel-b"],
        origin=Position(lat=-63.0, lon=-60.0),
        destination=Position(lat=-65.0, lon=-55.0),
        spacing_nm=2.0
    )
    
    response = asyncio.run(planner.plan_convoy(request))
    assert response.shared_corridor is not None
    assert "vessel-a" in response.vessel_routes
    assert "vessel-b" in response.vessel_routes
    assert response.shared_corridor.id == response.vessel_routes["vessel-a"].id

def test_rendezvous_planning(mock_fleet_manager_for_planners):
    planner = RendezvousPlanner()
    request = RendezvousRequest(
        vessel_a_id="vessel-a",
        vessel_b_id="vessel-b"
    )
    
    response = asyncio.run(planner.plan_rendezvous(request))
    assert response.meeting_point is not None
    assert response.vessel_a_route is not None
    assert response.vessel_b_route is not None
    
    # Default midpoint calculation
    # vessel_a = -63.0, -60.0
    # vessel_b = -64.0, -58.0
    assert response.meeting_point.lat == -63.5
    assert response.meeting_point.lon == -59.0
