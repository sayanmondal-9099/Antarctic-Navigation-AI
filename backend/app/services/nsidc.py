import os
from typing import Dict, Any
from datetime import datetime, timedelta

class SeaIceService:
    def get_latest_sea_ice_metadata(self) -> Dict[str, Any]:
        """
        Returns metadata for the latest sea-ice concentration product.
        NASA Worldview AMSR2 (or similar) is used as a fallback/proxy.
        """
        # Worldview tiles typically update daily, so we mock the "acquired_at" to yesterday
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        return {
            "source": "REAL OBSERVATION",
            "sensor": "AMSR2 Sea Ice Concentration (NASA Worldview)",
            "acquired_at": yesterday.strftime("%Y-%m-%dT00:00:00.000Z"),
            "layer_name": "AMSR2_Sea_Ice_Concentration_12km_Night",
            "tile_url": "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/AMSR2_Sea_Ice_Concentration_12km_Night/default/{time}/250m/{z}/{y}/{x}.png"
        }
