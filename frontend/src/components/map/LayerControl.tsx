import React from "react";
import type { MapLayerVisibility } from "../../hooks/useMapData";

interface LayerControlProps {
  layers: MapLayerVisibility;
  onToggleLayer: (layerKey: keyof MapLayerVisibility) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onToggleLayer,
}) => {
  return (
    <div className="ecdis-layer-toolbar" role="toolbar" aria-label="Map Layer Filters">
      <div className="ecdis-toolbar-status">
        <span className="ecdis-live-beacon"></span>
        <span className="ecdis-mode-text">ECDIS POLAR CHART</span>
        <span className="ecdis-class-tag">SIMULATED DEMO DATA</span>
      </div>

      <div className="ecdis-layer-buttons">
        <button
          type="button"
          className={`layer-pill-btn ${layers.vessels ? "active" : ""}`}
          onClick={() => onToggleLayer("vessels")}
          title="Toggle Active Vessel AIS Contacts"
        >
          <span className="pill-dot"></span>
          🚢 Vessels
        </button>

        <button
          type="button"
          className={`layer-pill-btn ${layers.icebergs ? "active" : ""}`}
          onClick={() => onToggleLayer("icebergs")}
          title="Toggle Tracked Iceberg Hazards"
        >
          <span className="pill-dot"></span>
          🧊 Icebergs
        </button>

        <button
          type="button"
          className={`layer-pill-btn ${layers.routes ? "active" : ""}`}
          onClick={() => onToggleLayer("routes")}
          title="Toggle Recommended Navigation Corridor"
        >
          <span className="pill-dot"></span>
          ──── Recommended Route
        </button>

        <button
          type="button"
          className={`layer-pill-btn disabled ${layers.seaIce ? "active" : ""}`}
          onClick={() => onToggleLayer("seaIce")}
          title="Copernicus Sea Ice Raster (Not connected yet)"
        >
          <span className="pill-dot pill-inactive"></span>
          ❄️ Sea Ice (NOT CONNECTED)
        </button>

        <button
          type="button"
          className={`layer-pill-btn ${layers.bathymetry ? "active" : ""}`}
          onClick={() => onToggleLayer("bathymetry")}
          title="Toggle Ocean Depth Contours"
        >
          <span className="pill-dot"></span>
          🌊 Bathymetry
        </button>
      </div>
    </div>
  );
};
