import { useState } from "react";
import type { EmergencyDistressState } from "../types/navigator";

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  emergencyState: EmergencyDistressState;
  onActivateDistress: (type: NonNullable<EmergencyDistressState["distressType"]>) => void;
  onDeactivateDistress: () => void;
}

export function EmergencyModal({
  isOpen,
  onClose,
  emergencyState,
  onActivateDistress,
  onDeactivateDistress,
}: EmergencyModalProps) {
  const [selectedType, setSelectedType] = useState<NonNullable<EmergencyDistressState["distressType"]>>("HULL_BREACH");

  if (!isOpen) return null;

  const distressTypes = [
    {
      id: "HULL_BREACH" as const,
      label: "HULL BREACH / FLOODING",
      icon: "🌊",
      desc: "Structural ice collision breach detected in bow/keel compartment.",
    },
    {
      id: "ICE_BESETMENT" as const,
      label: "ICE BESETMENT (TRAPPED)",
      icon: "🧊",
      desc: "Vessel immobilized in heavy multi-year pack ice / pressure ridges.",
    },
    {
      id: "MEDICAL_EVAC" as const,
      label: "POLAR MEDICAL EVACUATION",
      icon: "🚑",
      desc: "Life-threatening medical emergency requiring helicopter SAR extraction.",
    },
    {
      id: "ENGINE_FAILURE" as const,
      label: "MAIN PROPULSION / POWER LOSS",
      icon: "⚡",
      desc: "Total black-out or rudder freeze in freezing drift zone.",
    },
    {
      id: "COLLISION_RISK" as const,
      label: "IMMINENT ICEBERG COLLISION",
      icon: "💥",
      desc: "Tabular iceberg calving collision trajectory within 0.5 NM.",
    },
  ];

  return (
    <div className="modal-overlay">
      <div className="emergency-modal-card">
        <div className="emergency-modal-header">
          <div className="header-title-flex">
            <span className="sos-blinker-icon">🚨</span>
            <div>
              <h3>POLAR EMERGENCY & SOS DISTRESS CONSOLE</h3>
              <p className="modal-sub">
                GMDSS / COSPAS-SARSAT 406 MHz International Distress Protocol
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="emergency-modal-body">
          {!emergencyState.isDistressActive ? (
            <div className="distress-activation-flow">
              <div className="distress-warning-banner">
                <span className="warning-icon">⚠️</span>
                <div>
                  <strong>DECLARING MAYDAY DISTRESS TRANSMISSION:</strong>
                  <p>
                    This will broadcast emergency distress packets across satellite GMDSS,
                    activate the 406 MHz EPIRB beacon, alert MRCC Punta Arenas, and request immediate
                    icebreaker tasking.
                  </p>
                </div>
              </div>

              <span className="flow-step-label">SELECT EMERGENCY CATEGORY:</span>
              <div className="distress-types-grid">
                {distressTypes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`distress-type-card ${selectedType === t.id ? "selected" : ""}`}
                    onClick={() => setSelectedType(t.id)}
                  >
                    <span className="type-icon">{t.icon}</span>
                    <div className="type-text">
                      <span className="type-title">{t.label}</span>
                      <span className="type-desc">{t.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="haven-fallback-box">
                <span className="haven-label">NEAREST ICE SHELTER HAVEN:</span>
                <span className="haven-value highlight-cyan">
                  {emergencyState.nearestShelterHaven.name} ({emergencyState.nearestShelterHaven.distanceNm} NM @ {emergencyState.nearestShelterHaven.bearingDeg}°)
                </span>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel / Return
                </button>
                <button
                  type="button"
                  className="btn-trigger-distress"
                  onClick={() => onActivateDistress(selectedType)}
                >
                  🚨 BROADCAST MAYDAY DISTRESS
                </button>
              </div>
            </div>
          ) : (
            <div className="distress-active-flow">
              <div className="active-distress-hero">
                <span className="active-siren">🚨</span>
                <div className="active-hero-text">
                  <h4>MAYDAY DISTRESS TRANSMISSION ACTIVE</h4>
                  <p className="hero-category">
                    INCIDENT: {emergencyState.distressType?.replace("_", " ")}
                  </p>
                  <span className="hero-timestamp font-mono">
                    TRANSMITTING SINCE: {emergencyState.activatedAtUtc}
                  </span>
                </div>
              </div>

              <div className="sar-status-grid">
                <div className="sar-status-item">
                  <span className="sar-label">EPIRB 406 MHz BEACON</span>
                  <span className="sar-value highlight-green">
                    ● BROADCASTING [HEX ID: 367300A89F12]
                  </span>
                </div>

                <div className="sar-status-item">
                  <span className="sar-label">GMDSS / VHF DSC CHANNEL 16</span>
                  <span className="sar-value highlight-green">
                    ● CONTINUOUS LOOP TRANSMISSION
                  </span>
                </div>

                <div className="sar-status-item">
                  <span className="sar-label">SAR COORDINATION</span>
                  <span className="sar-value highlight-cyan">
                    {emergencyState.acknowledgedBy || "MRCC Punta Arenas & McMurdo Base [ACKNOWLEDGED]"}
                  </span>
                </div>

                <div className="sar-status-item">
                  <span className="sar-label">DISPATCHED RESCUE VESSEL</span>
                  <span className="sar-value highlight-amber">
                    {emergencyState.nearestRescueVessel} — ETA: {emergencyState.rescueEtaHours}h
                  </span>
                </div>
              </div>

              <div className="shelter-route-advisory">
                <span className="advisory-badge">TACTICAL SHELTER ADVISORY</span>
                <p>
                  Steer bearing <strong>{emergencyState.nearestShelterHaven.bearingDeg}°</strong> toward{" "}
                  <strong>{emergencyState.nearestShelterHaven.name}</strong> ({emergencyState.nearestShelterHaven.coordinates}).
                  Natural rock haven offers protection from drifting ice floes.
                </p>
              </div>

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn-deactivate-distress"
                  onClick={onDeactivateDistress}
                >
                  DEACTIVATE DISTRESS / STAND DOWN
                </button>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Keep Transmitting & Close Dialog
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
