import unittest
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app

class TestVesselEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_get_all_vessels(self):
        """Verify GET /api/vessels returns list of simulated demo vessels."""
        response = self.client.get("/api/vessels")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 3)
        vessel_ids = [v["id"] for v in data]
        self.assertIn("vessel-A", vessel_ids)
        self.assertIn("vessel-B", vessel_ids)
        self.assertIn("vessel-C", vessel_ids)

    def test_get_single_vessel(self):
        """Verify GET /api/vessels/{vessel_id} returns single vessel details."""
        response = self.client.get("/api/vessels/vessel-A")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "vessel-A")
        self.assertEqual(data["name"], "Ship A (R/V Polar Pioneer)")
        self.assertIn("position", data)
        self.assertIn("speed_knots", data)

    def test_get_nonexistent_vessel_returns_404(self):
        """Verify GET /api/vessels/unknown-vessel returns structured HTTP 404."""
        response = self.client.get("/api/vessels/unknown-vessel-999")
        self.assertEqual(response.status_code, 404)
        data = response.json()
        self.assertIn("detail", data)

if __name__ == "__main__":
    unittest.main()
