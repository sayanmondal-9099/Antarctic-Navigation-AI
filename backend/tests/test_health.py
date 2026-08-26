import unittest
from fastapi.testclient import TestClient
from app.main import app


class TestHealthEndpoint(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_check_returns_200(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)

    def test_health_check_payload_structure(self):
        response = self.client.get("/api/health")
        data = response.json()
        self.assertIn("status", data)
        self.assertEqual(data["status"], "ok")
        self.assertIn("service", data)
        self.assertEqual(data["service"], "antarctic-navigation-ai")
        self.assertIn("timestamp", data)


if __name__ == "__main__":
    unittest.main()
