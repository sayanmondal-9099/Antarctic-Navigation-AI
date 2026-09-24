import pytest
from app.models.data_models import NormalizedVessel, NormalizedWeather, NormalizedOceanCurrent, NormalizedEnvironmentalSnapshot
from app.risk.calculator import RiskConfig
from app.routing.routing_cost import RoutingCostEvaluator

def test_routing_cost_headwind_penalty():
    config = RiskConfig()
    evaluator = RoutingCostEvaluator(risk_config=config)
    
    # Ownship traveling North (heading 0)
    vessel = NormalizedVessel(
        id="test-1", name="Test", latitude=-60.0, longitude=-45.0,
        speed_knots=15.0, heading_degrees=0.0
    )
    
    # Headwind: wind coming from North (0 degrees), traveling towards South (180 degrees)
    # Wait, meteorological wind direction is where the wind originates.
    # So 0 degrees means North wind. If we travel North (bearing 0), wind is hitting our face (headwind).
    weather_headwind = NormalizedWeather(
        latitude=-60.0, longitude=-45.0, wind_speed_knots=40.0, wind_direction_deg=0.0,
        temperature_c=-5.0, visibility_nm=10.0, pressure_hpa=1000.0, freezing_rate_cm_day=0.0, source="test"
    )
    
    # Tailwind: wind coming from South (180 degrees)
    weather_tailwind = NormalizedWeather(
        latitude=-60.0, longitude=-45.0, wind_speed_knots=40.0, wind_direction_deg=180.0,
        temperature_c=-5.0, visibility_nm=10.0, pressure_hpa=1000.0, freezing_rate_cm_day=0.0, source="test"
    )
    
    snap_head = NormalizedEnvironmentalSnapshot(timestamp="test", weather=weather_headwind)
    snap_tail = NormalizedEnvironmentalSnapshot(timestamp="test", weather=weather_tailwind)
    
    # We are traveling from -61.0, -45.0 to -60.0, -45.0. 
    # The bearing from -61 to -60 is North (0 degrees).
    cost_head, _, _, _, speed_head = evaluator.evaluate_edge_cost(-60.0, -45.0, 60.0, snap_head, vessel, prev_lat=-61.0, prev_lon=-45.0)
    cost_tail, _, _, _, speed_tail = evaluator.evaluate_edge_cost(-60.0, -45.0, 60.0, snap_tail, vessel, prev_lat=-61.0, prev_lon=-45.0)
    
    # Headwind should have a higher penalty (higher cost)
    assert cost_head > cost_tail
    # Headwind reduces speed, tailwind increases speed
    assert speed_head < 15.0
    assert speed_tail > 15.0

def test_routing_cost_adverse_current_penalty():
    config = RiskConfig()
    evaluator = RoutingCostEvaluator(risk_config=config)
    
    vessel = NormalizedVessel(
        id="test-1", name="Test", latitude=-60.0, longitude=-45.0,
        speed_knots=15.0, heading_degrees=0.0
    )
    
    # Ocean current direction is where it's flowing towards.
    # Flowing South (180 degrees)
    curr_adverse = NormalizedOceanCurrent(
        latitude=-60.0, longitude=-45.0, current_speed_knots=3.0, current_direction_deg=180.0, source="test"
    )
    
    # Flowing North (0 degrees)
    curr_favorable = NormalizedOceanCurrent(
        latitude=-60.0, longitude=-45.0, current_speed_knots=3.0, current_direction_deg=0.0, source="test"
    )
    
    snap_adv = NormalizedEnvironmentalSnapshot(timestamp="test", ocean_currents=[curr_adverse])
    snap_fav = NormalizedEnvironmentalSnapshot(timestamp="test", ocean_currents=[curr_favorable])
    
    # Traveling North (0 degrees)
    cost_adv, _, _, _, speed_adv = evaluator.evaluate_edge_cost(-60.0, -45.0, 60.0, snap_adv, vessel, prev_lat=-61.0, prev_lon=-45.0)
    cost_fav, _, _, _, speed_fav = evaluator.evaluate_edge_cost(-60.0, -45.0, 60.0, snap_fav, vessel, prev_lat=-61.0, prev_lon=-45.0)
    
    assert cost_adv > cost_fav
    assert speed_adv < 15.0
    assert speed_fav > 15.0
