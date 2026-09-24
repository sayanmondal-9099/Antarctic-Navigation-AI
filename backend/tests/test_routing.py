import pytest
from app.models.schemas import Position, RouteRequest
from app.api.routing import OptimizeRouteRequest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_optimize_route_endpoint_safest():
    req = OptimizeRouteRequest(
        origin=Position(lat=-60.2, lon=-45.3),
        destination=Position(lat=-60.4, lon=-38.5),
        vessel_id="vessel-A",
        risk_tolerance="safest",
        economic_speed_knots=12.0
    )
    
    response = client.post("/api/routing/optimize", json=req.model_dump())
    assert response.status_code == 200
    data = response.json()
    
    assert "recommended_route" in data
    assert "alternative_routes" in data
    
    rec = data["recommended_route"]
    assert rec["routing_mode"] == "safest"
    assert rec["type"] == "recommended"
    assert len(data["alternative_routes"]) == 2
    
    alts = [r["routing_mode"] for r in data["alternative_routes"]]
    assert "balanced" in alts
    assert "fastest" in alts
    
def test_optimize_route_endpoint_fastest():
    req = OptimizeRouteRequest(
        origin=Position(lat=-60.2, lon=-45.3),
        destination=Position(lat=-60.4, lon=-38.5),
        vessel_id="vessel-A",
        risk_tolerance="fastest",
        economic_speed_knots=12.0
    )
    
    response = client.post("/api/routing/optimize", json=req.model_dump())
    assert response.status_code == 200
    data = response.json()
    
    rec = data["recommended_route"]
    assert rec["routing_mode"] == "fastest"
    assert rec["type"] == "recommended"
