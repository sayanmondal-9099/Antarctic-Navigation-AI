"""
Unit Tests for Data Provider Abstraction, Offline Demo Datasets, and Adapter Stubs.
"""

import unittest
from app.data.providers import (
    DemoDataProvider,
    NSIDCProvider,
    BYUNICProvider,
    CopernicusProvider,
    ERA5Provider,
    ISROProvider,
    AISProvider,
)


class TestDataProviders(unittest.TestCase):
    """
    Test suite for provider contract, offline dataset loading, and adapter stubs.
    """

    def test_demo_data_provider_snapshot(self):
        provider = DemoDataProvider()
        snapshot = provider.get_snapshot()

        self.assertIsNotNone(snapshot)
        self.assertGreaterEqual(len(snapshot.vessels), 3)
        self.assertGreaterEqual(len(snapshot.icebergs), 1)
        self.assertGreaterEqual(len(snapshot.sea_ice), 10)
        self.assertIsNotNone(snapshot.weather)
        self.assertGreaterEqual(len(snapshot.ocean_currents), 1)

    def test_provider_adapter_stubs(self):
        providers = [
            NSIDCProvider(),
            BYUNICProvider(),
            CopernicusProvider(),
            ERA5Provider(),
            ISROProvider(),
            AISProvider(),
        ]

        for p in providers:
            snapshot = p.get_snapshot()
            self.assertIsNotNone(snapshot)
            self.assertTrue(len(snapshot.vessels) >= 1)
            self.assertTrue(len(snapshot.icebergs) >= 1)


if __name__ == "__main__":
    unittest.main()
