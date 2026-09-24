import type { Position, ApiRoute } from './index';

export interface FleetVessel {
    id: string;
    name: string;
    type: string;
    position: Position;
    heading: number;
    speed_knots: number;
    destination: string;
    status: string;
    mission: string;
    priority: string;
    safety_radius_nm: number;
    eta_destination: string;
    current_risk: string;
}

export interface ConflictDetection {
    vessel_a_id: string;
    vessel_b_id: string;
    cpa_nm: number;
    tcpa_minutes: number;
    severity: string;
    conflict_location: Position;
}

export interface ConvoyRequest {
    lead_vessel_id: string;
    support_vessel_ids: string[];
    origin: Position;
    destination: Position;
    spacing_nm: number;
}

export interface ConvoyResponse {
    convoy_id: string;
    shared_corridor: ApiRoute;
    vessel_routes: Record<string, ApiRoute>;
    estimated_formation_time: string;
    advisories: string[];
}

export interface RendezvousRequest {
    vessel_a_id: string;
    vessel_b_id: string;
    meeting_point?: Position;
    target_time?: string;
}

export interface RendezvousResponse {
    meeting_point: Position;
    vessel_a_route: ApiRoute;
    vessel_b_route: ApiRoute;
    vessel_a_eta: string;
    vessel_b_eta: string;
    waiting_time_minutes: number;
    advisories: string[];
}
