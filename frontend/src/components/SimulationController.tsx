import React from "react";
import "./SimulationController.css";

interface SimulationControllerProps {
  time: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  speedMultiplier: number;
  onSpeedChange: (speed: number) => void;
  status: string;
}

export const SimulationController: React.FC<SimulationControllerProps> = ({
  time,
  isPlaying,
  onPlayPause,
  onReset,
  speedMultiplier,
  onSpeedChange,
  status,
}) => {
  const formattedTime = `T+${Math.floor(time).toString().padStart(2, "0")}:${Math.floor((time % 1) * 60).toString().padStart(2, "0")}`;

  return (
    <div className="simulation-controller-container">
      <div className="sim-status-indicator">
        <span className="sim-mode-badge">SIMULATION MODE</span>
        <span className="sim-time-display">{formattedTime}</span>
      </div>

      <div className="sim-controls">
        <button className="sim-btn" onClick={onReset} title="Reset">↻</button>
        <button className="sim-btn primary-sim-btn" onClick={onPlayPause} title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? "Ⅱ" : "▶"}
        </button>
      </div>

      <div className="sim-speed-controls">
        <button className={`sim-speed-btn ${speedMultiplier === 0.5 ? "active" : ""}`} onClick={() => onSpeedChange(0.5)}>0.5×</button>
        <button className={`sim-speed-btn ${speedMultiplier === 1 ? "active" : ""}`} onClick={() => onSpeedChange(1)}>1×</button>
        <button className={`sim-speed-btn ${speedMultiplier === 2 ? "active" : ""}`} onClick={() => onSpeedChange(2)}>2×</button>
      </div>

      <div className="sim-event-feed">
        <div className="sim-event-text">{status}</div>
      </div>
    </div>
  );
};
