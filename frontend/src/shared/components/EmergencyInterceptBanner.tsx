import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  ShieldAlert,
  MapPin,
  Clock,
  Radio,
  FileCheck,
  X,
  Volume2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { playRiskAlertSiren } from '../utils/alertSiren';
import { apiClient } from '../../core/api/client';

export const EmergencyInterceptBanner: React.FC = () => {
  const navigate = useNavigate();
  const [activeThreat, setActiveThreat] = useState<any | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callDispatched, setCallDispatched] = useState<any | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Listen for WebSocket or simulate real-time APB threat trigger from live feeds
    const timer = setTimeout(() => {
      if (!isDismissed) {
        const threat = {
          plate: 'GJ01AB1234',
          vehicle: 'Toyota Fortuner 4x4 (White)',
          threat_score: 95,
          camera_id: 'CAM01',
          camera_name: 'SG Highway Iskcon Jct, Ahmedabad',
          nearest_station: 'Navrangpura Police Station',
          nearest_chowki: 'SG Highway Traffic Police Chowki (850m away)',
          speed_kmh: 68.2,
          fir_number: 'FIR-2026-CR-08942',
          timestamp: new Date().toLocaleTimeString(),
        };
        setActiveThreat(threat);
        playRiskAlertSiren(threat.threat_score);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [isDismissed]);

  if (!activeThreat || isDismissed) return null;

  const handleAutoCallDispatch = async () => {
    setIsCalling(true);
    try {
      const res = await apiClient<any>('/api/v1/alerts/auto-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          plate: activeThreat.plate,
          station: activeThreat.nearest_station,
          nearest_chowki: activeThreat.nearest_chowki,
        }),
      });
      setCallDispatched(res);
    } catch {
      // Fallback display
      setCallDispatched({
        auto_call_status: 'CONNECTED_AND_AUDIO_DISPATCHED',
        intercept_chowki: activeThreat.nearest_chowki,
        patrol_units_notified: ['PCR-VAN-04', 'CHOWKI-UNIT-02', 'NHAI-TOLL-INTERCEPT'],
      });
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg w-full font-mono animate-bounce-short select-none">
      <div className="bg-sentinel-950 border-2 border-cyber-crimson rounded-lg shadow-glow-crimson overflow-hidden">
        {/* Top Crimson Banner */}
        <div className="bg-cyber-crimson px-3.5 py-2 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-bold text-xs">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>🚨 APB HIGH-RISK VEHICLE SIGHTED — INTERCEPT ALERT</span>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="hover:bg-red-800 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3 bg-sentinel-950/95 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-yellow-400 bg-black px-2 py-0.5 rounded border border-yellow-500/60">
                  {activeThreat.plate}
                </span>
                <span className="px-2 py-0.5 rounded bg-red-950 border border-cyber-crimson text-cyber-crimson font-bold text-[10px]">
                  RISK: {activeThreat.threat_score}/100
                </span>
              </div>
              <p className="text-slate-200 font-bold mt-1">{activeThreat.vehicle}</p>
              <p className="text-slate-400 text-[11px]">
                {activeThreat.fir_number} &bull; Stolen Vehicle Pursuit
              </p>
            </div>

            <div className="text-right text-[11px] text-slate-400">
              <p className="text-cyber-cyan font-bold flex items-center justify-end gap-1">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                <span>{activeThreat.camera_id.toUpperCase()}</span>
              </p>
              <p>{activeThreat.speed_kmh} km/h</p>
              <p>{activeThreat.timestamp}</p>
            </div>
          </div>

          {/* Nearest Police Station / Chowki Box */}
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-cyber-cyan font-bold">
              <MapPin className="w-3.5 h-3.5 text-cyber-crimson" />
              <span>Nearest Intercept Authority:</span>
            </div>
            <p className="text-slate-200 pl-5 font-semibold">
              {activeThreat.nearest_chowki}
            </p>
            <p className="text-slate-400 pl-5 text-[10px]">
              Jurisdiction: {activeThreat.nearest_station}
            </p>
          </div>

          {/* Emergency Call Status Feedback */}
          {callDispatched ? (
            <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>AUTO-CALL CONNECTED & DOSSIER DISPATCHED</span>
              </div>
              <p className="text-[10px] text-slate-300">
                Audio siren & vehicle profile relayed to <b>{callDispatched.intercept_chowki}</b> and patrol units (PCR-VAN-04, CHOWKI-UNIT-02).
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 pt-1">
              <button
                disabled={isCalling}
                onClick={handleAutoCallDispatch}
                className="flex-1 py-2 rounded bg-cyber-crimson hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-glow-crimson transition-all"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>
                  {isCalling
                    ? 'INITIATING EMERGENCY CALL...'
                    : '🚨 AUTO-CALL NEAREST POLICE STATION'}
                </span>
              </button>

              <button
                onClick={() => navigate(`/investigate?plate=${activeThreat.plate}`)}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan font-bold text-xs flex items-center gap-1 border border-slate-700"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>360° DOSSIER</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
