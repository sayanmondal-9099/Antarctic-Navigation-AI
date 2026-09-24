import React, { useState, useEffect } from 'react';
import { ShieldAlert, Ship, Navigation, Route, Users, MapPin } from 'lucide-react';
import type { FleetVessel, ConvoyResponse, RendezvousResponse } from '../types/fleet';
import { fleetApi } from '../services/api/fleet';
import type { Position } from '../types/index';

export const FleetDashboard: React.FC = () => {
    const [vessels, setVessels] = useState<FleetVessel[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVessel, setSelectedVessel] = useState<FleetVessel | null>(null);
    const [activeConvoy, setActiveConvoy] = useState<ConvoyResponse | null>(null);
    const [activeRendezvous, setActiveRendezvous] = useState<RendezvousResponse | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchFleet = async () => {
            try {
                const data = await fleetApi.getFleet();
                setVessels(data);
            } catch (err) {
                console.error('Failed to fetch fleet', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFleet();
        // Set up polling
        const interval = setInterval(fetchFleet, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSimulateConvoy = async () => {
        if (!selectedVessel || vessels.length < 2) return;
        
        setProcessing(true);
        try {
            // Find another vessel to act as support
            const support = vessels.find(v => v.id !== selectedVessel.id);
            if (!support) return;

            const request = {
                lead_vessel_id: selectedVessel.id,
                support_vessel_ids: [support.id],
                origin: selectedVessel.position,
                destination: { lat: -65.0, lon: -55.0 } as Position, // arbitrary destination
                spacing_nm: 2.0
            };
            const response = await fleetApi.planConvoy(request);
            setActiveConvoy(response);
            setActiveRendezvous(null);
        } catch (err) {
            console.error('Failed to simulate convoy', err);
        } finally {
            setProcessing(false);
        }
    };

    const handleSimulateRendezvous = async () => {
        if (!selectedVessel || vessels.length < 2) return;
        
        setProcessing(true);
        try {
            const partner = vessels.find(v => v.id !== selectedVessel.id);
            if (!partner) return;

            const request = {
                vessel_a_id: selectedVessel.id,
                vessel_b_id: partner.id
            };
            const response = await fleetApi.planRendezvous(request);
            setActiveRendezvous(response);
            setActiveConvoy(null);
        } catch (err) {
            console.error('Failed to simulate rendezvous', err);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <section className="command-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header">
                <div className="panel-title-row">
                    <span className="panel-icon">
                        <Users size={16} />
                    </span>
                    <h3>FLEET OPERATIONS</h3>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Active Fleet List */}
                <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Vessels</h3>
                    {loading ? (
                        <div className="text-sm text-slate-500">Loading fleet...</div>
                    ) : (
                        <div className="space-y-2">
                            {vessels.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedVessel(v)}
                                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                        selectedVessel?.id === v.id
                                            ? 'bg-indigo-900/40 border-indigo-500'
                                            : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-slate-100 flex items-center gap-2">
                                                <Ship className="w-4 h-4 text-cyan-400" />
                                                {v.name}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">{v.mission} • {v.type}</div>
                                        </div>
                                        <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                            {v.speed_knots}kts
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vessel Details & Operations */}
                {selectedVessel && (
                    <div className="panel-body mt-4" style={{ background: 'var(--bg-surface-elevated)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Navigation className="w-4 h-4" style={{ color: 'var(--status-nominal)' }} />
                            Tactical Options: {selectedVessel.name}
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="p-2 rounded" style={{ background: 'var(--bg-surface-base)', border: '1px solid var(--border-subtle)' }}>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Priority</div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedVessel.priority}</div>
                            </div>
                            <div className="p-2 rounded" style={{ background: 'var(--bg-surface-base)', border: '1px solid var(--border-subtle)' }}>
                                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Safety Radius</div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedVessel.safety_radius_nm} NM</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button 
                                onClick={handleSimulateConvoy}
                                disabled={processing}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Route className="w-4 h-4" />
                                Form Convoy
                            </button>
                            
                            <button 
                                onClick={handleSimulateRendezvous}
                                disabled={processing}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <MapPin className="w-4 h-4" />
                                Plan Rendezvous
                            </button>
                        </div>
                    </div>
                )}

                {/* Operation Results */}
                {activeConvoy && (
                    <div className="bg-indigo-900/30 rounded-lg p-4 border border-indigo-500/50">
                        <h3 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" />
                            Convoy Authorized
                        </h3>
                        <div className="text-xs text-slate-300 mb-2 space-y-1">
                            <p><strong>Corridor Risk:</strong> {activeConvoy.shared_corridor.risk_level}</p>
                            <p><strong>Distance:</strong> {activeConvoy.shared_corridor.total_distance_nm} NM</p>
                        </div>
                        <div className="text-xs text-indigo-300 bg-indigo-950/50 p-2 rounded">
                            {activeConvoy.advisories[0]}
                        </div>
                    </div>
                )}

                {activeRendezvous && (
                    <div className="bg-emerald-900/30 rounded-lg p-4 border border-emerald-500/50">
                        <h3 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Rendezvous Plotted
                        </h3>
                        <div className="text-xs text-slate-300 mb-2 space-y-1">
                            <p><strong>Point:</strong> {activeRendezvous.meeting_point.lat.toFixed(2)}, {activeRendezvous.meeting_point.lon.toFixed(2)}</p>
                            <p><strong>Wait Time:</strong> {activeRendezvous.waiting_time_minutes} min</p>
                        </div>
                        <div className="text-xs text-emerald-300 bg-emerald-950/50 p-2 rounded">
                            {activeRendezvous.advisories[0]}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
