export interface GeoCoordinate {
  lat: number;
  lng: number;
  label?: string;
}

export interface VesselState {
  id: string;
  name: string;
  callSign: string;
  vesselClass: string;
  iceClass: string;
  position: GeoCoordinate;
  speedKnots: number;
  headingDegrees: number;
  targetSpeedKnots: number;
  destination: string;
  eta: string;
  fuelPercentage: number;
  hullStrainMpa: number;
  engineLoadPercentage: number;
  status: "cruising" | "icebreaking" | "anchored" | "alert";
}

export interface IcebergHazard {
  id: string;
  designation: string;
  type: "tabular" | "pinnacle" | "growler" | "bergy_bit";
  position: GeoCoordinate;
  dimensionsKm: { length: number; width: number; heightAboveWater: number };
  driftSpeedKnots: number;
  driftHeadingDegrees: number;
  hazardRadiusNm: number;
  threatLevel: "high" | "medium" | "low";
}

export interface Waypoint {
  id: string;
  name: string;
  coord: GeoCoordinate;
  order: number;
  iceConcentrationTenths: number; // 0 - 10
  iceThicknessMeters: number;
  estimatedArrival: string;
  depthMeters: number;
}

export interface NavigationRoute {
  id: string;
  name: string;
  type: "recommended" | "direct_hazard" | "alternative";
  waypoints: Waypoint[];
  totalDistanceNm: number;
  estimatedDurationHours: number;
  averageIceRiskScore: number; // 0 - 100
  color: string;
}

export interface RiskFactor {
  category: "Ice" | "Iceberg" | "Weather" | "Vessel";
  scorePercent: number; // 0 - 100
  rating: "Nominal" | "Moderate" | "Elevated" | "Severe" | "Critical";
  barSegments: number; // e.g. 5 out of 6
  details: string;
  trend: "rising" | "stable" | "declining";
}

export interface RiskAnalysis {
  overallSafetyScore: number; // 0 - 100
  threatStatus: "SECURE" | "ADVISORY" | "HAZARDOUS" | "CRITICAL";
  factors: RiskFactor[];
  advisories: string[];
}

export interface MapLayerConfig {
  showIceDensity: boolean;
  showIcebergs: boolean;
  showRecommendedRoute: boolean;
  showHazardRoute: boolean;
  showRangeRings: boolean;
  showRadarSweep: boolean;
  showBathymetry: boolean;
}
