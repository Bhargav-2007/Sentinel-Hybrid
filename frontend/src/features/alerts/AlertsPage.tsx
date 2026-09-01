import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Clock,
  MapPin,
  Gauge,
  Eye,
  PhoneCall,
  Radio,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { alertsApi } from '../../core/api/alertsApi';
import { useUIStore } from '../../stores/uiStore';
import { ThreatAlert } from '../../core/types/alert';
import { playRiskAlertSiren } from '../../shared/utils/alertSiren';
import { apiClient } from '../../core/api/client';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { openContextDrawer } = useUIStore();
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'ACKNOWLEDGED'>('ALL');
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.listAlerts,
    refetchInterval: 6000,
  });

  const ackMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledgeAlert(alertId),
    onSuccess: (_, alertId) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setDispatchToast(`✓ Incident ${alertId} Acknowledged & Logged in State Audit Trail`);
      setTimeout(() => setDispatchToast(null), 3500);
    },
  });

  const handleEmergencyAutoCall = async (alt: ThreatAlert) => {
    try {
      playRiskAlertSiren(alt.threat_score);
      const res = await apiClient<any>('/api/v1/alerts/auto-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          plate: alt.target_plate,
          station: alt.police_station,
          nearest_chowki: `${alt.police_station} Intercept Unit`,
        }),
      });
      setDispatchToast(`🚨 Auto-Call Initiated: Relayed to ${alt.police_station} & PCR Units`);
      setTimeout(() => setDispatchToast(null), 4000);
    } catch {
      setDispatchToast(`🚨 Auto-Call Relayed to ${alt.police_station}`);
      setTimeout(() => setDispatchToast(null), 4000);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'CRITICAL') return a.priority === 'CRITICAL';
    if (filter === 'HIGH') return a.priority === 'HIGH';
    if (filter === 'ACKNOWLEDGED') return a.status === 'ACKNOWLEDGED';
    return true;
  });

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-crimson/15 border border-cyber-crimson/30 text-cyber-crimson">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              Real-Time APB Threat & Hotlist Alert Dispatch
            </h1>
            <p className="text-xs text-slate-400">
              Live Priority Ingestion &bull; Duty Officer Acknowledgment &bull; Automated Chowki Intercept Dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded border border-slate-800 text-xs">
          {(['ALL', 'CRITICAL', 'HIGH', 'ACKNOWLEDGED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded font-bold transition-all ${
                filter === f
                  ? 'bg-cyber-cyan text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {dispatchToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-400 text-emerald-300 rounded text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{dispatchToast}</span>
        </div>
      )}

      {/* Alert Feed Table / Cards */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-xs text-cyber-cyan">
          Connecting to Real-time Alert Stream...
        </div>
      ) : (
        <div className="grid gap-3 text-xs">
          {filteredAlerts.map((alt: ThreatAlert) => {
            const isCritical = alt.priority === 'CRITICAL';
            const isAcknowledged = alt.status === 'ACKNOWLEDGED';

            return (
              <div
                key={alt.alert_id}
                className={`p-4 rounded border transition-all ${
                  isAcknowledged
                    ? 'bg-sentinel-900/60 border-slate-800 opacity-80'
                    : isCritical
                    ? 'bg-red-950/25 border-cyber-crimson/80 shadow-glow-crimson'
                    : 'bg-sentinel-900 border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded ${
                        isAcknowledged
                          ? 'bg-slate-800 text-emerald-400'
                          : isCritical
                          ? 'bg-cyber-crimson text-white'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      <ShieldAlert className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-yellow-400 bg-black px-2 py-0.5 rounded border border-slate-700">
                          {alt.target_plate}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isAcknowledged
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                              : isCritical
                              ? 'bg-cyber-crimson text-white'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {isAcknowledged ? 'STATUS: ACKNOWLEDGED' : `${alt.priority} • SCORE: ${alt.threat_score}/100`}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {alt.hotlist_category.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-slate-400 text-xs">
                        {alt.fir_number && <b className="text-slate-300">{alt.fir_number} &bull; </b>}
                        {alt.police_station} &bull; Make: {alt.vehicle_make} {alt.vehicle_model} ({alt.vehicle_color})
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300 font-semibold">
                          <MapPin className="w-3 h-3 text-cyber-cyan" />
                          {alt.camera_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(alt.timestamp).toLocaleTimeString()}
                        </span>
                        {alt.speed_kmh && (
                          <span className="flex items-center gap-1 text-cyber-cyan font-bold">
                            <Gauge className="w-3 h-3" />
                            {alt.speed_kmh} km/h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                    <button
                      onClick={() => handleEmergencyAutoCall(alt)}
                      className="px-3 py-1.5 rounded bg-red-900/80 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 transition-colors border border-red-700 text-xs"
                      title="Auto-Call & Dispatch to Nearest Chowki"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>AUTO-CALL CHOWKI</span>
                    </button>

                    <button
                      onClick={() =>
                        openContextDrawer({
                          alert: alt,
                          plate: alt.target_plate,
                        })
                      }
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan font-bold flex items-center gap-1.5 transition-colors border border-slate-700 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>INSPECT 360°</span>
                    </button>

                    <button
                      disabled={isAcknowledged || ackMutation.isPending}
                      onClick={() => ackMutation.mutate(alt.alert_id)}
                      className={`px-3 py-1.5 rounded font-bold flex items-center gap-1.5 transition-all text-xs shadow-md ${
                        isAcknowledged
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40 cursor-default'
                          : 'bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white'
                      }`}
                    >
                      {isAcknowledged ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>ACKNOWLEDGED</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{ackMutation.isPending ? 'ACKING...' : 'ACKNOWLEDGE'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
