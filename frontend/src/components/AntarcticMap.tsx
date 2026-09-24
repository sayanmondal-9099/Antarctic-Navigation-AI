/* eslint-disable react/set-state-in-effect */
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
  satelliteApi,
  type SatelliteResponse,
  type RiskGridCell,
} from "../services/api";
import {
  initialVessel,
  mockNearbyVessel,
  mockIcebergs,
  recommendedRoute as defaultRecommendedRoute,
  directHazardRoute,
} from "../data/mockNavigationData";
import { SpatialGlobeMap } from "./map/SpatialGlobeMap";

export interface ExtendedMapLayerConfig {
  showSatellite: boolean;
  showSeaIce: boolean;
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
  simulationTime?: number;
  setSimulationTime?: (time: React.SetStateAction<number>) => void;
}

export function AntarcticMap({
  vessel: propVessel,
  recommendedRoute: propRoute,
  selectedWaypoint: propSelectedWp,
  onSelectWaypoint: propOnSelectWp,
  selectedIceberg: propSelectedIce,
  onSelectIceberg: propOnSelectIce,
  simulationTime = 0,
  setSimulationTime,
}: AntarcticMapProps) {
  const [layers, setLayers] = useState<ExtendedMapLayerConfig>({
    showSatellite: false,
    showSeaIce: false,
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
  const [viewMode, setViewMode] = useState<"2D" | "3D">("3D");
  const [activeInspector, setActiveInspector] = useState<"vessel" | "vesselB" | "iceberg" | "waypoint" | "destination" | "gridCell" | null>(null);
  const [selectedCell, setSelectedCell] = useState<RiskGridCell | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<string | null>(null);

  // Temporal Forward Forecast Simulation
  const [isSimulatingForecast, setIsSimulatingForecast] = useState<boolean>(false);
  const [metoceanConditions, setMetoceanConditions] = useState<{
    air_temp: number;
    wind_speed: number;
    wind_dir: number;
    freezing_rate: number;
    visibility: number;
    icing_risk: string;
  }>({
    air_temp: -14.5,
    wind_speed: 28.0,
    wind_dir: 225,
    freezing_rate: 3.2,
    visibility: 4.5,
    icing_risk: "MODERATE",
  });

  // Base reference icebergs for T+0
  const [baseIcebergs, setBaseIcebergs] = useState<IcebergHazard[]>(mockIcebergs);

  // Live or fallback state
  const [shipA, setShipA] = useState<VesselState>(propVessel || initialVessel);
  const [shipB, setShipB] = useState<VesselState>(mockNearbyVessel);
  const [icebergs, setIcebergs] = useState<IcebergHazard[]>(mockIcebergs);
  const [activeRoute, setActiveRoute] = useState<NavigationRoute>(propRoute || defaultRecommendedRoute);
  const [riskGridCells, setRiskGridCells] = useState<RiskGridCell[]>([]);
  const [satelliteData, setSatelliteData] = useState<SatelliteResponse | null>(null);


  useEffect(() => {
    const loadSatellite = async () => {
      const data = await satelliteApi.getLatest();
      setSatelliteData(data);
      // Auto-enable satellite if it's a REAL OBSERVATION
      if (data?.sentinel_1?.source === "REAL OBSERVATION") {
        setLayers(prev => ({ ...prev, showSatellite: true }));
      }
    };
    loadSatellite();
  }, []);

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
      .then((vesselsData: any) => {
        if (!isMounted || !vesselsData || vesselsData.length === 0) return;
        const vA = vesselsData.find((v: any) => v.id === "vessel-A");
        if (vA) {
          setShipA((prev) => ({
            ...prev,
            position: { lat: vA.position.lat, lng: vA.position.lon, label: `${Math.abs(vA.position.lat)}°S, ${Math.abs(vA.position.lon)}°W` },
            headingDegrees: vA.heading,
            speedKnots: vA.speed_knots ?? 12.0,
            destination: vA.destination,
          }));
        }
        const vB = vesselsData.find((v: any) => v.id === "vessel-B");
        if (vB) {
          setShipB((prev) => ({
            ...prev,
            position: { lat: vB.position.lat, lng: vB.position.lon, label: `${Math.abs(vB.position.lat)}°S, ${Math.abs(vB.position.lon)}°W` },
            headingDegrees: vB.heading,
            speedKnots: vB.speed_knots ?? 10.5,
            destination: vB.destination,
          }));
        }
      })
      .catch(() => {});

    fetchIcebergs()
      .then((iceData: any) => {
        if (!isMounted || !iceData || iceData.length === 0) return;
        const mappedIcebergs: IcebergHazard[] = iceData.map((ice: any, idx: number) => {
          const centerLat = ice.polygon.reduce((sum: number, p: any) => sum + p.lat, 0) / ice.polygon.length;
          const centerLon = ice.polygon.reduce((sum: number, p: any) => sum + p.lon, 0) / ice.polygon.length;
          return {
            id: ice.id,
            designation: ice.name || `Iceberg ${ice.id}`,
            type: ice.size_class === "giant" ? "tabular" : ice.size_class === "small" ? "growler" : "pinnacle",
            position: { lat: centerLat, lng: centerLon, label: `Sector ${idx + 1}` },
            dimensionsKm: { length: 12, width: 6, heightAboveWater: 35 },
            driftSpeedKnots: 1.0,
            driftHeadingDegrees: 215,
            hazardRadiusNm: ice.size_class === "giant" ? 4.5 : 2.5,
            threatLevel: (ice.threat_level as "high" | "medium" | "low") || "medium",
          };
        });
        setBaseIcebergs(mappedIcebergs);
        setIcebergs(mappedIcebergs);
      })
      .catch(() => {});

    fetchDemoRoute()
      .then((routeData: any) => {
        if (!isMounted || !routeData || !routeData.waypoints) return;
        const mappedRoute: NavigationRoute = {
          id: routeData.id,
          name: routeData.name,
          type: "recommended",
          totalDistanceNm: routeData.total_distance_nm,
          estimatedDurationHours: routeData.estimated_duration_hours,
          averageIceRiskScore: Math.round(routeData.average_risk_score),
          color: "#38bdf8",
          waypoints: routeData.waypoints.map((wp: any) => ({
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
      .then((gridData: any) => {
        if (!isMounted || !gridData || !gridData.cells) return;
        setRiskGridCells(gridData.cells);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper: Kinematic projection of an iceberg
  const projectIcebergKinematics = (base: IcebergHazard, hours: number): IcebergHazard & { originPosition?: { lat: number; lng: number }; displacementNm?: number } => {
    if (hours === 0) {
      return {
        ...base,
        originPosition: { lat: base.position.lat, lng: base.position.lng },
        displacementNm: 0,
      };
    }

    const speed = base.driftSpeedKnots || 1.0;
    const heading = base.driftHeadingDegrees || 215.0;
    const distNm = speed * hours;
    const rad = (heading * Math.PI) / 180.0;
    const dLat = (distNm * Math.cos(rad)) / 60.0;
    const avgLatRad = (base.position.lat * Math.PI) / 180.0;
    const dLng = (distNm * Math.sin(rad)) / (60.0 * Math.cos(avgLatRad));

    return {
      ...base,
      originPosition: { lat: base.position.lat, lng: base.position.lng },
      position: {
        lat: Number((base.position.lat + dLat).toFixed(4)),
        lng: Number((base.position.lng + dLng).toFixed(4)),
        label: `Projected +${hours}h (${distNm.toFixed(1)} NM)`
      },
      displacementNm: Number(distNm.toFixed(1)),
    };
  };

  // Sync simulation time to iceberg drift and metocean conditions
  useEffect(() => {
    if (simulationTime > 0) {
      const instantProjected = baseIcebergs.map((base) => projectIcebergKinematics(base, simulationTime));
      setIcebergs(instantProjected);
    } else {
      setIcebergs(baseIcebergs);
    }

    const windShift = Math.sin(simulationTime / 12.0) * 8.0;
    setMetoceanConditions({
      air_temp: Number((-14.5 - simulationTime * 0.1).toFixed(1)),
      wind_speed: Number((28.0 + windShift).toFixed(1)),
      wind_dir: Math.round((225 + simulationTime * 2) % 360),
      freezing_rate: 3.2,
      visibility: simulationTime < 36 ? 4.5 : 1.2,
      icing_risk: simulationTime > 18 ? "SEVERE" : "MODERATE",
    });
  }, [simulationTime, baseIcebergs]);

  // Handle temporal drift projection changes (+0h, +6h, +12h, +24h, +48h)
  const handleForecastChange = async (hours: number) => {
    if (setSimulationTime) {
      setSimulationTime(hours);
    }


    if (hours === 0) {
      return;
    }

    // 3. Fetch high-precision hydrodynamic backend forecast asynchronously
    setIsSimulatingForecast(true);
    try {
      const data = await fetchTemporalForecast(hours);
      if (data && data.icebergs && data.icebergs.length > 0) {
        const enriched: IcebergHazard[] = data.icebergs.map((pIce: any) => {
          const matchingBase = baseIcebergs.find((b) => b.id === pIce.id);
          const origLat = matchingBase ? matchingBase.position.lat : pIce.original_centroid.lat;
          const origLng = matchingBase ? matchingBase.position.lng : (pIce.original_centroid.lon ?? (pIce.original_centroid as any).lng);
          const dispNm = (pIce.drift_vector as any).total_displacement_nm ?? pIce.drift_vector.distance_nm ?? Number((pIce.drift_vector.speed_knots * hours).toFixed(1));

          return {
            id: pIce.id,
            designation: `${pIce.name ?? pIce.id}`,
            type: pIce.size_class === "giant" ? "tabular" : pIce.size_class === "small" ? "growler" : "pinnacle",
            position: {
              lat: pIce.projected_centroid.lat,
              lng: pIce.projected_centroid.lon ?? (pIce.projected_centroid as any).lng,
              label: `Projected +${hours}h (${dispNm} NM)`
            },
            originPosition: { lat: origLat, lng: origLng },
            dimensionsKm: { length: 12, width: 6, heightAboveWater: 35 },
            driftSpeedKnots: pIce.drift_vector.speed_knots,
            driftHeadingDegrees: pIce.drift_vector.heading_degrees,
            hazardRadiusNm: pIce.size_class === "giant" ? 4.8 : 2.6,
            threatLevel: (pIce.threat_level as "high" | "medium" | "low") ?? "medium",
            displacementNm: dispNm,
          };
        });
        setIcebergs(enriched);

        if (data.metocean) {
          const m = data.metocean as any;
          setMetoceanConditions({
            air_temp: m.air_temperature_c ?? -14.5,
            wind_speed: m.wind_speed_knots ?? m.wind_speed_kts ?? 28.0,
            wind_dir: m.wind_direction_deg ?? m.wind_heading_deg ?? 225,
            freezing_rate: m.sea_ice_freezing_rate_cm_day ?? 3.2,
            visibility: m.visibility_nm ?? 4.5,
            icing_risk: m.icing_spray_risk ?? "MODERATE",
          });
        }
      }
    } catch {
      // Deterministic local simulation is already rendered and active!
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
            <span className="ecdis-coordinates-meta font-mono" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              SECTOR: WEDDELL SEA / SOUTH ORKNEY · 60°12'S 045°18'W · GRID WGS-84
              {satelliteData && (
                <span style={{ 
                  color: satelliteData.sentinel_1.source === "REAL OBSERVATION" ? "#10b981" : "#f59e0b",
                  borderLeft: "1px solid rgba(255,255,255,0.2)",
                  paddingLeft: "8px",
                  fontWeight: "bold"
                }}>
                  ● {satelliteData.sentinel_1.source}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="ecdis-layer-pill-group">
          <button
            type="button"
            className={`ecdis-pill-btn ${viewMode === "3D" ? "active-indigo" : ""}`}
            onClick={() => setViewMode(prev => prev === "3D" ? "2D" : "3D")}
            style={{ fontWeight: "bold", border: "1px solid #6366f1" }}
          >
            <span className="pill-dot dot-indigo"></span> {viewMode === "3D" ? "3D SPATIAL" : "2D TACTICAL"}
          </button>
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
            className={`ecdis-pill-btn ${layers.showSatellite ? "active-green" : ""}`}
            onClick={() => toggleLayer("showSatellite")}
          >
            <span className="pill-dot dot-green"></span> Sentinel-1 SAR
          </button>
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showSeaIce ? "active-blue" : ""}`}
            onClick={() => toggleLayer("showSeaIce")}
          >
            <span className="pill-dot dot-blue"></span> Sea Ice (NSIDC)
          </button>
          <button
            type="button"
            className={`ecdis-pill-btn ${layers.showIceDensity ? "active-blue" : ""}`}
            onClick={() => toggleLayer("showIceDensity")}
          >
            <span className="pill-dot dot-blue"></span> Ice Density Polygon
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
          <span className={`timeline-value font-mono ${simulationTime === 0 ? "text-green" : "text-amber"}`}>
            {simulationTime === 0 ? "T+00h (REALTIME SATELLITE OBSERVED)" : `T+${Math.floor(simulationTime).toString().padStart(2, "0")}h (KINEMATIC PROJECTION)`}
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
          ].map(({ hrs, label }) => {
            // Determine active step based on simulationTime ranges
            const currentStep = [48, 24, 12, 6, 0].find(h => simulationTime >= h) ?? 0;
            return (
              <button
                key={hrs}
                type="button"
                className={`timeline-step-btn ${currentStep === hrs ? "active-step" : ""}`}
                onClick={() => handleForecastChange(hrs)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {simulationTime > 0 && (
        <div className="ecdis-metocean-forecast-strip font-mono">
          <span className="metocean-pill">🌡️ AIR: <strong className="text-cyan">{metoceanConditions.air_temp}°C</strong></span>
          <span className="metocean-pill">💨 WIND: <strong className="text-amber">{metoceanConditions.wind_speed} kts ({metoceanConditions.wind_dir}°)</strong></span>
          <span className="metocean-pill">👁️ VIS: <strong className="text-blue">{metoceanConditions.visibility} NM</strong></span>
          <span className="metocean-pill">❄️ FREEZING: <strong className="text-cyan">+{metoceanConditions.freezing_rate} cm/d</strong></span>
          <span className={`metocean-pill ${metoceanConditions.icing_risk === "SEVERE" ? "pill-severe" : "pill-moderate"}`}>
            ⚠️ SPRAY ICING: <strong>{metoceanConditions.icing_risk}</strong>
          </span>
        </div>
      )}

      {/* ── Main Tactical SVG Map Canvas ─────────────────────────────────── */}
      <div className="ecdis-viewport-container" style={{ position: "relative" }}>
        {/* Satellite Timestamp Overlay */}
        {layers.showSatellite && satelliteData && (
          <div className="absolute top-4 right-4 z-10 p-2 rounded" style={{ background: "rgba(2, 8, 19, 0.8)", border: "1px solid #10b981" }}>
            <div className="text-[10px] text-emerald-400 font-mono flex flex-col gap-1">
              <span className="font-bold">SATELLITE OBSERVATION</span>
              <span>ACQUIRED: {new Date(satelliteData.sentinel_1.acquired_at).toISOString().replace('T', ' ').substring(0, 16)} UTC</span>
              <span>SOURCE: {satelliteData.sentinel_1.sensor}</span>
            </div>
          </div>
        )}
        
        {viewMode === "3D" ? (
          <SpatialGlobeMap
            shipA={currentShipA}
            shipB={shipB}
            icebergs={icebergs}
            activeRoute={currentRoute}
            hazardRoute={layers.showHazardRoute ? directHazardRoute : undefined}
            selectedWaypoint={selectedWaypoint}
            onSelectWaypoint={onSelectWaypoint}
            selectedIceberg={selectedIceberg}
            onSelectIceberg={onSelectIceberg}
            layers={layers}
            forecastHours={simulationTime}
            hoveredTarget={hoveredTarget}
            setHoveredTarget={setHoveredTarget}
            satelliteData={satelliteData}
          />
        ) : (
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

            {/* Cyan Radar Glow Filter */}
            <filter id="ecdisCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Green Destination Berth Glow */}
            <filter id="ecdisGreenGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Radar Sweeper Radial Alpha Gradient */}
            <radialGradient id="ecdisRadarBeam" cx="0%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#00f0ff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ocean Base Floor */}
          <rect width="1000" height="580" fill="url(#polarOceanDeep)" />

          {/* Polar Nautical Bathymetric Contours */}
          {layers.showBathymetry && (
            <g className="ecdis-bathymetry-contours" opacity="0.35">
              <path d="M 0,520 Q 300,380 600,430 T 1000,360" fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="3 3" />
              <text x="30" y="515" fill="#0284c7" fontSize="7.5" fontFamily="monospace">-500m (Shelf)</text>

              <path d="M 0,350 Q 350,220 700,270 T 1000,190" fill="none" stroke="#0369a1" strokeWidth="0.8" strokeDasharray="4 4" />
              <text x="30" y="345" fill="#0369a1" fontSize="7.5" fontFamily="monospace">-2000m (Abyssal)</text>

              <path d="M 0,180 Q 400,100 750,140 T 1000,80" fill="none" stroke="#075985" strokeWidth="0.8" />
              <text x="30" y="175" fill="#075985" fontSize="7.5" fontFamily="monospace">-3500m (Trench)</text>
            </g>
          )}

          {/* Graticule Grid Coordinates */}
          <g className="ecdis-graticule-grid" opacity="0.18">
            {[100, 210, 320, 430, 540].map((y, i) => (
              <line key={`lat-${i}`} x1="0" y1={y} x2="1000" y2={y} stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 4" />
            ))}
            {[150, 300, 450, 600, 750, 900].map((x, i) => (
              <line key={`lon-${i}`} x1={x} y1="0" x2={x} y2="580" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="2 4" />
            ))}
          </g>

          {/* Graticule Longitude / Latitude Coordinate Labels */}
          <g className="ecdis-graticule-labels font-mono" fill="#64748b" fontSize="7.5" opacity="0.6">
            <text x="155" y="570">46°30'W</text>
            <text x="305" y="570">44°45'W</text>
            <text x="455" y="570">43°00'W</text>
            <text x="605" y="570">41°15'W</text>
            <text x="755" y="570">39°30'W</text>

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
              {/* Center Dashed Track Line */}
              <path
                d={generateRouteSvgPath(currentRoute)}
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeDasharray="6 4"
              />

              {/* Waypoints along Recommended Route */}
              {currentRoute.waypoints.map((wp, i) => {
                const pt = projectToSvg(wp.coord.lat, wp.coord.lng);
                const isSelected = selectedWaypoint?.id === wp.id;
                const isHovered = hoveredTarget === wp.id;

                return (
                  <g
                    key={wp.id}
                    className="ecdis-waypoint-node"
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

          {/* 12 Geometric Iceberg Hazards (Vector Polygons + Drift Arrows + Ghost Trail) */}
          {layers.showIcebergs && (
            <g className="ecdis-icebergs-layer">
              {icebergs.map((ice) => {
                const pos = projectToSvg(ice.position.lat, ice.position.lng);
                const isSelected = selectedIceberg?.id === ice.id;
                const isHovered = hoveredTarget === ice.id;
                const isHighThreat = ice.threatLevel === "high";
                const hasDrifted = simulationTime > 0 && (ice as any).originPosition;
                const origPos = hasDrifted ? projectToSvg((ice as any).originPosition.lat, (ice as any).originPosition.lng) : null;

                return (
                  <g key={ice.id} className="ecdis-iceberg-item">
                    {/* Ghost Anchor at T+0 Origin and Drift Trail */}
                    {hasDrifted && origPos && (
                      <g className="ecdis-iceberg-drift-trail" opacity="0.75">
                        {/* Dashed Trajectory Line */}
                        <line
                          x1={origPos.x}
                          y1={origPos.y}
                          x2={pos.x}
                          y2={pos.y}
                          stroke={isHighThreat ? "#ef4444" : "#f59e0b"}
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                        />
                        {/* Ghost Anchor Circle at T+0 */}
                        <circle
                          cx={origPos.x}
                          cy={origPos.y}
                          r="6"
                          fill="none"
                          stroke={isHighThreat ? "rgba(239, 68, 68, 0.6)" : "rgba(245, 158, 11, 0.6)"}
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                        <text
                          x={origPos.x - 10}
                          y={origPos.y - 8}
                          fill="#94a3b8"
                          fontSize="6.5"
                          fontFamily="monospace"
                        >
                          T+0
                        </text>
                      </g>
                    )}

                    {/* Displaced Iceberg Hazard Group */}
                    <g
                      className={`ecdis-iceberg-group ${hasDrifted ? "projected-drift" : ""}`}
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
                        fill={isSelected || isHovered ? "#38bdf8" : hasDrifted ? "#fde68a" : "#e0f2fe"}
                        stroke={isHighThreat ? "#ef4444" : "#94a3b8"}
                        strokeWidth="1.2"
                      />

                      {/* Designation and Displacement Tag */}
                      <g transform="translate(10, -6)">
                        <rect
                          x="-2"
                          y="-7"
                          width={hasDrifted ? "78" : ice.designation.length > 12 ? "65" : "36"}
                          height="13"
                          rx="2"
                          fill="rgba(6, 12, 24, 0.88)"
                          stroke={isHighThreat ? "rgba(248, 113, 113, 0.5)" : "rgba(148, 163, 184, 0.4)"}
                          strokeWidth="0.8"
                        />
                        <text x="2" y="3" fill={isHighThreat ? "#fca5a5" : "#cbd5e1"} fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                          {ice.designation.replace("Iceberg ", "").split(" ")[0]}
                          {hasDrifted && (ice as any).displacementNm ? ` (+${(ice as any).displacementNm}NM)` : ""}
                        </text>
                      </g>
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
        )}

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
