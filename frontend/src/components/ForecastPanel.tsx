import React, { useState, useEffect } from 'react';
import type { ModelStatusResponse } from '../services/api/forecastApi';
import { forecastApi } from '../services/api/forecastApi';

export const ForecastPanel: React.FC = () => {
  const [horizon, setHorizon] = useState<number>(24);
  const [status, setStatus] = useState<ModelStatusResponse | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await forecastApi.getStatus();
        setStatus(data);
      } catch (err) {
        console.error("Failed to load forecast model status", err);
      }
    };
    fetchStatus();
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHorizon(parseInt(e.target.value));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-white shadow-xl max-w-sm w-full">
      <h3 className="text-lg font-bold mb-4 tracking-wider flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        FORECAST
      </h3>

      {/* Horizon Slider */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">Forecast Horizon: {horizon}h</label>
        <input 
          type="range" 
          min="12" 
          max="72" 
          step="12" 
          value={horizon} 
          onChange={handleSliderChange}
          className="w-full accent-cyan-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1 px-1">
          <span>12h</span>
          <span>24h</span>
          <span>48h</span>
          <span>72h</span>
        </div>
      </div>

      {/* Predictions Summary (Demo static view as real requires specific targets) */}
      <div className="space-y-4 mb-6">
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold">Sea Ice</span>
            <span className="text-xs text-cyan-400">{horizon}h</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
            <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: '80%' }}></div>
          </div>
          <div className="text-xs text-slate-400">Confidence: <span className="text-green-400 font-mono">HIGH</span></div>
        </div>

        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold">Iceberg Drift</span>
          </div>
          <div className="text-sm text-slate-300 mb-1">
            ↘ 14.2 km (Predicted)
          </div>
          <div className="text-xs text-slate-400">Confidence: <span className="text-yellow-400 font-mono">MODERATE</span></div>
        </div>
      </div>

      {/* Model Status */}
      {status && (
        <div className="border-t border-slate-800 pt-4">
          <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">ML Status</h4>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${status.sea_ice_model.status === 'ready' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="text-slate-300">Sea Ice Model:</span> 
              <span className="text-slate-400 ml-auto capitalize">{status.sea_ice_model.status}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${status.iceberg_model.status === 'ready' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className="text-slate-300">Iceberg Model:</span> 
              <span className="text-slate-400 ml-auto capitalize">{status.iceberg_model.status}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${status.fallback_enabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-slate-300">Fallback:</span> 
              <span className="text-slate-400 ml-auto">{status.fallback_enabled ? 'Enabled' : 'Disabled'}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
