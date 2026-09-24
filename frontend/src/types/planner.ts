import type { GeoCoordinate, NavigationRoute } from "./navigation";

export interface PolarPort {
  id: string;
  name: string;
  region: string;
  countryOrBase: string;
  coord: GeoCoordinate;
  description: string;
}

export interface VesselProfile {
  id: string;
  name: string;
  iceClass: string;
  vesselType: string;
  maxSpeedKnots: number;
  economicSpeedKnots: number;
  maxIceThicknessMeters: number;
  fuelConsumptionLPerNm: number;
  draftMeters: number;
  description: string;
}

export type RiskToleranceLevel = "conservative" | "balanced" | "aggressive";

export interface RouteCalculationRequest {
  originId: string;
  destinationId: string;
  vesselId: string;
  riskTolerance: RiskToleranceLevel;
  avoidIcebergDriftZones: boolean;
  prioritizeOpenLeads: boolean;
}

export interface RouteComparisonMetrics {
  directDistanceNm: number;
  directDurationHours: number;
  directIceRiskScore: number;
  calculatedDistanceNm: number;
  calculatedDurationHours: number;
  calculatedIceRiskScore: number;
  distanceDeltaNm: number;
  timeSavingsHours: number;
  riskReductionPercent: number;
  fuelEstimateLiters: number;
}

export interface CalculatedRouteResult {
  route: NavigationRoute;
  origin: PolarPort;
  destination: PolarPort;
  vessel: VesselProfile;
  riskTolerance: RiskToleranceLevel;
  metrics: RouteComparisonMetrics;
  calculatedAtUtc: string;
  confidenceScore: number; // 0 - 100
  icebergAvoidanceCount: number;
  iceLeadUsagePercent: number;
  alternatives?: NavigationRoute[];
  warnings?: string[];
}
