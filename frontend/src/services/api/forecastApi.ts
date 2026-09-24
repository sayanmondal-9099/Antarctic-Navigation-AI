import { apiClient } from './client';
import type { Position } from '../../types';

export interface ForecastRequest {
  horizon_hours: number;
  latitude?: number;
  longitude?: number;
  item_id?: string;
}

export interface SeaIceForecastResponse {
  latitude: number;
  longitude: number;
  forecast_time: string;
  predicted_concentration: number;
  confidence: string;
  model_version: string;
}

export interface IcebergForecastResponse {
  iceberg_id: string;
  current_position: Position;
  predicted_position: Position;
  predicted_track: Position[];
  forecast_time: string;
  confidence: string;
  model_version: string;
}

export interface ModelMetadata {
  model_name: string;
  model_version: string;
  training_data_range: string;
  features: string[];
  training_timestamp: string;
  metrics: Record<string, number>;
  status: string;
}

export interface ModelStatusResponse {
  sea_ice_model: ModelMetadata;
  iceberg_model: ModelMetadata;
  fallback_enabled: boolean;
}

export const forecastApi = {
  getStatus: async (): Promise<ModelStatusResponse> => {
    const response = await apiClient.get('/forecast/models/status');
    return response.data;
  },

  forecastSeaIce: async (request: ForecastRequest): Promise<SeaIceForecastResponse> => {
    const { data } = await apiClient.post<SeaIceForecastResponse>('/forecast/sea-ice', request);
    return data;
  },

  forecastIceberg: async (request: ForecastRequest): Promise<IcebergForecastResponse> => {
    const response = await apiClient.post('/forecast/iceberg', request);
    return response.data;
  }
};
