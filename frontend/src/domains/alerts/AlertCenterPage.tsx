import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertService } from '../../services/alertService';
import { useRealtimeStore } from '../../core/realtime/websocketService';
import { useAuthStore } from '../../core/auth/authStore';
import { AlertIncident } from '../../shared/types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  Search, 
  FileCheck, 
  Tv2, 
  MapPin, 
  FolderOpen,
  XCircle, 
  Clock
} from 'lucide-react';

export const AlertCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { officer } = useAuthStore();
  const { alerts, setAlerts } = useRealtimeStore();
  const [selectedAlert, setSelectedAlert] = useState<AlertIncident | null>(null);

  const officerId = officer?.officer_id || 'POLICE-AHM-042';

  // Fetch Alerts
  const { data: fetchedAlerts = [] } = useQuery({
    queryKey: ['alerts-center'],
    queryFn: () => alertService.listAlerts({ limit: 50 }),
    refetchInterval: 8000,
  });

  const activeList = alerts.length > 0 ? alerts : fetchedAlerts;
  const current = selectedAlert || activeList[0] || null;

  // Actions
  const ackMutation = useMutation({
    mutationFn: (id: string) => alertService.acknowledgeAlert(id, officerId, 'PCR-07'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts-center'] }),
  });

  const investMutation = useMutation({
    mutationFn: (id: string) => alertService.investigateAlert(id, officerId, 'Pursuit dispatched.'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts-center'] }),
  });

  return (
    <div className="flex flex-col gap-4 max-w-[1920px] mx-auto select-none font-mono text-xs h-[calc(100vh-6.5rem)]">
      {/* Top Banner */}
      <div className="bg-[#090e1a] border border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-500/50 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              3-COLUMN APB THREAT INCIDENT TRIAGE & ACTION CENTER
            </h1>
            <p className="text-[10px] text-slate-400 font-sans">eGujCop Watchlist Correlation & Incident Escalation</p>
          </div>
        </div>
        <span className="text-[10px] text-emerald-400 font-bold">● WEBSOCKET LIVE SYNC</span>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* COLUMN 1: ALERT LIST (4 cols) */}
        <div className="lg:col-span-4 bg-[#090e1a] border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5 overflow-hidden shadow-xl">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            INCOMING ALERTS ({activeList.length})
          </span>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {activeList.map((alt) => {
              const isSelected = current?.id === alt.id;
              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedAlert(alt)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-red-950/30 border-red-500/80 shadow-md shadow-red-500/10'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                      {alt.severity}
                    </span>
                    <span className="font-bold text-yellow-300 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/40 text-[11px]">
                      {alt.detected_plate || 'PLATE-DETECT'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-100 text-xs mt-1.5 truncate">{alt.title}</h4>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{alt.camera_name}</span>
                    <span>{new Date(alt.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: SELECTED ALERT DOSSIER (5 cols) */}
        <div className="lg:col-span-5 bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto shadow-xl">
          {current ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] text-slate-400 uppercase font-bold">SELECTED INCIDENT REFERENCE</span>
                <h2 className="text-sm font-bold text-slate-100 mt-0.5">{current.incident_number}</h2>
              </div>

              {/* Plate & Vehicle Card */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">DETECTED REGISTRATION</span>
                  <span className="text-sm font-bold text-yellow-300 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/40">
                    {current.detected_plate}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500">CONFIDENCE</span>
                    <p className="font-bold text-emerald-400">{(current.confidence_score * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">CASE NUMBER</span>
                    <p className="font-bold text-cyan-300">{current.fir_number || 'FIR-2026-CR-0881'}</p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500">CHECKPOINT NODE</span>
                <p className="font-bold text-slate-200">{current.camera_name}</p>
                <p className="text-slate-400 text-[10px]">{current.district} (Lat: {current.latitude}, Lng: {current.longitude})</p>
              </div>

              {/* Section 65B HMAC Signature */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[9px] font-mono">
                <span className="text-slate-500">SHA-256 HMAC CRYPTOGRAPHIC SEAL:</span>
                <p className="text-cyan-400/90 break-all mt-1">{current.section65b_hmac_hash}</p>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500">Select an alert from Column 1.</div>
          )}
        </div>

        {/* COLUMN 3: ACTIONS & DISPATCH (3 cols) */}
        <div className="lg:col-span-3 bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">COMMAND BAR ACTIONS</span>

            <button
              onClick={() => current && ackMutation.mutate(current.id)}
              disabled={!current || current.status !== 'NEW' || ackMutation.isPending}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ACKNOWLEDGE</span>
            </button>

            <button
              onClick={() => current && navigate(`/live?focus=${current.camera_id}`)}
              disabled={!current}
              className="w-full py-2.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Tv2 className="w-4 h-4" />
              <span>OPEN CAMERA</span>
            </button>

            <button
              onClick={() => current && navigate(`/investigate/vehicle?plate=${current.detected_plate || 'GJ01AB1234'}`)}
              disabled={!current}
              className="w-full py-2.5 rounded-lg bg-yellow-950 hover:bg-yellow-900 border border-yellow-500/50 text-yellow-300 font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>TRACE VEHICLE</span>
            </button>

            <button
              onClick={() => current && navigate(`/map?lat=${current.latitude}&lng=${current.longitude}`)}
              disabled={!current}
              className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition-colors flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>LOCATE IN GIS</span>
            </button>

            <button
              onClick={() => current && navigate(`/incidents?alert=${current.id}`)}
              disabled={!current}
              className="w-full py-2.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 font-bold transition-colors flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>CREATE INCIDENT</span>
            </button>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-500">
            Duty Officer: <strong className="text-slate-300">{officerId}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
