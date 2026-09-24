"""
Data Provider Abstraction Layer for Antarctic Maritime Navigation Decision-Support System.
Ensures that the Risk Engine and Routing Engines never directly couple to external APIs.
All providers output normalized, validated internal geographic models.
"""

from abc import ABC, abstractmethod
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from app.models.data_models import (
    NormalizedVessel,
    NormalizedIceberg,
    NormalizedSeaIce,
    NormalizedWeather,
    NormalizedOceanCurrent,
    NormalizedEnvironmentalSnapshot,
)
from app.data.normalizer import DataNormalizer


class BaseDataProvider(ABC):
    """
    Abstract Data Provider Interface.
    All source-specific adapters implement this contract.
    """

    @abstractmethod
    def get_vessels(self) -> List[NormalizedVessel]:
        """Returns list of normalized active vessels."""
        pass

    @abstractmethod
    def get_icebergs(self) -> List[NormalizedIceberg]:
        """Returns list of normalized tracked iceberg hazards."""
        pass

    @abstractmethod
    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        """Returns list of normalized sea-ice concentration points/cells."""
        pass

    @abstractmethod
    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        """Returns normalized meteorological observation."""
        pass

    @abstractmethod
    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        """Returns list of normalized hydrodynamic current vectors."""
        pass

    def get_snapshot(self) -> NormalizedEnvironmentalSnapshot:
        """Returns consolidated multi-layer snapshot."""
        return NormalizedEnvironmentalSnapshot(
            vessels=self.get_vessels(),
            icebergs=self.get_icebergs(),
            sea_ice=self.get_sea_ice(),
            weather=self.get_weather(),
            ocean_currents=self.get_ocean_currents(),
            source=self.__class__.__name__,
        )


