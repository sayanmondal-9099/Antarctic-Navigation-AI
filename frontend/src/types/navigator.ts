import type { GeoCoordinate } from "./navigation";

export interface NearbyVessel {
  id: string;
  name: string;
  callSign: string;
  mmsi: string;
  vesselType: "Research" | "Icebreaker" | "Fishing" | "Supply" | "Patrol";
  position: GeoCoordinate;
  distanceNm: number;
  bearingDeg: number;
  speedKnots: number;
  headingDeg: number;
  cpaNm: number; // Closest Point of Approach in nautical miles
  tcpaMin: number; // Time to CPA in minutes
  vhfChannel: number;
  status: "Underway" | "Ice Escort" | "Trawling" | "Stationary" | "Emergency Standby";
  iceClass: string;
}

export interface NextWaypointGuidance {
  id: string;
  name: string;
  order: number;
  distanceNm: number;
  bearingDeg: number;
  courseToSteerDeg: number;
  crossTrackErrorNm: number; // + is right of track, - is left of track
  timeToGo: string; // e.g. "01h 00m"
  iceConcentration: number; // 0-10
  iceThicknessMeters: number;
  speedAdvisoryKnots: number;
  depthMeters: number;
  actionInstruction: string;
}

export interface TurnByTurnLeg {
  id: string;
  order: number;
  fromWaypoint: string;
  toWaypoint: string;
  legDistanceNm: number;
  legHeadingDeg: number;
  estimatedLegTime: string;
  iceProfile: "Open Water" | "Light Drift" | "Medium Pack" | "Heavy Floes";
  iceThicknessMeters: number;
  status: "completed" | "active" | "pending";
  maneuverAdvisory: string;
}

export interface EmergencyDistressState {
  isDistressActive: boolean;
  distressType: "HULL_BREACH" | "ICE_BESETMENT" | "MEDICAL_EVAC" | "ENGINE_FAILURE" | "COLLISION_RISK" | null;
  epirbTransmitting: boolean;
  gmdssChannelActive: boolean;
  activatedAtUtc: string | null;
  acknowledgedBy: string | null;
  nearestRescueVessel: string;
  rescueEtaHours: number;
  nearestShelterHaven: {
    name: string;
    coordinates: string;
    distanceNm: number;
    bearingDeg: number;
  };
}
