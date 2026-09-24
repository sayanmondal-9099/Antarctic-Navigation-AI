import os
import json
from typing import Dict, Any, Optional
from app.ml.schemas import ModelMetadata

REGISTRY_FILE = os.path.join(os.path.dirname(__file__), "model_registry.json")

class ModelRegistry:
    """
    Simple file-based model registry.
    """
    def __init__(self):
        self._load_registry()

    def _load_registry(self):
        if os.path.exists(REGISTRY_FILE):
            with open(REGISTRY_FILE, 'r') as f:
                self.registry = json.load(f)
        else:
            self.registry = {
                "sea_ice_model": {
                    "model_name": "SeaIceBaseline",
                    "model_version": "v0.0.0",
                    "training_data_range": "N/A",
                    "features": [],
                    "training_timestamp": "N/A",
                    "metrics": {},
                    "status": "unavailable"
                },
                "iceberg_model": {
                    "model_name": "IcebergBaseline",
                    "model_version": "v0.0.0",
                    "training_data_range": "N/A",
                    "features": [],
                    "training_timestamp": "N/A",
                    "metrics": {},
                    "status": "unavailable"
                }
            }
            self._save_registry()

    def _save_registry(self):
        with open(REGISTRY_FILE, 'w') as f:
            json.dump(self.registry, f, indent=4)

    def get_model_metadata(self, model_key: str) -> Optional[ModelMetadata]:
        data = self.registry.get(model_key)
        if data:
            return ModelMetadata(**data)
        return None
        
    def update_model(self, model_key: str, metadata: ModelMetadata):
        self.registry[model_key] = metadata.model_dump()
        self._save_registry()

model_registry = ModelRegistry()
