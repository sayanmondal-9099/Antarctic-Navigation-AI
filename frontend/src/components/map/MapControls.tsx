import React from "react";

interface MapControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <>
      {/* Zoom Control Buttons */}
      <div className="ecdis-viewport-actions" aria-label="Map Zoom Controls">
        <button
          type="button"
          className="ecdis-hud-btn"
          onClick={onZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          className="ecdis-hud-btn"
          onClick={onZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          −
        </button>
        <button
          type="button"
          className="ecdis-hud-btn font-mono"
          onClick={onResetZoom}
          title="Reset Scale"
          aria-label="Reset Scale"
        >
          {zoomLevel === 1 ? "1:1" : `${Math.round(zoomLevel * 100)}%`}
        </button>
      </div>

      {/* Polar Compass Rose */}
      <div className="ecdis-compass-rose" title="Polar Grid Alignment (True South)">
        <div className="compass-needle">
          <span className="compass-s">S</span>
          <span className="compass-arrow"></span>
          <span className="compass-n">N</span>
        </div>
      </div>
    </>
  );
};
