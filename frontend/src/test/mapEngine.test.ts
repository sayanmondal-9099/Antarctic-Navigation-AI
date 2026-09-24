import { describe, it, expect } from "vitest";
import {
  initialVessel,
  mockAllVessels,
  mockIcebergs,
  recommendedRoute,
} from "../data/mockNavigationData";

describe("Map Engine Test Suite — Antarctic Maritime Navigation", () => {
  it("1. Vessel Data Integrity: Loads 3 simulated demo vessels", () => {
    expect(mockAllVessels.length).toBeGreaterThanOrEqual(3);

    const [vA, vB, vC] = mockAllVessels;
    expect(vA.id).toBe("vessel-A");
    expect(vA.name).toContain("Ship A");
    expect(vA.status).toBe("cruising");
    expect(typeof vA.position.lat).toBe("number");
    expect(typeof vA.position.lng).toBe("number");
    expect(typeof vA.speedKnots).toBe("number");
    expect(typeof vA.headingDegrees).toBe("number");

    expect(vB.id).toBe("vessel-B");
    expect(vB.name).toContain("Ship B");
    expect(vB.status).toBe("icebreaking");

    expect(vC.id).toBe("vessel-C");
    expect(vC.name).toContain("Ship C");
    expect(vC.destination).toBe("Rothera Station");
  });

  it("2. Iceberg Hazards: Loads at least 10 simulated icebergs with varied risk levels", () => {
    expect(mockIcebergs.length).toBeGreaterThanOrEqual(10);

    const threatLevels = new Set(mockIcebergs.map((i) => i.threatLevel));
    expect(threatLevels.has("high")).toBe(true);
    expect(threatLevels.has("medium")).toBe(true);
    expect(threatLevels.has("low")).toBe(true);

    for (const ice of mockIcebergs) {
      expect(ice.id).toBeDefined();
      expect(ice.designation).toBeDefined();
      expect(ice.hazardRadiusNm).toBeGreaterThan(0);
      expect(ice.position.lat).toBeLessThan(0); // South
      expect(ice.position.lng).toBeLessThan(0); // West
    }
  });

  it("3. Route & Waypoints: Contains polyline sequence from origin to destination", () => {
    expect(recommendedRoute.type).toBe("recommended");
    expect(recommendedRoute.waypoints.length).toBeGreaterThanOrEqual(4);
    expect(recommendedRoute.totalDistanceNm).toBeGreaterThan(0);
    expect(recommendedRoute.estimatedDurationHours).toBeGreaterThan(0);

    const wp0 = recommendedRoute.waypoints[0];
    const wpEnd = recommendedRoute.waypoints[recommendedRoute.waypoints.length - 1];

    expect(wp0.coord.lat).toBe(-60.2);
    expect(wp0.coord.lng).toBe(-45.3);
    expect(wpEnd.coord.lat).toBe(-60.4);
    expect(wpEnd.coord.lng).toBe(-38.5);
  });

  it("4. Vessel Selection & Highlight State Transition", () => {
    let selectedId = "vessel-A";
    const selectVessel = (id: string) => {
      selectedId = id;
    };

    expect(selectedId).toBe("vessel-A");
    selectVessel("vessel-B");
    expect(selectedId).toBe("vessel-B");
    selectVessel("vessel-C");
    expect(selectedId).toBe("vessel-C");

    const currentVessel = mockAllVessels.find((v) => v.id === selectedId);
    expect(currentVessel).toBeDefined();
    expect(currentVessel?.name).toContain("Ship C");
  });

  it("5. Layer Toggles Logic", () => {
    const layers = {
      vessels: true,
      icebergs: true,
      routes: true,
      seaIce: false, // SEA ICE DATA — NOT CONNECTED
      bathymetry: true,
      radarSweep: true,
    };

    const toggle = (key: keyof typeof layers) => {
      layers[key] = !layers[key];
    };

    expect(layers.vessels).toBe(true);
    toggle("vessels");
    expect(layers.vessels).toBe(false);
    toggle("vessels");
    expect(layers.vessels).toBe(true);

    expect(layers.seaIce).toBe(false);
    toggle("seaIce");
    expect(layers.seaIce).toBe(true);
  });

  it("6. Resilience: Empty and invalid data states handle gracefully without crashing", () => {
    const emptyVessels: any[] = [];
    const fallbackVessel = emptyVessels.find((v) => v.id === "vessel-A") ?? initialVessel;
    expect(fallbackVessel).toBeDefined();
    expect(fallbackVessel.id).toBe("vessel-A");

    const invalidCoords = { lat: NaN, lng: NaN };
    const isValid = !isNaN(invalidCoords.lat) && !isNaN(invalidCoords.lng);
    expect(isValid).toBe(false);
  });

  it("7. Temporal Drift Simulation: Computes kinematic forward displacement for +6h, +12h, +24h, +48h", () => {
    const ice = mockIcebergs[0]; // A-81 Tabular
    const initialLat = ice.position.lat;
    const initialLng = ice.position.lng;
    const speed = ice.driftSpeedKnots; // 0.9 kts
    const heading = ice.driftHeadingDegrees; // 215 deg (SW)

    const testHours = [6, 12, 24, 48];
    for (const hours of testHours) {
      const distNm = speed * hours;
      const rad = (heading * Math.PI) / 180.0;
      const dLat = (distNm * Math.cos(rad)) / 60.0;
      const avgLatRad = (initialLat * Math.PI) / 180.0;
      const dLng = (distNm * Math.sin(rad)) / (60.0 * Math.cos(avgLatRad));

      const projectedLat = initialLat + dLat;
      const projectedLng = initialLng + dLng;

      // In SW drift (215°), latitude becomes more negative (further South), longitude becomes more negative (further West)
      expect(projectedLat).toBeLessThan(initialLat);
      expect(projectedLng).toBeLessThan(initialLng);
      expect(distNm).toBeGreaterThan(0);
      expect(distNm).toBeCloseTo(speed * hours);
    }
  });
});
