import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { VesselState, IcebergHazard, NavigationRoute, Waypoint } from "../../types/navigation";

// Camera Tracking Component
function CameraTracker({ targetVessel }: { targetVessel: VesselState }) {
  const { controls } = useThree();
  const targetPos = useMemo(() => latLngToVector3(targetVessel.position.lat, targetVessel.position.lng, 0), [targetVessel.position.lat, targetVessel.position.lng]);
  
  useFrame(() => {
    if (controls) {
      (controls as any).target.lerp(targetPos, 0.05);
      (controls as any).update();
    }
  });

  return null;
}

export interface SpatialGlobeMapProps {
  shipA: VesselState;
  shipB: VesselState;
  icebergs: IcebergHazard[];
  activeRoute: NavigationRoute;
  hazardRoute?: NavigationRoute;
  selectedWaypoint: Waypoint | null;
  onSelectWaypoint: (wp: Waypoint | null) => void;
  selectedIceberg: IcebergHazard | null;
  onSelectIceberg: (ice: IcebergHazard | null) => void;
  layers: {
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
  };
  forecastHours: number;
  hoveredTarget: string | null;
  setHoveredTarget: (target: string | null) => void;
  satelliteData?: any;
}

// Coordinate Mapping
const MIN_LAT = -62.6;
const MAX_LAT = -59.2;
const MIN_LNG = -47.8;
const MAX_LNG = -37.8;
const SCALE = 20;

const latLngToVector3 = (lat: number, lng: number, altitude = 0) => {
  const normX = (lng - MIN_LNG) / (MAX_LNG - MIN_LNG);
  const normZ = (MAX_LAT - lat) / (MAX_LAT - MIN_LAT);
  
  // Center it around (0,0,0)
  const x = (normX - 0.5) * SCALE * 2;
  const z = (normZ - 0.5) * SCALE * 1.5;
  
  return new THREE.Vector3(x, altitude, z);
};

// ── Components ─────────────────────────────────────────────────────────────

// NASA GIBS WMS (Global Imagery Browse Services) or mock fallback
// We use a static demo texture if the real one isn't loaded
const AntarcticSurface = ({ 
  showSatellite, 
  showSeaIce,
  satelliteData: _satelliteData
}: { 
  showSatellite: boolean, 
  showSeaIce: boolean,
  satelliteData: any 
}) => {
  // Try to load textures. In a real app we'd build WMS URLs based on bounding box.
  // We'll use a solid color if loading fails or isn't requested.
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
      <planeGeometry args={[SCALE * 2.5, SCALE * 2]} />
      <meshStandardMaterial 
        color="#050914" 
        emissive="#020813"
        metalness={0.8} 
        roughness={0.2}
        wireframe={false}
      />
      {/* We overlay a slightly raised plane for satellite imagery if active */}
      {showSatellite && (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[SCALE * 2.5, SCALE * 2]} />
          <meshBasicMaterial 
            color="#223344" // Placeholder for SAR grey
            transparent 
            opacity={0.5} 
          />
        </mesh>
      )}
      {/* Overlay for Sea Ice */}
      {showSeaIce && (
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[SCALE * 2.5, SCALE * 2]} />
          <meshBasicMaterial 
            color="#aaddff" // Placeholder for Sea Ice
            transparent 
            opacity={0.3} 
          />
        </mesh>
      )}
      <gridHelper args={[SCALE * 2.5, 30, '#0284c7', '#0369a1']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]} />
    </mesh>
  );
};

const VesselModel = ({ vessel, isSelected, onClick, onHover }: { vessel: VesselState, isSelected: boolean, onClick: () => void, onHover: (v: boolean) => void }) => {
  const pos = latLngToVector3(vessel.position.lat, vessel.position.lng, 0.2);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Convert heading to radians (0 is North -> -Z direction in our mapping)
  const headingRad = -(vessel.headingDegrees * Math.PI) / 180;

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = 0.2 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      if (isSelected) {
        meshRef.current.rotation.y = headingRad + Math.sin(state.clock.elapsedTime * 4) * 0.05;
      }
    }
  });

  return (
    <group position={pos} rotation={[0, headingRad, 0]} onClick={onClick} onPointerOver={() => onHover(true)} onPointerOut={() => onHover(false)}>
      {/* Ship Hull (Simplified low-poly look) */}
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[0.3, 0.4, 0.8]} />
        <meshStandardMaterial color={isSelected ? "#00f0ff" : "#0284c7"} emissive={isSelected ? "#0088ff" : "#002244"} emissiveIntensity={isSelected ? 0.8 : 0.2} />
      </mesh>
      
      {/* Selection Ring */}
      {isSelected && (
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.15, 0]}>
          <ringGeometry args={[0.8, 0.9, 32]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* HTML Label overlaying the 3D space */}
      <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(6, 15, 30, 0.85)',
          border: `1px solid ${isSelected ? '#00f0ff' : '#0284c7'}`,
          padding: '4px 8px',
          borderRadius: '4px',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '10px',
          whiteSpace: 'nowrap',
          backdropFilter: 'blur(4px)',
          boxShadow: isSelected ? '0 0 12px rgba(0,240,255,0.4)' : 'none',
          transition: 'all 0.3s ease'
        }}>
          {vessel.name.split(' ')[1]} | {vessel.speedKnots}kt
        </div>
      </Html>
    </group>
  );
};

