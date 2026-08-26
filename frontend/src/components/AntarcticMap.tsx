import { useState, useEffect } from "react";
import type {
  VesselState,
  IcebergHazard,
  NavigationRoute,
  Waypoint,
} from "../types/navigation";
import {
  fetchVessels,
  fetchIcebergs,
  fetchDemoRoute,
  fetchRiskGrid,
  fetchTemporalForecast,
  type RiskGridCell,
} from "../api/client";
import {
  initialVessel,
  mockNearbyVessel,
  mockIcebergs,
  recommendedRoute as defaultRecommendedRoute,
  directHazardRoute,
} from "../data/mockNavigationData";

export interface ExtendedMapLayerConfig {
  showIceDensity: boolean;
  showIcebergs: boolean;
  showRecommendedRoute: boolean;
  showHazardRoute: boolean;
  showRangeRings: boolean;
  showRadarSweep: boolean;
  showRiskGrid: boolean;
  showBathymetry: boolean;
}

interface AntarcticMapProps {
  vessel?: VesselState;
  recommendedRoute?: NavigationRoute;
  selectedWaypoint?: Waypoint | null;
  onSelectWaypoint?: (wp: Waypoint | null) => void;
  selectedIceberg?: IcebergHazard | null;
  onSelectIceberg?: (ice: IcebergHazard | null) => void;
}

