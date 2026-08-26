import type {
  PolarPort,
  VesselProfile,
  CalculatedRouteResult,
  RouteCalculationRequest,
} from "../types/planner";
import type { NavigationRoute, Waypoint } from "../types/navigation";

export const polarOrigins: PolarPort[] = [
  {
    id: "port-palmer",
    name: "Palmer Station",
    region: "Anvers Island / Arthur Harbor",
    countryOrBase: "United States (USAP)",
    coord: { lat: -64.774, lng: -64.053 },
    description: "Main US research station on the Antarctic Peninsula with all-weather landing pier.",
  },
  {
    id: "port-ushuaia",
    name: "Ushuaia Port (Tierra del Fuego)",
    region: "Beagle Channel / Gateway",
    countryOrBase: "Argentina",
    coord: { lat: -54.807, lng: -68.307 },
    description: "Primary southern hemisphere gateway port for Antarctic research and expedition vessels.",
  },
  {
    id: "port-gerlache",
    name: "Gerlache Strait Nav Sector",
    region: "Graham Land Archipelago",
    countryOrBase: "Maritime Passage",
    coord: { lat: -64.819, lng: -63.512 },
    description: "Current active coordinates for R/V Polar Pioneer underway in Sector 4B.",
  },
  {
    id: "port-king-george",
    name: "King George Island (Frei / Bellingshausen)",
    region: "South Shetland Islands",
    countryOrBase: "Chile / International",
    coord: { lat: -62.197, lng: -58.963 },
    description: "Hub for Antarctic logistics with airstrip and sheltered Maxwell Bay anchorage.",
  },
  {
    id: "port-rothera",
    name: "Rothera Research Station",
    region: "Adelaide Island / Marguerite Bay",
    countryOrBase: "United Kingdom (BAS)",
    coord: { lat: -67.571, lng: -68.125 },
    description: "BAS Antarctic headquarters with Biscoe Wharf deep-water polar vessel berth.",
  },
];

export const polarDestinations: PolarPort[] = [
  {
    id: "dest-mcmurdo",
    name: "McMurdo Station (Winter Quarters Bay)",
    region: "Ross Island / Ross Sea",
    countryOrBase: "United States (USAP)",
    coord: { lat: -77.846, lng: 166.668 },
    description: "Largest Antarctic science community and primary hub for South Pole logistics.",
  },
  {
    id: "dest-marguerite",
    name: "Marguerite Bay Deep Base",
    region: "Fallieres Coast",
    countryOrBase: "International Science Zone",
    coord: { lat: -66.602, lng: -65.204 },
    description: "Sheltered scientific mooring basin with access to George VI Ice Shelf.",
  },
  {
    id: "dest-deception",
    name: "Deception Island (Port Foster)",
    region: "South Shetland Islands",
    countryOrBase: "Volcanic Caldera Haven",
    coord: { lat: -62.972, lng: -60.627 },
    description: "Flooded volcanic caldera offering supreme storm shelter via Neptune's Bellows.",
  },
  {
    id: "dest-halley",
    name: "Halley VI Station (Brunt Ice Shelf)",
    region: "Weddell Sea Coast",
    countryOrBase: "United Kingdom (BAS)",
    coord: { lat: -75.583, lng: -26.541 },
    description: "World-leading atmospheric observatory situated on the floating Brunt Ice Shelf.",
  },
  {
    id: "dest-esperanza",
    name: "Esperanza Base (Hope Bay)",
    region: "Trinity Peninsula",
    countryOrBase: "Argentina",
    coord: { lat: -63.397, lng: -56.998 },
    description: "Northernmost continental station in Hope Bay with pack ice tracking station.",
  },
];

export const vesselFleet: VesselProfile[] = [
  {
    id: "vessel-pioneer",
    name: "R/V Polar Pioneer",
    iceClass: "IACS Polar Class 2 (PC2)",
    vesselType: "Heavy Polar Research Vessel",
    maxSpeedKnots: 16.0,
    economicSpeedKnots: 12.5,
    maxIceThicknessMeters: 1.8,
    fuelConsumptionLPerNm: 18.5,
    draftMeters: 8.4,
    description: "Year-round operations in moderate multi-year ice conditions. High-efficiency bow.",
  },
  {
    id: "vessel-aurora",
    name: "Icebreaker Aurora Australis",
    iceClass: "IACS Polar Class 1 (PC1)",
    vesselType: "Heavy Icebreaker & Resupply",
    maxSpeedKnots: 14.5,
    economicSpeedKnots: 10.0,
    maxIceThicknessMeters: 2.8,
    fuelConsumptionLPerNm: 32.0,
    draftMeters: 10.2,
    description: "Capable of continuous ramming and escort in extreme multi-year ice ridges.",
  },
  {
    id: "vessel-gould",
    name: "R/V Laurence M. Gould",
    iceClass: "IACS Polar Class 4 (PC4)",
    vesselType: "Light Polar Vessel",
    maxSpeedKnots: 13.0,
    economicSpeedKnots: 11.0,
    maxIceThicknessMeters: 0.8,
    fuelConsumptionLPerNm: 14.0,
    draftMeters: 5.8,
    description: "Specialized in open leads and thin first-year pack ice. Avoids heavy ridging.",
  },
  {
    id: "vessel-expedition",
    name: "Polar Expedition Yacht 1A",
    iceClass: "DNV 1A Super",
    vesselType: "Expedition Cruiser",
    maxSpeedKnots: 18.0,
    economicSpeedKnots: 14.0,
    maxIceThicknessMeters: 0.4,
    fuelConsumptionLPerNm: 11.5,
    draftMeters: 4.6,
    description: "Fast passenger transit restricted to charted open waters and light drift leads.",
  },
];

