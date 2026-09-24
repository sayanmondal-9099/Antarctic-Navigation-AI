import { useState } from "react";
import type { VesselState } from "../types/navigation";

interface ShipStatusPanelProps {
  vessel: VesselState;
  onSpeedChange?: (newSpeed: number) => void;
}

export function ShipStatusPanel({ vessel, onSpeedChange }: ShipStatusPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Convert heading degrees to 16-point cardinal compass text
  const getCompassDirection = (deg: number): string => {
    const directions = [
      "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ];
    const index = Math.round((deg % 360) / 22.5) % 16;
    return directions[index];
  };

  const cardinal = getCompassDirection(vessel.headingDegrees);

  return (
    <section className="command-panel ship-status-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SHIP STATUS</h3>
        <span style={{ 
          background: `var(--bg-surface)`, 
          color: 'var(--text-primary)', 
          padding: '4px 12px', 
          borderRadius: '4px',
          fontWeight: 800,
          border: `1px solid var(--border-subtle)`
        }}>
          {vessel.speedKnots.toFixed(1)} KTS | {vessel.headingDegrees}°
        </span>
      </div>

      <button 
        style={{ 
          background: 'transparent', 
          border: '1px solid var(--border-subtle)', 
          color: 'var(--text-secondary)',
          padding: '6px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.75rem',
          marginTop: '4px'
        }}
        onClick={() => setShowDetails(!showDetails)}
      >
        [{showDetails ? "HIDE TELEMETRY" : "VIEW TELEMETRY"}]
      </button>

      {showDetails && (
        <div className="panel-body" style={{ marginTop: '8px' }}>
          {/* Top Key Metrics Grid matching the wireframe (Speed, Heading, ETA) */}
          <div className="telemetry-cards-grid">
            {/* Speed Card */}
            <div className="telemetry-card">
              <span className="card-label">SPEED</span>
              <div className="card-value-row">
                <span className="card-value status-cyan">{vessel.speedKnots.toFixed(1)}</span>
                <span className="card-unit">KTS</span>
              </div>
              <div className="card-subtext">
                Target: <span className="status-low">{vessel.targetSpeedKnots.toFixed(1)} kts</span> (Ice Limit)
              </div>
            </div>

            {/* Heading Card with Compass Gyro */}
            <div className="telemetry-card">
              <span className="card-label">HEADING</span>
              <div className="card-value-row">
                <span className="card-value status-mod">{vessel.headingDegrees}°</span>
                <span className="card-unit">{cardinal}</span>
              </div>
              <div className="card-subtext compass-indicator-row">
                <span
                  className="mini-compass-arrow"
                  style={{ transform: `rotate(${vessel.headingDegrees}deg)` }}
                >
                  ▲
                </span>
                <span>True South Bearing</span>
              </div>
            </div>

            {/* ETA Card */}
            <div className="telemetry-card">
              <span className="card-label">ESTIMATED ARRIVAL</span>
              <div className="card-value-row">
                <span className="card-value font-mono status-low">{vessel.eta}</span>
              </div>
              <div className="card-subtext truncate" title={vessel.destination}>
                To: {vessel.destination}
              </div>
            </div>
          </div>

          {/* Secondary Detailed Engineering & Polar Specs */}
          <div className="engineering-specs-table">
            <div className="spec-row">
              <span className="spec-name">POSITION</span>
              <span className="spec-val font-mono status-cyan">
                60.2°S, 45.3°W ({vessel.position.label || "Weddell Sea"})
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-name">DESTINATION</span>
              <span className="spec-val font-mono status-low">
                {vessel.destination}
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-name">SECTOR THREATS</span>
              <span className="spec-val font-mono">
                🧊 12 Icebergs · 🚢 1 Nearby Vessel (Ship B)
              </span>
            </div>

            <div className="spec-row">
              <span className="spec-name">POLAR ICE CLASS</span>
              <span className="spec-val status-cyan">{vessel.iceClass}</span>
            </div>

            <div className="spec-row">
              <span className="spec-name">HULL ICE STRAIN</span>
              <div className="spec-bar-wrapper">
                <div className="progress-track">
                  <div
                    className="progress-fill fill-cyan"
                    style={{ width: `${(vessel.hullStrainMpa / 40) * 100}%` }}
                  ></div>
                </div>
                <span className="spec-val font-mono">{vessel.hullStrainMpa} MPa (Nominal)</span>
              </div>
            </div>

            <div className="spec-row">
              <span className="spec-name">PROPULSION LOAD</span>
              <div className="spec-bar-wrapper">
                <div className="progress-track">
                  <div
                    className="progress-fill fill-green"
                    style={{ width: `${vessel.engineLoadPercentage}%` }}
                  ></div>
                </div>
                <span className="spec-val font-mono">{vessel.engineLoadPercentage}%</span>
              </div>
            </div>

            <div className="spec-row">
              <span className="spec-name">FUEL RESERVE</span>
              <div className="spec-bar-wrapper">
                <div className="progress-track">
                  <div
                    className="progress-fill fill-green"
                    style={{ width: `${vessel.fuelPercentage}%` }}
                  ></div>
                </div>
                <span className="spec-val font-mono">{vessel.fuelPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Throttle Control */}
          {onSpeedChange && (
            <div className="speed-throttle-control">
              <div className="throttle-label-row">
                <span className="throttle-title">NAVIGATIONAL SPEED THROTTLE</span>
                <span className="throttle-val font-mono">{vessel.speedKnots} kts</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={vessel.speedKnots}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="hud-slider"
              />
              <div className="throttle-marks">
                <span>0 kts (Stop)</span>
                <span>8 kts (Heavy Ice)</span>
                <span>12 kts (Safe AI)</span>
                <span>20 kts (Open Water)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
