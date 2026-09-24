import React from "react";
import type { VesselState } from "../../types/navigation";

interface VesselLayerProps {
  vessels: VesselState[];
  selectedVesselId: string;
  onSelectVessel: (vesselId: string) => void;
  projectToSvg: (lat: number, lng: number) => { x: number; y: number };
}

export const VesselLayer: React.FC<VesselLayerProps> = ({
  vessels,
  selectedVesselId,
  onSelectVessel,
  projectToSvg,
}) => {
  return (
    <g className="ecdis-vessel-layer">
      {vessels.map((vessel) => {
        const pt = projectToSvg(vessel.position.lat, vessel.position.lng);
        const isSelected = vessel.id === selectedVesselId;
        const isFlagship = vessel.id === "vessel-A";

        // Course prediction vector calculation (15 min projection)
        const vectorLen = Math.max(18, Math.min(42, (vessel.speedKnots / 12) * 34));

        return (
          <g
            key={vessel.id}
            className={`ecdis-vessel-group ${isSelected ? "selected" : ""}`}
            transform={`translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectVessel(vessel.id);
            }}
            style={{ cursor: "pointer" }}
            aria-label={`Vessel ${vessel.name}`}
          >
            {/* Selection Pulsing Rings */}
            {isSelected && (
              <>
                <circle r="22" fill="none" stroke="#00f0ff" strokeWidth="1.5" className="vessel-ping" />
                <circle r="34" fill="none" stroke="#00f0ff" strokeWidth="0.8" className="vessel-ping-outer" />
              </>
            )}

            {/* Velocity & Heading Vector Arrow */}
            <g transform={`rotate(${vessel.headingDegrees})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={-vectorLen}
                stroke={isFlagship ? "#00f0ff" : isSelected ? "#38bdf8" : "#f59e0b"}
                strokeWidth="2.2"
                strokeDasharray="4 2"
              />
              <polygon
                points={`0,${-vectorLen - 5} -4,${-vectorLen + 3} 4,${-vectorLen + 3}`}
                fill={isFlagship ? "#00f0ff" : isSelected ? "#38bdf8" : "#f59e0b"}
              />
            </g>

            {/* High-Tech Tactical AIS Hull Chevron */}
            <polygon
              points="0,-14 8,9 0,5 -8,9"
              fill={isFlagship ? "#0284c7" : isSelected ? "#0369a1" : "#b45309"}
              stroke={isSelected ? "#ffffff" : isFlagship ? "#38bdf8" : "#fcd34d"}
              strokeWidth={isSelected ? "2.2" : "1.5"}
              filter={isSelected || isFlagship ? "url(#ecdisCyanGlow)" : undefined}
            />

            {/* Compact Callout Label */}
            <g transform="translate(14, -12)">
              <rect
                x="-4"
                y="-9"
                width={isSelected ? "118" : "90"}
                height={isSelected ? "26" : "20"}
                rx="4"
                fill={isSelected ? "rgba(8, 24, 48, 0.95)" : "rgba(15, 23, 42, 0.88)"}
                stroke={isSelected ? "#00f0ff" : isFlagship ? "#38bdf8" : "rgba(245, 158, 11, 0.5)"}
                strokeWidth={isSelected ? "1.2" : "0.8"}
              />
              <text
                x="2"
                y="3"
                fill={isSelected ? "#00f0ff" : isFlagship ? "#38bdf8" : "#fcd34d"}
                fontSize={isSelected ? "9" : "8"}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {vessel.name.split(" (")[0]}
              </text>
              {isSelected && (
                <text x="2" y="13" fill="#cbd5e1" fontSize="7" fontFamily="monospace">
                  {vessel.speedKnots} kts · HDG {vessel.headingDegrees}°
                </text>
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
};
