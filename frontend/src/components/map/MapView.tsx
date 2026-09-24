import React, { useState, useCallback } from "react";
import type { IcebergHazard, Waypoint } from "../../types/navigation";
import { useMapData } from "../../hooks/useMapData";
import { VesselLayer } from "./VesselLayer";
import { IcebergLayer } from "./IcebergLayer";
import { RouteLayer } from "./RouteLayer";
import { DestinationMarker } from "./DestinationMarker";
import { LayerControl } from "./LayerControl";
import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";
import { SelectedVessel } from "./SelectedVessel";

interface MapViewProps {
  onSpeedChange?: (speed: number) => void;
}

export const MapView: React.FC<MapViewProps> = ({ onSpeedChange }) => {
  const {
    vessels,
    selectedVessel,
    selectedVesselId,
    selectVessel,
    icebergs,
    route,
    destination,
    layers,
    toggleLayer,
  } = useMapData();

  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [selectedWaypoint, setSelectedWaypoint] = useState<Waypoint | null>(null);
  const [selectedIceberg, setSelectedIceberg] = useState<IcebergHazard | null>(null);
  const [activeInspector, setActiveInspector] = useState<"none" | "vessel" | "iceberg" | "waypoint" | "destination">("none");

  // Polar stereographic projection mapping (Weddell Sea & South Orkney Sector)
  const projectToSvg = useCallback(
    (lat: number, lng: number): { x: number; y: number } => {
      const minLat = -62.6;
      const maxLat = -59.0;
      const minLng = -48.2;
      const maxLng = -37.0;

      const svgWidth = 1200;
      const svgHeight = 780;

      const normX = (lng - minLng) / (maxLng - minLng);
      const normY = (maxLat - lat) / (maxLat - minLat);

      const centerX = svgWidth / 2;
      const centerY = svgHeight / 2;

      const rawX = normX * (svgWidth - 160) + 80;
      const rawY = normY * (svgHeight - 140) + 70;

      const x = centerX + (rawX - centerX) * zoomLevel;
      const y = centerY + (rawY - centerY) * zoomLevel;

      return { x, y };
    },
    [zoomLevel]
  );

  const handleSelectVessel = (vesselId: string) => {
    selectVessel(vesselId);
    setActiveInspector("vessel");
  };

  const handleSelectIceberg = (iceberg: IcebergHazard) => {
    setSelectedIceberg(iceberg);
    setActiveInspector("iceberg");
  };

  const handleSelectWaypoint = (wp: Waypoint | null) => {
    setSelectedWaypoint(wp);
    setActiveInspector(wp ? "waypoint" : "none");
  };

  return (
    <div className="ecdis-map-engine-root" role="main" aria-label="Antarctic Tactical Map Engine">
      {/* ── Top Layer Control Bar ───────────────────────────────────────── */}
      <LayerControl layers={layers} onToggleLayer={toggleLayer} />

      <div className="ecdis-map-canvas-container">
        {/* ── Left Selected Vessel Side Panel ───────────────────────────── */}
        <SelectedVessel
          vessel={selectedVessel}
          allVessels={vessels}
          onSelectVessel={handleSelectVessel}
          onSpeedChange={onSpeedChange}
        />

        {/* ── Main SVG Polar ECDIS Chart ─────────────────────────────────── */}
        <div className="ecdis-svg-viewport">
          <svg
            viewBox="0 0 1200 780"
            className="ecdis-svg-canvas"
            xmlns="http://www.w3.org/2000/svg"
            onClick={() => setActiveInspector("none")}
          >
            <defs>
              <radialGradient id="ecdisOceanGrad" cx="50%" cy="50%" r="75%">
                <stop offset="0%" stopColor="#040b18" />
                <stop offset="60%" stopColor="#020813" />
                <stop offset="100%" stopColor="#01040a" />
              </radialGradient>

              <filter id="ecdisCyanGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="ecdisRedGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4.0" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="ecdisGreenGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Ocean Base Layer */}
            <rect width="1200" height="780" fill="url(#ecdisOceanGrad)" />

            {/* Polar Nautical Bathymetric Contours */}
            {layers.bathymetry && (
              <g className="ecdis-bathymetry-contours" opacity="0.4">
                <path
                  d="M 50,720 Q 320,540 600,600 T 1150,520"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                />
                <text x="70" y="715" fill="#0284c7" fontSize="8" fontFamily="monospace">
                  -500m (South Orkney Shelf)
                </text>

                <path
                  d="M 50,480 Q 400,320 780,380 T 1150,280"
                  fill="none"
                  stroke="#0369a1"
                  strokeWidth="1"
                  strokeDasharray="6 4"
                />
                <text x="70" y="475" fill="#0369a1" fontSize="8" fontFamily="monospace">
                  -2000m (Abyssal Plain)
                </text>

                <path
                  d="M 50,240 Q 450,150 820,200 T 1150,110"
                  fill="none"
                  stroke="#075985"
                  strokeWidth="0.8"
                />
                <text x="70" y="235" fill="#075985" fontSize="8" fontFamily="monospace">
                  -3500m (Weddell Deep Trench)
                </text>
              </g>
            )}

            {/* Polar Graticule Coordinate Lines */}
            <g className="ecdis-graticules" opacity="0.25">
              {[59.5, 60.0, 60.5, 61.0, 61.5, 62.0].map((lat) => {
                const pt = projectToSvg(lat, -45.0);
                return (
                  <g key={`lat-${lat}`}>
                    <line x1="40" y1={pt.y} x2="1160" y2={pt.y} stroke="#38bdf8" strokeWidth="0.5" />
                    <text x="1165" y={pt.y + 3} fill="#64748b" fontSize="8" fontFamily="monospace">
                      {lat.toFixed(1)}°S
                    </text>
                  </g>
                );
              })}
              {[-47.0, -45.0, -43.0, -41.0, -39.0].map((lng) => {
                const pt = projectToSvg(-60.5, lng);
                return (
                  <g key={`lng-${lng}`}>
                    <line x1={pt.x} y1="40" x2={pt.x} y2="740" stroke="#38bdf8" strokeWidth="0.5" />
                    <text x={pt.x - 14} y="760" fill="#64748b" fontSize="8" fontFamily="monospace">
                      {Math.abs(lng).toFixed(0)}°W
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 1. Recommended Route Layer */}
            {layers.routes && (
              <RouteLayer
                route={route}
                selectedWaypoint={selectedWaypoint}
                onSelectWaypoint={handleSelectWaypoint}
                projectToSvg={projectToSvg}
              />
            )}

            {/* 2. Destination Marker */}
            <DestinationMarker
              destination={destination}
              onClick={() => setActiveInspector("destination")}
              projectToSvg={projectToSvg}
            />

            {/* 3. Iceberg Hazards Layer */}
            {layers.icebergs && (
              <IcebergLayer
                icebergs={icebergs}
                selectedIcebergId={selectedIceberg?.id}
                onSelectIceberg={handleSelectIceberg}
                projectToSvg={projectToSvg}
              />
            )}

            {/* 4. Vessels AIS Layer */}
            {layers.vessels && (
              <VesselLayer
                vessels={vessels}
                selectedVesselId={selectedVesselId}
                onSelectVessel={handleSelectVessel}
                projectToSvg={projectToSvg}
              />
            )}
          </svg>

          {/* ── Viewport Controls & Polar Rose ──────────────────────────── */}
          <MapControls
            zoomLevel={zoomLevel}
            onZoomIn={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
            onZoomOut={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
            onResetZoom={() => setZoomLevel(1.0)}
          />

          {/* ── Accessible Symbology Legend ──────────────────────────────── */}
          <MapLegend />

          {/* ── Floating Tactical Inspector Card ────────────────────────── */}
          {activeInspector === "iceberg" && selectedIceberg && (
            <div className="ecdis-floating-inspector">
              <div className="inspector-top-bar">
                <span className="inspector-badge">🧊 ICE HAZARD RADAR PROFILE</span>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setActiveInspector("none")}
                >
                  ✕
                </button>
              </div>
              <div className="inspector-content">
                <p className="inspector-lead">{selectedIceberg.designation}</p>
                <div className="inspector-key-values font-mono">
                  <span>Threat Rating:</span>
                  <span className={selectedIceberg.threatLevel === "high" ? "text-red" : "text-amber"}>
                    {selectedIceberg.threatLevel.toUpperCase()} RISK
                  </span>
                  <span>Kinematic Drift:</span>
                  <span>{selectedIceberg.driftSpeedKnots} kts @ {selectedIceberg.driftHeadingDegrees}° TRUE</span>
                  <span>Safety Buffer:</span>
                  <span>{selectedIceberg.hazardRadiusNm} NM Exclusion Radius</span>
                </div>
              </div>
            </div>
          )}

          {activeInspector === "waypoint" && selectedWaypoint && (
            <div className="ecdis-floating-inspector">
              <div className="inspector-top-bar">
                <span className="inspector-badge">📍 ROUTE WAYPOINT INTEL</span>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => {
                    setSelectedWaypoint(null);
                    setActiveInspector("none");
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="inspector-content">
                <p className="inspector-lead">{selectedWaypoint.name}</p>
                <div className="inspector-key-values font-mono">
                  <span>Coordinates:</span>
                  <span>{Math.abs(selectedWaypoint.coord.lat).toFixed(2)}°S, {Math.abs(selectedWaypoint.coord.lng).toFixed(2)}°W</span>
                  <span>Ice Concentration:</span>
                  <span className="text-cyan">{selectedWaypoint.iceConcentrationTenths}/10 Pack</span>
                  <span>Sounding Depth:</span>
                  <span>{selectedWaypoint.depthMeters} m</span>
                  <span>Estimated Arrival:</span>
                  <span className="text-green">{selectedWaypoint.estimatedArrival}</span>
                </div>
              </div>
            </div>
          )}

          {activeInspector === "destination" && (
            <div className="ecdis-floating-inspector">
              <div className="inspector-top-bar">
                <span className="inspector-badge">🎯 TARGET DESTINATION INTEL</span>
                <button
                  type="button"
                  className="inspector-close-btn"
                  onClick={() => setActiveInspector("none")}
                >
                  ✕
                </button>
              </div>
              <div className="inspector-content">
                <p className="inspector-lead">{destination.name}</p>
                <div className="inspector-key-values font-mono">
                  <span>Position:</span>
                  <span>{Math.abs(destination.lat).toFixed(2)}°S, {Math.abs(destination.lng).toFixed(2)}°W</span>
                  <span>Status:</span>
                  <span className="text-green">{destination.status}</span>
                  <span>Total Voyage Distance:</span>
                  <span className="text-cyan">{route.totalDistanceNm} NM</span>
                  <span>Estimated Passage:</span>
                  <span>{route.estimatedDurationHours} Hours</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom HUD Summary Strip ────────────────────────────────────── */}
      <div className="ecdis-bottom-summary-bar font-mono">
        <div className="summary-metric-block">
          <span className="metric-tag">RECOMMENDED PASSAGE</span>
          <span className="metric-data text-cyan">
            {selectedVessel.name.split(" (")[0]} ──→ {destination.name.split(" (")[0]} ({route.totalDistanceNm} NM)
          </span>
        </div>
        <div className="summary-metric-block">
          <span className="metric-tag">PASSAGE DURATION</span>
          <span className="metric-data">{route.estimatedDurationHours} Hours (@ {selectedVessel.speedKnots.toFixed(1)} kts)</span>
        </div>
        <div className="summary-metric-block">
          <span className="metric-tag">DECISION-SUPPORT STATUS</span>
          <span className="metric-data text-green">
            Simulated Polar Navigation Dataset Loaded (3 Vessels · 12 Icebergs)
          </span>
        </div>
      </div>
    </div>
  );
};
