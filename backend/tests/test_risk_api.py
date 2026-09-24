"""
Unit Tests for FastAPI Risk Engine Endpoints.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestRiskApiEndpoints(unittest.TestCase):
    """
    Test suite for /api/risk/vessel/{vessel_id}, /api/risk/area, and /api/risk/evaluate.
    """

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_get_vessel_risk_success(self):
        resp = self.client.get("/api/risk/vessel/vessel-A")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["vessel_id"], "vessel-A")
        self.assertIn("overall_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("contributors", data)
        self.assertGreaterEqual(len(data["contributors"]), 4)
        self.assertIn("explanation", data)

    def test_get_vessel_risk_not_found(self):
        resp = self.client.get("/api/risk/vessel/non-existent-vessel")
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.json()["detail"].lower())

    def test_get_area_risk_success(self):
        resp = self.client.get("/api/risk/area?min_lat=-62.0&max_lat=-59.0&min_lon=-47.0&max_lon=-38.0&grid_step=1.0")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("average_risk", data)
        self.assertIn("max_risk", data)
        self.assertIn("critical_zones_count", data)
        self.assertGreater(data["total_grid_points"], 0)

    def test_get_area_risk_invalid_bounds(self):
        resp = self.client.get("/api/risk/area?min_lat=-59.0&max_lat=-62.0")
        self.assertEqual(resp.status_code, 422)

    def test_post_evaluate_point(self):
        payload = {
            "latitude": -60.2,
            "longitude": -45.3,
            "speed_knots": 12.0,
            "heading_degrees": 85.0,
            "weights": {
                "iceberg_weight": 0.40,
                "ice_weight": 0.30,
                "vessel_weight": 0.15,
                "weather_weight": 0.10,
                "current_weight": 0.05,
            },
        }
        resp = self.client.post("/api/risk/evaluate", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("overall_score", data)
        self.assertIn("risk_level", data)
        self.assertIn("contributors", data)


if __name__ == "__main__":
    unittest.main()
