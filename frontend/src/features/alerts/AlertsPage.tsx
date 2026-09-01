import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShieldAlert, CheckCircle, Clock, MapPin, Gauge, Eye } from 'lucide-react';
import { alertsApi } from '../../core/api/alertsApi';
import { useUIStore } from '../../stores/uiStore';
import { ThreatAlert } from '../../core/types/alert';

export const AlertsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { openContextDrawer } = useUIStore();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.listAlerts,
    refetchInterval: 10000,
  });

  const ackMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-crimson/15 border border-cyber-crimson/30 text-cyber-crimson">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono text-white">
              Real-Time APB Threat & Hotlist Alert Dispatch
            </h1>
            <p className="text-xs font-mono text-slate-400">
              Live Priority Ingestion &bull; Multi-Factor Threat Triage (0–100) &bull; Duty Officer Acknowledgment
            </p>
          </div>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson font-bold">
          {alerts.length} ACTIVE INCIDENTS
        </span>
      </div>

      {/* Alert Feed Table / Cards */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center font-mono text-xs text-cyber-cyan">
          Connecting to Real-time Alert Stream...
        </div>
      ) : (
        <div className="grid gap-3">
          {alerts.map((alt: ThreatAlert) => {
            const isCritical = alt.priority === 'CRITICAL';

            return (
              <div
                key={alt.alert_id}
                className={`p-4 rounded border transition-all ${
                  isCritical
                    ? 'bg-red-950/25 border-cyber-crimson/70 shadow-glow-crimson'
                    : 'bg-sentinel-900 border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded ${
                        isCritical ? 'bg-cyber-crimson text-white' : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      <ShieldAlert className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-yellow-400 bg-black px-2 py-0.5 rounded border border-slate-700">
                          {alt.target_plate}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            isCritical ? 'bg-cyber-crimson text-white' : 'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {alt.priority} &bull; SCORE: {alt.threat_score}/100
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-300">
                          {alt.hotlist_category.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-slate-400">
                        {alt.fir_number && <b className="text-slate-300">{alt.fir_number} &bull; </b>}
                        {alt.police_station} &bull; Make: {alt.vehicle_make} {alt.vehicle_model} ({alt.vehicle_color})
                      </p>

                      <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-cyber-cyan" />
                          {alt.camera_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(alt.timestamp).toLocaleTimeString()}
                        </span>
                        {alt.speed_kmh && (
                          <span className="flex items-center gap-1 text-cyber-cyan">
                            <Gauge className="w-3 h-3" />
                            {alt.speed_kmh} km/h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() =>
                        openContextDrawer({
                          alert: alt,
                          plate: alt.target_plate,
                        })
                      }
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan font-mono text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>INSPECT 360°</span>
                    </button>

                    <button
                      onClick={() => ackMutation.mutate(alt.alert_id)}
                      className="px-3 py-1.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>ACKNOWLEDGE</span>
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
