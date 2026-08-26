/**
 * API client for the Antarctic Navigation AI backend.
 */

import axios from "axios";
import type {
  Vessel,
  Iceberg,
  ApiRoute,
  ApiRiskEvaluation,
  Position
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export async function fetchVessels(): Promise<Vessel[]> {
  const { data } = await apiClient.get<Vessel[]>("/telemetry/vessels");
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
  bounds: {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
  };
  grid_resolution_deg: number;
  total_cells: number;
  cells: RiskGridCell[];
}

export async function fetchRiskGrid(resolutionDeg = 0.35): Promise<RiskGridResponse> {
  const { data } = await apiClient.get<RiskGridResponse>(`/routing/risk-grid?resolution_deg=${resolutionDeg}`);
  return data;
}

export async function fetchDemoRoute(): Promise<ApiRoute> {
  const { data } = await apiClient.get<ApiRoute>("/routing/demo-route");
  return data;
}

export async function optimizeRoute(
  origin: Position,
  destination: Position,
  riskTolerance = "balanced",
  speedKnots = 12.0
): Promise<ApiRoute> {
  const { data } = await apiClient.post<ApiRoute>("/routing/optimize", {
    origin,
    destination,
    risk_tolerance: riskTolerance,
    economic_speed_knots: speedKnots
  });
  return data;
}

export async function fetchRiskEvaluation(): Promise<ApiRiskEvaluation> {
  const { data } = await apiClient.get<ApiRiskEvaluation>("/routing/risk-evaluation");
  return data;
}

// ── Multi-Vessel Deconfliction ────────────────────────────────────────────────

export interface DeconflictionResponse {
  scenario_id: string;
  channel_name: string;
  colregs_rule: string;
  urgency: string;
  kinematics: {
    cpa_nm: number;
    tcpa_minutes: number;
    is_collision_risk: boolean;
  };
  options: {
    id: string;
    title: string;
    recommended: boolean;
    safety_score: number;
    projected_cpa_nm: number;
    new_heading_deg: number;
    new_speed_knots: number;
    time_delay_minutes: number;
    maneuver_action: string;
    route: ApiRoute;
  }[];
}

export async function fetchDeconfliction(): Promise<DeconflictionResponse> {
  const { data } = await apiClient.post<DeconflictionResponse>("/routing/deconflict", {});
  return data;
}

// ── Forecast & Temporal Simulation ────────────────────────────────────────────

export interface ProjectedIceberg {
  id: string;
  name: string;
  size_class: string;
  threat_level: "high" | "medium" | "low";
  original_centroid: Position;
  projected_centroid: Position;
  drift_vector: {
    speed_knots: number;
    heading_degrees: number;
    total_displacement_nm: number;
  };
  hours_forward: number;
  polygon: Position[];
}

export interface TemporalForecastResponse {
  hours_forward: number;
  metocean: {
    hours_forward: number;
    air_temperature_c: number;
    sea_temperature_c: number;
    wind_speed_knots: number;
    wind_direction_deg: number;
    sea_ice_freezing_rate_cm_day: number;
    visibility_nm: number;
    icing_spray_risk: string;
  };
  projected_icebergs_count: number;
  icebergs: ProjectedIceberg[];
}

export async function fetchTemporalForecast(hours = 24.0): Promise<TemporalForecastResponse> {
  const { data } = await apiClient.get<TemporalForecastResponse>(`/routing/forecast/temporal?hours=${hours}`);
  return data;
}

export default apiClient;
