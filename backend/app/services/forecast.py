import math
from typing import List, Dict, Any

class TemporalForecastService:
    def __init__(self):
        # Prevailing polar current & wind vectors in Weddell Sea sector
        self.current_speed_kts = 0.6
        self.current_heading_deg = 215.0 # SW drift
        self.wind_speed_kts = 28.0
        self.wind_heading_deg = 225.0

    def project_icebergs(
        self,
        icebergs_data: List[Dict[str, Any]],
        hours_forward: float = 24.0
    ) -> List[Dict[str, Any]]:
        """
        Projects polygon and centroid coordinates forward in time.
        """
        projected = []
        for berg in icebergs_data:
            drift_speed = berg.get("drift_speed_knots", 1.0)
            drift_heading = berg.get("drift_heading_degrees", 215.0)

            # Distance traveled in NM
            dist_nm = drift_speed * hours_forward

            # Convert to delta lat / lon in degrees
            rad = math.radians(drift_heading)
            dlat_deg = (dist_nm * math.cos(rad)) / 60.0
            
            # Approximate mean latitude
            mean_lat = sum(p["lat"] for p in berg["polygon"]) / len(berg["polygon"])
            dlon_deg = (dist_nm * math.sin(rad)) / (60.0 * math.cos(math.radians(mean_lat)))

            # Shift polygon vertices
            new_poly = [
                {
                    "lat": round(p["lat"] + dlat_deg, 4),
                    "lon": round(p["lon"] + dlon_deg, 4)
                }
                for p in berg["polygon"]
            ]

            projected.append({
                "id": berg["id"],
                "name": berg.get("name", berg["id"]),
                "size_class": berg.get("size_class", "large"),
                "threat_level": berg.get("threat_level", "medium"),
                "original_centroid": {
                    "lat": round(mean_lat, 4),
                    "lon": round(sum(p["lon"] for p in berg["polygon"]) / len(berg["polygon"]), 4)
                },
                "projected_centroid": {
                    "lat": round(mean_lat + dlat_deg, 4),
                    "lon": round(sum(p["lon"] for p in berg["polygon"]) / len(berg["polygon"]) + dlon_deg, 4)
                },
                "drift_vector": {
                    "speed_knots": drift_speed,
                    "heading_degrees": drift_heading,
                    "total_displacement_nm": round(dist_nm, 1)
                },
                "hours_forward": hours_forward,
                "polygon": new_poly
            })

        return projected

    def get_metocean_forecast(self, hours_forward: float = 24.0) -> Dict[str, Any]:
        """
        Returns meteorological conditions forecast.
        """
        wind_shift = math.sin(hours_forward / 12.0) * 8.0
        return {
            "hours_forward": hours_forward,
            "air_temperature_c": round(-14.5 - (hours_forward * 0.1), 1),
            "sea_temperature_c": -1.8,
            "wind_speed_knots": round(self.wind_speed_kts + wind_shift, 1),
            "wind_direction_deg": round((self.wind_heading_deg + hours_forward * 2) % 360, 0),
            "sea_ice_freezing_rate_cm_day": 3.2,
            "visibility_nm": 4.5 if hours_forward < 36 else 1.2,
            "icing_spray_risk": "SEVERE" if hours_forward > 18 else "MODERATE"
        }
