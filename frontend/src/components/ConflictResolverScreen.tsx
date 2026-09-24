import { useState, useEffect } from "react";
import type { NavigationRoute } from "../types/navigation";
import type { ConflictScenario, DeconflictionOption } from "../types/conflict";
import { initialConflictScenarios } from "../data/mockConflictData";
import { fetchDeconfliction } from "../services/api";

interface ConflictResolverScreenProps {
  onExecuteDeconfliction: (route: NavigationRoute, newHeading: number, newSpeed: number) => void;
}

export function ConflictResolverScreen({ onExecuteDeconfliction }: ConflictResolverScreenProps) {
  const [scenarios, setScenarios] = useState<ConflictScenario[]>(initialConflictScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string>("scenario-gerlache-crossing");
  const [selectedOptionId, setSelectedOptionId] = useState<string>("alt-01-lead-evasion");
  const [isResolved, setIsResolved] = useState<boolean>(false);
  const [resolvedOptionTitle, setResolvedOptionTitle] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    fetchDeconfliction()
      .then((data: any) => {
        if (!isMounted || !data) return;
        const cpa = data.kinematics?.cpa_nm ?? data.cpa_initial_nm ?? 0.8;
        const tcpa = data.kinematics?.tcpa_minutes ?? data.tcpa_initial_minutes ?? 14.5;
        // Merge backend dynamic encounter
        setScenarios((prev) => {
          const updated = [...prev];
          const matchIdx = updated.findIndex((s) => s.id === "scenario-gerlache-crossing");
          if (matchIdx >= 0) {
            updated[matchIdx] = {
              ...updated[matchIdx],
              currentCpaNm: cpa,
              tcpaMinutes: tcpa,
            };
          }
          return updated;
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];
  const selectedOption =
    activeScenario.deconflictionOptions.find((opt) => opt.id === selectedOptionId) ??
    activeScenario.deconflictionOptions[0];

  const handleSelectScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    const scenario = scenarios.find((s) => s.id === scenarioId) ?? scenarios[0];
    setSelectedOptionId(scenario.deconflictionOptions[0].id);
    setIsResolved(false);
  };

  const handleExecuteOption = (option: DeconflictionOption) => {
    onExecuteDeconfliction(option.alternativeRoute, option.newHeadingDeg, option.newSpeedKnots);
    setIsResolved(true);
    setResolvedOptionTitle(option.title);
  };

  return (
    <div className="conflict-screen-container">
      {/* ── Scenario Selector Bar ─────────────────────────────────────────── */}
      <section className="scenario-selector-bar">
        <span className="selector-label">ENCOUNTER SCENARIO:</span>
        <div className="scenario-buttons-row">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              className={`scenario-btn ${activeScenarioId === sc.id ? "active" : ""}`}
              onClick={() => handleSelectScenario(sc.id)}
            >
              <span className="scenario-icon">⚡</span>
              <span>{sc.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Top Conflict Alert HUD ────────────────────────────────────────── */}
      <section className={`conflict-alarm-banner ${isResolved ? "resolved-banner" : "alarm-critical"}`}>
        <div className="alarm-left-flex">
          <span className="alarm-siren">{isResolved ? "✅" : "🚨"}</span>
          <div className="alarm-text-block">
            <div className="alarm-header-row">
              <h3>
                {isResolved
                  ? `CONFLICT RESOLVED — ${resolvedOptionTitle.toUpperCase()}`
                  : `TRAFFIC CONFLICT DETECTED: ${activeScenario.vesselA.name.toUpperCase()} ⚡ ${activeScenario.vesselB.name.toUpperCase()}`}
              </h3>
              <span className={`badge ${isResolved ? "badge-secure" : "badge-critical"}`}>
                {isResolved ? "DECONFLICTED" : activeScenario.urgencyLevel}
              </span>
            </div>
            <p className="alarm-subtext">
              {isResolved
                ? "New collision-free route trajectory engaged. Closest Point of Approach expanded to safe buffer."
                : `${activeScenario.channelName} · ${activeScenario.colregsRuleName}`}
            </p>
          </div>
        </div>

        <div className="alarm-metrics-summary font-mono">
          <div className="summary-chip">
            <span className="chip-label">CURRENT CPA</span>
            <span className={`chip-val ${isResolved ? "status-low" : "status-crit"}`}>
              {isResolved ? `${selectedOption.projectedCpaNm} NM` : `${activeScenario.currentCpaNm} NM`}
            </span>
          </div>
          <div className="summary-chip">
            <span className="chip-label">TIME TO CPA (TCPA)</span>
            <span className={`chip-val ${isResolved ? "status-low" : "status-mod"}`}>
              {isResolved ? "CLEARED" : `${activeScenario.tcpaMinutes} mins`}
            </span>
          </div>
        </div>
      </section>

      {/* ── Main 2-Column Grid: Tactical Conflict Map & Alternative Options ── */}
      <div className="conflict-main-grid">
        {/* ── Left Column: Tactical Conflict Vector Map ────────────────────── */}
        <section className="conflict-panel tactical-radar-panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <span className="panel-icon">🗺️</span>
              <h3>INTERSECTION RADAR & ALTERNATIVE CORRIDORS</h3>
            </div>
            <span className="badge badge-ai">COLLISION SIMULATION</span>
          </div>

          <div className="panel-body">
            <div className="conflict-svg-wrapper">
              <svg viewBox="0 0 700 440" className="conflict-vector-svg">
                <defs>
                  <radialGradient id="dangerZoneGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                    <stop offset="60%" stopColor="#ef4444" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>

                  <filter id="cpaGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Radar Grid Lines */}
                <rect width="700" height="440" fill="#060b17" />
                <circle cx="350" cy="220" r="80" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3 3" />
                <circle cx="350" cy="220" r="160" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeDasharray="4 4" />
                <line x1="350" y1="20" x2="350" y2="420" stroke="rgba(56, 189, 248, 0.12)" strokeDasharray="2 4" />
                <line x1="30" y1="220" x2="670" y2="220" stroke="rgba(56, 189, 248, 0.12)" strokeDasharray="2 4" />

                {/* Channel Land / Ice Walls */}
                <path d="M 40,40 Q 90,160 80,300 T 50,420 L 0,420 L 0,0 L 40,40 Z" fill="rgba(30, 41, 59, 0.7)" stroke="#475569" />
                <text x="60" y="80" fill="rgba(148, 163, 184, 0.4)" fontSize="10" fontFamily="monospace">WEST COASTLINE</text>

                <path d="M 640,20 Q 610,180 620,320 T 660,420 L 700,420 L 700,0 Z" fill="rgba(30, 41, 59, 0.7)" stroke="#475569" />
                <text x="560" y="80" fill="rgba(148, 163, 184, 0.4)" fontSize="10" fontFamily="monospace">FAST ICE RIDGE</text>

                {/* Conflict Collision Epicenter Zone (CPA) */}
                <circle cx="350" cy="220" r="45" fill="url(#dangerZoneGrad)" className="threat-circle" />
                <circle cx="350" cy="220" r="10" fill="#ef4444" stroke="#ffffff" strokeWidth="2" filter="url(#cpaGlow)" />
                <text x="365" y="225" fill="#fca5a5" fontSize="11" fontFamily="monospace" fontWeight="bold">
                  💥 CPA {activeScenario.currentCpaNm} NM (TCPA: {activeScenario.tcpaMinutes}m)
                </text>

                {/* Ship A Vector Track (Cyan) */}
                <g className="ship-a-track">
                  <line x1="140" y1="120" x2="350" y2="220" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 4" />
                  <circle cx="140" cy="120" r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                  <text x="133" y="125" fontSize="13">🚢</text>
                  <text x="110" y="100" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    SHIP A ({activeScenario.vesselA.speedKnots} kts)
                  </text>
                </g>

                {/* Ship B Vector Track (Red) */}
                <g className="ship-b-track">
                  <line x1="560" y1="110" x2="350" y2="220" stroke="#f87171" strokeWidth="3" strokeDasharray="6 4" />
                  <circle cx="560" cy="110" r="14" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                  <text x="553" y="115" fontSize="13">🚢</text>
                  <text x="490" y="95" fill="#f87171" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    SHIP B ({activeScenario.vesselB.speedKnots} kts)
                  </text>
                </g>

                {/* Alternative Route 1: Starboard Thermal Lead (Green Cyan) */}
                <path
                  d="M 140,120 Q 220,180 280,290 T 420,380"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3.5"
                  strokeDasharray={selectedOptionId === "alt-01-lead-evasion" ? "none" : "4 4"}
                  opacity={selectedOptionId === "alt-01-lead-evasion" ? 1 : 0.4}
                />
                <circle cx="280" cy="290" r="6" fill="#34d399" />
                <text x="290" y="295" fill="#34d399" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  ALT 1: EVASION CORRIDOR (CPA 2.4 NM)
                </text>

                {/* Alternative Route 2: Speed Reduction / Hold (Amber) */}
                <path
                  d="M 140,120 L 260,180 L 350,250 L 460,360"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray={selectedOptionId === "alt-02-speed-reduction" ? "none" : "3 3"}
                  opacity={selectedOptionId === "alt-02-speed-reduction" ? 1 : 0.35}
                />
                <text x="210" y="160" fill="#fbbf24" fontSize="9" fontFamily="monospace">
                  ALT 2: SPEED HOLD
                </text>

                {/* Safe Separation Vector between vessels */}
                <line x1="280" y1="290" x2="420" y2="220" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="320" y="270" fill="#a7f3d0" fontSize="9" fontFamily="monospace">
                  SAFE GAP 2.4 NM
                </text>
              </svg>
            </div>

            {/* Ice Constraint Information Box */}
            <div className="ice-constraint-info-box">
              <span className="constraint-label">❄️ POLAR ICE RESTRAINT CONTEXT:</span>
              <p>{activeScenario.iceConstraintSummary}</p>
            </div>
          </div>
        </section>

        {/* ── Right Column: Alternative Deconfliction Routes Matrix ─────────── */}
        <section className="conflict-panel alternatives-matrix-panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <span className="panel-icon">🔀</span>
              <h3>AI ALTERNATIVE DECONFLICTION ROUTES</h3>
            </div>
            <span className="badge badge-secure font-mono">3 OPTIONS COMPUTED</span>
          </div>

          <div className="panel-body">
            <div className="deconfliction-options-list">
              {activeScenario.deconflictionOptions.map((opt) => {
                const isSelected = selectedOptionId === opt.id;

                return (
                  <div
                    key={opt.id}
                    className={`deconfliction-card ${isSelected ? "card-selected" : ""} ${opt.recommended ? "card-recommended" : ""}`}
                    onClick={() => setSelectedOptionId(opt.id)}
                  >
                    <div className="card-top-row">
                      <div className="card-title-group">
                        <span className="card-title">{opt.title}</span>
                        {opt.recommended && (
                          <span className="badge badge-recommended">AI RECOMMENDED</span>
                        )}
                      </div>
                      <span className="badge badge-safety-score font-mono">
                        SAFETY {opt.safetyScore}/100
                      </span>
                    </div>

                    <p className="card-desc">{opt.description}</p>

                    <div className="card-metrics-grid font-mono">
                      <div className="metric-cell">
                        <span className="cell-label">NEW CPA</span>
                        <span className="cell-value status-low">{opt.projectedCpaNm} NM</span>
                      </div>
                      <div className="metric-cell">
                        <span className="cell-label">NEW HEADING</span>
                        <span className="cell-value status-cyan">{opt.newHeadingDeg}°</span>
                      </div>
                      <div className="metric-cell">
                        <span className="cell-label">NEW SPEED</span>
                        <span className="cell-value status-mod">{opt.newSpeedKnots} kts</span>
                      </div>
                      <div className="metric-cell">
                        <span className="cell-label">TIME DELAY</span>
                        <span className="cell-value">+{opt.timeDelayMinutes} mins</span>
                      </div>
                    </div>

                    <div className="card-maneuver-box">
                      <span className="maneuver-tag">TACTICAL ACTION:</span>
                      <span className="maneuver-instruction">{opt.maneuverAction}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Execute Alternative Route Action Bar */}
            <div className="conflict-actions-bar">
              <button
                type="button"
                className={`btn-execute-deconfliction ${isResolved ? "executed-success" : ""}`}
                onClick={() => handleExecuteOption(selectedOption)}
              >
                {isResolved ? (
                  <span>✅ ALTERNATIVE ROUTE ACTIVE & SYNCHRONIZED!</span>
                ) : (
                  <span>🚀 EXECUTE {selectedOption.title.split(":")[0].toUpperCase()}</span>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
