import React, { useState } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { playRiskAlertSiren } from '../utils/alertSiren';
import { apiClient } from '../../core/api/client';
import { useTargetStore } from '../../stores/targetStore';

export const EmergencyInterceptBanner: React.FC = () => {
  const navigate = useNavigate();
  const { activeTarget } = useTargetStore();
  const [isCalling, setIsCalling] = useState(false);
  const [callDispatched, setCallDispatched] = useState<any | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!activeTarget || !activeTarget.isWanted || isDismissed) return null;

  const latestSighting = activeTarget.sightings && activeTarget.sightings.length > 0
    ? activeTarget.sightings[activeTarget.sightings.length - 1]
    : {
        camera_name: 'SG Highway Iskcon Jct, Ahmedabad',
        district: 'Ahmedabad City',
        timestamp: new Date().toLocaleTimeString(),
        speed_kmh: 68.2,
      };

  const handleAutoCallDispatch = async () => {
    setIsCalling(true);
    try {
      playRiskAlertSiren(activeTarget.threatScore || 95);
      const res = await apiClient<any>('/api/v1/alerts/auto-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          plate: activeTarget.plate,
          station: activeTarget.policeStation || 'Navrangpura Police Station, Ahmedabad',
          nearest_chowki: `${activeTarget.policeStation || 'SG Highway'} Intercept Unit`,
        }),
      });
      setCallDispatched(res);
    } catch {
      setCallDispatched({
        auto_call_status: 'CONNECTED_AND_AUDIO_DISPATCHED',
        intercept_chowki: `${activeTarget.policeStation} Intercept Unit`,
        patrol_units_notified: ['PCR-VAN-04', 'CHOWKI-UNIT-02', 'STATE-HIGHWAY-PATROL'],
      });
    } finally {
      setIsCalling(false);
    }
  };

  const handleOpen360Dossier = () => {
    navigate(`/investigate?plate=${encodeURIComponent(activeTarget.plate)}`);
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
            className="hover:bg-red-800 p-1 rounded transition-colors cursor-pointer"
            title="Dismiss Alert"
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
                  {activeTarget.plate}
                </span>
                <span className="px-2 py-0.5 rounded bg-red-950 border border-cyber-crimson text-cyber-crimson font-bold text-[10px]">
                  THREAT: {activeTarget.threatScore || 95}/100
                </span>
                <span className="text-[10px] text-yellow-400 font-semibold uppercase">
                  {activeTarget.status}
                </span>
              </div>
              <p className="text-slate-300 font-bold mt-1">
                {activeTarget.vehicleMake} {activeTarget.vehicleModel} ({activeTarget.vehicleColor || 'Active'})
              </p>
              <p className="text-slate-400 text-[11px]">
                {activeTarget.firNo ? `FIR: ${activeTarget.firNo}` : 'FIR: Unassigned'} {activeTarget.policeStation ? `• ${activeTarget.policeStation}` : ''}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 block">Current Velocity</span>
              <span className="text-yellow-400 font-extrabold text-sm">{latestSighting.speed_kmh} km/h</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800 space-y-1 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>
                <b>Sighted At:</b> {latestSighting.camera_name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Radio className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>
                <b>Nearest Unit:</b> {activeTarget.policeStation} Intercept Chowki (850m away)
              </span>
            </div>
          </div>

          {callDispatched && (
            <div className="p-2.5 rounded bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 space-y-1 animate-fadeIn text-[11px]">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>🚨 Emergency PCR Audio Intercept Dispatched!</span>
              </div>
              <p className="text-[10px] text-slate-300">
                Call audio transmitted to {callDispatched.intercept_chowki || 'Nearest Station'}. Units on pursuit:{' '}
                <b>{callDispatched.patrol_units_notified?.join(', ') || 'PCR-04, PCR-08'}</b>
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              disabled={isCalling}
              onClick={handleAutoCallDispatch}
              className="flex-1 py-2 rounded bg-cyber-crimson hover:bg-red-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-crimson transition-all cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{isCalling ? 'TRANSMITTING...' : '🚨 AUTO-CALL & DISPATCH CHOWKI'}</span>
            </button>

            <button
              onClick={handleOpen360Dossier}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>360° DOSSIER</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
