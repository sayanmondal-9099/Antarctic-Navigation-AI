from fastapi import APIRouter, Depends, Query
from typing import Dict, Any
from app.services.copernicus import CopernicusService
from app.services.nsidc import SeaIceService

router = APIRouter()

def get_copernicus_service() -> CopernicusService:
    return CopernicusService()

def get_nsidc_service() -> SeaIceService:
    return SeaIceService()

@router.get("/latest")
async def get_latest_satellite_data(
    aoi_wkt: str = Query("POLYGON((-47.8 -62.6, -37.8 -62.6, -37.8 -59.2, -47.8 -59.2, -47.8 -62.6))", description="WKT Polygon of the Area of Interest"),
    copernicus: CopernicusService = Depends(get_copernicus_service),
    nsidc: SeaIceService = Depends(get_nsidc_service)
):
    """
    Returns metadata for the latest available Sentinel-1 SAR and Sea Ice products.
    """
    sar_data = copernicus.get_latest_sentinel1_metadata(aoi_wkt)
    ice_data = nsidc.get_latest_sea_ice_metadata()
    
    return {
        "sentinel_1": sar_data,
        "sea_ice": ice_data
    }
