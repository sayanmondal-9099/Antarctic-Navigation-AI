import React from "react";

export const MapLegend: React.FC = () => {
  return (
    <div className="ecdis-map-legend" role="region" aria-label="ECDIS Map Legend">
      <div className="legend-title">ECDIS SYMBOLOGY</div>
      <div className="legend-items font-mono">
        <div className="legend-item">
          <span className="legend-glyph text-cyan">🚢</span>
          <span className="legend-label">Vessel (AIS Target)</span>
        </div>
        <div className="legend-item">
          <span className="legend-glyph text-amber">🧊</span>
          <span className="legend-label">Iceberg (Medium Risk)</span>
        </div>
        <div className="legend-item">
          <span className="legend-glyph text-red">⚠️</span>
          <span className="legend-label">High Risk Iceberg (Tabular)</span>
        </div>
        <div className="legend-item">
          <span className="legend-glyph legend-line text-cyan">━━━━</span>
          <span className="legend-label">Recommended Route</span>
        </div>
        <div className="legend-item">
          <span className="legend-glyph text-green">🎯</span>
          <span className="legend-label">Destination (Berth)</span>
        </div>
      </div>
    </div>
  );
};