export function AntarcticMap({
  vessel: propVessel,
  recommendedRoute: propRoute,
  selectedWaypoint: propSelectedWp,
  onSelectWaypoint: propOnSelectWp,
  selectedIceberg: propSelectedIce,
  onSelectIceberg: propOnSelectIce,
}: AntarcticMapProps) {
  const [layers, setLayers] = useState<ExtendedMapLayerConfig>({
    showIceDensity: true,
    showIcebergs: true,
    showRecommendedRoute: true,
    showHazardRoute: true,
    showRangeRings: true,
    showRadarSweep: true,
    showRiskGrid: false,
    showBathymetry: true,
  });

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeInspector, setActiveInspector] = useState<"vessel" | "vesselB" | "iceberg" | "waypoint" | "destination" | "gridCell" | null>(null);
  const [selectedCell, setSelectedCell] = useState<RiskGridCell | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);

  // Temporal Forward Forecast Simulation (+0h, +6h, +12h, +24h, +48h)
  const [forecastHours, setForecastHours] = useState<number>(0);
  const [isSimulatingForecast, setIsSimulatingForecast] = useState<boolean>(false);

  // Live or fallback state
  const [shipA, setShipA] = useState<VesselState>(propVessel || initialVessel);
  const [shipB, setShipB] = useState<VesselState>(mockNearbyVessel);
  const [icebergs, setIcebergs] = useState<IcebergHazard[]>(mockIcebergs);
  const [activeRoute, setActiveRoute] = useState<NavigationRoute>(propRoute || defaultRecommendedRoute);
  const [riskGridCells, setRiskGridCells] = useState<RiskGridCell[]>([]);

  const [localSelectedWp, setLocalSelectedWp] = useState<Waypoint | null>(null);
  const [localSelectedIce, setLocalSelectedIce] = useState<IcebergHazard | null>(null);

  const selectedWaypoint = propSelectedWp !== undefined ? propSelectedWp : localSelectedWp;
  const onSelectWaypoint = propOnSelectWp || setLocalSelectedWp;
  const selectedIceberg = propSelectedIce !== undefined ? propSelectedIce : localSelectedIce;
  const onSelectIceberg = propOnSelectIce || setLocalSelectedIce;

  // Derived display state
  const currentShipA = propVessel || shipA;
  const currentRoute = propRoute || activeRoute;

  useEffect(() => {
    let isMounted = true;
    
    // Fetch live backend telemetry
    fetchVessels()
      .then((vesselsData) => {
        if (!isMounted || !vesselsData || vesselsData.length === 0) return;
        const vA = vesselsData.find((v) => v.id === "vessel-A");
        if (vA) {
          setShipA((prev) => ({
            ...prev,
            position: { lat: vA.position.lat, lng: vA.position.lon, label: `${Math.abs(vA.position.lat)}°S, ${Math.abs(vA.position.lon)}°W` },
            headingDegrees: vA.heading,
            speedKnots: vA.speed_knots,
            destination: vA.destination,
          }));
        }
        const vB = vesselsData.find((v) => v.id === "vessel-B");
        if (vB) {
          setShipB((prev) => ({
            ...prev,
            position: { lat: vB.position.lat, lng: vB.position.lon, label: `${Math.abs(vB.position.lat)}°S, ${Math.abs(vB.position.lon)}°W` },
            headingDegrees: vB.heading,
            speedKnots: vB.speed_knots,
            destination: vB.destination,
          }));
        }
      })
      .catch(() => {});

    fetchIcebergs()
      .then((iceData) => {
        if (!isMounted || !iceData || iceData.length === 0) return;
        const mappedIcebergs: IcebergHazard[] = iceData.map((ice, idx) => {
          const centerLat = ice.polygon.reduce((sum, p) => sum + p.lat, 0) / ice.polygon.length;
          const centerLon = ice.polygon.reduce((sum, p) => sum + p.lon, 0) / ice.polygon.length;
          return {
            id: ice.id,
            designation: ice.name || `Iceberg ${ice.id}`,
            type: ice.size_class === "giant" ? "tabular" : ice.size_class === "small" ? "growler" : "pinnacle",
            position: { lat: centerLat, lng: centerLon, label: `Sector ${idx + 1}` },
            dimensionsKm: { length: 12, width: 6, heightAboveWater: 35 },
            driftSpeedKnots: 1.0,
            driftHeadingDegrees: 210,
            hazardRadiusNm: ice.size_class === "giant" ? 4.5 : 2.5,
            threatLevel: (ice.threat_level as "high" | "medium" | "low") || "medium",
          };
        });
        setIcebergs(mappedIcebergs);
      })
      .catch(() => {});

    fetchDemoRoute()
      .then((routeData) => {
        if (!isMounted || !routeData || !routeData.waypoints) return;
        const mappedRoute: NavigationRoute = {
          id: routeData.id,
          name: routeData.name,
          type: "recommended",
          totalDistanceNm: routeData.total_distance_nm,
          estimatedDurationHours: routeData.estimated_duration_hours,
          averageIceRiskScore: Math.round(routeData.average_risk_score),
          color: "#38bdf8",
          waypoints: routeData.waypoints.map((wp) => ({
            id: wp.id,
            name: wp.name,
            coord: { lat: wp.lat, lng: wp.lon },
            order: wp.order,
            iceConcentrationTenths: Math.round(wp.ice_risk_score / 10),
            iceThicknessMeters: 0.4,
            estimatedArrival: `+${wp.order * 3}h 15m`,
            depthMeters: 510,
          })),
        };
        setActiveRoute(mappedRoute);
      })
      .catch(() => {});

    fetchRiskGrid(0.35)
      .then((gridData) => {
        if (!isMounted || !gridData || !gridData.cells) return;
        setRiskGridCells(gridData.cells);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle temporal drift projection changes
  const handleForecastChange = async (hours: number) => {
    setForecastHours(hours);
    if (hours === 0) {
      const baseIce = await fetchIcebergs().catch(() => null);
      if (baseIce) {
        setIcebergs(baseIce.map((ice, idx) => ({
          id: ice.id,
          designation: ice.name || `Iceberg ${ice.id}`,
          type: ice.size_class === "giant" ? "tabular" : ice.size_class === "small" ? "growler" : "pinnacle",
          position: {
            lat: ice.polygon.reduce((sum, p) => sum + p.lat, 0) / ice.polygon.length,
            lng: ice.polygon.reduce((sum, p) => sum + p.lon, 0) / ice.polygon.length,
            label: `Sector ${idx + 1}`
          },
          dimensionsKm: { length: 12, width: 6, heightAboveWater: 35 },
          driftSpeedKnots: 1.0,
          driftHeadingDegrees: 210,
          hazardRadiusNm: ice.size_class === "giant" ? 4.5 : 2.5,
          threatLevel: (ice.threat_level as "high" | "medium" | "low") || "medium",
        })));
      }
      return;
    }

    setIsSimulatingForecast(true);
    try {
      const data = await fetchTemporalForecast(hours);
      if (data && data.icebergs) {
        const projected: IcebergHazard[] = data.icebergs.map((pIce) => ({
          id: pIce.id,
          designation: `${pIce.name}`,
          type: pIce.size_class === "giant" ? "tabular" : pIce.size_class === "small" ? "growler" : "pinnacle",
          position: {
            lat: pIce.projected_centroid.lat,
            lng: pIce.projected_centroid.lon,
            label: `Projected +${hours}h (${pIce.drift_vector.total_displacement_nm} NM)`
          },
          dimensionsKm: { length: 12, width: 6, heightAboveWater: 35 },
          driftSpeedKnots: pIce.drift_vector.speed_knots,
          driftHeadingDegrees: pIce.drift_vector.heading_degrees,
          hazardRadiusNm: pIce.size_class === "giant" ? 4.8 : 2.6,
          threatLevel: pIce.threat_level,
        }));
        setIcebergs(projected);
      }
    } finally {
      setIsSimulatingForecast(false);
    }
  };

  const toggleLayer = (layerKey: keyof ExtendedMapLayerConfig) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // Geographic bounds: Lat -62.6 to -59.2, Lng -47.8 to -37.8
  const minLat = -62.6;
  const maxLat = -59.2;
  const minLng = -47.8;
  const maxLng = -37.8;

  const projectToSvg = (lat: number, lng: number): { x: number; y: number } => {
    const normX = (lng - minLng) / (maxLng - minLng);
    const normY = (maxLat - lat) / (maxLat - minLat);
    return {
      x: 90 + Math.max(0, Math.min(1, normX)) * 820,
      y: 50 + Math.max(0, Math.min(1, normY)) * 480,
    };
  };

  const shipAPos = projectToSvg(currentShipA.position.lat, currentShipA.position.lng);
  const shipBPos = projectToSvg(shipB.position.lat, shipB.position.lng);
  const destPos = projectToSvg(-60.4, -38.5);

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
    <section className="command-map-card ecdis-glass-card">
      {/* ── Top Tactical ECDIS Header ───────────────────────────────────── */}
      <div className="ecdis-top-toolbar">
        <div className="ecdis-header-left">
          <div className="ecdis-status-indicator">
            <span className="live-beacon-ring"></span>
            <span className="live-beacon-core"></span>
          </div>
          <div className="ecdis-title-group">
            <div className="ecdis-title-row">
              <span className="ecdis-title-main">ANTARCTIC SITUATIONAL ECDIS</span>
              <span className="ecdis-classification-tag">SOLAS V/19 · POLAR CODE CAT-A</span>
            </div>
            <span className="ecdis-coordinates-meta font-mono">
              SECTOR: WEDDELL SEA / SOUTH ORKNEY · 60°12'S 045°18'W · GRID WGS-84
            </span>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="ecdis-layer-pill-group">
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showRecommendedRoute ? "active-cyan" : ""}`}
            onClick={() => toggleLayer("showRecommendedRoute")}
          >
            <span className="pill-dot dot-cyan"></span> AI Safe Corridor (A*)
          </button>
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showRiskGrid ? "active-red" : ""}`}
            onClick={() => toggleLayer("showRiskGrid")}
          >
            <span className="pill-dot dot-red"></span> 2D Risk Grid
          </button>
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showIcebergs ? "active-amber" : ""}`}
            onClick={() => toggleLayer("showIcebergs")}
          >
            <span className="pill-dot dot-amber"></span> Icebergs ({icebergs.length})
          </button>
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showIceDensity ? "active-blue" : ""}`}
            onClick={() => toggleLayer("showIceDensity")}
          >
            <span className="pill-dot dot-blue"></span> Sea Ice Fields
          </button>
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showBathymetry ? "active-indigo" : ""}`}
            onClick={() => toggleLayer("showBathymetry")}
          >
            <span className="pill-dot dot-indigo"></span> Bathymetry
          </button>
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showRadarSweep ? "active-green" : ""}`}
            onClick={() => toggleLayer("showRadarSweep")}
          >
            <span className="pill-dot dot-green"></span> Radar
          </button>
        </div>
      </div>

      {/* ── Forecast & Drift Kinematic Scrubber Bar ──────────────────────── */}
      <div className="ecdis-timeline-scrubber-bar">
        <div className="timeline-info-chip">
          <span className="timeline-icon">⏱️</span>
          <span className="timeline-title">TEMPORAL DRIFT SIMULATION:</span>
          <span className={`timeline-value font-mono ${forecastHours === 0 ? "text-green" : "text-amber"}`}>
            {forecastHours === 0 ? "T+00h (REALTIME SATELLITE OBSERVED)" : `T+${forecastHours.toString().padStart(2, "0")}h (KINEMATIC PROJECTION)`}
          </span>
          {isSimulatingForecast && <span className="simulating-tag font-mono">[COMPUTING VECTORS...]</span>}
        </div>

        <div className="timeline-step-segments">
          {[
            { hrs: 0, label: "NOW (T+0)" },
            { hrs: 6, label: "+6h" },
            { hrs: 12, label: "+12h" },
            { hrs: 24, label: "+24h" },
            { hrs: 48, label: "+48h" },
          ].map(({ hrs, label }) => (
            <button
              key={hrs}
              type="button"
              className={`timeline-step-btn ${forecastHours === hrs ? "active-step" : ""}`}
              onClick={() => handleForecastChange(hrs)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Tactical SVG Map Canvas ─────────────────────────────────── */}
      <div className="ecdis-viewport-container">
        <svg
          viewBox="0 0 1000 580"
          className="ecdis-svg-canvas"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
        >
          <defs>
            {/* Ocean Depth Gradient */}
            <radialGradient id="polarOceanDeep" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0a152e" />
              <stop offset="60%" stopColor="#060c1d" />
              <stop offset="100%" stopColor="#030610" />
            </radialGradient>

            {/* Pack Ice Concentration Gradients */}
            <radialGradient id="heavyPackIce" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="65%" stopColor="#0284c7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            {/* Iceberg Threat Halo */}
            <radialGradient id="icebergGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#f87171" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* AI Corridor Glow Filter */}
            <filter id="ecdisCyanGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="ecdisGreenGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear Radar Sweep Beam */}
            <linearGradient id="ecdisRadarBeam" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
              <stop offset="85%" stopColor="rgba(56, 189, 248, 0.03)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Deep Bathymetric Ocean Base */}
          <rect width="1000" height="580" fill="url(#polarOceanDeep)" />

          {/* Bathymetry Depth Contours & Shelf Lines */}
          {layers.showBathymetry && (
            <g className="bathymetry-layer" opacity="0.6">
              {/* Continental Slope Isobaths */}
              <path
                d="M 50,110 Q 300,160 520,130 T 950,90"
                fill="none"
                stroke="rgba(30, 58, 110, 0.4)"
                strokeWidth="1.2"
                strokeDasharray="6 8"
              />
              <text x="80" y="105" fill="rgba(100, 149, 237, 0.4)" fontSize="8" fontFamily="monospace">
                -500m ISOBATH (SOUTH ORKNEY SHELF)
              </text>

              <path
                d="M 50,310 Q 380,390 640,340 T 950,290"
                fill="none"
                stroke="rgba(30, 58, 110, 0.35)"
                strokeWidth="1.2"
                strokeDasharray="4 6"
              />
              <text x="80" y="305" fill="rgba(100, 149, 237, 0.35)" fontSize="8" fontFamily="monospace">
                -2,000m ABYSSAL PLAIN CONTOUR
              </text>

              <path
                d="M 50,470 Q 420,520 720,480 T 950,440"
                fill="none"
                stroke="rgba(30, 58, 110, 0.3)"
                strokeWidth="1"
              />
              <text x="80" y="465" fill="rgba(100, 149, 237, 0.3)" fontSize="8" fontFamily="monospace">
                -3,500m WEDDELL DEEP TRENCH
              </text>
            </g>
          )}

          {/* Graticule Longitude & Latitude Lines */}
          <g className="ecdis-graticule" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1">
            <line x1="150" y1="30" x2="150" y2="550" strokeDasharray="3 6" />
            <line x1="320" y1="30" x2="320" y2="550" strokeDasharray="3 6" />
            <line x1="490" y1="30" x2="490" y2="550" strokeDasharray="3 6" />
            <line x1="660" y1="30" x2="660" y2="550" strokeDasharray="3 6" />
            <line x1="830" y1="30" x2="830" y2="550" strokeDasharray="3 6" />

            <line x1="40" y1="100" x2="960" y2="100" strokeDasharray="3 6" />
            <line x1="40" y1="210" x2="960" y2="210" strokeDasharray="3 6" />
            <line x1="40" y1="320" x2="960" y2="320" strokeDasharray="3 6" />
            <line x1="40" y1="430" x2="960" y2="430" strokeDasharray="3 6" />
          </g>

          {/* Graticule Text Coordinates */}
          <g className="ecdis-graticule-labels" fill="rgba(148, 163, 184, 0.45)" fontSize="9" fontFamily="monospace">
            <text x="155" y="45">46°00'W</text>
            <text x="325" y="45">44°00'W</text>
            <text x="495" y="45">42°00'W</text>
            <text x="665" y="45">40°00'W</text>
            <text x="835" y="45">38°00'W</text>

            <text x="50" y="105">59°30'S</text>
            <text x="50" y="215">60°15'S</text>
            <text x="50" y="325">61°00'S</text>
            <text x="50" y="435">61°45'S</text>
          </g>

          {/* ── 2D Spatial Risk Heatmap Layer ───────────────────────────────── */}
          {layers.showRiskGrid && (
            <g className="ecdis-risk-grid-layer">
              {riskGridCells.map((cell, idx) => {
                const pt = projectToSvg(cell.lat, cell.lon);
                const isCritical = cell.risk_score >= 0.8;
                const isHazard = cell.risk_score >= 0.5 && cell.risk_score < 0.8;
                const fillColor = isCritical
                  ? "rgba(239, 68, 68, 0.35)"
                  : isHazard
                  ? "rgba(245, 158, 11, 0.22)"
                  : "rgba(56, 189, 248, 0.08)";
                const strokeColor = isCritical ? "#ef4444" : isHazard ? "#f59e0b" : "rgba(56, 189, 248, 0.2)";

                return (
                  <g
                    key={idx}
                    transform={`translate(${pt.x - 14}, ${pt.y - 14})`}
                    onClick={() => {
                      setSelectedCell(cell);
                      setActiveInspector("gridCell");
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect width="28" height="28" fill={fillColor} stroke={strokeColor} strokeWidth="0.8" rx="3" />
                    <text x="14" y="17" fill="#e2e8f0" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.8">
                      {Math.round(cell.risk_score * 100)}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Sea Ice Fields & Lead Corridors */}
          {layers.showIceDensity && (
            <g className="ecdis-sea-ice-fields">
              <ellipse cx="540" cy="180" rx="140" ry="75" fill="url(#heavyPackIce)" />
              <ellipse cx="680" cy="330" rx="160" ry="95" fill="url(#heavyPackIce)" />
              <text x="490" y="185" fill="#38bdf8" fontSize="9" opacity="0.6" fontFamily="monospace" letterSpacing="0.08em">
                ❄️ PACK ICE (6-7/10 CONCENTRATION)
              </text>
            </g>
          )}

          {/* Direct Hazard Route Line (Dashed Warning Corridor) */}
          {layers.showHazardRoute && (
            <g className="ecdis-hazard-route">
              <path
                d={generateRouteSvgPath(directHazardRoute)}
                fill="none"
                stroke="#f87171"
                strokeWidth="2"
                strokeDasharray="6 6"
                opacity="0.6"
              />
              <g transform="translate(480, 275)">
                <rect x="-8" y="-10" width="130" height="20" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(239, 68, 68, 0.5)" strokeWidth="1" />
                <text x="5" y="4" fill="#fca5a5" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                  ⚠️ DIRECT PATH (BLOCKED)
                </text>
              </g>
            </g>
          )}

          {/* AI Recommended Route Corridor (Smooth Luminous Ribbon) */}
          {layers.showRecommendedRoute && (
            <g className="ecdis-recommended-route">
              {/* Outer Glow Halo */}
              <path
                d={generateRouteSvgPath(currentRoute)}
                fill="none"
                stroke="#0284c7"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
              />
              {/* Main Glowing Track */}
              <path
                d={generateRouteSvgPath(currentRoute)}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#ecdisCyanGlow)"
              />
              {/* Core Pulse Dashed Centerline */}
              <path
                d={generateRouteSvgPath(currentRoute)}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="8 6"
              />

              {/* Waypoint Tactical Nodes */}
              {currentRoute.waypoints.map((wp, i) => {
                const pt = projectToSvg(wp.coord.lat, wp.coord.lng);
                const isSelected = selectedWaypoint?.id === wp.id;
                const isHovered = hoveredTarget === wp.id;

                return (
                  <g
                    key={wp.id}
                    className="ecdis-wp-node"
                    transform={`translate(${pt.x}, ${pt.y})`}
                    onClick={() => {
                      onSelectWaypoint(isSelected ? null : wp);
                      setActiveInspector("waypoint");
                    }}
                    onMouseEnter={() => setHoveredTarget(wp.id)}
                    onMouseLeave={() => setHoveredTarget(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      r={isSelected || isHovered ? "8" : "4.5"}
                      fill={isSelected ? "#00f0ff" : "#0284c7"}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      filter="url(#ecdisCyanGlow)"
                    />
                    <circle
                      r={isSelected || isHovered ? "14" : "8"}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.7"
                    />
                    {/* Compact Waypoint Number Pill */}
                    <g transform="translate(8, -10)">
                      <rect x="-2" y="-7" width="28" height="14" rx="3" fill="rgba(6, 15, 30, 0.85)" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="0.8" />
                      <text x="12" y="3.5" fill="#7dd3fc" fontSize="8" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        W{i + 1}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Range Rings Centered on Flagship Ship A */}
          {layers.showRangeRings && (
            <g className="ecdis-range-rings" transform={`translate(${shipAPos.x}, ${shipAPos.y})`}>
              <circle r="45" fill="none" stroke="rgba(56, 189, 248, 0.22)" strokeWidth="1" strokeDasharray="3 3" />
              <text x="48" y="-4" fill="rgba(56, 189, 248, 0.5)" fontSize="8" fontFamily="monospace">5 NM</text>

              <circle r="90" fill="none" stroke="rgba(56, 189, 248, 0.16)" strokeWidth="1" strokeDasharray="4 4" />
              <text x="93" y="-4" fill="rgba(56, 189, 248, 0.4)" fontSize="8" fontFamily="monospace">10 NM</text>

              <circle r="150" fill="none" stroke="rgba(56, 189, 248, 0.1)" strokeWidth="1" strokeDasharray="5 5" />
              <text x="153" y="-4" fill="rgba(56, 189, 248, 0.3)" fontSize="8" fontFamily="monospace">20 NM</text>
            </g>
          )}

          {/* Polar Radar Sweeper Animation */}
          {layers.showRadarSweep && (
            <g className="radar-sweep-group" transform={`translate(${shipAPos.x}, ${shipAPos.y})`}>
              <path d="M 0 0 L 140 -80 A 160 160 0 0 1 160 0 Z" fill="url(#ecdisRadarBeam)" className="radar-sweeper" />
            </g>
          )}

          {/* 12 Geometric Iceberg Hazards (Vector Polygons + Drift Arrows) */}
          {layers.showIcebergs && (
            <g className="ecdis-icebergs-layer">
              {icebergs.map((ice) => {
                const pos = projectToSvg(ice.position.lat, ice.position.lng);
                const isSelected = selectedIceberg?.id === ice.id;
                const isHovered = hoveredTarget === ice.id;
                const isHighThreat = ice.threatLevel === "high";

                return (
                  <g
                    key={ice.id}
                    className="ecdis-iceberg-group"
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      onSelectIceberg(isSelected ? null : ice);
                      setActiveInspector("iceberg");
                    }}
                    onMouseEnter={() => setHoveredTarget(ice.id)}
                    onMouseLeave={() => setHoveredTarget(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Threat Exclusion Buffer Zone */}
                    <circle
                      r={isHighThreat ? "22" : "15"}
                      fill="url(#icebergGlow)"
                      stroke={isHighThreat ? "rgba(239, 68, 68, 0.7)" : "rgba(245, 158, 11, 0.5)"}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />

                    {/* Kinematic Drift Direction Vector Arrow */}
                    <g transform={`rotate(${ice.driftHeadingDegrees})`}>
                      <line x1="0" y1="0" x2="0" y2="-18" stroke={isHighThreat ? "#f87171" : "#fbbf24"} strokeWidth="1.5" />
                      <polygon points="0,-21 -3,-15 3,-15" fill={isHighThreat ? "#f87171" : "#fbbf24"} />
                    </g>

                    {/* Vector Ice Crystal Polygon Icon */}
                    <polygon
                      points="0,-8 7,-3 5,6 -5,6 -7,-3"
                      fill={isSelected || isHovered ? "#38bdf8" : "#e0f2fe"}
                      stroke={isHighThreat ? "#ef4444" : "#94a3b8"}
                      strokeWidth="1.2"
                    />

                    {/* Minimal Designation Tag */}
                    <g transform="translate(10, -6)">
                      <rect
                        x="-2"
                        y="-7"
                        width={ice.designation.length > 12 ? "65" : "36"}
                        height="13"
                        rx="2"
                        fill="rgba(6, 12, 24, 0.85)"
                        stroke={isHighThreat ? "rgba(248, 113, 113, 0.4)" : "rgba(148, 163, 184, 0.3)"}
                        strokeWidth="0.8"
                      />
                      <text x="2" y="3" fill={isHighThreat ? "#fca5a5" : "#cbd5e1"} fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                        {ice.designation.replace("Iceberg ", "")}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* 🎯 Target Destination (Demo Station Berth) */}
          <g
            className="ecdis-destination-target"
            transform={`translate(${destPos.x}, ${destPos.y})`}
            onClick={() => setActiveInspector("destination")}
            style={{ cursor: "pointer" }}
          >
            <circle r="22" fill="none" stroke="rgba(52, 211, 153, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle r="10" fill="#065f46" stroke="#34d399" strokeWidth="2" filter="url(#ecdisGreenGlow)" />
            {/* Target Crosshairs */}
            <line x1="-14" y1="0" x2="14" y2="0" stroke="#34d399" strokeWidth="1" />
            <line x1="0" y1="-14" x2="0" y2="14" stroke="#34d399" strokeWidth="1" />

            {/* Smart Offset HUD Tag (Positioned cleanly to top-right) */}
            <g transform="translate(16, -22)">
              <rect x="-4" y="-10" width="125" height="24" rx="4" fill="rgba(6, 40, 30, 0.92)" stroke="#34d399" strokeWidth="1.2" />
              <text x="4" y="2" fill="#34d399" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                🎯 DEMO STATION
              </text>
              <text x="4" y="11" fill="#a7f3d0" fontSize="7.5" fontFamily="monospace">
                60.40°S 38.50°W · BERTH READY
              </text>
            </g>
          </g>

          {/* 🚢 Ship B (Nearby Vessel - AIS Contact) */}
          <g
            className="ecdis-vessel-b"
            transform={`translate(${shipBPos.x}, ${shipBPos.y})`}
            onClick={() => setActiveInspector("vesselB")}
            style={{ cursor: "pointer" }}
          >
            {/* Course Prediction Vector */}
            <g transform={`rotate(${shipB.headingDegrees})`}>
              <line x1="0" y1="0" x2="0" y2="-32" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="3 2" />
              <polygon points="0,-35 -4,-27 4,-27" fill="#f59e0b" />
            </g>

            {/* AIS Vessel Chevron Hull */}
            <polygon
              points="0,-10 6,7 0,4 -6,7"
              fill="#b45309"
              stroke="#fde68a"
              strokeWidth="1.5"
            />

            {/* Smart Offset Tag */}
            <g transform="translate(14, -18)">
              <rect x="-3" y="-9" width="105" height="22" rx="3" fill="rgba(24, 18, 5, 0.92)" stroke="#f59e0b" strokeWidth="1" />
              <text x="3" y="2" fill="#fde68a" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
                SHIP B · AIS CONTACT
              </text>
              <text x="3" y="10" fill="#fcd34d" fontSize="7.5" fontFamily="monospace">
                {shipB.speedKnots} kts · HDG {shipB.headingDegrees}°
              </text>
            </g>
          </g>

          {/* 🚢 Ship A (Flagship Vessel - Own Ship) */}
          <g
            className="ecdis-vessel-a"
            transform={`translate(${shipAPos.x}, ${shipAPos.y})`}
            onClick={() => setActiveInspector("vessel")}
            style={{ cursor: "pointer" }}
          >
            {/* Radar Halo Pulse */}
            <circle r="20" fill="none" stroke="#38bdf8" strokeWidth="1.2" className="vessel-ping" />
            <circle r="32" fill="none" stroke="#38bdf8" strokeWidth="0.8" className="vessel-ping-outer" />

            {/* Speed & Heading Vector (15 min projection) */}
            <g transform={`rotate(${currentShipA.headingDegrees})`}>
              <line x1="0" y1="0" x2="0" y2="-40" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="4 2" />
              <polygon points="0,-45 -5,-35 5,-35" fill="#00f0ff" />
            </g>

            {/* High-Tech Tactical Vessel Hull Polygon */}
            <polygon
              points="0,-14 8,9 0,5 -8,9"
              fill="#0284c7"
              stroke="#ffffff"
              strokeWidth="1.8"
              filter="url(#ecdisCyanGlow)"
            />

            {/* Smart Leader Line to Floating Top-Left HUD Card (Zero overlap!) */}
            <path d="M -8,-10 L -30,-30 L -120,-30" fill="none" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="1" />
            <g transform="translate(-130, -52)">
              <rect x="-8" y="-2" width="125" height="34" rx="4" fill="rgba(8, 16, 32, 0.95)" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="0" y="11" fill="#38bdf8" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                SHIP A (FLAGSHIP)
              </text>
              <text x="0" y="23" fill="#cbd5e1" fontSize="8" fontFamily="monospace">
                60.2°S 45.3°W · {currentShipA.speedKnots} kts
              </text>
            </g>
          </g>
        </svg>

        {/* Tactical Map Zoom Controls */}
        <div className="ecdis-viewport-actions">
          <button
            type="button"
            className="ecdis-hud-btn"
            onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="ecdis-hud-btn"
            onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.15))}
            title="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            className="ecdis-hud-btn font-mono"
            onClick={() => setZoomLevel(1)}
            title="Reset 1:1 Scale"
          >
            1:1
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

        {/* Interactive Tactical Telemetry Inspector Card */}
        {activeInspector === "gridCell" && selectedCell && (
          <div className="ecdis-floating-inspector">
            <div className="inspector-top-bar">
              <span className="inspector-badge">🔥 2D RISK CELL TELEMETRY</span>
              <button type="button" className="inspector-close-btn" onClick={() => setActiveInspector(null)}>✕</button>
            </div>
            <div className="inspector-content">
              <p className="inspector-lead">Polar Coordinate ({Math.abs(selectedCell.lat)}°S, {Math.abs(selectedCell.lon)}°W)</p>
              <div className="inspector-key-values font-mono">
                <span>Calculated Risk:</span>
                <span className={selectedCell.risk_score >= 0.7 ? "text-red" : "text-cyan"}>
                  {(selectedCell.risk_score * 100).toFixed(0)}% ({selectedCell.status})
                </span>
                <span>Sea Ice Concentration:</span>
                <span>{selectedCell.ice_concentration_tenths}/10 Pack</span>
                <span>Nearest Iceberg:</span>
                <span>{selectedCell.closest_iceberg_nm} NM</span>
              </div>
            </div>
          </div>
        )}

        {activeInspector === "waypoint" && selectedWaypoint && (
          <div className="ecdis-floating-inspector">
            <div className="inspector-top-bar">
              <span className="inspector-badge">📍 WAYPOINT TELEMETRY</span>
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => {
                  onSelectWaypoint(null);
                  setActiveInspector(null);
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
                <span className="text-cyan">{selectedWaypoint.iceConcentrationTenths}/10</span>
                <span>Sounding Depth:</span>
                <span>{selectedWaypoint.depthMeters} m</span>
                <span>Estimated Arrival:</span>
                <span className="text-green">{selectedWaypoint.estimatedArrival}</span>
              </div>
            </div>
          </div>
        )}

        {activeInspector === "iceberg" && selectedIceberg && (
          <div className="ecdis-floating-inspector">
            <div className="inspector-top-bar">
              <span className="inspector-badge">🧊 ICEBERG RADAR SIGNATURE</span>
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => {
                  onSelectIceberg(null);
                  setActiveInspector(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="inspector-content">
              <p className="inspector-lead">{selectedIceberg.designation}</p>
              <div className="inspector-key-values font-mono">
                <span>Threat Level:</span>
                <span className={selectedIceberg.threatLevel === "high" ? "text-red" : "text-amber"}>
                  {selectedIceberg.threatLevel.toUpperCase()}
                </span>
                <span>Kinematic Drift:</span>
                <span>{selectedIceberg.driftSpeedKnots} kts @ {selectedIceberg.driftHeadingDegrees}°</span>
                <span>Safety Buffer:</span>
                <span>{selectedIceberg.hazardRadiusNm} NM</span>
              </div>
            </div>
          </div>
        )}

        {activeInspector === "destination" && (
          <div className="ecdis-floating-inspector">
            <div className="inspector-top-bar">
              <span className="inspector-badge">🎯 TARGET DESTINATION INTEL</span>
              <button type="button" className="inspector-close-btn" onClick={() => setActiveInspector(null)}>✕</button>
            </div>
            <div className="inspector-content">
              <p className="inspector-lead">Demo Station (Polar Research Base)</p>
              <div className="inspector-key-values font-mono">
                <span>Position:</span>
                <span>60.40°S, 38.50°W</span>
                <span>Status:</span>
                <span className="text-green">PORT OPEN / BERTH READY</span>
                <span>Passage Distance:</span>
                <span className="text-cyan">{currentRoute.totalDistanceNm} NM</span>
                <span>ETA:</span>
                <span>{currentRoute.estimatedDurationHours} Hours</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom HUD Summary Strip ────────────────────────────────────── */}
      <div className="ecdis-bottom-summary-bar font-mono">
        <div className="summary-metric-block">
          <span className="metric-tag">AI SAFE CORRIDOR</span>
          <span className="metric-data text-cyan">
            Ship A ──→ Demo Station ({currentRoute.totalDistanceNm} NM)
          </span>
        </div>
        <div className="summary-metric-block">
          <span className="metric-tag">TRANSIT DURATION</span>
          <span className="metric-data">{currentRoute.estimatedDurationHours} Hours (@ 12.0 kts)</span>
        </div>
        <div className="summary-metric-block">
          <span className="metric-tag">POLAR ENGINES</span>
          <span className="metric-data text-green">
            2D Risk Raster · Lattice A* · Kinematic Drift Projections
          </span>
        </div>
      </div>
    </section>
  );
}

export default AntarcticMap;
