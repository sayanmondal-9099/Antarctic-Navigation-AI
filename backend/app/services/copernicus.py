import os
import time
import requests
from typing import Dict, Any, Optional
from datetime import datetime

class CopernicusService:
    def __init__(self):
        self.client_id = os.getenv("COPERNICUS_CLIENT_ID")
        self.client_secret = os.getenv("COPERNICUS_CLIENT_SECRET")
        self.auth_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
        self.odata_url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
        self._token: Optional[str] = None
        self._token_expiry: float = 0

    def _get_token(self) -> Optional[str]:
        if not self.client_id or not self.client_secret:
            return None

        if self._token and time.time() < self._token_expiry:
            return self._token

        try:
            response = requests.post(
                self.auth_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
            )
            response.raise_for_status()
            data = response.json()
            self._token = data.get("access_token")
            # Usually valid for 10 minutes, set expiry securely
            self._token_expiry = time.time() + data.get("expires_in", 600) - 10
            return self._token
        except Exception as e:
            print(f"Error fetching Copernicus token: {e}")
            return None

    def get_latest_sentinel1_metadata(self, aoi_wkt: str) -> Dict[str, Any]:
        """
        Fetches the latest Sentinel-1 GRD observation metadata for the given AOI.
        """
        token = self._get_token()
        
        # Fallback to simulated data if no token
        if not token:
            return self._get_mock_metadata()

        try:
            # Query CDSE OData API for Sentinel-1 GRD, intersecting AOI, sorted by creation date
            filter_query = f"Collection/Name eq 'SENTINEL-1' and contains(Name,'GRD') and OData.CSC.Intersects(area=geography'SRID=4326;{aoi_wkt}')"
            params = {
                "$filter": filter_query,
                "$orderby": "ContentDate/Start desc",
                "$top": 1
            }
            
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(self.odata_url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            if data.get("value") and len(data["value"]) > 0:
                product = data["value"][0]
                return {
                    "source": "REAL OBSERVATION",
                    "sensor": "Sentinel-1 SAR",
                    "acquired_at": product["ContentDate"]["Start"],
                    "product_id": product["Id"],
                    "name": product["Name"],
                    "footprint": product["Footprint"]
                }
            else:
                return self._get_mock_metadata()

        except Exception as e:
            print(f"Error querying Copernicus Data Space: {e}")
            return self._get_mock_metadata()
            
    def _get_mock_metadata(self) -> Dict[str, Any]:
        """Returns mock metadata for demo simulation or fallback."""
        return {
            "source": "DEMO SIMULATION",
            "sensor": "Sentinel-1 SAR (Simulated)",
            "acquired_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
            "product_id": "simulated-product-001",
            "name": "S1A_IW_GRDH_1SDV_SIMULATED",
            "footprint": "POLYGON((-47.8 -62.6, -37.8 -62.6, -37.8 -59.2, -47.8 -59.2, -47.8 -62.6))"
        }
