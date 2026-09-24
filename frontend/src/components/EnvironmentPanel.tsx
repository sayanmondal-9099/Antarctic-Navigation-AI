import { useEffect, useState } from 'react';
import { Wind, Droplets, ThermometerSnowflake, Info } from 'lucide-react';

interface EnvironmentSummary {
  weather: any;
  ocean_current: any;
  sea_ice_concentration: number;
  environmental_risk_level: string;
  advisories: string[];
  timestamp: string;
}

interface EnvironmentPanelProps {
  latitude: number;
  longitude: number;
}

export function EnvironmentPanel({ latitude, longitude }: EnvironmentPanelProps) {
  const [data, setData] = useState<EnvironmentSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchEnv = async () => {
      setLoading(true);
      try {
        const url = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
        const res = await fetch(`${url}/environment/summary?latitude=${latitude}&longitude=${longitude}`);
        const json = await res.json();
        if (active) setData(json);
      } catch (err) {
        console.error("Failed to fetch environment:", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchEnv();
    
    // Poll every 30 seconds
    const intervalId = setInterval(fetchEnv, 30000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [latitude, longitude]);

  if (loading && !data) {
    return (
      <div className="bg-slate-900/90 border border-slate-700/50 rounded-xl p-4 mt-4 backdrop-blur-md">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-700 rounded"></div>
              <div className="h-4 bg-slate-700 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="navigator-panel environment-panel" style={{ flex: 1 }}>
      <div className="panel-header">
        <div className="panel-title-row">
          <span className="panel-icon">🌡️</span>
          <h3>ENVIRONMENTAL CONDITIONS</h3>
        </div>
        <span className={`badge ${
          data.environmental_risk_level === 'CRITICAL' ? 'badge-critical' :
          data.environmental_risk_level === 'HIGH' ? 'badge-severe' :
          data.environmental_risk_level === 'MODERATE' ? 'badge-elevated' :
          'badge-nominal'
        }`}>
          {data.environmental_risk_level} RISK
        </span>
      </div>

      <div className="panel-body">
        <div className="grid grid-cols-2 gap-3 mb-2">
          {/* Wind */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 flex items-start gap-3" style={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400" style={{ color: 'var(--cyan-bright)' }}>
              <Wind size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Wind</div>
              {data.weather ? (
                <>
                  <div className="text-slate-100 font-semibold" style={{ color: 'var(--text-primary)' }}>{data.weather.wind_speed_knots} kts</div>
                  <div className="text-slate-400 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{data.weather.wind_direction_deg}°</div>
                </>
              ) : (
                <div className="text-slate-500 text-xs">Unavailable</div>
              )}
            </div>
          </div>

          {/* Current */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 flex items-start gap-3" style={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400" style={{ color: '#818cf8' }}>
              <Droplets size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Current</div>
              {data.ocean_current ? (
                <>
                  <div className="text-slate-100 font-semibold" style={{ color: 'var(--text-primary)' }}>{data.ocean_current.current_speed_knots} kts</div>
                  <div className="text-slate-400 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{data.ocean_current.current_direction_deg}°</div>
                </>
              ) : (
                <div className="text-slate-500 text-xs">Unavailable</div>
              )}
            </div>
          </div>

          {/* Temp */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 flex items-start gap-3" style={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400" style={{ color: 'var(--cyan-bright)' }}>
              <ThermometerSnowflake size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Temperature</div>
              {data.weather ? (
                <>
                  <div className="text-slate-100 font-semibold" style={{ color: 'var(--text-primary)' }}>{data.weather.temperature_c}°C</div>
                </>
              ) : (
                <div className="text-slate-500 text-xs">Unavailable</div>
              )}
            </div>
          </div>
          
          {/* Sea Ice */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30 flex items-start gap-3" style={{ background: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}>
            <div className="p-2 bg-slate-100/10 rounded-lg text-slate-300" style={{ color: 'var(--text-secondary)' }}>
              <Info size={18} />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Sea Ice</div>
              {data.sea_ice_concentration !== null ? (
                <>
                  <div className="text-slate-100 font-semibold" style={{ color: 'var(--text-primary)' }}>{(data.sea_ice_concentration * 10).toFixed(0)}%</div>
                </>
              ) : (
                <div className="text-slate-500 text-xs">Unavailable</div>
              )}
            </div>
          </div>
        </div>

        <div className="advisories-card mt-2">
          <div className="advisories-header">
            <span className="advisory-title">ACTIVE ADVISORIES</span>
          </div>
          <ul className="advisories-list">
            {data.advisories.map((adv, idx) => (
              <li key={idx} className="advisory-item">
                <span className="advisory-bullet">›</span> {adv}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
