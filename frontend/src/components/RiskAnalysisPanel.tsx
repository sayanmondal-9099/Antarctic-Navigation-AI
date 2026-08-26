import { useState } from "react";
import type { RiskAnalysis, RiskFactor } from "../types/navigation";

interface RiskAnalysisPanelProps {
  initialRisk: RiskAnalysis;
}

export function RiskAnalysisPanel({ initialRisk }: RiskAnalysisPanelProps) {
  const [riskData, setRiskData] = useState<RiskAnalysis>(initialRisk);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);

  // Helper to render ASCII / Segmented Block Meters matching the user wireframe: █████░
  const renderSegmentedBar = (filled: number, total = 6) => {
    const filledBlocks = "█".repeat(Math.min(total, Math.max(0, filled)));
    const emptyBlocks = "░".repeat(Math.max(0, total - filled));
    return `${filledBlocks}${emptyBlocks}`;
  };

  const getRiskColorClass = (rating: RiskFactor["rating"]) => {
    switch (rating) {
      case "Critical":
        return "risk-critical";
      case "Severe":
        return "risk-severe";
      case "Elevated":
        return "risk-elevated";
      case "Moderate":
        return "risk-moderate";
      case "Nominal":
      default:
        return "risk-nominal";
    }
  };

  // Toggle simulated storm/ice conditions
  const toggleSimulation = () => {
    if (!simulationActive) {
      setRiskData({
        overallSafetyScore: 64,
        threatStatus: "ADVISORY",
        factors: [
          {
            category: "Ice",
            scorePercent: 94,
            rating: "Critical",
            barSegments: 6,
            details: "Dynamic ice convergence: Fast ice pressure ridges forming at WP-03",
            trend: "rising",
          },
          {
            category: "Iceberg",
            scorePercent: 78,
            rating: "Severe",
            barSegments: 5,
            details: "Iceberg A-81 accelerated drift (1.6 kts) into primary corridor",
            trend: "rising",
          },
          {
            category: "Weather",
            scorePercent: 68,
            rating: "Elevated",
            barSegments: 4,
            details: "Severe blizzard gusting 58 kts, visibility < 0.2 nm",
            trend: "rising",
          },
          {
            category: "Vessel",
            scorePercent: 32,
            rating: "Moderate",
            barSegments: 2,
            details: "Hull vibration registered in forward bow frame",
            trend: "rising",
          },
        ],
        advisories: [
          "URGENT: Re-routing recommended to divert 8.5 nm West of A-81 drift trajectory.",
          "Reduce propulsion to 7.5 kts to prevent hull ice compression strain.",
          "Prepare thermal anti-icing for bridge forward radar array.",
        ],
      });
      setSimulationActive(true);
    } else {
      setRiskData(initialRisk);
      setSimulationActive(false);
    }
  };

  return (
    <section className="command-panel risk-analysis-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <span className="panel-icon">⚠️</span>
          <h3>RISK ANALYSIS</h3>
        </div>
        <div className="panel-header-actions">
          <button
            type="button"
            className={`btn-sim-toggle ${simulationActive ? "active" : ""}`}
            onClick={toggleSimulation}
            title="Simulate severe weather/iceberg drift changes"
          >
            {simulationActive ? "⚡ STORM SIMULATION [ACTIVE]" : "🧪 SIMULATE BLIZZARD"}
          </button>
          <span className={`badge badge-safety badge-${riskData.threatStatus.toLowerCase()}`}>
            {riskData.threatStatus}
          </span>
        </div>
      </div>

      <div className="panel-body">
        {/* Overall Safety Gauge Score */}
        <div className="safety-index-banner">
          <div className="safety-score-circle">
            <span className="score-num font-mono">{riskData.overallSafetyScore}</span>
            <span className="score-den">/100</span>
          </div>
          <div className="safety-summary-text">
            <span className="safety-headline">
              {riskData.threatStatus === "SECURE"
                ? "AI ROUTE OPTIMAL — COLLISION AVOIDANCE SECURED"
                : "TACTICAL ALERT — ADVERSE POLAR ICE CONVERGENCE"}
            </span>
            <span className="safety-sub">
              Dynamic multi-factor risk assessment computed across vessel corridor
            </span>
          </div>
        </div>

        {/* Risk Factor Gauges matching wireframe categories */}
        <div className="risk-factors-list">
          {riskData.factors.map((factor) => {
            const colorClass = getRiskColorClass(factor.rating);
            const blockBar = renderSegmentedBar(factor.barSegments, 6);

            return (
              <div key={factor.category} className={`risk-factor-row ${colorClass}`}>
                <div className="factor-main-line">
                  <span className="factor-category font-mono">{factor.category.padEnd(8, " ")}</span>
                  
                  {/* Segmented ASCII Bar display matching wireframe */}
                  <span className="factor-ascii-bar font-mono" title={`${factor.scorePercent}%`}>
                    {blockBar}
                  </span>

                  <span className="factor-percentage font-mono">{factor.scorePercent}%</span>
                  <span className={`factor-badge badge-${factor.rating.toLowerCase()}`}>
                    {factor.rating.toUpperCase()}
                  </span>
                </div>

                <div className="factor-details-line">
                  <span className="trend-icon">
                    {factor.trend === "rising" ? "▲" : factor.trend === "declining" ? "▼" : "▶"}
                  </span>
                  <span className="details-text">{factor.details}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Tactical Advisories Box */}
        <div className="advisories-card">
          <div className="advisories-header">
            <span className="advisory-icon">🤖</span>
            <span className="advisory-title">AI NAVIGATION ADVISORIES</span>
          </div>
          <ul className="advisories-list">
            {riskData.advisories.map((advisory, idx) => (
              <li key={idx} className="advisory-item">
                <span className="advisory-bullet">›</span>
                <span>{advisory}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
