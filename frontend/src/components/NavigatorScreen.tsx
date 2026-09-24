import { useState } from "react";
import type { VesselState, NavigationRoute } from "../types/navigation";
import type {
  NextWaypointGuidance,
  TurnByTurnLeg,
  EmergencyDistressState,
} from "../types/navigator";
import {
  initialNextWaypoint,
  turnByTurnLegs,
  initialEmergencyState,
} from "../data/mockNavigatorData";
import { EmergencyModal } from "./EmergencyModal";
import { RiskAnalysisPanel } from "./RiskAnalysisPanel";
import { EnvironmentPanel } from "./EnvironmentPanel";

interface NavigatorScreenProps {
  vessel: VesselState;
  recommendedRoute: NavigationRoute;
}

export function NavigatorScreen({ vessel, recommendedRoute }: NavigatorScreenProps) {
  const [nextWp] = useState<NextWaypointGuidance>(initialNextWaypoint);
  const [legs] = useState<TurnByTurnLeg[]>(turnByTurnLegs);
  const [emergencyState, setEmergencyState] = useState<EmergencyDistressState>(initialEmergencyState);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);

  const handleActivateDistress = (type: NonNullable<EmergencyDistressState["distressType"]>) => {
    const nowUtc = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
    setEmergencyState((prev) => ({
      ...prev,
      isDistressActive: true,
      distressType: type,
      epirbTransmitting: true,
      gmdssChannelActive: true,
      activatedAtUtc: nowUtc,
      acknowledgedBy: "MRCC Punta Arenas & McMurdo Station [ACKNOWLEDGED]",
    }));
  };

  const handleDeactivateDistress = () => {
    setEmergencyState(initialEmergencyState);
  };

  return (
    <div className="navigator-screen-container">
      {/* ── 1. Top Hero Pilot HUD (Position, Dest, Next WP, ETA, Risk) ───────── */}
      <section className="navigator-hud-banner">
        {/* Current Position */}
        <div className="hud-metric-card">
          <div className="metric-header">
            <span className="metric-icon">📍</span>
            <span className="metric-title">CURRENT POSITION</span>
          </div>
          <div className="metric-body">
            <span className="metric-primary font-mono status-cyan">
              64°49'12" S, 63°30'45" W
            </span>
            <span className="metric-sub">
              Gerlache Strait · Depth <span className="font-mono">420m</span>
            </span>
          </div>
        </div>

        {/* Destination */}
        <div className="hud-metric-card">
          <div className="metric-header">
            <span className="metric-icon">🎯</span>
            <span className="metric-title">DESTINATION</span>
          </div>
          <div className="metric-body">
            <span className="metric-primary status-low">
              {vessel.destination.split("/")[0]}
            </span>
            <span className="metric-sub font-mono">
              Remaining: {recommendedRoute.totalDistanceNm} NM
            </span>
          </div>
        </div>

        {/* Next Waypoint */}
        <div className="hud-metric-card card-highlighted">
          <div className="metric-header">
            <span className="metric-icon">⏭️</span>
            <span className="metric-title">NEXT WAYPOINT</span>
          </div>
          <div className="metric-body">
            <div className="metric-split-row">
              <span className="metric-primary status-mod">{nextWp.name}</span>
              <span className="badge badge-active-wp">ACTIVE</span>
            </div>
            <span className="metric-sub font-mono">
              {nextWp.distanceNm} NM @ {nextWp.bearingDeg}° (XTE: {nextWp.crossTrackErrorNm} NM)
            </span>
          </div>
        </div>

        {/* ETA */}
        <div className="hud-metric-card">
          <div className="metric-header">
            <span className="metric-icon">⏱️</span>
            <span className="metric-title">ESTIMATED TIME (ETA)</span>
          </div>
          <div className="metric-body">
            <span className="metric-primary font-mono status-cyan">
              {vessel.eta}
            </span>
            <span className="metric-sub">
              Next WP in <span className="font-mono status-low">{nextWp.timeToGo}</span>
            </span>
          </div>
        </div>

        {/* Risk Level */}
        <div className="hud-metric-card">
          <div className="metric-header">
            <span className="metric-icon">🛡️</span>
            <span className="metric-title">CORRIDOR RISK LEVEL</span>
          </div>
          <div className="metric-body">
            <div className="metric-split-row">
              <span className="risk-level-badge level-optimal">LEVEL 2 / 5</span>
              <span className="badge badge-secure">OPTIMAL</span>
            </div>
            <span className="metric-sub">
              Ice Pack <span className="font-mono">0.4m</span> · Thermal Clear
            </span>
          </div>
        </div>
      </section>

      {/* ── Emergency Distress Alert Bar if Active ──────────────────────────── */}
      {emergencyState.isDistressActive && (
        <section className="emergency-alert-strip">
          <div className="emergency-strip-content">
            <span className="blinking-siren">🚨</span>
            <span className="strip-title">
              DISTRESS BROADCAST ACTIVE: {emergencyState.distressType?.replace("_", " ")}
            </span>
            <span className="strip-sub font-mono">
              EPIRB 406MHz & GMDSS Ch 16 Active · Dispatched: {emergencyState.nearestRescueVessel}
            </span>
          </div>
          <button
            type="button"
            className="btn-strip-manage"
            onClick={() => setIsEmergencyModalOpen(true)}
          >
            MANAGE SOS CONSOLE
          </button>
        </section>
      )}

      {/* ── Main Navigator Layout Grid ───────────────────────────────────────── */}
      <div className="navigator-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* ── Left Column: Route & Environment ──────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <section className="navigator-panel route-waypoints-panel" style={{ flex: 1 }}>
            <div className="panel-header">
              <div className="panel-title-row">
                <span className="panel-icon">📋</span>
                <h3>RECOMMENDED ROUTE</h3>
              </div>
              <span className="badge badge-secure">SAFE CORRIDOR</span>
            </div>

            <div className="panel-body">
              <div className="turn-by-turn-list">
                {legs.map((leg) => {
                  const isActive = leg.status === "active";
                  const isCompleted = leg.status === "completed";

                  return (
                    <div
                      key={leg.id}
                      className={`leg-card ${isActive ? "leg-active" : isCompleted ? "leg-completed" : "leg-pending"}`}
                    >
                      <div className="leg-card-header">
                        <div className="leg-order-badge">LEG 0{leg.order}</div>
                        <div className="leg-names">
                          <span className="leg-from">{leg.fromWaypoint.split(":")[0]}</span>
                          <span className="leg-arrow">➔</span>
                          <span className="leg-to status-cyan">{leg.toWaypoint}</span>
                        </div>
                        <span className={`leg-status-tag status-${leg.status}`}>
                          {leg.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="leg-metrics-row font-mono">
                        <span>📏 {leg.legDistanceNm} NM</span>
                        <span>🧭 HDG {leg.legHeadingDeg}°</span>
                        <span>⏱️ {leg.estimatedLegTime}</span>
                        <span>❄️ {leg.iceProfile} ({leg.iceThicknessMeters}m)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <EnvironmentPanel latitude={vessel.position.lat} longitude={vessel.position.lng} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <RiskAnalysisPanel initialRisk={{ overallSafetyScore: 92, threatStatus: 'SECURE', factors: [], advisories: [] }} />

          {/* Emergency / SOS Console Panel */}
          <section className="navigator-panel emergency-sos-panel">
            <div className="panel-header header-emergency">
              <div className="panel-title-row">
                <span className="panel-icon">🚨</span>
                <h3>EMERGENCY & SOS DISTRESS</h3>
              </div>
              <span className="badge badge-sos-status">
                {emergencyState.isDistressActive ? "MAYDAY ACTIVE" : "STANDBY"}
              </span>
            </div>

            <div className="panel-body">
              <div className="sos-console-box">
                <p className="sos-summary-text">
                  Direct satellite GMDSS & EPIRB 406 MHz emergency distress trigger.
                  Transmits GPS position and telemetry to Polar SAR coordination stations.
                </p>

                <div className="haven-quick-ref">
                  <span className="haven-ref-label">NEAREST ICE HAVEN:</span>
                  <span className="haven-ref-val font-mono status-cyan">
                    {emergencyState.nearestShelterHaven.name} ({emergencyState.nearestShelterHaven.distanceNm} NM @ {emergencyState.nearestShelterHaven.bearingDeg}°)
                  </span>
                </div>

                <button
                  type="button"
                  className={`btn-sos-main-trigger ${emergencyState.isDistressActive ? "active-siren" : ""}`}
                  onClick={() => setIsEmergencyModalOpen(true)}
                >
                  {emergencyState.isDistressActive ? "🚨 MANAGE ACTIVE DISTRESS" : "🆘 TRIGGER EMERGENCY / SOS"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Emergency SOS Modal Dialog ───────────────────────────────────────── */}
      <EmergencyModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        emergencyState={emergencyState}
        onActivateDistress={handleActivateDistress}
        onDeactivateDistress={handleDeactivateDistress}
      />
    </div>
  );
}
