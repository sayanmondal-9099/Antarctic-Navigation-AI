import { useEffect, useState } from "react";
import { type HealthResponse, fetchHealth } from "../services/api";
import type { AppUser } from "../services/supabase/auth";
import { signOut } from "../services/supabase/auth";

export type ScreenId = "command_center" | "navigator" | "route_calculator" | "conflict_resolver" | "fleet_dashboard";

interface HeaderProps {
  vesselName: string;
  callSign: string;
  activeScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
  user?: AppUser;
}

export function Header({
  vesselName,
  callSign,
  activeScreen,
  onScreenChange,
  user,
}: HeaderProps) {
  const [health, setHealth] = useState<{
    status: "loading" | "online" | "offline";
    data?: HealthResponse;
    latencyMs?: number;
    lastChecked?: string;
  }>({ status: "loading" });

  const [utcTime, setUtcTime] = useState<string>("");

  const checkHealth = async () => {
    const start = performance.now();
    try {
      const data = await fetchHealth();
      const latencyMs = Math.round(performance.now() - start);
      setHealth({
        status: "online",
        data,
        latencyMs,
        lastChecked: new Date().toLocaleTimeString("en-US", {
          timeZone: "UTC",
          hour12: false,
        }),
      });
    } catch {
      setHealth({
        status: "offline",
        lastChecked: new Date().toLocaleTimeString("en-US", {
          timeZone: "UTC",
          hour12: false,
        }),
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    const performHealthCheck = async () => {
      const start = performance.now();
      try {
        const data = await fetchHealth();
        if (!isMounted) return;
        const latencyMs = Math.round(performance.now() - start);
        setHealth({
          status: "online",
          data,
          latencyMs,
          lastChecked: new Date().toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour12: false,
          }),
        });
      } catch {
        if (!isMounted) return;
        setHealth({
          status: "offline",
          lastChecked: new Date().toLocaleTimeString("en-US", {
            timeZone: "UTC",
            hour12: false,
          }),
        });
      }
    };

    void performHealthCheck();
    const healthInterval = setInterval(() => {
      void performHealthCheck();
    }, 15000);

    const updateClock = () => {
      const now = new Date();
      setUtcTime(
        now.toISOString().replace("T", " ").substring(0, 19) + " UTC"
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);

    return () => {
      isMounted = false;
      clearInterval(healthInterval);
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <header className="command-header">
      <div className="header-brand">
        <div className="brand-icon-wrapper">
          <span className="brand-pulse-ring"></span>
          <span className="brand-icon">🧭</span>
        </div>
        <div className="brand-text">
          <div className="brand-title-row">
            <h1>ANTARCTIC NAVIGATION AI</h1>
            <span className="badge badge-ai">AUTONOMOUS AI ACTIVE</span>
          </div>
          <p className="brand-subtitle">
            Polar Route Optimization & Ice Collision Avoidance System
          </p>
          {import.meta.env.VITE_DEMO_MODE === "true" && (
            <span style={{
              background: 'var(--status-critical, #ef4444)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              marginLeft: '12px'
            }}>DEMO MODE</span>
          )}
        </div>
      </div>

      {/* ── Screen Navigation Switcher ───────────────────────────────────── */}
      <nav className="header-nav-switcher">
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === "command_center" ? "active" : ""}`}
          onClick={() => onScreenChange("command_center")}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">1. COMMAND CENTER</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === "navigator" ? "active" : ""}`}
          onClick={() => onScreenChange("navigator")}
        >
          <span className="tab-icon">🧭</span>
          <span className="tab-text">2. NAVIGATOR</span>
          <span className="tab-badge-indicator">PILOT</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === "route_calculator" ? "active" : ""}`}
          onClick={() => onScreenChange("route_calculator")}
        >
          <span className="tab-icon">🗺️</span>
          <span className="tab-text">3. ROUTE CALCULATOR</span>
          <span className="tab-badge-indicator">AI ENGINE</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === "conflict_resolver" ? "active" : ""}`}
          onClick={() => onScreenChange("conflict_resolver")}
        >
          <span className="tab-icon">⚡</span>
          <span className="tab-text">4. CONFLICT RESOLVER</span>
          <span className="tab-badge-indicator badge-conflict-tab">COLREGS</span>
        </button>
        <button
          type="button"
          className={`nav-tab-btn ${activeScreen === "fleet_dashboard" ? "active" : ""}`}
          onClick={() => onScreenChange("fleet_dashboard")}
        >
          <span className="tab-icon">🚢</span>
          <span className="tab-text">5. FLEET</span>
          <span className="tab-badge-indicator">MULTI-VESSEL</span>
        </button>
      </nav>

      {/* ── Telemetry HUD ───────────────────────────────────────────────── */}
      <div className="header-telemetry">
        <div className="telemetry-item">
          <span className="telemetry-label">VESSEL</span>
          <span className="telemetry-value status-cyan">
            {vesselName} <span className="telemetry-sub">[{callSign}]</span>
          </span>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">MISSION CLOCK</span>
          <span className="telemetry-value font-mono">{utcTime || "SYNCING..."}</span>
        </div>

        {user && (
          <div className="telemetry-item">
            <span className="telemetry-label">OPERATOR</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="telemetry-value status-cyan" style={{ fontSize: '0.85em' }}>
                {user.email.split('@')[0].toUpperCase()}
                <span className="telemetry-sub"> [{user.role}]</span>
              </span>
              <button 
                onClick={() => signOut()}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text)',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                LOGOUT
              </button>
              {import.meta.env.VITE_DEMO_MODE === "true" && (
                <button 
                  onClick={() => window.location.reload()}
                  style={{
                    background: 'var(--status-critical, #ef4444)',
                    border: '1px solid var(--status-critical, #ef4444)',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  RESET DEMO
                </button>
              )}
            </div>
          </div>
        )}

        <div className="telemetry-item">
          <span className="telemetry-label">SYSTEM</span>
          <div className="health-badge-wrapper">
            {health.status === "loading" && (
              <span className="health-badge health-checking">
                <span className="dot dot-pulse"></span> CHK
              </span>
            )}
            {health.status === "online" && (
              <span className="health-badge health-online" title="Backend API Connected">
                <span className="dot dot-green"></span> ONLINE
              </span>
            )}
            {health.status === "offline" && (
              <button className="health-badge health-offline" onClick={checkHealth} title="Reconnect">
                <span className="dot dot-red"></span> OFFLINE
              </button>
            )}
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">DATA</span>
          <div className="health-badge-wrapper">
            <span className="health-badge health-online" title="Data Providers Active">
              <span className="dot dot-green"></span> CACHED
            </span>
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">SUPABASE</span>
          <div className="health-badge-wrapper">
             <span className={`health-badge ${user?.isDemo ? 'health-offline' : 'health-online'}`} title={user?.isDemo ? 'Offline / Demo Mode' : 'Connected'}>
                <span className={`dot ${user?.isDemo ? 'dot-amber' : 'dot-green'}`} style={{ backgroundColor: user?.isDemo ? 'var(--amber-neon)' : undefined }}></span> 
                {user?.isDemo ? 'DEMO' : 'CONN'}
             </span>
          </div>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">ML</span>
          <div className="health-badge-wrapper">
             <span className="health-badge health-online" style={{ color: 'var(--cyan-bright)', borderColor: 'var(--cyan-bright)', background: 'rgba(56, 189, 248, 0.1)' }}>
                <span className="dot dot-cyan" style={{ backgroundColor: 'var(--cyan-neon)' }}></span> AVAIL
             </span>
          </div>
        </div>
      </div>
    </header>
  );
}
