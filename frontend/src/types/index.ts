export interface Position {
  lat: number;
  lon: number;
}

export interface Vessel {
  id: string;
  name: string;
  type: string;
  position: Position;
  heading: number;
  speed_knots: number;
  destination: string;
}

export interface Iceberg {
  id: string;
  name?: string;
  size_class: string;
  threat_level?: "high" | "medium" | "low";
  polygon: Position[];
}

export interface ApiWaypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  order: number;
  ice_risk_score: number;
  notes?: string;
}

export interface ApiRoute {
  id: string;
  name: string;
  type: string;
  total_distance_nm: number;
  estimated_duration_hours: number;
  average_risk_score: number;
  waypoints: ApiWaypoint[];
  advisories: string[];
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