const IcebergModel = ({ iceberg, isSelected, onClick, onHover }: { iceberg: IcebergHazard, isSelected: boolean, onClick: () => void, onHover: (v: boolean) => void }) => {
  const pos = latLngToVector3(iceberg.position.lat, iceberg.position.lng, 0);
  const isHighThreat = iceberg.threatLevel === 'high';
  
  return (
    <group position={pos} onClick={onClick} onPointerOver={() => onHover(true)} onPointerOut={() => onHover(false)}>
      {/* Base Iceberg Shape */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <coneGeometry args={[0.4, 0.6, 4]} />
        <meshStandardMaterial 
          color={isSelected ? "#38bdf8" : (isHighThreat ? "#ef4444" : "#e0f2fe")}
          emissive={isHighThreat ? "#aa0000" : "#002244"}
          emissiveIntensity={isHighThreat ? 0.5 : 0.1}
          metalness={0.1}
          roughness={0.9}
        />
      </mesh>
      
      {/* Threat Radius Ring */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[iceberg.hazardRadiusNm * 0.2, iceberg.hazardRadiusNm * 0.2 + 0.05, 32]} />
        <meshBasicMaterial color={isHighThreat ? "#ef4444" : "#f59e0b"} transparent opacity={isHighThreat ? 0.6 : 0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const RoutePath = ({ route, isHazard = false }: { route: NavigationRoute, isHazard?: boolean }) => {
  const points = useMemo(() => {
    if (!route || !route.waypoints) return [];
    return route.waypoints.map(wp => latLngToVector3(wp.coord.lat, wp.coord.lng, 0.1));
  }, [route]);

  if (!route || route.waypoints.length === 0) return null;

  const color = isHazard ? '#f87171' : '#00f0ff';
  
  return (
    <group>
      <Line
        points={points}
        color={color}
        lineWidth={isHazard ? 2 : 4}
        dashed={isHazard}
        dashSize={0.5}
        gapSize={0.2}
      />
      {/* Render Route Waypoints */}
      {!isHazard && points.map((p, i) => (
        <mesh key={i} position={[p.x, 0.15, p.z]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>
      ))}
    </group>
  );
};

// ── Main Map Component ─────────────────────────────────────────────────────

export function SpatialGlobeMap({
  shipA,
  shipB,
  icebergs,
  activeRoute,
  hazardRoute,
  selectedWaypoint: _selectedWaypoint,
  onSelectWaypoint: _onSelectWaypoint,
  selectedIceberg,
  onSelectIceberg,
  layers,
  forecastHours: _forecastHours,
  hoveredTarget: _hoveredTarget,
  setHoveredTarget,
  satelliteData
}: SpatialGlobeMapProps) {
  return (
    <Canvas 
      camera={{ position: [0, 10, 15], fov: 45 }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
      shadows
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 5]} intensity={1} castShadow />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#00f0ff" />
      
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
      
      <AntarcticSurface 
        showSatellite={layers.showSatellite}
        showSeaIce={layers.showSeaIce}
        satelliteData={satelliteData}
      />
      
      {/* Entities */}
      <VesselModel 
        vessel={shipA} 
        isSelected={true} // For demonstration, assume active vessel is selected contextually
        onClick={() => {}} 
        onHover={(h) => setHoveredTarget(h ? shipA.id : null)}
      />
      
      <VesselModel 
        vessel={shipB} 
        isSelected={false} 
        onClick={() => {}} 
        onHover={(h) => setHoveredTarget(h ? shipB.id : null)}
      />

      {layers.showIcebergs && icebergs.map(ice => (
        <IcebergModel 
          key={ice.id} 
          iceberg={ice} 
          isSelected={selectedIceberg?.id === ice.id}
          onClick={() => onSelectIceberg(selectedIceberg?.id === ice.id ? null : ice)}
          onHover={(h) => setHoveredTarget(h ? ice.id : null)}
        />
      ))}

      {/* Routes */}
      {layers.showRecommendedRoute && <RoutePath route={activeRoute} />}
      {layers.showHazardRoute && hazardRoute && <RoutePath route={hazardRoute} isHazard={true} />}

      {/* Spatial Controls */}
      <OrbitControls 
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below ground
      />
      
      {/* Camera Tracker for Simulation Storytelling */}
      <CameraTracker targetVessel={shipA} />
    </Canvas>
  );
}
