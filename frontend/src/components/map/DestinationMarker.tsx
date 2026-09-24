import React from "react";
import type { MapDestination } from "../../hooks/useMapData";

interface DestinationMarkerProps {
  destination: MapDestination;
  onClick?: () => void;
  projectToSvg: (lat: number, lng: number) => { x: number; y: number };
}

export const DestinationMarker: React.FC<DestinationMarkerProps> = ({
  destination,
  onClick,
  projectToSvg,
}) => {
  const pt = projectToSvg(destination.lat, destination.lng);

  return (
    <g
      className="ecdis-destination-target"
      transform={`translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{ cursor: "pointer" }}
      aria-label={`Target Destination ${destination.name}`}
    >
      {/* Outer Rotating Range Ring */}
      <circle r="24" fill="none" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle r="12" fill="#065f46" stroke="#34d399" strokeWidth="2" filter="url(#ecdisGreenGlow)" />

      {/* Target Crosshairs */}
      <line x1="-16" y1="0" x2="16" y2="0" stroke="#34d399" strokeWidth="1.2" />
      <line x1="0" y1="-16" x2="0" y2="16" stroke="#34d399" strokeWidth="1.2" />

      {/* Top-Right HUD Badge */}
      <g transform="translate(16, -20)">
        <rect
          x="-4"
          y="-10"
          width="132"
          height="24"
          rx="4"
          fill="rgba(6, 36, 26, 0.95)"
          stroke="#34d399"
          strokeWidth="1.2"
        />
        <text x="4" y="2" fill="#34d399" fontSize="9" fontFamily="monospace" fontWeight="bold">
          🎯 DEMO STATION
        </text>
        <text x="4" y="11" fill="#a7f3d0" fontSize="7" fontFamily="monospace">
          {Math.abs(destination.lat).toFixed(2)}°S {Math.abs(destination.lng).toFixed(2)}°W · BERTH READY
        </text>
      </g>
    </g>
  );
};
