import { useState } from "react";
import {
  Header,
  type ScreenId,
  AntarcticMap,
  ShipStatusPanel,
  RiskAnalysisPanel,
  NavigatorScreen,
  RouteCalculatorScreen,
  ConflictResolverScreen,
} from "./components";
import {
  initialVessel,
  recommendedRoute,
  initialRiskAnalysis,
} from "./data/mockNavigationData";
import type { VesselState, NavigationRoute } from "./types/navigation";
import "./App.css";

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("command_center");
  const [vessel, setVessel] = useState<VesselState>(initialVessel);
  const [activeRoute, setActiveRoute] = useState<NavigationRoute>(recommendedRoute);

  const handleSpeedChange = (newSpeed: number) => {
    setVessel((prev) => ({
      ...prev,
      speedKnots: newSpeed,
      engineLoadPercentage: Math.min(100, Math.round((newSpeed / 18) * 85 + 10)),
      hullStrainMpa: parseFloat((10 + (newSpeed / 14.2) * 3.5).toFixed(1)),
      status: newSpeed === 0 ? "anchored" : newSpeed > 13 ? "cruising" : "icebreaking",
    }));
  };

  const handleApplyRoute = (newRoute: NavigationRoute, destinationName: string) => {
    setActiveRoute(newRoute);
    setVessel((prev) => ({
      ...prev,
      destination: destinationName,
      eta: `${newRoute.estimatedDurationHours} Hours`,
    }));
    // Switch to Navigator to fly the newly calculated route
    setActiveScreen("navigator");
  };

  const handleExecuteDeconfliction = (
    newRoute: NavigationRoute,
    newHeading: number,
    newSpeed: number
  ) => {
    setActiveRoute(newRoute);
    setVessel((prev) => ({
      ...prev,
      headingDegrees: newHeading,
      speedKnots: newSpeed,
    }));
    // Switch to Navigator to fly the deconflicted corridor
    setActiveScreen("navigator");
  };

  return (
    <div className="command-center-root">
      {/* ── Top Header & Mission HUD ───────────────────────────── */}
      <Header
        vesselName={vessel.name}
        callSign={vessel.callSign}
        activeScreen={activeScreen}
        onScreenChange={setActiveScreen}
      />

      {/* ── Screen 1: Command Center (Overview & Map) ─────────── */}
      {activeScreen === "command_center" && (
        <main className="command-main-grid">
          {/* Top: Tactical Antarctic Navigation Map */}
          <section className="grid-area-map">
            <AntarcticMap vessel={vessel} recommendedRoute={activeRoute} />
          </section>

          {/* Bottom Split: Ship Status (Left) and Risk Analysis (Right) */}
          <div className="grid-area-bottom-split">
            <ShipStatusPanel vessel={vessel} onSpeedChange={handleSpeedChange} />
            <RiskAnalysisPanel initialRisk={initialRiskAnalysis} />
          </div>
        </main>
      )}

      {/* ── Screen 2: Navigator (Pilot, Waypoint, AIS Traffic & SOS) ─── */}
      {activeScreen === "navigator" && (
        <main className="navigator-main-view">
          <NavigatorScreen
            vessel={vessel}
            recommendedRoute={activeRoute}
          />
        </main>
      )}

      {/* ── Screen 3: Route Calculator (Origin, Dest, Vessel, Risk) ──── */}
      {activeScreen === "route_calculator" && (
        <main className="planner-main-view">
          <RouteCalculatorScreen
            onApplyRoute={handleApplyRoute}
          />
        </main>
      )}

      {/* ── Screen 4: Conflict Resolver (Ship A vs Ship B & Alternatives) */}
      {activeScreen === "conflict_resolver" && (
        <main className="conflict-main-view">
          <ConflictResolverScreen
            onExecuteDeconfliction={handleExecuteDeconfliction}
          />
        </main>
      )}

      {/* ── Tactical Status Footer ─────────────────────────────── */}
      <footer className="command-footer">
        <div className="footer-status-line">
          <span className="footer-indicator">●</span>
          <span>ANTARCTIC AUTONOMOUS MARITIME SAFETY SYSTEM</span>
          <span className="footer-separator">|</span>
          <span>POLAR CODE CATEGORY A / PC2 COMPLIANT</span>
          <span className="footer-separator">|</span>
          <span>
            ACTIVE VIEW:{" "}
            {activeScreen === "conflict_resolver"
              ? "SCREEN 4 (CONFLICT RESOLVER & ALTERNATIVES)"
              : activeScreen === "route_calculator"
              ? "SCREEN 3 (ROUTE CALCULATOR)"
              : activeScreen === "navigator"
              ? "SCREEN 2 (NAVIGATOR PILOT)"
              : "SCREEN 1 (COMMAND CENTER)"}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
