import math
from typing import Optional, Tuple
from app.models.data_models import NormalizedIceberg, NormalizedSeaIce, NormalizedEnvironmentalSnapshot
from app.models.schemas import Position
from app.ml.schemas import SeaIceForecastResponse, IcebergForecastResponse
from app.ml.baseline import BaselineSeaIceModel, BaselineIcebergModel
from app.ml.models import SeaIceMLModel, IcebergMLModel
from app.ml.features import extract_sea_ice_features, extract_iceberg_features
from app.ml.registry import model_registry
from datetime import datetime, timedelta, timezone

class MLForecastGate:
    """
    Safety gate for ML forecasting.
    Validates predictions and falls back to deterministic baseline when necessary.
    """
    def __init__(self):
        self.sea_ice_baseline = BaselineSeaIceModel()
        self.iceberg_baseline = BaselineIcebergModel()
        self.sea_ice_ml = SeaIceMLModel()
        self.iceberg_ml = IcebergMLModel()

    def _is_plausible_coordinate(self, lat: float, lon: float) -> bool:
        if lat is None or lon is None: return False
        if math.isnan(lat) or math.isnan(lon): return False
        if math.isinf(lat) or math.isinf(lon): return False
        if not (-90.0 <= lat <= 90.0): return False
        if not (-180.0 <= lon <= 180.0): return False
        return True

    def _calculate_forecast_time(self, horizon_hours: int) -> str:
        return (datetime.now(timezone.utc) + timedelta(hours=horizon_hours)).isoformat()

    def get_sea_ice_forecast(
        self,
        current_ice: NormalizedSeaIce,
        snapshot: NormalizedEnvironmentalSnapshot,
        horizon_hours: int
    ) -> SeaIceForecastResponse:
        """
        Retrieves Sea Ice forecast, preferring ML but falling back to Baseline.
        """
        metadata = model_registry.get_model_metadata("sea_ice_model")
        forecast_time = self._calculate_forecast_time(horizon_hours)
        
        # ML Attempt
        use_ml = metadata and metadata.status == "ready" and self.sea_ice_ml.is_loaded
        if use_ml:
            features = extract_sea_ice_features(current_ice, snapshot)
            ml_pred = self.sea_ice_ml.predict(features)
            
            if ml_pred is not None:
                predicted_conc = float(ml_pred[0])
                if not math.isnan(predicted_conc) and not math.isinf(predicted_conc):
                    # Clamp to [0, 10]
                    predicted_conc = max(0.0, min(10.0, predicted_conc))
                    return SeaIceForecastResponse(
                        latitude=current_ice.latitude,
                        longitude=current_ice.longitude,
                        forecast_time=forecast_time,
                        predicted_concentration=predicted_conc,
                        confidence="MODERATE", # Simple confidence
                        model_version=metadata.model_version
                    )

        # Baseline Fallback
        baseline_pred = self.sea_ice_baseline.predict(current_ice, horizon_hours)
        return SeaIceForecastResponse(
            latitude=current_ice.latitude,
            longitude=current_ice.longitude,
            forecast_time=forecast_time,
            predicted_concentration=baseline_pred,
            confidence="HIGH", # Baseline is deterministic
            model_version=self.sea_ice_baseline.version
        )

    def get_iceberg_forecast(
        self,
        iceberg: NormalizedIceberg,
        snapshot: NormalizedEnvironmentalSnapshot,
        horizon_hours: int
    ) -> IcebergForecastResponse:
        """
        Retrieves Iceberg forecast, preferring ML but falling back to Baseline.
        """
        metadata = model_registry.get_model_metadata("iceberg_model")
        forecast_time = self._calculate_forecast_time(horizon_hours)
        current_pos = Position(lat=iceberg.latitude, lon=iceberg.longitude)
        
        # ML Attempt
        use_ml = metadata and metadata.status == "ready" and self.iceberg_ml.is_loaded
        if use_ml:
            features = extract_iceberg_features(iceberg, snapshot)
            ml_pred = self.iceberg_ml.predict(features)
            
            if ml_pred is not None and ml_pred.shape[1] >= 2:
                pred_lat, pred_lon = float(ml_pred[0][0]), float(ml_pred[0][1])
                
                if self._is_plausible_coordinate(pred_lat, pred_lon):
                    # For ML demo, assume a straight line to predicted point for track
                    predicted_pos = Position(lat=pred_lat, lon=pred_lon)
                    return IcebergForecastResponse(
                        iceberg_id=iceberg.id,
                        current_position=current_pos,
                        predicted_position=predicted_pos,
                        predicted_track=[current_pos, predicted_pos],
                        forecast_time=forecast_time,
                        confidence="MODERATE",
                        model_version=metadata.model_version
                    )

        # Baseline Fallback
        final_pos, track = self.iceberg_baseline.predict(iceberg, horizon_hours)
        return IcebergForecastResponse(
            iceberg_id=iceberg.id,
            current_position=current_pos,
            predicted_position=final_pos,
            predicted_track=track,
            forecast_time=forecast_time,
            confidence="HIGH", # Baseline is deterministic
            model_version=self.iceberg_baseline.version
        )

forecast_gate = MLForecastGate()