export function calculateOptimizedRoute(request: RouteCalculationRequest): CalculatedRouteResult {
  const origin = polarOrigins.find((p) => p.id === request.originId) ?? polarOrigins[2];
  const dest = polarDestinations.find((d) => d.id === request.destinationId) ?? polarDestinations[0];
  const vessel = vesselFleet.find((v) => v.id === request.vesselId) ?? vesselFleet[0];

  // Compute realistic distance multiplier based on risk tolerance & destination
  let baseDistance = 184.6;
  if (dest.id === "dest-marguerite") baseDistance = 126.0;
  if (dest.id === "dest-deception") baseDistance = 94.0;
  if (dest.id === "dest-halley") baseDistance = 420.0;
  if (dest.id === "dest-esperanza") baseDistance = 110.0;

  let distanceMultiplier = 1.0;
  let iceRiskScore = 24;
  let safetyScore = 92;
  let icebergAvoidanceCount = 3;
  let iceLeadUsage = 85;

  if (request.riskTolerance === "conservative") {
    distanceMultiplier = 1.15; // Longer path to skirt around all ice fields
    iceRiskScore = 12;
    safetyScore = 98;
    icebergAvoidanceCount = 5;
    iceLeadUsage = 96;
  } else if (request.riskTolerance === "aggressive") {
    distanceMultiplier = 0.88; // Shorter path through pack ice
    iceRiskScore = 65;
    safetyScore = 74;
    icebergAvoidanceCount = 1;
    iceLeadUsage = 40;
  }

  const calculatedDistanceNm = parseFloat((baseDistance * distanceMultiplier).toFixed(1));
  const avgSpeed = vessel.economicSpeedKnots;
  const calculatedDurationHours = parseFloat((calculatedDistanceNm / avgSpeed).toFixed(1));
  const directDistanceNm = parseFloat((baseDistance * 0.85).toFixed(1));
  const directDurationHours = parseFloat((directDistanceNm / (avgSpeed * 0.65)).toFixed(1)); // Slower due to thick ice
  const directIceRiskScore = 86;

  const fuelEstimateLiters = Math.round(calculatedDistanceNm * vessel.fuelConsumptionLPerNm);

  const waypoints: Waypoint[] = [
    {
      id: "wp-c01",
      name: `${origin.name.split(" ")[0]} Departure`,
      coord: origin.coord,
      order: 1,
      iceConcentrationTenths: 2,
      iceThicknessMeters: 0.3,
      estimatedArrival: "00:00 (Dep)",
      depthMeters: 420,
    },
    {
      id: "wp-c02",
      name: "Polar Thermal Lead Alfa",
      coord: { lat: (origin.coord.lat + dest.coord.lat) / 2 + 0.5, lng: (origin.coord.lng + dest.coord.lng) / 2 - 0.4 },
      order: 2,
      iceConcentrationTenths: request.riskTolerance === "aggressive" ? 6 : 3,
      iceThicknessMeters: request.riskTolerance === "aggressive" ? 1.2 : 0.4,
      estimatedArrival: `+${(calculatedDurationHours * 0.3).toFixed(1)}h`,
      depthMeters: 380,
    },
    {
      id: "wp-c03",
      name: "A-81 Iceberg Buffer Waypoint",
      coord: { lat: (origin.coord.lat + dest.coord.lat) / 2 - 0.2, lng: (origin.coord.lng + dest.coord.lng) / 2 + 0.3 },
      order: 3,
      iceConcentrationTenths: request.riskTolerance === "conservative" ? 1 : 4,
      iceThicknessMeters: 0.5,
      estimatedArrival: `+${(calculatedDurationHours * 0.6).toFixed(1)}h`,
      depthMeters: 510,
    },
    {
      id: "wp-c04",
      name: `${dest.name.split(" ")[0]} Approach Entry`,
      coord: dest.coord,
      order: 4,
      iceConcentrationTenths: 1,
      iceThicknessMeters: 0.2,
      estimatedArrival: `+${calculatedDurationHours}h (Arr)`,
      depthMeters: 620,
    },
  ];

  const route: NavigationRoute = {
    id: `calc-route-${Date.now()}`,
    name: `AI ${request.riskTolerance.toUpperCase()} ROUTE: ${origin.name.split(" ")[0]} ➔ ${dest.name.split(" ")[0]}`,
    type: "recommended",
    waypoints,
    totalDistanceNm: calculatedDistanceNm,
    estimatedDurationHours: calculatedDurationHours,
    averageIceRiskScore: iceRiskScore,
    color: "#38bdf8",
  };

  const nowUtc = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  return {
    route,
    origin,
    destination: dest,
    vessel,
    riskTolerance: request.riskTolerance,
    calculatedAtUtc: nowUtc,
    confidenceScore: safetyScore,
    icebergAvoidanceCount,
    iceLeadUsagePercent: iceLeadUsage,
    metrics: {
      directDistanceNm,
      directDurationHours,
      directIceRiskScore,
      calculatedDistanceNm,
      calculatedDurationHours,
      calculatedIceRiskScore: iceRiskScore,
      distanceDeltaNm: parseFloat((calculatedDistanceNm - directDistanceNm).toFixed(1)),
      timeSavingsHours: parseFloat((directDurationHours - calculatedDurationHours).toFixed(1)),
      riskReductionPercent: Math.round(((directIceRiskScore - iceRiskScore) / directIceRiskScore) * 100),
      fuelEstimateLiters,
    },
  };
}
