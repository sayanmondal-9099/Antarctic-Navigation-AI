import os
import joblib
import numpy as np
from typing import Optional

MODEL_DIR = os.path.join(os.path.dirname(__file__), "weights")

class ScikitLearnModel:
    """
    Wrapper for Scikit-Learn models.
    """
    def __init__(self, filename: str):
        self.filepath = os.path.join(MODEL_DIR, filename)
        self.model = None
        self.is_loaded = False
        self._load()

    def _load(self):
        if os.path.exists(self.filepath):
            try:
                self.model = joblib.load(self.filepath)
                self.is_loaded = True
            except Exception as e:
                print(f"Failed to load model {self.filepath}: {e}")
                self.is_loaded = False
        else:
            self.is_loaded = False

    def predict(self, features: list) -> Optional[np.ndarray]:
        if not self.is_loaded or self.model is None:
            return None
        try:
            return self.model.predict(np.array(features).reshape(1, -1))
        except Exception as e:
            print(f"Prediction failed: {e}")
            return None

class SeaIceMLModel(ScikitLearnModel):
    def __init__(self):
        super().__init__("sea_ice_model.pkl")

class IcebergMLModel(ScikitLearnModel):
    def __init__(self):
        super().__init__("iceberg_model.pkl")
