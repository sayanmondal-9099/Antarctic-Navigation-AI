import { useState } from "react";
import type { RiskAnalysis } from "../types/navigation";

// Extend type locally to include overallLevel string from App
interface ExtendedRiskAnalysis extends RiskAnalysis {
  overallLevel?: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
}

interface RiskAnalysisPanelProps {
  initialRisk: ExtendedRiskAnalysis;
}

export function RiskAnalysisPanel({ initialRisk }: RiskAnalysisPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "#ef4444";
      case "HIGH": return "#f97316";
      case "MODERATE": return "#fbbf24";
      default: return "#34d399";
    }
  };

  const level = initialRisk.overallLevel || "LOW";
  const color = getRiskColor(level);

  return (
    <section className="command-panel risk-analysis-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>NAVIGATION RISK</h3>
        <span style={{ 
          background: `${color}33`, 
          color: color, 
          padding: '4px 12px', 
          borderRadius: '4px',
          fontWeight: 800,
          border: `1px solid ${color}66`
        }}>
          {level}
        </span>
      </div>

      {level !== "LOW" && (
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ color: 'var(--text-primary)' }}>WHY?</strong>
          <ul style={{ paddingLeft: '16px', margin: '8px 0', color: 'var(--text-secondary)' }}>
            {initialRisk.factors.filter(f => f.rating === "Critical" || f.rating === "Severe").map((factor, i) => (
               <li key={i}>{factor.details}</li>
            ))}
          </ul>
        </div>
      )}

      <button 
        style={{ 
          background: 'transparent', 
          border: '1px solid var(--border-subtle)', 
          color: 'var(--text-secondary)',
          padding: '6px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.75rem'
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        [{showDetails ? "HIDE DETAILS" : "VIEW DETAILS"}]
      </button>

      {showDetails && (
        <div className="risk-factors-list" style={{ marginTop: '12px' }}>
          {initialRisk.factors.map((factor) => (
             <div key={factor.category} style={{ fontSize: '0.75rem', marginBottom: '8px', padding: '8px', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                   <strong>{factor.category}</strong>
                   <span style={{ color: getRiskColor(factor.rating.toUpperCase()) }}>{factor.rating}</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>{factor.details}</div>
             </div>
          ))}
          <div className="advisories-card" style={{ marginTop: '12px' }}>
            <div className="advisories-header">
              <span className="advisory-title">AI ADVISORIES</span>
            </div>
            <ul className="advisories-list">
              {initialRisk.advisories.map((advisory, idx) => (
                <li key={idx} className="advisory-item">
                  <span className="advisory-bullet">›</span>
                  <span>{advisory}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