class DemoDataProvider(BaseDataProvider):
    """
    High-Fidelity Deterministic Offline Benchmark Provider.
    Loads benchmark datasets from 'data/sample/' with automatic fallback.
    Guarantees 100% offline functionality.
    """

    def __init__(self, sample_dir: Optional[Path] = None):
        if sample_dir is None:
            # Locate data/sample directory relative to project root or Docker container
            dev_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "sample"
            docker_dir = Path(__file__).resolve().parent.parent.parent / "data" / "sample"
            if dev_dir.exists():
                self.sample_dir = dev_dir
            elif docker_dir.exists():
                self.sample_dir = docker_dir
            elif Path("/app/data/sample").exists():
                self.sample_dir = Path("/app/data/sample")
            else:
                self.sample_dir = dev_dir
        else:
            self.sample_dir = sample_dir

    def _read_json_file(self, filename: str) -> List[Dict[str, Any]]:
        target_path = self.sample_dir / filename
        if not target_path.exists():
            return []
        try:
            with open(target_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else [data]
        except Exception:
            return []

    def get_vessels(self) -> List[NormalizedVessel]:
        raw_list = self._read_json_file("vessels.json")
        if not raw_list:
            # Fallback benchmark vessels
            raw_list = [
                {
                    "id": "vessel-A",
                    "name": "Ship A (R/V Polar Pioneer)",
                    "position": {"lat": -60.2, "lon": -45.3},
                    "heading": 85.0,
                    "speed_knots": 12.0,
                    "destination": "Demo Station",
                    "status": "cruising",
                    "source": "DEMO_BENCHMARK",
                },
                {
                    "id": "vessel-B",
                    "name": "Ship B (Aurora Australis)",
                    "position": {"lat": -62.0, "lon": -47.0},
                    "heading": 45.0,
                    "speed_knots": 9.5,
                    "destination": "Palmer Base",
                    "status": "icebreaking",
                    "source": "DEMO_BENCHMARK",
                },
                {
                    "id": "vessel-C",
                    "name": "Ship C (R/V Kronprins Haakon)",
                    "position": {"lat": -59.4, "lon": -41.2},
                    "heading": 160.0,
                    "speed_knots": 14.0,
                    "destination": "Rothera Station",
                    "status": "cruising",
                    "source": "DEMO_BENCHMARK",
                },
            ]

        vessels = []
        for raw in raw_list:
            try:
                vessels.append(DataNormalizer.normalize_vessel(raw, default_source="DEMO_OFFLINE"))
            except Exception:
                continue
        return vessels

    def get_icebergs(self) -> List[NormalizedIceberg]:
        raw_list = self._read_json_file("icebergs.json")
        if not raw_list:
            # Fallback benchmark icebergs
            raw_list = [
                {
                    "id": "iceberg-01",
                    "name": "Iceberg A-81 Tabular",
                    "size_class": "giant",
                    "threat_level": "high",
                    "polygon": [
                        {"lat": -59.7, "lon": -43.2},
                        {"lat": -59.85, "lon": -43.5},
                        {"lat": -59.9, "lon": -42.8},
                        {"lat": -59.75, "lon": -42.6},
                    ],
                }
            ]

        icebergs = []
        for raw in raw_list:
            try:
                icebergs.append(DataNormalizer.normalize_iceberg(raw, default_source="DEMO_OFFLINE"))
            except Exception:
                continue
        return icebergs

    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        # Grid points across Weddell Sea navigation corridor
        grid = []
        for lat in [-62.0, -61.5, -61.0, -60.5, -60.0, -59.5]:
            for lon in [-46.0, -44.0, -42.0, -40.0, -38.0]:
                # Higher concentration further South
                conc = 2.0 + (abs(lat) - 59.0) * 1.8
                grid.append(
                    NormalizedSeaIce(
                        latitude=lat,
                        longitude=lon,
                        concentration_tenths=min(9.5, round(conc, 1)),
                        thickness_meters=round(0.4 + (abs(lat) - 59.0) * 0.3, 2),
                        source="DEMO_OFFLINE_GRID",
                    )
                )
        return grid

    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        # High wind scenario for northern latitudes (e.g. Route A), calmer for southern (Route B)
        if lat > -60.5:
            return NormalizedWeather(
                latitude=lat,
                longitude=lon,
                wind_speed_knots=45.0,
                wind_direction_deg=270.0,  # Westerly
                temperature_c=-14.5,
                visibility_nm=2.0,
                pressure_hpa=985.0,
                freezing_rate_cm_day=5.2,
                source="DEMO_OFFLINE_MET_HIGH_RISK",
            )
        else:
            return NormalizedWeather(
                latitude=lat,
                longitude=lon,
                wind_speed_knots=12.0,
                wind_direction_deg=180.0,
                temperature_c=-8.5,
                visibility_nm=10.0,
                pressure_hpa=1010.0,
                freezing_rate_cm_day=1.2,
                source="DEMO_OFFLINE_MET_LOW_RISK",
            )

    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        # Return a grid of currents. Strong adverse currents in the north, weak favorable in the south
        currents = []
        for lat in [-62.0, -61.0, -60.0, -59.0]:
            for lon in [-46.0, -44.0, -42.0, -40.0]:
                if lat > -60.5:
                    # Strong adverse (flowing West, ~270)
                    speed = 3.5
                    direction = 270.0
                else:
                    # Weak favorable (flowing East/SE)
                    speed = 0.5
                    direction = 135.0
                
                currents.append(NormalizedOceanCurrent(
                    latitude=lat,
                    longitude=lon,
                    current_speed_knots=speed,
                    current_direction_deg=direction,
                    source="DEMO_OFFLINE_HYDRO"
                ))
        return currents


# ── Future External Provider Adapters (Stubs / Placeholders) ─────────────────

class NSIDCProvider(BaseDataProvider):
    """
    Adapter for National Snow and Ice Data Center (NSIDC) Sea Ice Concentration.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self._fallback = DemoDataProvider()

    def get_vessels(self) -> List[NormalizedVessel]:
        return self._fallback.get_vessels()

    def get_icebergs(self) -> List[NormalizedIceberg]:
        return self._fallback.get_icebergs()

    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        # Live NSIDC NetCDF/GeoTIFF ingestion will plug in here.
        # Defaults to normalized offline baseline.
        return self._fallback.get_sea_ice()

    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        return self._fallback.get_weather(lat, lon)

    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        return self._fallback.get_ocean_currents()


class BYUNICProvider(BaseDataProvider):
    """
    Adapter for BYU / National Ice Center (NIC) Antarctic Iceberg Database.
    """
    def __init__(self, endpoint_url: Optional[str] = None):
        self.endpoint_url = endpoint_url
        self._fallback = DemoDataProvider()

    def get_vessels(self) -> List[NormalizedVessel]:
        return self._fallback.get_vessels()

    def get_icebergs(self) -> List[NormalizedIceberg]:
        # Live BYU/NIC shapefile / CSV feed connects here.
        return self._fallback.get_icebergs()

    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        return self._fallback.get_sea_ice()

    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        return self._fallback.get_weather(lat, lon)

    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        return self._fallback.get_ocean_currents()


class CopernicusProvider(BaseDataProvider):
    """
    Adapter for Copernicus Marine Service (CMEMS) Ocean Currents & Hydrodynamics.
    """
    def __init__(self, username: Optional[str] = None, password: Optional[str] = None):
        self._fallback = DemoDataProvider()

    def get_vessels(self) -> List[NormalizedVessel]:
        return self._fallback.get_vessels()

    def get_icebergs(self) -> List[NormalizedIceberg]:
        return self._fallback.get_icebergs()

    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        return self._fallback.get_sea_ice()

    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        return self._fallback.get_weather(lat, lon)

    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        return self._fallback.get_ocean_currents()


class ERA5Provider(BaseDataProvider):
    """
    Adapter for ECMWF ERA5 Atmospheric Reanalysis & Forecast (Wind/Weather).
    """
    def __init__(self, api_key: Optional[str] = None):
        self._fallback = DemoDataProvider()

    def get_vessels(self) -> List[NormalizedVessel]:
        return self._fallback.get_vessels()

    def get_icebergs(self) -> List[NormalizedIceberg]:
        return self._fallback.get_icebergs()

    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        return self._fallback.get_sea_ice()

    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        return self._fallback.get_weather(lat, lon)

    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        return self._fallback.get_ocean_currents()


class ISROProvider(BaseDataProvider):
    """
    Adapter for ISRO / MOSDAC / Bhuvan Indian Satellite Polar Observations.
    """
    def __init__(self, access_token: Optional[str] = None):
        self._fallback = DemoDataProvider()

    def get_vessels(self) -> List[NormalizedVessel]:
        return self._fallback.get_vessels()

    def get_icebergs(self) -> List[NormalizedIceberg]:
        return self._fallback.get_icebergs()

    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        return self._fallback.get_sea_ice()

    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        return self._fallback.get_weather(lat, lon)

    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        return self._fallback.get_ocean_currents()


class AISProvider(BaseDataProvider):
    """
    Adapter for Marine AIS Multi-Vessel Dynamic Telemetry Stream.
    """
    def __init__(self, feed_url: Optional[str] = None):
        self._fallback = DemoDataProvider()

    def get_vessels(self) -> List[NormalizedVessel]:
        return self._fallback.get_vessels()

    def get_icebergs(self) -> List[NormalizedIceberg]:
        return self._fallback.get_icebergs()

    def get_sea_ice(self) -> List[NormalizedSeaIce]:
        return self._fallback.get_sea_ice()

    def get_weather(self, lat: float = -60.2, lon: float = -45.3) -> NormalizedWeather:
        return self._fallback.get_weather(lat, lon)

    def get_ocean_currents(self) -> List[NormalizedOceanCurrent]:
        return self._fallback.get_ocean_currents()
