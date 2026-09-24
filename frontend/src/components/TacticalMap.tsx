import { useState } from "react";
import type {
  VesselState,
  IcebergHazard,
  NavigationRoute,
  Waypoint,
  MapLayerConfig,
} from "../types/navigation";

interface TacticalMapProps {
  vessel: VesselState;
  icebergs: IcebergHazard[];
  recommendedRoute: NavigationRoute;
  hazardRoute: NavigationRoute;
  selectedWaypoint: Waypoint | null;
  onSelectWaypoint: (wp: Waypoint | null) => void;
  selectedIceberg: IcebergHazard | null;
  onSelectIceberg: (ice: IcebergHazard | null) => void;
}

export function TacticalMap({
  vessel,
  icebergs,
  recommendedRoute,
  hazardRoute,
  selectedWaypoint,
  onSelectWaypoint,
  selectedIceberg,
  onSelectIceberg,
}: TacticalMapProps) {
  const [layers, setLayers] = useState<MapLayerConfig>({
    showIceDensity: true,
    showIcebergs: true,
    showRecommendedRoute: true,
    showHazardRoute: true,
    showRangeRings: true,
    showRadarSweep: true,
    showBathymetry: true,
    showWind: false,
    showCurrent: false,
  });

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeInspector, setActiveInspector] = useState<"vessel" | "iceberg" | "waypoint" | null>(null);

  const toggleLayer = (layerKey: keyof MapLayerConfig) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Convert geographic coordinates (Lat -64 to -67, Lng -62 to -66) to SVG viewbox coordinates (width: 900, height: 560)
  const minLat = -67.0;
  const maxLat = -64.4;
  const minLng = -66.0;
  const maxLng = -62.0;

  const projectToSvg = (lat: number, lng: number): { x: number; y: number } => {
    const normX = (lng - minLng) / (maxLng - minLng);
    const normY = (maxLat - lat) / (maxLat - minLat); // Invert Y for SVG coordinates
    return {
      x: 100 + normX * 700,
      y: 60 + normY * 440,
    };
  };

  const shipPos = projectToSvg(vessel.position.lat, vessel.position.lng);

  // Generate SVG path for routes
  const generateRouteSvgPath = (route: NavigationRoute): string => {
    if (route.waypoints.length === 0) return "";
    return route.waypoints
      .map((wp, idx) => {
        const pt = projectToSvg(wp.coord.lat, wp.coord.lng);
        return `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <section className="command-map-card">
      <div className="map-card-header">
        <div className="map-title-section">
          <span className="radar-live-dot"></span>
          <h2>TACTICAL ANTARCTIC NAVIGATION MAP</h2>
          <span className="map-sector-badge">SECTOR: GERLACHE STRAIT / WEDDELL BASIN</span>
        </div>

        <div className="map-layer-controls">
          <button
            type="button"
            className={`layer-btn ${layers.showRecommendedRoute ? "active-cyan" : ""}`}
            onClick={() => toggleLayer("showRecommendedRoute")}
            title="Toggle AI Recommended Route"
          >
            <span className="layer-indicator line-cyan"></span> AI Route
          </button>
          <button
            type="button"
            className={`layer-btn ${layers.showHazardRoute ? "active-red" : ""}`}
            onClick={() => toggleLayer("showHazardRoute")}
            title="Toggle Direct High Risk Hazard Path"
          >
            <span className="layer-indicator line-red"></span> Hazard Path
          </button>
          <button
            type="button"
            className={`layer-btn ${layers.showIcebergs ? "active-amber" : ""}`}
            onClick={() => toggleLayer("showIcebergs")}
            title="Toggle Iceberg Radar Signatures"
          >
            🧊 Icebergs ({icebergs.length})
          </button>
          <button
            type="button"
            className={`layer-btn ${layers.showIceDensity ? "active-blue" : ""}`}
            onClick={() => toggleLayer("showIceDensity")}
            title="Toggle Pack Ice Concentration Field"
          >
            ❄️ Ice Field
          </button>
          <button
            type="button"
            className={`layer-btn ${layers.showRadarSweep ? "active-green" : ""}`}
            onClick={() => toggleLayer("showRadarSweep")}
            title="Toggle Polar Radar Sweep"
          >
            📡 Radar
          </button>
          <button
            type="button"
            className={`layer-btn ${layers.showWind ? "active-blue" : ""}`}
            onClick={() => toggleLayer("showWind")}
            title="Toggle Wind Vectors"
          >
            💨 Wind
          </button>
          <button
            type="button"
            className={`layer-btn ${layers.showCurrent ? "active-indigo" : ""}`}
            onClick={() => toggleLayer("showCurrent")}
            title="Toggle Ocean Currents"
          >
            🌊 Currents
          </button>
        </div>
      </div>

      <div className="map-viewport-wrapper">
        <svg
          viewBox="0 0 900 560"
          className="tactical-map-svg"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
        >
          <defs>
            {/* Ice field gradient patterns */}
            <radialGradient id="heavyIceGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="icebergThreatGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>

            <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radar beam gradient */}
            <linearGradient id="radarBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
              <stop offset="80%" stopColor="rgba(56, 189, 248, 0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Map Base Background */}
          <rect width="900" height="560" className="map-base-rect" fill="#070c18" />

          {/* Coordinate Grid Lines */}
          <g className="map-grid-lines" stroke="rgba(56, 189, 248, 0.12)" strokeWidth="1" strokeDasharray="3 4">
            {/* Longitude lines */}
            <line x1="160" y1="20" x2="160" y2="540" />
            <line x1="320" y1="20" x2="320" y2="540" />
            <line x1="480" y1="20" x2="480" y2="540" />
            <line x1="640" y1="20" x2="640" y2="540" />
            <line x1="800" y1="20" x2="800" y2="540" />

            {/* Latitude lines */}
            <line x1="30" y1="90" x2="870" y2="90" />
            <line x1="30" y1="200" x2="870" y2="200" />
            <line x1="30" y1="310" x2="870" y2="310" />
            <line x1="30" y1="420" x2="870" y2="420" />
            <line x1="30" y1="520" x2="870" y2="520" />
          </g>

          {/* Coordinate Labels */}
          <g className="map-grid-labels" fill="rgba(148, 163, 184, 0.6)" fontSize="10" fontFamily="monospace">
            <text x="165" y="35">65°30'W</text>
            <text x="325" y="35">64°45'W</text>
            <text x="485" y="35">64°00'W</text>
            <text x="645" y="35">63°15'W</text>
            <text x="805" y="35">62°30'W</text>

            <text x="40" y="95">64°30'S</text>
            <text x="40" y="205">65°00'S</text>
            <text x="40" y="315">65°30'S</text>
            <text x="40" y="425">66°00'S</text>
            <text x="40" y="525">66°30'S</text>
          </g>

          {/* Antarctic Landmass / Shelf Outlines */}
          <g className="antarctic-landmass" fill="rgba(30, 41, 59, 0.7)" stroke="rgba(71, 85, 105, 0.5)" strokeWidth="1.5">
            {/* Graham Coastline */}
            <path d="M 680,20 Q 720,100 750,180 T 820,320 Q 860,420 890,560 L 900,560 L 900,20 Z" />
            <text x="760" y="120" fill="rgba(148, 163, 184, 0.4)" fontSize="12" fontWeight="600" letterSpacing="2">GRAHAM LAND</text>

            {/* Palmer Archipelago Islands */}
            <path d="M 120,40 Q 160,70 180,120 T 160,200 Q 130,240 100,220 T 90,120 Z" />
            <text x="110" y="140" fill="rgba(148, 163, 184, 0.4)" fontSize="10" letterSpacing="1">ANVERS ISLAND</text>

            <path d="M 140,290 Q 200,340 220,420 T 170,490 Q 120,470 110,380 Z" />
            <text x="135" y="400" fill="rgba(148, 163, 184, 0.4)" fontSize="10" letterSpacing="1">RENAUD ISLAND</text>
          </g>

          {/* Pack Ice Concentration Overlay */}
          {layers.showIceDensity && (
            <g className="pack-ice-zones">
              {/* High risk ice pack in eastern sound */}
              <ellipse cx="610" cy="220" rx="140" ry="90" fill="url(#heavyIceGradient)" />
              <ellipse cx="540" cy="330" rx="120" ry="80" fill="url(#heavyIceGradient)" />
              <text x="560" y="225" fill="#38bdf8" fontSize="10" opacity="0.75" fontFamily="monospace">
                ❄️ PACK ICE CONCENTRATION 8/10 (1.8m)
              </text>
            </g>
          )}

          {/* Direct Hazard Route (Dashed Crimson) */}
          {layers.showHazardRoute && (
            <g className="route-hazard-layer">
              <path
                d={generateRouteSvgPath(hazardRoute)}
                fill="none"
                stroke="#f87171"
                strokeWidth="2.5"
                strokeDasharray="6 6"
                filter="url(#redGlow)"
              />
              <g className="hazard-warning-tag" transform="translate(560, 260)">
                <rect x="-8" y="-12" width="130" height="24" rx="4" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" strokeWidth="1" />
                <text x="4" y="4" fill="#fca5a5" fontSize="10" fontWeight="bold">⚠️ DIRECT ICE HAZARD</text>
              </g>
            </g>
          )}

          {/* AI Recommended Route (Glowing Cyan) */}
          {layers.showRecommendedRoute && (
            <g className="route-recommended-layer">
              {/* Glow underline */}
              <path
                d={generateRouteSvgPath(recommendedRoute)}
                fill="none"
                stroke="url(#routeGlow)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#cyanGlow)"
              />
              {/* Inner crisp line */}
              <path
                d={generateRouteSvgPath(recommendedRoute)}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="8 4"
              />

              {/* Waypoints along recommended route */}
              {recommendedRoute.waypoints.map((wp) => {
                const pt = projectToSvg(wp.coord.lat, wp.coord.lng);
                const isSelected = selectedWaypoint?.id === wp.id;

                return (
                  <g
                    key={wp.id}
                    className="waypoint-marker"
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => {
                      onSelectWaypoint(isSelected ? null : wp);
                      setActiveInspector("waypoint");
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      r={isSelected ? "10" : "6"}
                      fill={isSelected ? "#00f0ff" : "#0284c7"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      r={isSelected ? "18" : "11"}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.8"
                    />
                    <text
                      x="12"
                      y="4"
                      fill="#e2e8f0"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="waypoint-label"
                    >
                      {wp.name.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Range Rings Centered on Ship A */}
          {layers.showRangeRings && (
            <g className="range-rings-layer" transform={`translate(${shipPos.x}, ${shipPos.y})`}>
              <circle r="45" fill="none" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="1" strokeDasharray="3 3" />
              <text x="48" y="-5" fill="rgba(56, 189, 248, 0.5)" fontSize="9" fontFamily="monospace">5 NM</text>

              <circle r="90" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
              <text x="93" y="-5" fill="rgba(56, 189, 248, 0.4)" fontSize="9" fontFamily="monospace">10 NM</text>

              <circle r="160" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1" strokeDasharray="5 5" />
              <text x="163" y="-5" fill="rgba(56, 189, 248, 0.35)" fontSize="9" fontFamily="monospace">20 NM</text>
            </g>
          )}

          {/* Polar Radar Sweep Animation */}
          {layers.showRadarSweep && (
            <g className="radar-sweep-group" transform={`translate(${shipPos.x}, ${shipPos.y})`}>
              <path
                d="M 0 0 L 140 -80 A 160 160 0 0 1 160 0 Z"
                fill="url(#radarBeam)"
                className="radar-sweeper"
              />
            </g>
          )}

          {/* Wind Vectors */}
          {layers.showWind && (
            <g className="wind-layer" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6">
              {[...Array(20)].map((_, i) => {
                const x = 100 + (i % 5) * 150;
                const y = 80 + Math.floor(i / 5) * 100;
                const angle = 270; // Simulate prevailing westerlies
                return (
                  <g key={`wind-${i}`} transform={`translate(${x},${y}) rotate(${angle})`}>
                    <line x1="0" y1="0" x2="30" y2="0" />
                    <line x1="25" y1="-5" x2="30" y2="0" />
                    <line x1="25" y1="5" x2="30" y2="0" />
                  </g>
                );
              })}
            </g>
          )}

          {/* Ocean Currents */}
          {layers.showCurrent && (
            <g className="current-layer" stroke="#818cf8" strokeWidth="2" opacity="0.5">
              {[...Array(15)].map((_, i) => {
                const x = 120 + (i % 5) * 160;
                const y = 90 + Math.floor(i / 5) * 120;
                const angle = y < 280 ? 270 : 135; // Match our demo data pattern
                return (
                  <g key={`curr-${i}`} transform={`translate(${x},${y}) rotate(${angle})`}>
                    <path d="M 0,0 Q 15,-10 30,0 T 60,0" fill="none" />
                    <polygon points="60,0 55,-4 55,4" fill="#818cf8" />
                  </g>
                );
              })}
            </g>
          )}

          {/* Iceberg Hazards */}
          {layers.showIcebergs && (
            <g className="icebergs-layer">
              {icebergs.map((ice) => {
                const pos = projectToSvg(ice.position.lat, ice.position.lng);
                const isSelected = selectedIceberg?.id === ice.id;
                const hazardRadiusPx = ice.hazardRadiusNm * 9;

                return (
                  <g
                    key={ice.id}
                    className="iceberg-marker-group"
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      onSelectIceberg(isSelected ? null : ice);
                      setActiveInspector("iceberg");
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Proximity Threat Perimeter */}
                    <circle
                      r={hazardRadiusPx}
                      fill="url(#icebergThreatGrad)"
                      stroke={ice.threatLevel === "high" ? "#ef4444" : "#f59e0b"}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="threat-circle"
                    />

                    {/* Drift Vector Arrow */}
                    <g transform={`rotate(${ice.driftHeadingDegrees})`}>
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="-26"
                        stroke="#f87171"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                      <polygon points="0,-28 -4,-20 4,-20" fill="#f87171" />
                    </g>

                    {/* Iceberg Physical Marker */}
                    <rect
                      x="-10"
                      y="-8"
                      width="20"
                      height="16"
                      rx="3"
                      fill="#e0f2fe"
                      stroke={isSelected ? "#38bdf8" : "#94a3b8"}
                      strokeWidth="2"
                    />
                    <text x="-7" y="4" fontSize="11">🧊</text>

                    {/* Iceberg Designation Tag */}
                    <g transform="translate(14, -6)">
                      <rect x="-2" y="-10" width="95" height="18" rx="3" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(248, 113, 113, 0.4)" strokeWidth="1" />
                      <text x="4" y="3" fill="#fecaca" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        {ice.designation.split(" ")[0]} ({ice.driftSpeedKnots}kt)
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Ship A (Vessel) Marker */}
          <g
            className="vessel-marker-group"
            transform={`translate(${shipPos.x}, ${shipPos.y})`}
            onClick={() => setActiveInspector("vessel")}
            style={{ cursor: "pointer" }}
          >
            {/* Animated Pulse Waves */}
            <circle r="22" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="vessel-ping" />
            <circle r="34" fill="none" stroke="#38bdf8" strokeWidth="1" className="vessel-ping-outer" />

            {/* Heading Vector Arrow */}
            <g transform={`rotate(${vessel.headingDegrees})`}>
              <line x1="0" y1="0" x2="0" y2="-36" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 2" />
              <polygon points="0,-40 -5,-30 5,-30" fill="#38bdf8" />
            </g>

            {/* Ship Icon Badge */}
            <circle r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="2" filter="url(#cyanGlow)" />
            <text x="-7" y="5" fontSize="13">🚢</text>

            {/* Ship Live Telemetry Tag */}
            <g transform="translate(18, -14)">
              <rect x="-4" y="-12" width="130" height="26" rx="4" fill="rgba(11, 20, 38, 0.95)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="4" y="1" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
                SHIP A ({vessel.name.split(" ")[1]})
              </text>
              <text x="4" y="11" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                {vessel.speedKnots} kts · HDG {vessel.headingDegrees}°
              </text>
            </g>
          </g>
        </svg>

        {/* Tactical Map Overlay Controls (Zoom + Reset) */}
        <div className="map-view-actions">
          <button
            type="button"
            className="hud-action-btn"
            onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="hud-action-btn"
            onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
            title="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            className="hud-action-btn font-mono"
            onClick={() => setZoomLevel(1)}
            title="Reset Map Scale"
          >
            1:1
          </button>
        </div>

        {/* Tactical Map Compass Rose */}
        <div className="map-compass-rose" title="Polar Grid Alignment (True South)">
          <div className="compass-needle">
            <span className="compass-s">S</span>
            <span className="compass-arrow"></span>
            <span className="compass-n">N</span>
          </div>
        </div>

        {/* Interactive Selection Inspector Drawer */}
        {activeInspector === "waypoint" && selectedWaypoint && (
          <div className="map-inspector-card">
            <div className="inspector-header">
              <span className="inspector-title">📍 WAYPOINT TELEMETRY</span>
              <button
                type="button"
                className="inspector-close"
                onClick={() => {
                  onSelectWaypoint(null);
                  setActiveInspector(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="inspector-body">
              <p className="inspector-name">{selectedWaypoint.name}</p>
              <div className="inspector-grid">
                <span>Coordinates:</span>
                <span className="font-mono">
                  {Math.abs(selectedWaypoint.coord.lat).toFixed(2)}°S, {Math.abs(selectedWaypoint.coord.lng).toFixed(2)}°W
                </span>
                <span>Ice Concentration:</span>
                <span className="font-mono status-cyan">{selectedWaypoint.iceConcentrationTenths}/10</span>
                <span>Ice Thickness:</span>
                <span className="font-mono">{selectedWaypoint.iceThicknessMeters} m</span>
                <span>Sounding Depth:</span>
                <span className="font-mono">{selectedWaypoint.depthMeters} m</span>
                <span>ETA:</span>
                <span className="font-mono">{selectedWaypoint.estimatedArrival}</span>
              </div>
            </div>
          </div>
        )}

        {activeInspector === "iceberg" && selectedIceberg && (
          <div className="map-inspector-card">
            <div className="inspector-header">
              <span className="inspector-title">🧊 ICE HAZARD INTEL</span>
              <button
                type="button"
                className="inspector-close"
                onClick={() => {
                  onSelectIceberg(null);
                  setActiveInspector(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="inspector-body">
              <p className="inspector-name">{selectedIceberg.designation}</p>
              <div className="inspector-grid">
                <span>Threat Rating:</span>
                <span className="font-mono status-crit">{selectedIceberg.threatLevel.toUpperCase()}</span>
                <span>Dimensions:</span>
                <span className="font-mono">
                  {selectedIceberg.dimensionsKm.length} × {selectedIceberg.dimensionsKm.width} km (+{selectedIceberg.dimensionsKm.heightAboveWater}m)
                </span>
                <span>Drift Vector:</span>
                <span className="font-mono">
                  {selectedIceberg.driftSpeedKnots} kts @ {selectedIceberg.driftHeadingDegrees}°
                </span>
                <span>Hazard Perimeter:</span>
                <span className="font-mono">{selectedIceberg.hazardRadiusNm} NM</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Route Summary Bar */}
      <div className="map-footer-summary">
        <div className="summary-col">
          <span className="summary-label">ACTIVE ROUTE</span>
          <span className="summary-val status-cyan">
            {recommendedRoute.name} ({recommendedRoute.totalDistanceNm} NM)
          </span>
        </div>
        <div className="summary-col">
          <span className="summary-label">ESTIMATED TRANSIT</span>
          <span className="summary-val font-mono">{recommendedRoute.estimatedDurationHours} Hours</span>
        </div>
        <div className="summary-col">
          <span className="summary-label">COLLISION RISK REDUCTION</span>
          <span className="summary-val status-low">−72% vs Direct Channel</span>
        </div>
      </div>
    </section>
  );
}
