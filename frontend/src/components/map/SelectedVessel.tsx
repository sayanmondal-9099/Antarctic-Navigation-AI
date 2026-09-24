import React, { useState, useEffect } from "react";
import type { VesselState } from "../../types/navigation";
import { fetchVesselRisk, type VesselRiskAssessment } from "../../services/api/client";

interface SelectedVesselProps {
  vessel: VesselState;
  allVessels: VesselState[];
  onSelectVessel: (vesselId: string) => void;
  onSpeedChange?: (newSpeed: number) => void;
  onClose?: () => void;
}

export const SelectedVessel: React.FC<SelectedVesselProps> = ({
  vessel,
  allVessels,
  onSelectVessel,
  onSpeedChange,
  onClose,
}) => {
  const [riskAssessment, setRiskAssessment] = useState<VesselRiskAssessment | null>(null);
  const [loadingVesselId, setLoadingVesselId] = useState<string | null>(vessel.id);

  useEffect(() => {
    let isMounted = true;

    fetchVesselRisk(vessel.id)
      .then((data) => {
        if (isMounted) {
          setRiskAssessment(data);
          setLoadingVesselId(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          // Deterministic local fallback
          const otherVessels = allVessels.filter((v) => v.id !== vessel.id);
          const hasNearby = otherVessels.some(
            (v) => Math.abs(v.position.lat - vessel.position.lat) < 1.0 && Math.abs(v.position.lng - vessel.position.lng) < 1.0
          );
          setRiskAssessment({
            vessel_id: vessel.id,
            vessel_name: vessel.name,
            position: { lat: vessel.position.lat, lon: vessel.position.lng },
            overall_score: vessel.id === "vessel-A" ? 0.24 : vessel.id === "vessel-B" ? 0.48 : 0.18,
            risk_level: vessel.id === "vessel-B" ? "MODERATE" : "LOW",
            safety_score_percent: vessel.id === "vessel-B" ? 52 : 76,
            closest_iceberg_nm: 4.2,
            nearest_vessel_nm: hasNearby ? 8.4 : 18.5,
            contributors: [
              {
                name: "Iceberg Proximity",
                category: "iceberg",
                score: 0.35,
                level: "MODERATE",
                weight: 0.35,
                weighted_score: 0.12,
                details: "Closest tracked hazard 4.2 NM",
              },
              {
                name: "Sea Ice Concentration",
                category: "sea_ice",
                score: vessel.id === "vessel-B" ? 0.65 : 0.30,
                level: vessel.id === "vessel-B" ? "HIGH" : "MODERATE",
                weight: 0.25,
                weighted_score: 0.08,
                details: "Pack ice concentration in corridor",
              },
              {
                name: "Nearby Vessel Traffic",
                category: "vessel",
                score: hasNearby ? 0.45 : 0.10,
                level: hasNearby ? "MODERATE" : "LOW",
                weight: 0.20,
                weighted_score: 0.04,
                details: `${otherVessels.length} traffic contacts monitored`,
              },
              {
                name: "Weather & Wind",
                category: "weather",
                score: 0.25,
                level: "LOW",
                weight: 0.15,
                weighted_score: 0.04,
                details: "Wind 28 kts, freezing spray advisory",
              },
            ],
            explanation: [
              `Overall Situational Risk: ${vessel.id === "vessel-B" ? "MODERATE" : "LOW"}`,
              "• Iceberg Threat: Closest hazard buffer > 4.0 NM.",
            ],
            timestamp: new Date().toISOString(),
          });
          setLoadingVesselId(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [vessel.id, vessel.name, vessel.position.lat, vessel.position.lng, allVessels]);

  const getBadgeClass = (level: string) => {
    switch (level.toUpperCase()) {
      case "CRITICAL":
        return "badge-critical";
      case "HIGH":
        return "badge-severe";
      case "MODERATE":
        return "badge-moderate";
      case "LOW":
      default:
        return "badge-secure";
    }
  };

  return (
    <aside className="ecdis-selected-vessel-panel" aria-label="Selected Vessel Telemetry">
      <div className="panel-header-row">
        <div>
          <span className="panel-tag">ACTIVE VESSEL TELEMETRY</span>
          <h2 className="panel-title">{vessel.name}</h2>
          <span className="panel-subtitle font-mono">
            {vessel.callSign} · {vessel.iceClass}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            className="panel-close-btn"
            onClick={onClose}
            aria-label="Close Vessel Panel"
          >
            ✕
          </button>
        )}
      </div>

      <div className="vessel-switcher-strip">
        <span className="switcher-label font-mono">SELECT VESSEL:</span>
        <div className="switcher-chips">
          {allVessels.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`vessel-chip-btn ${v.id === vessel.id ? "active" : ""}`}
              onClick={() => onSelectVessel(v.id)}
            >
              {v.name.split(" (")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Realtime Risk Engine Assessment ─────────────────────────────────── */}
      <div className="vessel-risk-assessment-card">
        <div className="risk-card-header">
          <span className="risk-header-title font-mono">⚡ SITUATIONAL RISK ASSESSMENT</span>
          {riskAssessment && (
            <span className={`badge ${getBadgeClass(riskAssessment.risk_level)} font-mono`}>
              OVERALL: {riskAssessment.risk_level}
            </span>
          )}
        </div>

        {loadingVesselId === vessel.id ? (
          <div className="risk-loading font-mono text-cyan">CALCULATING PROXIMITY VECTORS...</div>
        ) : riskAssessment ? (
          <div className="risk-contributors-list font-mono">
            {riskAssessment.contributors.map((c) => (
              <div key={c.name} className="contributor-item">
                <div className="contributor-label-line">
                  <span className="c-name">{c.name.toUpperCase()}</span>
                  <span className={`c-badge ${getBadgeClass(c.level)}`}>{c.level}</span>
                </div>
                <div className="contributor-bar-track">
                  <div
                    className={`contributor-bar-fill ${c.level.toLowerCase()}`}
                    style={{ width: `${Math.round(c.score * 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {riskAssessment.closest_iceberg_nm && (
              <div className="risk-footnote">
                🧊 Closest Iceberg Hazard: <strong>{riskAssessment.closest_iceberg_nm} NM</strong>
              </div>
            )}
            {riskAssessment.nearest_vessel_nm && (
              <div className="risk-footnote">
                🚢 Nearest AIS Traffic: <strong>{riskAssessment.nearest_vessel_nm} NM</strong>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="telemetry-grid font-mono">
        <div className="telemetry-box">
          <span className="t-label">OPERATIONAL STATUS</span>
          <span className={`t-value ${vessel.status === "icebreaking" ? "text-amber" : "text-green"}`}>
            {vessel.status.toUpperCase()}
          </span>
        </div>

        <div className="telemetry-box">
          <span className="t-label">POSITION (LAT / LON)</span>
          <span className="t-value text-cyan">
            {Math.abs(vessel.position.lat).toFixed(2)}°S, {Math.abs(vessel.position.lng).toFixed(2)}°W
          </span>
        </div>

        <div className="telemetry-box">
          <span className="t-label">SPEED OVER GROUND</span>
          <span className="t-value highlight-number">{vessel.speedKnots.toFixed(1)} kts</span>
        </div>

        <div className="telemetry-box">
          <span className="t-label">GYRO HEADING</span>
          <span className="t-value">{vessel.headingDegrees.toString().padStart(3, "0")}° TRUE</span>
        </div>

        <div className="telemetry-box full-width">
          <span className="t-label">VOYAGE DESTINATION</span>
          <span className="t-value text-green">🎯 {vessel.destination} (ETA: {vessel.eta})</span>
        </div>
      </div>

      {/* Throttle Control */}
      {onSpeedChange && (
        <div className="speed-throttle-section">
          <div className="throttle-label-row font-mono">
            <span>SPEED THROTTLE</span>
            <span className="text-cyan">{vessel.speedKnots.toFixed(1)} KTS</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={vessel.speedKnots}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="throttle-slider"
            aria-label="Throttle Speed in Knots"
          />
          <div className="throttle-ticks font-mono">
            <span>0 KTS</span>
            <span>ECON 12 KTS</span>
            <span>MAX 20 KTS</span>
          </div>
        </div>
      )}

      <div className="panel-demo-disclaimer font-mono">
        ⚠️ SIMULATED DEMO DATA — NOT REAL-TIME AIS
      </div>
    </aside>
  );
};
