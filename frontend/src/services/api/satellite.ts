import { apiClient } from "./client";

export interface SatelliteMetadata {
  source: string;
  sensor: string;
  acquired_at: string;
  product_id?: string;
  name?: string;
  footprint?: string;
}

export interface SeaIceMetadata {
  source: string;
  sensor: string;
  acquired_at: string;
  layer_name: string;
  tile_url: string;
}

export interface SatelliteResponse {
  sentinel_1: SatelliteMetadata;
  sea_ice: SeaIceMetadata;
}

export const satelliteApi = {
  /**
   * Fetches the latest satellite and sea ice metadata for the current AOI.
   */
  getLatest: async (aoi_wkt?: string): Promise<SatelliteResponse> => {
    try {
      const params = aoi_wkt ? { aoi_wkt } : undefined;
      const response = await apiClient.get<SatelliteResponse>("/satellite/latest", { params });
      return response.data;
    } catch (error) {
      console.error("Error fetching satellite data", error);
      // Fallback to simulated data if API fails
      return {
        sentinel_1: {
          source: "DEMO SIMULATION",
          sensor: "Sentinel-1 SAR (Simulated)",
          acquired_at: new Date().toISOString(),
          product_id: "simulated-product-001",
          name: "S1A_IW_GRDH_1SDV_SIMULATED",
        },
        sea_ice: {
          source: "DEMO SIMULATION",
          sensor: "AMSR2 Sea Ice (Simulated)",
          acquired_at: new Date().toISOString(),
          layer_name: "AMSR2_Sea_Ice_Concentration_12km_Night",
          tile_url: ""
        }
      };
    }
  },
};
