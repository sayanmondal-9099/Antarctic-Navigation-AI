import math
from typing import List, Dict, Any
from shapely.geometry import Point, Polygon
from app.models.schemas import Position

def haversine_distance_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two coordinates in nautical miles."""
    R = 3440.065
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class RiskGridEngine:
    def __init__(
        self,
        lat_min: float = -62.5,
        lat_max: float = -59.5,
        lon_min: float = -47.5,
        lon_max: float = -38.0,
        grid_step: float = 0.25 # ~15 NM resolution
    ):
        self.lat_min = lat_min
        self.lat_max = lat_max
        self.lon_min = lon_min
        self.lon_max = lon_max
        self.grid_step = grid_step

    def compute_grid(self, icebergs_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates 2D risk cells with normalized risk scores (0.0 to 1.0) and hazard tags.
        """
        # Build Shapely polygons for icebergs
        berg_polys = []
        for berg in icebergs_data:
            pts = [(p["lon"], p["lat"]) for p in berg["polygon"]]
            if len(pts) >= 3:
                poly = Polygon(pts)
                berg_polys.append({
                    "poly": poly,
                    "threat": berg.get("threat_level", "medium"),
                    "name": berg.get("name", "Iceberg")
                })

        cells = []
        lat = self.lat_min
        while lat <= self.lat_max:
            lon = self.lon_min
            while lon <= self.lon_max:
                pt = Point(lon, lat)
                
                # 1. Iceberg proximity risk
                min_berg_dist_nm = 999.0
                inside_berg = False
                for b in berg_polys:
                    if b["poly"].contains(pt):
                        inside_berg = True
                        min_berg_dist_nm = 0.0
                        break
                    dist_deg = b["poly"].distance(pt)
                    dist_nm = dist_deg * 60.0
                    if dist_nm < min_berg_dist_nm:
                        min_berg_dist_nm = dist_nm

                # 2. Pack ice concentration factor
                # Natural Antarctic pack ice increases towards south and east
                pack_ice_score = max(0.0, min(1.0, (-lat - 59.5) / 3.0 * 0.7 + (-lon - 38.0) / 9.5 * 0.3))
                
                # 3. Aggregate risk calculation
                if inside_berg:
                    total_risk = 1.0
                    status = "IMPASSABLE"
                elif min_berg_dist_nm < 4.0:
                    total_risk = 0.85
                    status = "CRITICAL_PROXIMITY"
                elif min_berg_dist_nm < 8.0:
                    total_risk = 0.60
                    status = "HAZARDOUS"
                else:
                    total_risk = round(0.15 + 0.35 * pack_ice_score, 2)
                    status = "MODERATE" if total_risk > 0.35 else "NOMINAL"

                cells.append({
                    "lat": round(lat, 2),
                    "lon": round(lon, 2),
                    "risk_score": round(total_risk, 2),
                    "status": status,
                    "ice_concentration_tenths": min(10, int(total_risk * 10)),
                    "closest_iceberg_nm": round(min_berg_dist_nm, 1) if min_berg_dist_nm < 100 else 99.0
                })

                lon += self.grid_step
            lat += self.grid_step

        return {
            "sector": "Weddell Sea / South Orkney",
            "bounds": {
                "lat_min": self.lat_min,
                "lat_max": self.lat_max,
                "lon_min": self.lon_min,
                "lon_max": self.lon_max,
            },
            "grid_resolution_deg": self.grid_step,
            "total_cells": len(cells),
            "cells": cells
        }
