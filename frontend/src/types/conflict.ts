import type { GeoCoordinate, NavigationRoute } from "./navigation";

export interface ConflictVessel {
  id: string;
  name: string;
  callSign: string;
  iceClass: string;
  position: GeoCoordinate;
  headingDeg: number;
  speedKnots: number;
  lengthMeters: number;
  color: string;
}

export type ColregsClassification =
  | "CROSSING_GIVE_WAY"
  | "CROSSING_STAND_ON"
  | "HEAD_ON_NARROW_ICE_CHANNEL"
  | "OVERTAKING"
  | "ICEBERG_PINCH_POINT";

export interface DeconflictionOption {
  id: string;
  title: string;
  strategyType: "COURSE_ALTERATION" | "SPEED_REDUCTION" | "COORDINATED_AIS";
  description: string;
  newHeadingDeg: number;
  newSpeedKnots: number;
  projectedCpaNm: number;
  timeDelayMinutes: number;
  fuelDeltaLiters: number;
  safetyScore: number; // 0 - 100
  iceRiskLevel: "Low" | "Moderate" | "Elevated";
  maneuverAction: string;
  alternativeRoute: NavigationRoute;
  recommended: boolean;
}

export interface ConflictScenario {
  id: string;
  title: string;
  channelName: string;
  vesselA: ConflictVessel;
  vesselB: ConflictVessel;
  intersectionPoint: GeoCoordinate;
  currentCpaNm: number;
  tcpaMinutes: number;
  colregsRule: ColregsClassification;
  colregsRuleName: string;
  urgencyLevel: "CRITICAL" | "HIGH" | "MODERATE";
  iceConstraintSummary: string;
  deconflictionOptions: DeconflictionOption[];
}
