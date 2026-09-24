import React from "react";
import type { NavigationRoute, Waypoint } from "../../types/navigation";

interface RouteLayerProps {
  route: NavigationRoute;
  selectedWaypoint?: Waypoint | null;
  onSelectWaypoint?: (waypoint: Waypoint | null) => void;
  projectToSvg: (lat: number, lng: number) => { x: number; y: number };
}

export const RouteLayer: React.FC<RouteLayerProps> = ({
  route,
  selectedWaypoint,
  onSelectWaypoint,
  projectToSvg,
}) => {
  if (!route.waypoints || route.waypoints.length === 0) {
    return null;
  }

  const svgPath = route.waypoints
    .map((wp, idx) => {
      const pt = projectToSvg(wp.coord.lat, wp.coord.lng);
      return `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <g className="ecdis-route-layer">
      {/* Outer Cyan Halo Glow */}
      <path
        d={svgPath}
        fill="none"
        stroke="#0284c7"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
      />

      {/* Main Track Ribbon */}
      <path
        d={svgPath}
        fill="none"
        stroke="#00f0ff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ecdisCyanGlow)"
      />

      {/* Animated Centerline Dashes */}
      <path
        d={svgPath}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="8 6"
      />

      {/* Waypoint Nodes */}
      {route.waypoints.map((wp, i) => {
        const pt = projectToSvg(wp.coord.lat, wp.coord.lng);
        const isSelected = selectedWaypoint?.id === wp.id;
        const isStart = i === 0;
        const isEnd = i === route.waypoints.length - 1;

        if (isStart || isEnd) return null; // Handled by vessel & destination

        return (
          <g
            key={wp.id}
            className="ecdis-wp-node"
            transform={`translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectWaypoint?.(isSelected ? null : wp);
            }}
            style={{ cursor: "pointer" }}
            aria-label={`Waypoint ${wp.name}`}
          >
            {/* Waypoint Ring & Node */}
            <circle
              r={isSelected ? "11" : "8"}
              fill="rgba(8, 20, 36, 0.95)"
              stroke={isSelected ? "#00f0ff" : "#38bdf8"}
              strokeWidth={isSelected ? "2.2" : "1.4"}
            />
            <circle r="3" fill={isSelected ? "#00f0ff" : "#ffffff"} />

            {/* Tactical Label Badge */}
            <g transform="translate(10, -8)">
              <rect
                x="-2"
                y="-6"
                width="34"
                height="13"
                rx="2"
                fill="rgba(10, 18, 32, 0.88)"
                stroke="#38bdf8"
                strokeWidth="0.8"
              />
              <text x="3" y="3" fill="#38bdf8" fontSize="7" fontFamily="monospace" fontWeight="bold">
                {`W${i}`}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};
