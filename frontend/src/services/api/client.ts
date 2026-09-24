/**
 * Centralized API Service for Antarctic Maritime Navigation Decision-Support System.
 */

import axios, { AxiosError } from "axios";
import type {
  Iceberg,
  ApiRoute,
  ApiRoutingResponse,
  ApiRiskEvaluation,
  Position,
} from "../../types";

import { getAuthToken } from "../supabase/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.error("Failed to get auth token for request", err);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.warn(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} failed:`, error.message);
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Could trigger a global logout or notification here
    }
    return Promise.reject(error);
  }
);

// ── Health & Version ─────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export interface VersionResponse {
  version: string;
  service: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}

export async function fetchVersion(): Promise<VersionResponse> {
  const { data } = await apiClient.get<VersionResponse>("/version");
  return data;
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export interface ApiVessel {
  id: string;
  name: string;
  type?: string;
  position: Position;
  heading: number;
  speed_knots: number;
  destination: string;
  status?: string;
}

export async function fetchVessels(): Promise<ApiVessel[]> {
  const { data } = await apiClient.get<ApiVessel[]>("/telemetry/vessels");
  return data;
}

export async function fetchIcebergs(): Promise<Iceberg[]> {
  const { data } = await apiClient.get<Iceberg[]>("/telemetry/icebergs");
  return data;
}

// ── Routing & Risk Grid ───────────────────────────────────────────────────────

export interface RiskGridCell {
  lat: number;
  lon: number;
  risk_score: number;
  status: string;
  ice_concentration_tenths: number;
  closest_iceberg_nm: number;
}

export interface RiskGridResponse {
  sector: string;
  total_cells: number;
  iceberg_count: number;
  cells: RiskGridCell[];
}

export async function fetchRiskGrid(resolutionDeg: number = 0.25): Promise<RiskGridResponse> {
  const { data } = await apiClient.get<RiskGridResponse>(`/routing/risk-grid?resolution_deg=${resolutionDeg}`);
  return data;
}

export async function fetchDemoRoute(): Promise<ApiRoute> {
  const { data } = await apiClient.get<ApiRoute>("/routing/demo-route");
  return data;
}

export interface OptimizeRouteParams {
  origin: Position;
  destination: Position;
  vessel_id?: string;
  risk_tolerance?: "conservative" | "balanced" | "expedition" | string;
}

export async function optimizeRoute(
  originOrParams: Position | OptimizeRouteParams,
  dest?: Position,
  vesselId?: string,
  riskTolerance?: "safest" | "balanced" | "fastest" | string
): Promise<ApiRoutingResponse> {
  let body: OptimizeRouteParams;
  if ("lat" in originOrParams && dest) {
    body = {
      origin: originOrParams,
      destination: dest,
      vessel_id: vesselId ?? "vessel-A",
      risk_tolerance: riskTolerance ?? "balanced",
    };
  } else {
    body = originOrParams as OptimizeRouteParams;
  }
  const { data } = await apiClient.post<ApiRoutingResponse>("/routing/optimize", body);
  return data;
}

export async function fetchRiskEvaluation(): Promise<ApiRiskEvaluation> {
  const { data } = await apiClient.get<ApiRiskEvaluation>("/routing/risk-evaluation");
  return data;
}

// ── Multi-Vessel Deconfliction ────────────────────────────────────────────────

export interface DeconflictionAlternative {
  id: string;
  name: string;
  type: string;
  action_description: string;
  colregs_rule: string;
  cpa_nm: number;
  tcpa_minutes: number;
  route: ApiRoute;
}

export interface DeconflictionResponse {
  scenario: string;
  cpa_initial_nm: number;
  tcpa_initial_minutes: number;
  colregs_situation: string;
  risk_level: string;
  recommended_action: string;
  alternatives: DeconflictionAlternative[];
  options?: DeconflictionAlternative[];
  kinematics?: {
    cpa_nm: number;
    tcpa_minutes: number;
  };
}

export async function fetchDeconfliction(): Promise<DeconflictionResponse> {
  const { data } = await apiClient.post<DeconflictionResponse>("/routing/deconflict", {});
  return data;
}

// ── 4D Temporal Forecast ──────────────────────────────────────────────────────

export interface ProjectedIceberg {
  id: string;
  name?: string;
  size_class: string;
  threat_level?: string;
  original_centroid: Position;
  projected_centroid: Position;
  drift_vector: {
    speed_knots: number;
    heading_degrees: number;
    distance_nm: number;
  };
  polygon: Position[];
}

export interface TemporalForecastResponse {
  hours_forward: number;
  metocean?: {
    prevailing_current_kts: number;
    prevailing_current_deg: number;
    wind_speed_kts: number;
    wind_heading_deg: number;
    sea_state: string;
  };
  projected_icebergs_count: number;
  icebergs: ProjectedIceberg[];
}

export async function fetchTemporalForecast(hours: number = 24): Promise<TemporalForecastResponse> {
  const { data } = await apiClient.get<TemporalForecastResponse>(`/routing/forecast/temporal?hours=${hours}`);
  return data;
}

// ── Standalone Risk Engine API ────────────────────────────────────────────────

export interface RiskContributor {
  name: string;
  category: string;
  score: number; // [0.0, 1.0]
  level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
  weight: number;
  weighted_score: number;
  details: string;
}

export interface VesselRiskAssessment {
  vessel_id: string;
  vessel_name: string;
  position: Position;
  overall_score: number; // [0.0, 1.0]
  risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | string;
  safety_score_percent: number; // [0, 100]
  closest_iceberg_nm?: number | null;
  nearest_vessel_nm?: number | null;
  contributors: RiskContributor[];
  explanation: string[];
  timestamp: string;
}

export interface AreaRiskAssessment {
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
  };
  total_grid_points: number;
  average_risk: number;
  max_risk: number;
  critical_zones_count: number;
  high_risk_zones_count: number;
  icebergs_detected: number;
  timestamp: string;
}

export async function fetchVesselRisk(vesselId: string): Promise<VesselRiskAssessment> {
  const { data } = await apiClient.get<VesselRiskAssessment>(`/risk/vessel/${vesselId}`);
  return data;
}

export async function fetchAreaRisk(
  minLat: number = -62.0,
  maxLat: number = -59.0,
  minLon: number = -47.0,
  maxLon: number = -38.0,
  gridStep: number = 0.5
): Promise<AreaRiskAssessment> {
  const { data } = await apiClient.get<AreaRiskAssessment>(
    `/risk/area?min_lat=${minLat}&max_lat=${maxLat}&min_lon=${minLon}&max_lon=${maxLon}&grid_step=${gridStep}`
  );
  return data;
}

export async function evaluateCustomRiskPoint(payload: {
  latitude: number;
  longitude: number;
  speed_knots?: number;
  heading_degrees?: number;
  vessel_id?: string;
  weights?: Record<string, number>;
}): Promise<VesselRiskAssessment> {
  const { data } = await apiClient.post<VesselRiskAssessment>("/risk/evaluate", payload);
  return data;
}

