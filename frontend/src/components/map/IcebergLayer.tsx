import React from "react";
import type { IcebergHazard } from "../../types/navigation";

interface IcebergLayerProps {
  icebergs: IcebergHazard[];
  selectedIcebergId?: string | null;
  onSelectIceberg: (iceberg: IcebergHazard) => void;
  projectToSvg: (lat: number, lng: number) => { x: number; y: number };
}

export const IcebergLayer: React.FC<IcebergLayerProps> = ({
  icebergs,
  selectedIcebergId,
  onSelectIceberg,
  projectToSvg,
}) => {
  return (
    <g className="ecdis-iceberg-layer">
      {icebergs.map((ice) => {
        const pt = projectToSvg(ice.position.lat, ice.position.lng);
        const isSelected = selectedIcebergId === ice.id;
        const isHighThreat = ice.threatLevel === "high";
        const isMediumThreat = ice.threatLevel === "medium";

        const strokeColor = isHighThreat ? "#ef4444" : isMediumThreat ? "#f59e0b" : "#38bdf8";
        const fillColor = isHighThreat
          ? "rgba(239, 68, 68, 0.22)"
          : isMediumThreat
          ? "rgba(245, 158, 11, 0.18)"
          : "rgba(56, 189, 248, 0.15)";
        const bufferRadius = Math.max(14, ice.hazardRadiusNm * 4.2);

        return (
          <g
            key={ice.id}
            className={`ecdis-iceberg-hazard ${ice.threatLevel}`}
            transform={`translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectIceberg(ice);
            }}
            style={{ cursor: "pointer" }}
            aria-label={`${ice.designation} (${ice.threatLevel.toUpperCase()} Risk)`}
          >
            {/* Safety Clearance Exclusion Buffer Zone */}
            <circle
              r={bufferRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHighThreat ? "1.4" : "0.9"}
              strokeDasharray={isHighThreat ? "4 3" : "2 2"}
              opacity={isSelected ? 0.9 : 0.6}
            />

            {/* Faceted Geometric Ice Crystal Polygon */}
            <polygon
              points={
                ice.type === "tabular"
                  ? "-10,-6 10,-6 12,6 -12,6"
                  : ice.type === "pinnacle"
                  ? "0,-10 8,6 -8,6"
                  : "-6,-4 0,-7 6,-4 4,6 -4,6"
              }
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              filter={isHighThreat ? "url(#ecdisRedGlow)" : undefined}
            />

            {/* Drift Kinematic Vector Arrow */}
            <g transform={`rotate(${ice.driftHeadingDegrees})`}>
              <line x1="0" y1="0" x2="0" y2="-18" stroke={strokeColor} strokeWidth="1.2" strokeDasharray="2 2" />
              <polygon points="0,-21 -2.5,-16 2.5,-16" fill={strokeColor} />
            </g>

            {/* Compact Designation Tag */}
            <g transform="translate(10, -10)">
              <rect
                x="-3"
                y="-7"
                width={isHighThreat ? "52" : "42"}
                height="14"
                rx="2"
                fill="rgba(10, 15, 25, 0.9)"
                stroke={strokeColor}
                strokeWidth="0.8"
              />
              <text x="1" y="3" fill={strokeColor} fontSize="7" fontFamily="monospace" fontWeight="bold">
                {isHighThreat ? "⚠️ " : ""}
                {ice.designation.replace("Iceberg ", "").split(" ")[0]}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
