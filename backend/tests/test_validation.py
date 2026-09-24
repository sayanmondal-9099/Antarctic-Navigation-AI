"""
Unit Tests for Geographic Coordinate, Vessel, Iceberg, and Normalizer Validation.
"""

import unittest
import math
from pydantic import ValidationError
from app.models.data_models import (
    Coordinate,
    NormalizedVessel,
    NormalizedIceberg,
    NormalizedSeaIce,
    NormalizedWeather,
    NormalizedOceanCurrent,
)
from app.data.normalizer import DataNormalizer


class TestDataValidation(unittest.TestCase):
    """
    Test suite for Pydantic v2 data models and coordinate boundaries.
    """

    def test_coordinate_valid(self):
        coord = Coordinate(latitude=-60.25, longitude=-45.33)
        self.assertEqual(coord.latitude, -60.25)
        self.assertEqual(coord.longitude, -45.33)

    def test_coordinate_out_of_bounds(self):
        # Latitude out of bounds
        with self.assertRaises(ValidationError):
            Coordinate(latitude=-95.0, longitude=0.0)

        with self.assertRaises(ValidationError):
            Coordinate(latitude=91.0, longitude=0.0)

        # Longitude out of bounds
        with self.assertRaises(ValidationError):
            Coordinate(latitude=0.0, longitude=-185.0)

        with self.assertRaises(ValidationError):
            Coordinate(latitude=0.0, longitude=180.1)

    def test_coordinate_nan_or_inf(self):
        with self.assertRaises(ValidationError):
            Coordinate(latitude=float("nan"), longitude=0.0)

        with self.assertRaises(ValidationError):
            Coordinate(latitude=0.0, longitude=float("inf"))

    def test_vessel_validation_valid(self):
        vessel = NormalizedVessel(
            id="vessel-01",
            name="Polar Explorer",
            latitude=-62.1,
            longitude=-44.5,
            speed_knots=14.5,
            heading_degrees=85.0,
            status="cruising",
        )
        self.assertEqual(vessel.id, "vessel-01")
        self.assertEqual(vessel.speed_knots, 14.5)
        self.assertEqual(vessel.heading_degrees, 85.0)

    def test_vessel_validation_invalid_speed_and_heading(self):
        # Negative speed
        with self.assertRaises(ValidationError):
            NormalizedVessel(
                id="vessel-01",
                name="Ship",
                latitude=-60.0,
                longitude=-40.0,
                speed_knots=-5.0,
                heading_degrees=90.0,
            )

        # Impossible speed (> 60 kts)
        with self.assertRaises(ValidationError):
            NormalizedVessel(
                id="vessel-01",
                name="Ship",
                latitude=-60.0,
                longitude=-40.0,
                speed_knots=75.0,
                heading_degrees=90.0,
            )

        # Heading out of [0, 360]
        with self.assertRaises(ValidationError):
            NormalizedVessel(
                id="vessel-01",
                name="Ship",
                latitude=-60.0,
                longitude=-40.0,
                speed_knots=10.0,
                heading_degrees=400.0,
            )

    def test_iceberg_validation(self):
        iceberg = NormalizedIceberg(
            id="iceberg-A81",
            name="Iceberg A-81",
            latitude=-59.8,
            longitude=-43.1,
            size_class="giant",
            threat_level="high",
            hazard_radius_nm=4.5,
        )
        self.assertEqual(iceberg.threat_level, "high")
        self.assertEqual(iceberg.hazard_radius_nm, 4.5)

        # Negative hazard radius
        with self.assertRaises(ValidationError):
            NormalizedIceberg(
                id="ice-bad",
                latitude=-60.0,
                longitude=-40.0,
                hazard_radius_nm=-1.0,
            )

    def test_sea_ice_validation(self):
        sea_ice = NormalizedSeaIce(
            latitude=-61.5,
            longitude=-45.0,
            concentration_tenths=7.5,
            thickness_meters=1.2,
        )
        self.assertEqual(sea_ice.concentration_tenths, 7.5)

        # Concentration > 10.0 tenths
        with self.assertRaises(ValidationError):
            NormalizedSeaIce(
                latitude=-61.5,
                longitude=-45.0,
                concentration_tenths=12.0,
            )

    def test_weather_validation(self):
        weather = NormalizedWeather(
            latitude=-60.0,
            longitude=-45.0,
            wind_speed_knots=32.0,
            wind_direction_deg=220.0,
            temperature_c=-18.0,
        )
        self.assertEqual(weather.wind_speed_knots, 32.0)
        self.assertEqual(weather.temperature_c, -18.0)


class TestDataNormalizer(unittest.TestCase):
    """
    Test suite for unit conversions and alias extraction.
    """

    def test_extract_lat_lon_aliases(self):
        # lat / lon
        lat, lon = DataNormalizer.extract_lat_lon({"lat": -60.5, "lon": -45.2})
        self.assertEqual((lat, lon), (-60.5, -45.2))

        # LATITUDE / LONGITUDE
        lat, lon = DataNormalizer.extract_lat_lon({"LATITUDE": "-61.2", "LONGITUDE": "-44.1"})
        self.assertEqual((lat, lon), (-61.2, -44.1))

        # Longitude 0..360 wrapping (e.g. 315°E = -45°W)
        lat, lon = DataNormalizer.extract_lat_lon({"lat": -60.0, "lon": 315.0})
        self.assertEqual((lat, lon), (-60.0, -45.0))

    def test_speed_unit_conversions(self):
        # m/s to knots: 10 m/s ~ 19.44 kts
        knots = DataNormalizer.normalize_speed_knots(10.0, unit="m/s")
        self.assertAlmostEqual(knots, 19.44, places=1)

        # km/h to knots: 50 km/h ~ 27.0 kts
        knots_kmh = DataNormalizer.normalize_speed_knots(50.0, unit="km/h")
        self.assertAlmostEqual(knots_kmh, 27.0, places=1)

    def test_sea_ice_concentration_conversions(self):
        # Percentage 85% -> 8.5 tenths
        tenths = DataNormalizer.normalize_sea_ice_concentration(85.0)
        self.assertEqual(tenths, 8.5)

        # Fractional 0.65 -> 6.5 tenths
        tenths_frac = DataNormalizer.normalize_sea_ice_concentration(0.65)
        self.assertEqual(tenths_frac, 6.5)

        # Already tenths 7.0 -> 7.0
        tenths_direct = DataNormalizer.normalize_sea_ice_concentration(7.0)
        self.assertEqual(tenths_direct, 7.0)


if __name__ == "__main__":
    unittest.main()
