import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertService } from '../../services/alertService';
import { useAlertStore } from '../../stores/alertStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  Search, 
  FileCheck, 
  XCircle, 
  Radio, 
  Clock
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { officer } = useAuthStore();
  const { selectedAlert, setSelectedAlert } = useAlertStore();
  const { openSection65BModal } = useUIStore();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const officerId = officer?.officer_id || 'POLICE-AHM-042';

  // Fetch Alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', filterStatus, filterSeverity, searchTerm],
    queryFn: () => alertService.listAlerts({
      status: filterStatus,
      severity: filterSeverity,
      search: searchTerm,
      limit: 50,
    }),
    refetchInterval: 8000,
  });

  // Action Mutations
  const ackMutation = useMutation({
    mutationFn: (id: string) => alertService.acknowledgeAlert(id, officerId, 'PCR-EAGLE-07'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const investMutation = useMutation({
    mutationFn: (id: string) => alertService.investigateAlert(id, officerId, 'Patrol pursuit initiated.'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertService.resolveAlert(id, officerId, 'Suspect intercepted.'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const falsePosMutation = useMutation({
    mutationFn: (id: string) => alertService.markFalsePositive(id, officerId, 'OCR misread.'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const activeAlert = selectedAlert || alerts[0] || null;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto select-none font-mono">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#090e1a] p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/20">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-wide">
              REAL-TIME APB INCIDENT TRIAGE & HOTLIST PURSUIT
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              eGujCop Stolen Vehicle & Crime Watchlist Intercept Ledger
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New (Unassigned)</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search plate / FIR..."
              className="pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area: Left Master List + Right Incident Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Incident Feed (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 tracking-wider">
              ACTIVE APB INCIDENTS ({alerts.length})
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>LIVE WEBSOCKET SYNC</span>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
            {alerts.map((alt) => {
              const isSelected = activeAlert?.id === alt.id;
              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedAlert(alt)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3 ${
                    isSelected
                      ? 'bg-cyan-950/20 border-cyan-500/80 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          alt.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        }`}
                      >
                        {alt.severity}
                      </span>
                      <span className="font-bold text-xs text-slate-200">{alt.incident_number}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                        {alt.status}
                      </span>
                    </div>

                    <span className="text-yellow-300 text-xs font-bold bg-yellow-950/70 px-2 py-0.5 rounded border border-yellow-500/40">
                      {alt.detected_plate}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-100 font-sans">{alt.title}</h3>
                    <p className="text-[11px] text-slate-400 font-sans mt-0.5 line-clamp-1">{alt.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>{alt.camera_name} • {alt.district}</span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(alt.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Incident Detail Dossier (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {activeAlert ? (
            <div className="bg-[#090e1a] border border-slate-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold">INCIDENT DOSSIER</span>
                  <h2 className="text-sm font-bold text-slate-100 mt-0.5">{activeAlert.incident_number}</h2>
                </div>
                <button
                  onClick={() => openSection65BModal(activeAlert.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900 text-xs font-bold transition-colors"
                >
                  <FileCheck className="w-4 h-4 text-cyan-400" />
                  <span>SECTION 65B CERTIFICATE</span>
                </button>
              </div>

              {/* Target Vehicle & Plate Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">DETECTED REGISTRATION</span>
                  <span className="text-sm font-bold text-yellow-300 bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/40">
                    {activeAlert.detected_plate}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-900">
                  <div>
                    <span className="text-[10px] text-slate-500">VEHICLE TYPE</span>
                    <p className="text-slate-200 font-bold">{activeAlert.vehicle_make || 'Toyota'} {activeAlert.vehicle_model || 'Fortuner'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">CASE / FIR</span>
                    <p className="text-cyan-400 font-bold">{activeAlert.fir_number || 'FIR-2026-CR-0881'}</p>
                  </div>
                </div>
              </div>

              {/* Location & Checkpoint */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-[10px] text-slate-500">SIGHTING LOCATION</span>
                <p className="font-bold text-slate-200">{activeAlert.camera_name}</p>
                <p className="text-slate-400 text-[11px] font-sans">{activeAlert.district} (Lat: {activeAlert.latitude}, Lng: {activeAlert.longitude})</p>
              </div>

              {/* Section 65B HMAC Hash */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[10px]">
                <span className="text-slate-500">CRYPTOGRAPHIC SHA-256 HMAC CHAIN:</span>
                <p className="text-cyan-400/90 break-all mt-1">{activeAlert.section65b_hmac_hash}</p>
              </div>

              {/* Lifecycle Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold">TACTICAL ACTION WORKFLOW:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => ackMutation.mutate(activeAlert.id)}
                    disabled={activeAlert.status !== 'NEW' || ackMutation.isPending}
                    className="py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ACKNOWLEDGE</span>
                  </button>

                  <button
                    onClick={() => investMutation.mutate(activeAlert.id)}
                    disabled={activeAlert.status === 'INVESTIGATING' || activeAlert.status === 'RESOLVED' || investMutation.isPending}
                    className="py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span>DISPATCH PURSUIT</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => resolveMutation.mutate(activeAlert.id)}
                    disabled={activeAlert.status === 'RESOLVED' || resolveMutation.isPending}
                    className="py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>RESOLVE & CLOSE</span>
                  </button>

                  <button
                    onClick={() => falsePosMutation.mutate(activeAlert.id)}
                    disabled={falsePosMutation.isPending}
                    className="py-2.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-400 text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>FALSE POSITIVE</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 text-xs">
              Select an incident from the feed to view full forensic dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
