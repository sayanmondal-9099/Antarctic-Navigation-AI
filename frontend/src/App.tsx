import { useState, useEffect } from "react";
import {
  Header,
  type ScreenId,
  AntarcticMap,
  ShipStatusPanel,
  RiskAnalysisPanel,
  NavigatorScreen,
  RouteCalculatorScreen,
  ConflictResolverScreen,
  FleetDashboard,
  LoginScreen,
  SimulationController,
} from "./components";
import { onAuthStateChanged, type AppUser } from "./services/supabase/auth";
import {
  initialRiskAnalysis,
} from "./data/mockNavigationData";
import { useSimulation } from "./hooks/useSimulation";
import "./App.css";

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>("command_center");
  const [user, setUser] = useState<AppUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const simulation = useSimulation();
  
  // Use simulation state as the source of truth for the app
  const vessel = simulation.vessel;
  const activeRoute = simulation.activeRoute;
  const riskAnalysis = { ...initialRiskAnalysis, overallLevel: simulation.riskLevel as "LOW" | "MODERATE" | "HIGH" | "CRITICAL" };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  if (!authInitialized) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--color-bg-base)', color: 'var(--color-text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="brand-pulse-ring" style={{ position: 'relative' }}></span>
          <span>INITIALIZING SYSTEM...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={setUser} />;
  }

  const handleApplyRoute = () => {
    // Only used outside simulation
    setActiveScreen("navigator");
  };

  const handleExecuteDeconfliction = () => {
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
        user={user}
      />

      {/* ── Screen 1: Command Center (Overview & Map) ─────────── */}
      {activeScreen === "command_center" && (
        <main className="command-main-grid">
          {/* Left Sidebar: Compact Risk and Status */}
          <aside className="grid-area-left">
            <RiskAnalysisPanel initialRisk={riskAnalysis} />
            <ShipStatusPanel vessel={vessel} onSpeedChange={() => {}} />
          </aside>

          {/* Center: Tactical Antarctic Navigation Map */}
          <section className="grid-area-map">
            <AntarcticMap vessel={vessel} recommendedRoute={activeRoute} simulationTime={simulation.time} setSimulationTime={simulation.setTime} />
            {/* Primary Action Button Floating */}
            <div className="map-floating-actions">
               <button className="primary-action-btn" onClick={() => simulation.setIsPlaying(!simulation.isPlaying)}>
                 {simulation.isPlaying ? "PAUSE SIMULATION" : simulation.time === 0 ? "START OPERATIONAL SIMULATION" : "RESUME SIMULATION"}
               </button>
            </div>
          </section>

          {/* Right Sidebar: Removed for map emphasis. Could add collapsible details here later. */}
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

      {/* ── Screen 5: Fleet Dashboard ───────────────────────────────── */}
      {activeScreen === "fleet_dashboard" && (
        <main className="command-main-grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="flex h-full w-full justify-center">
            <FleetDashboard />
          </div>
        </main>
      )}

      {/* ── Simulation Controller (Timeline and Playback) ──────── */}
      {activeScreen === "command_center" && (
         <SimulationController 
           time={simulation.time}
           isPlaying={simulation.isPlaying}
           onPlayPause={() => simulation.setIsPlaying(!simulation.isPlaying)}
           onReset={simulation.reset}
           speedMultiplier={simulation.speedMultiplier}
           onSpeedChange={simulation.setSpeedMultiplier}
           status={simulation.simulationStatus}
         />
      )}

      {/* ── Tactical Status Footer ─────────────────────────────── */}
      <footer className="command-footer" style={{ marginTop: 'auto', paddingTop: '12px' }}>
        <div className="footer-status-line">
          <span className="footer-indicator">●</span>
          <span>ANTARCTIC AUTONOMOUS MARITIME SAFETY SYSTEM</span>
          <span className="footer-separator">|</span>
          <span>POLAR CODE CATEGORY A / PC2 COMPLIANT</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
