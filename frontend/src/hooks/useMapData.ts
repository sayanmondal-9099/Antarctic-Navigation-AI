import { useState, useEffect, useMemo, useCallback } from "react";
import type {
  VesselState,
  IcebergHazard,
  NavigationRoute,
} from "../types/navigation";
import {
  initialVessel,
  mockAllVessels,
  mockIcebergs,
  recommendedRoute as defaultRecommendedRoute,
} from "../data/mockNavigationData";
import {
  fetchVessels,
  fetchIcebergs,
  fetchDemoRoute,
} from "../services/api";

export interface MapLayerVisibility {
  vessels: boolean;
  icebergs: boolean;
  routes: boolean;
  seaIce: boolean;
  bathymetry: boolean;
  radarSweep: boolean;
}

export interface MapDestination {
  name: string;
  lat: number;
  lng: number;
  status: string;
}

export function useMapData() {
  const [vessels, setVessels] = useState<VesselState[]>(mockAllVessels);
  const [selectedVesselId, setSelectedVesselId] = useState<string>("vessel-A");
  const [icebergs, setIcebergs] = useState<IcebergHazard[]>(mockIcebergs);
  const [route, setRoute] = useState<NavigationRoute>(defaultRecommendedRoute);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const destination: MapDestination = useMemo(() => ({
    name: "Demo Station (Polar Base)",
    lat: -60.4,
    lng: -38.5,
    status: "PORT OPEN / BERTH READY",
  }), []);

  const [layers, setLayers] = useState<MapLayerVisibility>({
    vessels: true,
    icebergs: true,
    routes: true,
    seaIce: false, // SEA ICE DATA — NOT CONNECTED
    bathymetry: true,
    radarSweep: true,
  });

  // Load from backend if available, fallback gracefully to mock data
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [apiVessels, apiIcebergs, apiRoute] = await Promise.allSettled([
          fetchVessels(),
          fetchIcebergs(),
          fetchDemoRoute(),
        ]);

        if (!isMounted) return;

        if (apiVessels.status === "fulfilled" && apiVessels.value && apiVessels.value.length > 0) {
          setIsBackendConnected(true);
          setVessels((prev) => {
            return prev.map((localV) => {
              const remote = apiVessels.value.find((v: any) => v.id === localV.id);
              if (remote) {
                return {
                  ...localV,
                  position: {
                    lat: remote.position.lat,
                    lng: remote.position.lon,
                    label: `${Math.abs(remote.position.lat).toFixed(1)}°S, ${Math.abs(remote.position.lon).toFixed(1)}°W`,
                  },
                  headingDegrees: remote.heading,
                  speedKnots: remote.speed_knots ?? localV.speedKnots,
                  destination: remote.destination ?? localV.destination,
                };
              }
              return localV;
            });
          });
        }

        if (apiIcebergs.status === "fulfilled" && apiIcebergs.value && apiIcebergs.value.length > 0) {
          const mapped: IcebergHazard[] = apiIcebergs.value.map((ice: any, idx: number) => {
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
              hazardRadiusNm: ice.size_class === "giant" ? 4.8 : ice.threat_level === "high" ? 4.2 : 2.5,
              threatLevel: (ice.threat_level as "high" | "medium" | "low") ?? "medium",
            };
          });
          setIcebergs(mapped);
        }

        if (apiRoute.status === "fulfilled" && apiRoute.value && apiRoute.value.waypoints) {
          setRoute({
            id: apiRoute.value.id,
            name: apiRoute.value.name,
            type: "recommended",
            totalDistanceNm: apiRoute.value.total_distance_nm,
            estimatedDurationHours: apiRoute.value.estimated_duration_hours,
            averageIceRiskScore: Math.round(apiRoute.value.average_risk_score),
            color: "#38bdf8",
            waypoints: apiRoute.value.waypoints.map((wp: any) => ({
              id: wp.id,
              name: wp.name,
              coord: { lat: wp.lat, lng: wp.lon, label: wp.name },
              order: wp.order,
              iceConcentrationTenths: Math.round((wp.ice_risk_score / 100) * 10),
              iceThicknessMeters: 1.2,
              estimatedArrival: `+${wp.order * 3.5}h`,
              depthMeters: 1850,
            })),
          });
        }
      } catch {
        // Fallback remains completely active
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedVessel = useMemo(() => {
    return vessels.find((v) => v.id === selectedVesselId) ?? vessels[0] ?? initialVessel;
  }, [vessels, selectedVesselId]);

  const selectVessel = useCallback((vesselId: string) => {
    setSelectedVesselId(vesselId);
  }, []);

  const toggleLayer = useCallback((layerKey: keyof MapLayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }, []);

  return {
    vessels,
    selectedVessel,
    selectedVesselId,
    selectVessel,
    icebergs,
    route,
    destination,
    layers,
    toggleLayer,
    isLoading,
    isBackendConnected,
  };
}
