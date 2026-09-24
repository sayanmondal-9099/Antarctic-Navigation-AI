"""
Data Normalization Layer for Antarctic Maritime Navigation Decision-Support System.
Translates heterogeneous provider formats (different coordinate aliases, unit conventions,
lon 0..360 vs -180..180, m/s vs knots, percentage vs tenths) into standardized internal models.
"""

from datetime import datetime, timezone
import math
from typing import Dict, Any, Optional, List, Tuple
from app.models.data_models import (
    Coordinate,
    NormalizedVessel,
    NormalizedIceberg,
    NormalizedSeaIce,
    NormalizedWeather,
    NormalizedOceanCurrent,
)


class DataNormalizer:
    """
    Normalizes heterogeneous raw sensor and provider payloads.
    """

    @staticmethod
    def extract_lat_lon(raw: Dict[str, Any]) -> Tuple[float, float]:
        """
        Extracts latitude and longitude from multiple possible key aliases.
        """
        lat_val = None
        for k in ["lat", "latitude", "LAT", "Latitude", "LATITUDE", "y", "Y"]:
            if k in raw and raw[k] is not None:
                lat_val = raw[k]
                break

        lon_val = None
        for k in ["lon", "lng", "longitude", "LON", "LNG", "Longitude", "LONGITUDE", "x", "X"]:
            if k in raw and raw[k] is not None:
                lon_val = raw[k]
                break

        if lat_val is None or lon_val is None:
            raise ValueError(f"Missing coordinate fields in payload: {raw}")

        try:
            lat = float(lat_val)
            lon = float(lon_val)
        except (ValueError, TypeError) as e:
            raise ValueError(f"Cannot cast coordinates to float: lat={lat_val}, lon={lon_val}") from e

        # Normalize longitude from 0..360 (common in ERA5 / NetCDF grid products) to -180..180
        if 180.0 < lon <= 360.0:
            lon = lon - 360.0

        if not (-90.0 <= lat <= 90.0):
            raise ValueError(f"Latitude out of bounds [-90, 90]: {lat}")
        if not (-180.0 <= lon <= 180.0):
            raise ValueError(f"Longitude out of bounds [-180, 180]: {lon}")

        return round(lat, 6), round(lon, 6)

    @staticmethod
    def normalize_speed_knots(speed_val: Any, unit: str = "knots") -> float:
        """
        Normalizes speed to knots.
        Supported units: 'knots', 'kts', 'm/s', 'mps', 'km/h', 'kmh'
        """
        if speed_val is None:
            return 0.0
        try:
            v = float(speed_val)
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid speed value: {speed_val}") from e

        if v < 0.0:
            raise ValueError(f"Speed cannot be negative: {v}")

        u = unit.lower().strip()
        if u in ["knots", "kts", "knot"]:
            knots = v
        elif u in ["m/s", "mps", "meter/second", "meters_per_second"]:
            knots = v * 1.943844
        elif u in ["km/h", "kmh", "kph"]:
            knots = v * 0.539957
        else:
            knots = v

        return min(60.0, round(knots, 2))

    @staticmethod
    def normalize_sea_ice_concentration(val: Any) -> float:
        """
        Normalizes sea-ice concentration to tenths [0.0, 10.0].
        Handles percentage [0.0, 100.0] or fractional [0.0, 1.0] or tenths [0.0, 10.0].
        """
        if val is None:
            return 0.0
        try:
            num = float(val)
        except (ValueError, TypeError) as e:
            raise ValueError(f"Invalid sea ice concentration: {val}") from e

        if num < 0.0:
            raise ValueError(f"Sea ice concentration cannot be negative: {num}")

        # If given as percentage > 10.0 (e.g. 85%) -> convert to tenths 8.5
        if num > 10.0 and num <= 100.0:
            tenths = num / 10.0
        # If given as fractional 0.0..1.0 -> convert to tenths
        elif 0.0 <= num <= 1.0:
            tenths = num * 10.0
        else:
            tenths = num

        return min(10.0, round(tenths, 2))

    @staticmethod
    def normalize_timestamp(ts: Any) -> str:
        """
        Normalizes timestamps to ISO-8601 UTC string.
        """
        if ts is None:
            return datetime.now(timezone.utc).isoformat()
        if isinstance(ts, datetime):
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            return ts.isoformat()
        if isinstance(ts, (int, float)):
            # Epoch timestamp
            return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        if isinstance(ts, str):
            ts_clean = ts.strip()
            if not ts_clean:
                return datetime.now(timezone.utc).isoformat()
            try:
                # Validate parsing
                dt = datetime.fromisoformat(ts_clean.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                return datetime.now(timezone.utc).isoformat()
        return datetime.now(timezone.utc).isoformat()

    @classmethod
    def normalize_vessel(cls, raw: Dict[str, Any], default_source: str = "AIS") -> NormalizedVessel:
        """
        Normalizes a raw vessel dictionary to NormalizedVessel.
        """
        v_id = raw.get("id") or raw.get("vessel_id") or raw.get("mmsi")
        if not v_id:
            raise ValueError("Vessel payload missing required 'id' or 'mmsi'")

        name = raw.get("name") or raw.get("vessel_name") or f"Vessel {v_id}"
        
        # Coordinates might be nested in 'position' dict or flat
        pos_raw = raw.get("position") if isinstance(raw.get("position"), dict) else raw
        lat, lon = cls.extract_lat_lon(pos_raw)

        raw_speed = raw.get("speed_knots") if "speed_knots" in raw else raw.get("speed", 12.0)
        speed = cls.normalize_speed_knots(raw_speed, unit=raw.get("speed_unit", "knots"))

        raw_hdg = raw.get("heading") if "heading" in raw else raw.get("heading_degrees", 0.0)
        heading = float(raw_hdg) % 360.0

        return NormalizedVessel(
            id=str(v_id),
            name=str(name),
            latitude=lat,
            longitude=lon,
            speed_knots=speed,
            heading_degrees=heading,
            status=raw.get("status", "cruising"),
            destination=raw.get("destination", "Demo Station"),
            ice_class=raw.get("ice_class", "PC2"),
            source=raw.get("source", default_source),
            timestamp=cls.normalize_timestamp(raw.get("timestamp")),
            safety_radius_nm=float(raw.get("safety_radius_nm", 2.5)),
        )

    @classmethod
    def normalize_iceberg(cls, raw: Dict[str, Any], default_source: str = "BYU_NIC") -> NormalizedIceberg:
        """
        Normalizes a raw iceberg hazard dictionary to NormalizedIceberg.
        """
        i_id = raw.get("id") or raw.get("iceberg_id") or raw.get("name")
        if not i_id:
            raise ValueError("Iceberg payload missing required 'id'")

        # Parse polygon if provided
        poly_coords: List[Coordinate] = []
        raw_poly = raw.get("polygon")
        if isinstance(raw_poly, list) and len(raw_poly) > 0:
            for pt in raw_poly:
                if isinstance(pt, dict):
                    plat, plon = cls.extract_lat_lon(pt)
                    poly_coords.append(Coordinate(latitude=plat, longitude=plon))

        # Centroid calculation
        if poly_coords:
            lat = round(sum(p.latitude for p in poly_coords) / len(poly_coords), 6)
            lon = round(sum(p.longitude for p in poly_coords) / len(poly_coords), 6)
        else:
            pos_raw = raw.get("position") if isinstance(raw.get("position"), dict) else raw
            lat, lon = cls.extract_lat_lon(pos_raw)

        threat = (raw.get("threat_level") or "medium").lower()
        if threat not in ["critical", "high", "medium", "low"]:
            threat = "medium"

        size = (raw.get("size_class") or "medium").lower()
        if size not in ["giant", "large", "medium", "small", "growler"]:
            size = "medium"

        # Default hazard buffer based on size class
        default_buffer = 4.8 if size == "giant" else 3.5 if size == "large" else 2.5 if size == "medium" else 1.5
        hazard_buf = float(raw.get("hazard_radius_nm", default_buffer))

        return NormalizedIceberg(
            id=str(i_id),
            name=raw.get("name") or str(i_id),
            latitude=lat,
            longitude=lon,
            polygon=poly_coords,
            size_class=size,
            threat_level=threat,
            drift_speed_knots=cls.normalize_speed_knots(raw.get("drift_speed_knots", 1.0)),
            drift_heading_degrees=float(raw.get("drift_heading_degrees", 215.0)) % 360.0,
            hazard_radius_nm=hazard_buf,
            source=raw.get("source", default_source),
            timestamp=cls.normalize_timestamp(raw.get("timestamp")),
        )

    @classmethod
    def normalize_sea_ice(cls, raw: Dict[str, Any], default_source: str = "NSIDC") -> NormalizedSeaIce:
        """
        Normalizes sea-ice concentration grid entry.
        """
        lat, lon = cls.extract_lat_lon(raw)
        conc_raw = raw.get("concentration") if "concentration" in raw else raw.get("concentration_tenths", 5.0)
        conc = cls.normalize_sea_ice_concentration(conc_raw)

        return NormalizedSeaIce(
            latitude=lat,
            longitude=lon,
            concentration_tenths=conc,
            thickness_meters=float(raw.get("thickness_meters", 0.8)),
            stage_of_development=raw.get("stage_of_development", "first_year_ice"),
            source=raw.get("source", default_source),
            timestamp=cls.normalize_timestamp(raw.get("timestamp")),
        )

    @classmethod
    def normalize_weather(cls, raw: Dict[str, Any], default_source: str = "ERA5") -> NormalizedWeather:
        """
        Normalizes meteorological conditions.
        """
        lat, lon = cls.extract_lat_lon(raw)
        wind_spd = cls.normalize_speed_knots(
            raw.get("wind_speed_knots") if "wind_speed_knots" in raw else raw.get("wind_speed", 25.0),
            unit=raw.get("wind_speed_unit", "knots")
        )
        wind_dir = float(raw.get("wind_direction_deg") if "wind_direction_deg" in raw else raw.get("wind_direction", 225.0)) % 360.0

        return NormalizedWeather(
            latitude=lat,
            longitude=lon,
            wind_speed_knots=wind_spd,
            wind_direction_deg=wind_dir,
            temperature_c=float(raw.get("temperature_c", raw.get("temperature", -15.0))),
            visibility_nm=float(raw.get("visibility_nm", raw.get("visibility", 5.0))),
            freezing_rate_cm_day=float(raw.get("freezing_rate_cm_day", 2.5)),
            source=raw.get("source", default_source),
            timestamp=cls.normalize_timestamp(raw.get("timestamp")),
        )

    @classmethod
    def normalize_ocean_current(cls, raw: Dict[str, Any], default_source: str = "COPERNICUS") -> NormalizedOceanCurrent:
        """
        Normalizes ocean current data.
        """
        lat, lon = cls.extract_lat_lon(raw)
        spd = cls.normalize_speed_knots(
            raw.get("current_speed_knots") if "current_speed_knots" in raw else raw.get("current_speed", 0.6),
            unit=raw.get("speed_unit", "knots")
        )
        heading = float(raw.get("current_direction_deg") if "current_direction_deg" in raw else raw.get("current_direction", 215.0)) % 360.0

        return NormalizedOceanCurrent(
            latitude=lat,
            longitude=lon,
            current_speed_knots=spd,
            current_direction_deg=heading,
            source=raw.get("source", default_source),
            timestamp=cls.normalize_timestamp(raw.get("timestamp")),
        )
