import type { FleetVessel, ConflictDetection, ConvoyRequest, ConvoyResponse, RendezvousRequest, RendezvousResponse } from '../../types/fleet';
import type { ApiRoute } from '../../types/index';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const fleetApi = {
    async getFleet(): Promise<FleetVessel[]> {
        const response = await fetch(`${API_BASE}/fleet/`);
        if (!response.ok) throw new Error('Failed to fetch fleet');
        return response.json();
    },

    async getConflicts(): Promise<ConflictDetection[]> {
        const response = await fetch(`${API_BASE}/fleet/conflicts`);
        if (!response.ok) throw new Error('Failed to fetch conflicts');
        return response.json();
    },

    async analyzeConflicts(vesselId: string, plannedRoute: ApiRoute): Promise<ConflictDetection[]> {
        const response = await fetch(`${API_BASE}/fleet/conflicts/analyze?vessel_id=${encodeURIComponent(vesselId)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(plannedRoute),
        });
        if (!response.ok) throw new Error('Failed to analyze conflicts');
        return response.json();
    },

    async planConvoy(request: ConvoyRequest): Promise<ConvoyResponse> {
        const response = await fetch(`${API_BASE}/fleet/convoy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error('Failed to plan convoy');
        return response.json();
    },

    async planRendezvous(request: RendezvousRequest): Promise<RendezvousResponse> {
        const response = await fetch(`${API_BASE}/fleet/rendezvous`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error('Failed to plan rendezvous');
        return response.json();
    }
};
