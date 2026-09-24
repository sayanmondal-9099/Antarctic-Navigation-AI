from fastapi import APIRouter, Depends, Query
from app.core.supabase.auth import require_role, UserIdentity
from app.models.schemas import EnvironmentSummaryRequest, EnvironmentSummaryResponse
from app.data.providers import DemoDataProvider, BaseDataProvider
from app.risk.engine import evaluate_situational_risk, evaluate_area_risk
from app.risk.calculator import RiskCalculator

router = APIRouter(tags=["environment"])

def get_provider() -> BaseDataProvider:
    return DemoDataProvider()

@router.get("/summary", response_model=EnvironmentSummaryResponse)
def get_environmental_summary(
    latitude: float = Query(..., description="Latitude of location"),
    longitude: float = Query(..., description="Longitude of location"),
    provider: BaseDataProvider = Depends(get_provider),
    user: UserIdentity = Depends(require_role(["COMMAND_CENTER", "NAVIGATOR", "CAPTAIN", "SCIENTIST"]))
):
    snapshot = provider.get_snapshot()
    
    # Retrieve closest weather and currents for the given lat/lon
    # Using DemoDataProvider, it will generate weather dynamically based on lat/lon
    weather = provider.get_weather(latitude, longitude)
    
    from app.risk.calculator import haversine_distance_nm
    current = None
    if snapshot.ocean_currents:
        current = min(snapshot.ocean_currents, key=lambda c: haversine_distance_nm(latitude, longitude, c.latitude, c.longitude))
        
    sea_ice = None
    if snapshot.sea_ice:
        closest_ice = min(snapshot.sea_ice, key=lambda c: haversine_distance_nm(latitude, longitude, c.latitude, c.longitude))
        sea_ice = closest_ice.concentration_tenths
        
    # We can evaluate the risk for a synthetic point
    calculator = RiskCalculator()
    
    # Simple risk
    weather_score, w_level, w_details = calculator.calculate_weather_risk(weather)
    current_score, c_level, c_details = calculator.calculate_ocean_current_risk(snapshot.ocean_currents)
    
    advisories = [w_details, c_details]
    
    risk_level = calculator.config.classify_score(max(weather_score, current_score))
    
    return EnvironmentSummaryResponse(
        weather=weather.model_dump() if weather else None,
        ocean_current=current.model_dump() if current else None,
        sea_ice_concentration=sea_ice,
        environmental_risk_level=risk_level,
        advisories=advisories
    )
