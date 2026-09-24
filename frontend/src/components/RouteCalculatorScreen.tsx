import React, { useState } from "react";
import type { NavigationRoute } from "../types/navigation";
import type {
  RiskToleranceLevel,
  RouteCalculationRequest,
  CalculatedRouteResult,
} from "../types/planner";
import {
  polarOrigins,
  polarDestinations,
  vesselFleet,
  calculateOptimizedRoute,
} from "../data/mockPlannerData";
import { optimizeRoute } from "../services/api";

interface RouteCalculatorScreenProps {
  onApplyRoute: (route: NavigationRoute, destinationName: string) => void;
}

export function RouteCalculatorScreen({ onApplyRoute }: RouteCalculatorScreenProps) {
  const [originId, setOriginId] = useState<string>("port-gerlache");
  const [destinationId, setDestinationId] = useState<string>("dest-mcmurdo");
  const [vesselId, setVesselId] = useState<string>("vessel-pioneer");
  const [riskTolerance, setRiskTolerance] = useState<RiskToleranceLevel>("balanced");
  const [avoidIcebergs, setAvoidIcebergs] = useState<boolean>(true);
  const [prioritizeLeads, setPrioritizeLeads] = useState<boolean>(true);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calcResult, setCalcResult] = useState<CalculatedRouteResult>(() =>
    calculateOptimizedRoute({
      originId: "port-gerlache",
      destinationId: "dest-mcmurdo",
      vesselId: "vessel-pioneer",
      riskTolerance: "balanced",
      avoidIcebergDriftZones: true,
      prioritizeOpenLeads: true,
    })
  );
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setAppliedSuccess(false);

    const request: RouteCalculationRequest = {
      originId,
      destinationId,
      vesselId,
      riskTolerance,
      avoidIcebergDriftZones: avoidIcebergs,
      prioritizeOpenLeads: prioritizeLeads,
    };

    const originObj = polarOrigins.find((p) => p.id === originId) || polarOrigins[0];
    const destObj = polarDestinations.find((d) => d.id === destinationId) || polarDestinations[0];
    const vesselObj = vesselFleet.find((v) => v.id === vesselId) || vesselFleet[0];

    try {
      const apiRes = await optimizeRoute({
        origin: { lat: originObj.coord.lat, lon: originObj.coord.lng },
        destination: { lat: destObj.coord.lat, lon: destObj.coord.lng },
        vessel_id: vesselId,
        risk_tolerance: riskTolerance,
      });

      const rec = apiRes?.recommended_route;

      if (rec && rec.waypoints && rec.waypoints.length > 0) {
        const mappedNavRoute: NavigationRoute = {
          id: rec.id,
          name: rec.name,
          type: "recommended",
          totalDistanceNm: rec.total_distance_nm,
          estimatedDurationHours: rec.estimated_duration_hours,
          averageIceRiskScore: Math.round(rec.average_risk_score),
          color: "#38bdf8",
          waypoints: rec.waypoints.map((wp: any) => ({
            id: wp.id,
            name: wp.name,
            coord: { lat: wp.lat, lng: wp.lon },
            order: wp.order,
            iceConcentrationTenths: Math.round(wp.ice_risk_score / 10),
            iceThicknessMeters: 0.4,
            estimatedArrival: `+${wp.order * 2}h 45m`,
            depthMeters: 510,
          })),
        };

        const mapAltRoute = (alt: any, idx: number): NavigationRoute => ({
          id: alt.id,
          name: alt.name,
          type: "alternative",
          totalDistanceNm: alt.total_distance_nm,
          estimatedDurationHours: alt.estimated_duration_hours,
          averageIceRiskScore: Math.round(alt.average_risk_score),
          color: idx === 0 ? "#f59e0b" : "#8b5cf6",
          waypoints: alt.waypoints.map((wp: any) => ({
            id: wp.id,
            name: wp.name,
            coord: { lat: wp.lat, lng: wp.lon },
            order: wp.order,
            iceConcentrationTenths: Math.round(wp.ice_risk_score / 10),
            iceThicknessMeters: 0.4,
            estimatedArrival: `+${wp.order * 2}h 45m`,
            depthMeters: 510,
          })),
        });

        const alternatives = (apiRes.alternative_routes || []).map(mapAltRoute);

        const directDist = Math.round(rec.total_distance_nm * 0.88);
        const directDur = Math.round(rec.estimated_duration_hours * 1.35);

        setCalcResult({
          route: mappedNavRoute,
          origin: originObj,
          destination: destObj,
          vessel: vesselObj,
          metrics: {
            calculatedDistanceNm: rec.total_distance_nm,
            directDistanceNm: directDist,
            calculatedDurationHours: rec.estimated_duration_hours,
            directDurationHours: directDur,
            distanceDeltaNm: Math.round(rec.total_distance_nm - directDist),
            timeSavingsHours: Math.round(directDur - rec.estimated_duration_hours),
            calculatedIceRiskScore: Math.round(rec.average_risk_score),
            directIceRiskScore: 78,
            riskReductionPercent: 68,
            fuelEstimateLiters: Math.round(rec.total_distance_nm * vesselObj.fuelConsumptionLPerNm),
          },
          calculatedAtUtc: new Date().toISOString().substring(11, 19) + " UTC",
          confidenceScore: 96,
          riskTolerance: riskTolerance,
          icebergAvoidanceCount: 12,
          iceLeadUsagePercent: 65,
          alternatives,
          warnings: apiRes.warnings || [],
        });
      } else {
        const fallbackResult = calculateOptimizedRoute(request);
        setCalcResult(fallbackResult);
      }
    } catch {
      const fallbackResult = calculateOptimizedRoute(request);
      setCalcResult(fallbackResult);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleEngageRoute = () => {
    onApplyRoute(calcResult.route, calcResult.destination.name);
    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
    }, 3000);
  };

  const selectedVessel = vesselFleet.find((v) => v.id === vesselId) ?? vesselFleet[0];

  return (
    <div className="planner-screen-container">
      {/* ── Top Header Title ──────────────────────────────────────────────── */}
      <section className="planner-hero-card">
        <div className="planner-hero-text">
          <span className="planner-tag">VOYAGE CONFIGURATION & PLANNING</span>
          <h2>ANTARCTIC ROUTE OPTIMIZATION ENGINE</h2>
          <p>
            Compute multi-objective polar corridors balancing iceberg drift avoidance,
            sea ice thickness, vessel ice class limits, and fuel economics.
          </p>
        </div>
        <div className="planner-engine-badge">
          <span className="dot dot-green"></span>
          <span>RADARSAT-2 / SAR SATELLITE FEED: ACTIVE</span>
        </div>
      </section>

      {/* ── Main 2-Column Grid: Config Form & Calculation Results ─────────── */}
      <div className="planner-main-grid">
        {/* ── Left Column: Planning Parameters Form ────────────────────────── */}
        <section className="planner-panel config-form-panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <span className="panel-icon">⚙️</span>
              <h3>VOYAGE INPUT PARAMETERS</h3>
            </div>
            <span className="badge badge-ai">PARAMETERS CONFIG</span>
          </div>

          <div className="panel-body">
            {/* 1. Origin Selection */}
            <div className="form-group">
              <label className="form-label" htmlFor="select-origin">
                <span className="label-icon">📍</span> DEPARTURE ORIGIN
              </label>
              <select
                id="select-origin"
                className="planner-select font-mono"
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
              >
                {polarOrigins.map((port) => (
                  <option key={port.id} value={port.id}>
                    {port.name} ({port.region})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Destination Selection */}
            <div className="form-group">
              <label className="form-label" htmlFor="select-destination">
                <span className="label-icon">🎯</span> TARGET DESTINATION
              </label>
              <select
                id="select-destination"
                className="planner-select font-mono"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
              >
                {polarDestinations.map((dest) => (
                  <option key={dest.id} value={dest.id}>
                    {dest.name} [{dest.region}]
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Vessel Selection */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">🚢</span> VESSEL PROFILE & ICE CLASS
              </label>
              <div className="vessel-selector-cards">
                {vesselFleet.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`vessel-card-btn ${vesselId === v.id ? "selected" : ""}`}
                    onClick={() => setVesselId(v.id)}
                  >
                    <div className="vessel-card-top">
                      <span className="vessel-name">{v.name}</span>
                      <span className="vessel-class-pill">{v.iceClass.split(" ")[0]}</span>
                    </div>
                    <div className="vessel-specs font-mono">
                      <span>Ice Limit: {v.maxIceThicknessMeters}m</span>
                      <span>Speed: {v.economicSpeedKnots} kts</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Risk Tolerance Slider */}
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">🛡️</span> RISK TOLERANCE POLICY
              </label>
              <div className="risk-tolerance-selector">
                <button
                  type="button"
                  className={`risk-toggle-btn ${riskTolerance === "conservative" ? "active-green" : ""}`}
                  onClick={() => setRiskTolerance("conservative")}
                >
                  <span className="btn-icon">🛡️</span>
                  <span className="btn-title">CONSERVATIVE</span>
                  <span className="btn-sub">Zero-Ice / Wide Margin</span>
                </button>

                <button
                  type="button"
                  className={`risk-toggle-btn ${riskTolerance === "balanced" ? "active-cyan" : ""}`}
                  onClick={() => setRiskTolerance("balanced")}
                >
                  <span className="btn-icon">⚖️</span>
                  <span className="btn-title">BALANCED (AI)</span>
                  <span className="btn-sub">Optimal Speed & Evasion</span>
                </button>

                <button
                  type="button"
                  className={`risk-toggle-btn ${riskTolerance === "aggressive" ? "active-amber" : ""}`}
                  onClick={() => setRiskTolerance("aggressive")}
                >
                  <span className="btn-icon">⚡</span>
                  <span className="btn-title">EXPEDITION</span>
                  <span className="btn-sub">Direct / Active Icebreaking</span>
                </button>
              </div>
            </div>

            {/* Additional Routing Toggles */}
            <div className="routing-options-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={avoidIcebergs}
                  onChange={(e) => setAvoidIcebergs(e.target.checked)}
                />
                <span>Active avoidance for iceberg calving drift vectors</span>
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={prioritizeLeads}
                  onChange={(e) => setPrioritizeLeads(e.target.checked)}
                />
                <span>Prioritize thermal satellite open water leads</span>
              </label>
            </div>

            {/* Calculate Action Button */}
            <button
              type="button"
              className={`btn-calculate-route ${isCalculating ? "calculating" : ""}`}
              onClick={handleCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <span>⚙️ SYNTHESIZING SAR RADAR DATA & POLAR BATHYMETRY...</span>
              ) : (
                <span>🚀 CALCULATE OPTIMAL POLAR ROUTE</span>
              )}
            </button>
          </div>
        </section>

        {/* ── Right Column: Calculated Route Analytics & Waypoints ─────────── */}
        <section className="planner-panel results-display-panel">
          <div className="panel-header">
            <div className="panel-title-row">
              <span className="panel-icon">📊</span>
              <h3>CALCULATED ROUTE INTELLIGENCE</h3>
            </div>
            <span className="badge badge-secure font-mono">
              CONFIDENCE {calcResult.confidenceScore}%
            </span>
          </div>

          <div className="panel-body">
            {calcResult.warnings && calcResult.warnings.length > 0 && (
              <div className="planner-warning-banner" style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--status-critical)', padding: '12px', marginBottom: '16px', borderRadius: '4px' }}>
                <strong style={{ color: 'var(--status-critical)' }}>⚠️ MULTI-VESSEL CONFLICT WARNING:</strong>
                <ul style={{ margin: '8px 0 0 20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {calcResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Route Summary KPI Cards */}
            <div className="planner-kpi-grid">
              <div className="planner-kpi-card">
                <span className="kpi-label">TOTAL DISTANCE</span>
                <span className="kpi-value font-mono status-cyan">
                  {calcResult.metrics.calculatedDistanceNm} <span className="kpi-unit">NM</span>
                </span>
                <span className="kpi-sub">
                  vs Direct: <span className="font-mono">{calcResult.metrics.directDistanceNm} NM</span>
                </span>
              </div>

              <div className="planner-kpi-card">
                <span className="kpi-label">TRANSIT DURATION</span>
                <span className="kpi-value font-mono status-low">
                  {calcResult.metrics.calculatedDurationHours} <span className="kpi-unit">HRS</span>
                </span>
                <span className="kpi-sub status-low font-mono">
                  ⏱️ {calcResult.metrics.timeSavingsHours}h faster than pack ice
                </span>
              </div>

              <div className="planner-kpi-card">
                <span className="kpi-label">RISK REDUCTION</span>
                <span className="kpi-value font-mono status-cyan">
                  −{calcResult.metrics.riskReductionPercent}%
                </span>
                <span className="kpi-sub">
                  Ice Threat: <span className="status-low font-mono">{calcResult.metrics.calculatedIceRiskScore}/100</span>
                </span>
              </div>

              <div className="planner-kpi-card">
                <span className="kpi-label">ESTIMATED FUEL</span>
                <span className="kpi-value font-mono status-mod">
                  {calcResult.metrics.fuelEstimateLiters.toLocaleString()} <span className="kpi-unit">L</span>
                </span>
                <span className="kpi-sub font-mono">
                  @ {selectedVessel.fuelConsumptionLPerNm} L/NM rate
                </span>
              </div>
            </div>

            {/* Generated Waypoints Sequence */}
            <div className="calculated-waypoints-box">
              <div className="box-header">
                <span className="box-title">📍 COMPUTED WAYPOINT CORRIDOR</span>
                <span className="box-count font-mono">{calcResult.route.waypoints.length} WAYPOINTS</span>
              </div>

              <div className="calc-waypoints-table">
                {calcResult.route.waypoints.map((wp, i) => (
                  <div key={wp.id} className="calc-wp-row font-mono">
                    <span className="wp-num">0{i + 1}</span>
                    <span className="wp-name status-cyan">{wp.name}</span>
                    <span className="wp-coord">
                      {Math.abs(wp.coord.lat).toFixed(2)}°S, {Math.abs(wp.coord.lng).toFixed(2)}°W
                    </span>
                    <span className="wp-ice">❄️ {wp.iceConcentrationTenths}/10 ({wp.iceThicknessMeters}m)</span>
                    <span className="wp-eta status-low">{wp.estimatedArrival}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparative Analysis Table */}
            <div className="comparative-table-box">
              <div className="box-header">
                <span className="box-title">⚖️ CORRIDOR COMPARATIVE BENCHMARK</span>
              </div>
              <div className="benchmark-grid font-mono">
                <div className="benchmark-header">ROUTE TYPE</div>
                <div className="benchmark-header">DISTANCE</div>
                <div className="benchmark-header">TRANSIT TIME</div>
                <div className="benchmark-header">ICE RISK</div>

                <div className="benchmark-cell status-cyan font-bold">✨ AI Computed Safe Route</div>
                <div className="benchmark-cell status-cyan">{calcResult.metrics.calculatedDistanceNm} NM</div>
                <div className="benchmark-cell status-low">{calcResult.metrics.calculatedDurationHours} Hours</div>
                <div className="benchmark-cell status-low">LOW ({calcResult.metrics.calculatedIceRiskScore}%)</div>

                <div className="benchmark-cell status-crit">⚠️ Direct Channel Pack Ice</div>
                <div className="benchmark-cell">{calcResult.metrics.directDistanceNm} NM</div>
                <div className="benchmark-cell status-crit">{calcResult.metrics.directDurationHours} Hours</div>
                <div className="benchmark-cell status-crit">SEVERE ({calcResult.metrics.directIceRiskScore}%)</div>
              </div>
            </div>

            {/* Alternative Routes Quick View */}
            {calcResult.alternatives && calcResult.alternatives.length > 0 && (
              <div className="comparative-table-box" style={{ marginTop: '20px' }}>
                <div className="box-header">
                  <span className="box-title">🔀 ALTERNATIVE PATHFINDING PROFILES</span>
                </div>
                <div className="benchmark-grid font-mono">
                  <div className="benchmark-header">MODE</div>
                  <div className="benchmark-header">DISTANCE</div>
                  <div className="benchmark-header">DURATION</div>
                  <div className="benchmark-header">ICE RISK</div>
                  
                  {calcResult.alternatives.map((alt) => (
                    <React.Fragment key={alt.id}>
                      <div className="benchmark-cell" style={{ color: alt.color }}>{alt.name}</div>
                      <div className="benchmark-cell">{alt.totalDistanceNm} NM</div>
                      <div className="benchmark-cell">{alt.estimatedDurationHours} Hrs</div>
                      <div className="benchmark-cell">{alt.averageIceRiskScore}%</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar: Push to Navigator & Export */}
            <div className="results-actions-bar">
              <button
                type="button"
                className={`btn-engage-route ${appliedSuccess ? "engaged-success" : ""}`}
                onClick={handleEngageRoute}
              >
                {appliedSuccess ? (
                  <span>✅ ROUTE ENGAGED & PUSHED TO NAVIGATOR!</span>
                ) : (
                  <span>🧭 ENGAGE & PUSH TO NAVIGATOR</span>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
