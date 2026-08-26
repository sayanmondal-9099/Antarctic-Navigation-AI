import { useEffect, useState } from "react";
import { type HealthResponse, fetchHealth } from "../api/client";

export type ScreenId = "command_center" | "navigator" | "route_calculator" | "conflict_resolver";

interface HeaderProps {
  vesselName: string;
  callSign: string;
  activeScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
}

export function Header({
  vesselName,
  callSign,
  activeScreen,
  onScreenChange,
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
      </nav>

      {/* ── Telemetry HUD ───────────────────────────────────────────────── */}
      <div className="header-telemetry">
        <div className="telemetry-item">
          <span className="telemetry-label">VESSEL</span>
          <span className="telemetry-value highlight-cyan">
            {vesselName} <span className="telemetry-sub">[{callSign}]</span>
          </span>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">MISSION CLOCK</span>
          <span className="telemetry-value font-mono">{utcTime || "SYNCING..."}</span>
        </div>

        <div className="telemetry-item">
          <span className="telemetry-label">API SERVER</span>
          <div className="health-badge-wrapper">
            {health.status === "loading" && (
              <span className="health-badge health-checking">
                <span className="dot dot-pulse"></span> CHECKING...
              </span>
            )}
            {health.status === "online" && (
              <span
                className="health-badge health-online"
                title={`Connected to ${health.data?.service} (checked at ${health.lastChecked} UTC)`}
              >
                <span className="dot dot-green"></span> ONLINE
                <span className="latency">({health.latencyMs}ms)</span>
              </span>
            )}
            {health.status === "offline" && (
              <button
                type="button"
                className="health-badge health-offline"
                onClick={checkHealth}
                title="Click to reconnect to backend"
              >
                <span className="dot dot-red"></span> OFFLINE (RETRY)
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
