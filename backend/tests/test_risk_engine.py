"""
Unit Tests for Standalone Maritime Risk Calculator, Distance Formulas, Weighting, and Classification.
"""

import unittest
from app.models.data_models import (
    NormalizedVessel,
    NormalizedIceberg,
    NormalizedSeaIce,
    NormalizedWeather,
    NormalizedOceanCurrent,
    NormalizedEnvironmentalSnapshot,
)
from app.risk.calculator import (
    RiskCalculator,
    RiskConfig,
    haversine_distance_nm,
)


class TestMaritimeRiskEngine(unittest.TestCase):
    """
    Test suite for geodetic distance calculations, multivariable proximity risk, and weighting.
    """

    def setUp(self):
        self.calculator = RiskCalculator()
        self.demo_vessel = NormalizedVessel(
            id="vessel-test",
            name="R/V Discovery",
            latitude=-60.2,
            longitude=-45.3,
            speed_knots=12.0,
            heading_degrees=85.0,
            safety_radius_nm=2.5,
        )

        self.demo_icebergs = [
            NormalizedIceberg(
                id="iceberg-near",
                name="A-81 Near Hazard",
                latitude=-60.22,
                longitude=-45.32,
                size_class="giant",
                threat_level="high",
                hazard_radius_nm=3.0,
            ),
            NormalizedIceberg(
                id="iceberg-far",
                name="B-15 Distant",
                latitude=-63.0,
                longitude=-40.0,
                size_class="medium",
                threat_level="low",
                hazard_radius_nm=2.0,
            ),
        ]

    def test_haversine_distance_calculation(self):
        # 1 degree of latitude at the meridian is approximately 60 NM
        dist = haversine_distance_nm(-60.0, -45.0, -61.0, -45.0)
        self.assertAlmostEqual(dist, 60.0, delta=0.5)

        # Distance to same point is 0
        dist_zero = haversine_distance_nm(-60.2, -45.3, -60.2, -45.3)
        self.assertEqual(dist_zero, 0.0)

    def test_iceberg_proximity_risk_inside_hazard_buffer(self):
        # Vessel very close to iceberg (< hazard_radius_nm)
        score, dist_nm, name, level, details = self.calculator.calculate_iceberg_proximity_risk(
            -60.20, -45.30, self.demo_icebergs
        )
        self.assertLess(dist_nm, 3.0)
        self.assertGreaterEqual(score, 0.8)
        self.assertIn(level, ["HIGH", "CRITICAL"])
        self.assertIn("A-81", name)

    def test_iceberg_proximity_risk_far_away(self):
        # Vessel 100 NM away from all icebergs
        score, dist_nm, name, level, details = self.calculator.calculate_iceberg_proximity_risk(
            -55.0, -45.0, self.demo_icebergs
        )
        self.assertGreater(dist_nm, 100.0)
        self.assertLessEqual(score, 0.15)
        self.assertEqual(level, "LOW")

    def test_vessel_proximity_risk_close_traffic(self):
        traffic = [
            self.demo_vessel,
            NormalizedVessel(
                id="vessel-other",
                name="Passing Ship",
                latitude=-60.21,
                longitude=-45.31,
                speed_knots=10.0,
                heading_degrees=270.0,
            )
        ]
        score, dist_nm, name, level, details = self.calculator.calculate_vessel_proximity_risk(
            self.demo_vessel, traffic
        )
        self.assertLess(dist_nm, 2.0)
        self.assertGreaterEqual(score, 0.8)
        self.assertIn(level, ["HIGH", "CRITICAL"])

    def test_vessel_proximity_risk_isolated(self):
        # Only ownship in AIS stream
        score, dist_nm, name, level, details = self.calculator.calculate_vessel_proximity_risk(
            self.demo_vessel, [self.demo_vessel]
        )
        self.assertEqual(score, 0.0)
        self.assertIsNone(dist_nm)
        self.assertEqual(level, "LOW")

    def test_risk_weighting_and_classification(self):
        config = RiskConfig(
            iceberg_weight=0.50,
            ice_weight=0.20,
            vessel_weight=0.15,
            weather_weight=0.10,
            current_weight=0.05,
            low_threshold=0.25,
            moderate_threshold=0.50,
            high_threshold=0.75,
        )
        self.assertAlmostEqual(config.iceberg_weight, 0.50)
        self.assertEqual(config.classify_score(0.10), "LOW")
        self.assertEqual(config.classify_score(0.35), "MODERATE")
        self.assertEqual(config.classify_score(0.65), "HIGH")
        self.assertEqual(config.classify_score(0.85), "CRITICAL")

    def test_full_vessel_risk_evaluation(self):
        snapshot = NormalizedEnvironmentalSnapshot(
            vessels=[self.demo_vessel],
            icebergs=self.demo_icebergs,
            sea_ice=[
                NormalizedSeaIce(
                    latitude=-60.2,
                    longitude=-45.3,
                    concentration_tenths=6.5,
                )
            ],
            weather=NormalizedWeather(
                latitude=-60.2,
                longitude=-45.3,
                wind_speed_knots=30.0,
                wind_direction_deg=225.0,
                temperature_c=-16.0,
            ),
            ocean_currents=[],
        )

        assessment = self.calculator.evaluate_vessel_risk(self.demo_vessel, snapshot)
        self.assertEqual(assessment.vessel_id, "vessel-test")
        self.assertGreater(assessment.overall_score, 0.0)
        self.assertLessEqual(assessment.overall_score, 1.0)
        self.assertIn(assessment.risk_level, ["LOW", "MODERATE", "HIGH", "CRITICAL"])
        self.assertEqual(len(assessment.contributors), 5)
        self.assertTrue(len(assessment.explanation) > 0)

    def test_missing_data_resilience(self):
        # Snapshot with NO icebergs, NO sea ice, NO weather, NO currents
        empty_snapshot = NormalizedEnvironmentalSnapshot(
            vessels=[self.demo_vessel],
            icebergs=[],
            sea_ice=[],
            weather=None,
            ocean_currents=[],
        )
        assessment = self.calculator.evaluate_vessel_risk(self.demo_vessel, empty_snapshot)
        self.assertIsNotNone(assessment)
        self.assertEqual(assessment.risk_level, "LOW")
        self.assertGreater(assessment.safety_score_percent, 80)


if __name__ == "__main__":
    unittest.main()
