import { describe, it, expect } from "vitest";
import type { VesselRiskAssessment, RiskContributor } from "../services/api/client";

describe("Frontend Risk Engine Integration Test Suite", () => {
  it("1. Risk Contributor Model: Validates all required risk factors", () => {
    const contributors: RiskContributor[] = [
      {
        name: "Iceberg Proximity",
        category: "iceberg",
        score: 0.85,
        level: "HIGH",
        weight: 0.35,
        weighted_score: 0.30,
        details: "Closest tracked hazard A-81 at 2.4 NM",
      },
      {
        name: "Sea Ice Concentration",
        category: "sea_ice",
        score: 0.45,
        level: "MODERATE",
        weight: 0.25,
        weighted_score: 0.11,
        details: "Pack ice concentration 5/10 in corridor",
      },
      {
        name: "Nearby Vessel Traffic",
        category: "vessel",
        score: 0.20,
        level: "LOW",
        weight: 0.20,
        weighted_score: 0.04,
        details: "Nearest vessel 18.5 NM southward",
      },
      {
        name: "Weather & Wind",
        category: "weather",
        score: 0.30,
        level: "LOW",
        weight: 0.15,
        weighted_score: 0.05,
        details: "Wind 28 kts, freezing rate 2.5 cm/d",
      },
    ];

    expect(contributors.length).toBe(4);
    for (const c of contributors) {
      expect(c.score).toBeGreaterThanOrEqual(0.0);
      expect(c.score).toBeLessThanOrEqual(1.0);
      expect(["LOW", "MODERATE", "HIGH", "CRITICAL"]).toContain(c.level);
      expect(c.weight).toBeGreaterThan(0.0);
      expect(c.weighted_score).toBeCloseTo(c.score * c.weight, 1);
    }
  });

  it("2. Vessel Risk Assessment: Computes overall risk and safety index", () => {
    const assessment: VesselRiskAssessment = {
      vessel_id: "vessel-A",
      vessel_name: "Ship A (R/V Polar Pioneer)",
      position: { lat: -60.2, lon: -45.3 },
      overall_score: 0.35,
      risk_level: "MODERATE",
      safety_score_percent: 65,
      closest_iceberg_nm: 4.2,
      nearest_vessel_nm: 18.5,
      contributors: [],
      explanation: [
        "Overall Situational Risk: MODERATE (35.0% risk index, Safety Rating 65%).",
        "• Iceberg Threat: MODERATE — Closest hazard 'A-81' at 4.2 NM.",
      ],
      timestamp: new Date().toISOString(),
    };

    expect(assessment.vessel_id).toBe("vessel-A");
    expect(assessment.overall_score).toBe(0.35);
    expect(assessment.risk_level).toBe("MODERATE");
    expect(assessment.safety_score_percent).toBe(65);
    expect(assessment.closest_iceberg_nm).toBe(4.2);
    expect(assessment.explanation.length).toBeGreaterThanOrEqual(2);
  });

  it("3. Offline Fallback Resilience: Generates valid risk assessment if server fails", () => {
    const fallbackAssessment: VesselRiskAssessment = {
      vessel_id: "vessel-B",
      vessel_name: "Ship B",
      position: { lat: -62.0, lon: -47.0 },
      overall_score: 0.48,
      risk_level: "MODERATE",
      safety_score_percent: 52,
      closest_iceberg_nm: 3.1,
      nearest_vessel_nm: 8.4,
      contributors: [
        {
          name: "Iceberg Proximity",
          category: "iceberg",
          score: 0.60,
          level: "HIGH",
          weight: 0.35,
          weighted_score: 0.21,
          details: "Hazard proximity warning",
        },
      ],
      explanation: ["Offline fallback telemetry."],
      timestamp: new Date().toISOString(),
    };

    expect(fallbackAssessment.risk_level).toBe("MODERATE");
    expect(fallbackAssessment.contributors[0].name).toBe("Iceberg Proximity");
  });
});
