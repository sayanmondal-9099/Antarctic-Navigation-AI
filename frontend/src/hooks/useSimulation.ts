/* eslint-disable react/set-state-in-effect */
import { useState, useEffect, useRef } from "react";
import { initialVessel, recommendedRoute, directHazardRoute } from "../data/mockNavigationData";
import type { VesselState, NavigationRoute } from "../types/navigation";

export type SimulationState = {
  time: number; // 0 to 24 (representing T+00 to T+24)
  setTime: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  speedMultiplier: number;
  vessel: VesselState;
  activeRoute: NavigationRoute;
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  simulationStatus: string;
};

export const useSimulation = () => {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [vessel, setVessel] = useState<VesselState>(initialVessel);

  const lastUpdateRef = useRef<number>(0);

  const reset = () => {
    setTime(0);
    setIsPlaying(false);
    setVessel(initialVessel);
  };

  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      if (isPlaying) {
        const now = Date.now();
        if (lastUpdateRef.current === 0) lastUpdateRef.current = now;
        const delta = (now - lastUpdateRef.current) / 1000; // seconds
        lastUpdateRef.current = now;

        setTime((prevTime) => {
          const newTime = prevTime + delta * speedMultiplier * 0.5; // Scale so T+24 takes ~48 seconds at 1x
          if (newTime >= 24) {
            setIsPlaying(false);
            return 24;
          }
          return newTime;
        });
      } else {
        lastUpdateRef.current = Date.now();
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, speedMultiplier]);

  // Derive deterministic events based on time
  let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";
  let simulationStatus = "MISSION START";
  let activeRoute: NavigationRoute = recommendedRoute;

  if (time < 2) {
    riskLevel = "LOW";
    simulationStatus = "MISSION START";
    activeRoute = recommendedRoute;
  } else if (time >= 2 && time < 4) {
    simulationStatus = "SEA-ICE DENSITY INCREASES";
    riskLevel = "MODERATE";
    activeRoute = recommendedRoute;
  } else if (time >= 4 && time < 6) {
    simulationStatus = "ICEBERG DETECTED NEAR PLANNED ROUTE";
    riskLevel = "HIGH";
    activeRoute = recommendedRoute;
  } else if (time >= 6 && time < 8) {
    simulationStatus = "RISK ENGINE RE-EVALUATES ROUTE";
    riskLevel = "CRITICAL";
    activeRoute = recommendedRoute;
  } else if (time >= 8 && time < 10) {
    simulationStatus = "ALTERNATIVE ROUTE GENERATED";
    if (directHazardRoute) activeRoute = directHazardRoute;
    riskLevel = "MODERATE";
  } else if (time >= 10 && time < 12) {
    simulationStatus = "SECOND VESSEL ENTERS AREA";
    if (directHazardRoute) activeRoute = directHazardRoute;
    riskLevel = "MODERATE";
  } else if (time >= 12 && time < 14) {
    simulationStatus = "POTENTIAL ROUTE CONFLICT DETECTED";
    if (directHazardRoute) activeRoute = directHazardRoute;
    riskLevel = "HIGH";
  } else if (time >= 14 && time < 16) {
    simulationStatus = "DECONFLICTION CALCULATION";
    if (directHazardRoute) activeRoute = directHazardRoute;
    riskLevel = "HIGH";
  } else if (time >= 16 && time < 18) {
    simulationStatus = "SAFE CORRIDOR IDENTIFIED";
    if (recommendedRoute) activeRoute = recommendedRoute;
    riskLevel = "LOW";
  } else if (time >= 18 && time < 20) {
    simulationStatus = "VESSEL CONTINUES";
    if (recommendedRoute) activeRoute = recommendedRoute;
    riskLevel = "LOW";
  } else if (time >= 20 && time < 22) {
    simulationStatus = "MISSION PROGRESS";
    if (recommendedRoute) activeRoute = recommendedRoute;
    riskLevel = "LOW";
  } else {
    simulationStatus = "MISSION COMPLETE";
    if (recommendedRoute) activeRoute = recommendedRoute;
    riskLevel = "LOW";
  }

  // Interpolate vessel position
  useEffect(() => {
    if (activeRoute.waypoints && activeRoute.waypoints.length > 0) {
      const progress = time / 24;
      const totalWaypoints = activeRoute.waypoints.length;
      const currentIndex = Math.min(
        Math.floor(progress * totalWaypoints),
        totalWaypoints - 1
      );
      const nextIndex = Math.min(currentIndex + 1, totalWaypoints - 1);
      
      const currentWp = activeRoute.waypoints[currentIndex];
      const nextWp = activeRoute.waypoints[nextIndex];
      
      const segmentProgress = (progress * totalWaypoints) - currentIndex;
      
      const lat = currentWp.coord.lat + (nextWp.coord.lat - currentWp.coord.lat) * segmentProgress;
      const lng = currentWp.coord.lng + (nextWp.coord.lng - currentWp.coord.lng) * segmentProgress;

      setVessel(prev => ({
        ...prev,
        position: { lat, lng }
      }));
    }

  }, [time, activeRoute.waypoints]);

  return {
    time,
    setTime,
    isPlaying,
    setIsPlaying,
    speedMultiplier,
    setSpeedMultiplier,
    reset,
    vessel,
    activeRoute,
    riskLevel,
    simulationStatus
  };
};
