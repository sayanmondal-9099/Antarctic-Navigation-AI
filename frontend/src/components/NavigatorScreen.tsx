import { useState } from "react";
import type { VesselState, NavigationRoute } from "../types/navigation";
import type {
  NearbyVessel,
  NextWaypointGuidance,
  TurnByTurnLeg,
  EmergencyDistressState,
} from "../types/navigator";
import {
  initialNearbyVessels,
  initialNextWaypoint,
  turnByTurnLegs,
  initialEmergencyState,
} from "../data/mockNavigatorData";
import { EmergencyModal } from "./EmergencyModal";

interface NavigatorScreenProps {
  vessel: VesselState;
  recommendedRoute: NavigationRoute;
}

export function NavigatorScreen({ vessel, recommendedRoute }: NavigatorScreenProps) {
  const [nearbyVessels] = useState<NearbyVessel[]>(initialNearbyVessels);
  const [nextWp] = useState<NextWaypointGuidance>(initialNextWaypoint);
  const [legs] = useState<TurnByTurnLeg[]>(turnByTurnLegs);
  const [emergencyState, setEmergencyState] = useState<EmergencyDistressState>(initialEmergencyState);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [selectedVessel, setSelectedVessel] = useState<NearbyVessel | null>(null);
  const [hailedVesselId, setHailedVesselId] = useState<string | null>(null);

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

  const handleHailVessel = (vesselId: string) => {
    setHailedVesselId(vesselId);
    setTimeout(() => {
      setHailedVesselId(null);
    }, 4000);
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
            <span className="metric-primary font-mono highlight-cyan">
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
            <span className="metric-primary highlight-green">
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
              <span className="metric-primary highlight-amber">{nextWp.name}</span>
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
            <span className="metric-primary font-mono highlight-cyan">
              {vessel.eta}
            </span>
            <span className="metric-sub">
              Next WP in <span className="font-mono highlight-green">{nextWp.timeToGo}</span>
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
      <div className="navigator-grid-layout">
        {/* ── Left Column: Tactical Steering & Radar Simulation ───────────────── */}
        <section className="navigator-panel steering-radar-panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <span className="panel-icon">🧭</span>
              <h3>POLAR PILOT & STEERING GUIDANCE</h3>
            </div>
            <span className="badge badge-ai">AUTONOMOUS STEERING</span>
          </div>

          <div className="panel-body">
            {/* Steering Rose / Dial Gauge */}
            <div className="steering-compass-container">
              <div className="steering-dial">
                <div
                  className="dial-compass-cardinal"
                  style={{ transform: `rotate(${-vessel.headingDegrees}deg)` }}
                >
                  <span className="cardinal-mark c-n">N</span>
                  <span className="cardinal-mark c-e">E</span>
                  <span className="cardinal-mark c-s">S</span>
                  <span className="cardinal-mark c-w">W</span>
                </div>

                {/* Target Course Bug */}
                <div
                  className="dial-target-bug"
                  style={{ transform: `rotate(${nextWp.courseToSteerDeg - vessel.headingDegrees}deg)` }}
                  title={`Target Course to Steer: ${nextWp.courseToSteerDeg}°`}
                >
                  ▼
                </div>

                {/* Center Ship Indicator */}
                <div className="dial-center-vessel">
                  <span className="vessel-icon">🚢</span>
                  <span className="center-hdg font-mono">{vessel.headingDegrees}°</span>
                </div>
              </div>

              {/* Rudder & Pilot Data Grid */}
              <div className="steering-parameters-grid">
                <div className="param-item">
                  <span className="param-label">COURSE TO STEER (CTS)</span>
                  <span className="param-value font-mono highlight-amber">{nextWp.courseToSteerDeg}° SSE</span>
                </div>
                <div className="param-item">
                  <span className="param-label">CROSS-TRACK ERROR (XTE)</span>
                  <span className="param-value font-mono highlight-green">{nextWp.crossTrackErrorNm} NM (PORT)</span>
                </div>
                <div className="param-item">
                  <span className="param-label">SPEED ADVISORY</span>
                  <span className="param-value font-mono highlight-cyan">{nextWp.speedAdvisoryKnots} kts (ICE LIMIT)</span>
                </div>
                <div className="param-item">
                  <span className="param-label">SOUNDING DEPTH</span>
                  <span className="param-value font-mono">{nextWp.depthMeters} m</span>
                </div>
              </div>
            </div>

            {/* Tactical Pilot Instruction */}
            <div className="pilot-instruction-box">
              <span className="instruction-badge">AI PILOT ACTION</span>
              <p className="instruction-text">{nextWp.actionInstruction}</p>
            </div>
          </div>
        </section>

        {/* ── Middle Column: Turn-by-Turn Waypoints Sequence ──────────────────── */}
        <section className="navigator-panel route-waypoints-panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <span className="panel-icon">📋</span>
              <h3>RECOMMENDED ROUTE — WAYPOINT SEQUENCE</h3>
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
                        <span className="leg-to highlight-cyan">{leg.toWaypoint}</span>
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

                    <div className="leg-advisory-text">
                      <span className="bullet">›</span> {leg.maneuverAdvisory}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Right Column: AIS Nearby Vessels & Emergency SOS Console ────────── */}
        <div className="right-panels-column">
          {/* Nearby Vessels (AIS Traffic) */}
          <section className="navigator-panel nearby-vessels-panel">
            <div className="panel-header">
              <div className="panel-title-row">
                <span className="panel-icon">📡</span>
                <h3>NEARBY VESSELS (AIS RADAR)</h3>
              </div>
              <span className="badge badge-ais">{nearbyVessels.length} TARGETS</span>
            </div>

            <div className="panel-body">
              <div className="nearby-vessels-list">
                {nearbyVessels.map((v) => {
                  const isSelected = selectedVessel?.id === v.id;
                  const isHailed = hailedVesselId === v.id;

                  return (
                    <div
                      key={v.id}
                      className={`vessel-ais-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedVessel(isSelected ? null : v)}
                    >
                      <div className="ais-card-header">
                        <div className="ais-vessel-title">
                          <span className="ais-vessel-icon">
                            {v.vesselType === "Icebreaker" ? "🧊" : v.vesselType === "Research" ? "🔬" : "🐟"}
                          </span>
                          <span className="ais-vessel-name">{v.name}</span>
                        </div>
                        <span className="ais-vessel-call font-mono">[{v.callSign}]</span>
                      </div>

                      <div className="ais-card-metrics font-mono">
                        <div>Dist: <span className="highlight-cyan">{v.distanceNm} NM</span></div>
                        <div>Brg: <span>{v.bearingDeg}°</span></div>
                        <div>Spd: <span>{v.speedKnots} kts</span></div>
                        <div>CPA: <span className="highlight-green">{v.cpaNm} NM</span></div>
                      </div>

                      <div className="ais-card-footer">
                        <span className="ais-class-tag">{v.iceClass}</span>
                        <button
                          type="button"
                          className={`btn-vhf-hail ${isHailed ? "hailed" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHailVessel(v.id);
                          }}
                        >
                          {isHailed ? "📻 TRANSMITTING CH 16..." : `📻 HAIL VHF CH ${v.vhfChannel}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

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
                  <span className="haven-ref-val font-mono highlight-cyan">
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
