// Shared core foundation data models for Antarctic Maritime Navigation

export interface Position {
  lat: number;
  lon: number;
}

export interface Vessel {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  position?: Position;
  speed?: number;
  speed_knots?: number;
  heading: number;
  status: string;
  destination: string;
  type?: string;
}

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
  iceRiskScore: number;
  depthMeters?: number;
  notes?: string;
}

export interface Route {
  id: string;
  name: string;
  type: string;
  totalDistanceNm: number;
  estimatedDurationHours: number;
  averageRiskScore: number;
  waypoints: Waypoint[];
  advisories: string[];
}

export interface RiskScore {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  factor: string;
  description: string;
}

export interface Alert {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  message: string;
  timestamp: string;
}

// API-specific contract types
export interface ApiWaypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  order: number;
  ice_risk_score: number;
  notes?: string;
}

export interface ApiRiskBreakdown {
  ice: number;
  iceberg: number;
  weather: number;
  current: number;
  vessel: number;
}

export interface ApiRoute {
  id: string;
  name: string;
  type: string;
  total_distance_nm: number;
  estimated_duration_hours: number;
  average_risk_score: number;
  risk_level: string;
  routing_mode: string;
  risk_breakdown: ApiRiskBreakdown;
  waypoints: ApiWaypoint[];
  advisories: string[];
}

export interface ApiRoutingResponse {
  recommended_route: ApiRoute;
  alternative_routes: ApiRoute[];
  warnings: string[];
}

export interface Iceberg {
  id: string;
  name?: string;
  size_class: string;
  threat_level?: "high" | "medium" | "low";
  polygon: Position[];
}

export interface ApiRiskFactor {
  category: string;
  score_percent: number;
  rating: string;
  details: string;
  trend: string;
}

export interface ApiRiskEvaluation {
  overall_safety_score: number;
  threat_status: string;
  risk_level: string;
  icebergs_count: number;
  nearby_vessels_count: number;
  factors: ApiRiskFactor[];
  advisories: string[];
}
