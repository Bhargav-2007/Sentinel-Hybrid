import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Camera, RefreshCw, Eye, Search, Filter,
  Building2, Shield, Bus, HeartPulse, Landmark,
  AlertTriangle, CheckCircle2, XCircle, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { camerasApi } from '../../core/api/camerasApi';
import { useUIStore } from '../../stores/uiStore';
import { CameraNode, FleetHealthSummary } from '../../core/types/camera';

// ─── Helper: render a health badge with truthful state ───────────────────────
type BadgeState = 'OK' | 'FAIL' | 'NOT_TESTED' | 'UNKNOWN' | 'ACTIVE' | 'INACTIVE';

function healthBadge(label: string, state: BadgeState) {
  const styles: Record<BadgeState, string> = {
    OK:       'bg-emerald-950 text-emerald-400 border-emerald-800/60',
    ACTIVE:   'bg-emerald-950 text-emerald-400 border-emerald-800/60',
    FAIL:     'bg-red-950 text-red-400 border-red-800/60',
    INACTIVE: 'bg-red-950 text-red-400 border-red-800/60',
    NOT_TESTED: 'bg-slate-900 text-slate-500 border-slate-700',
    UNKNOWN:  'bg-amber-950 text-amber-400 border-amber-800/60',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded font-bold border text-[9px] ${styles[state]}`}>
      {label}:{state === 'OK' || state === 'ACTIVE' ? 'OK' : state === 'FAIL' || state === 'INACTIVE' ? 'FAIL' : state.replace('_', ' ')}
    </span>
  );
}

function toBadgeState(value: boolean | string | null | undefined): BadgeState {
  if (value === true || value === 'true') return 'OK';
  if (value === false || value === 'false') return 'FAIL';
  if (value === 'NOT_TESTED') return 'NOT_TESTED';
  return 'UNKNOWN';
}

function toActiveBadge(value: boolean | string | null | undefined): BadgeState {
  if (value === true || value === 'true') return 'ACTIVE';
  if (value === false || value === 'false') return 'INACTIVE';
  if (value === 'NOT_TESTED') return 'NOT_TESTED';
  return 'UNKNOWN';
}

export const CameraManagementPage: React.FC = () => {
  const { openContextDrawer } = useUIStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const { data: cameras = [], isLoading, refetch } = useQuery({
    queryKey: ['cameras-grid', districtFilter],
    queryFn: () => camerasApi.listCameras(districtFilter !== 'ALL' ? { district: districtFilter } : undefined),
  });

  // Fetch real fleet health from the supervisor
  const { data: fleetHealth, isLoading: healthLoading } = useQuery<FleetHealthSummary>({
    queryKey: ['fleet-health'],
    queryFn: () => camerasApi.getFleetHealth(),
    refetchInterval: 5000,
  });

  // Build a per-camera health index from supervisor telemetry
  const perCameraHealth = React.useMemo(() => {
    const map: Record<string, any> = {};
    // From supervisor's live cameras array
    if (fleetHealth?.cameras) {
      for (const c of fleetHealth.cameras) {
        if (c.camera_id) map[c.camera_id] = c;
        if (c.cam_tag) map[c.cam_tag] = c;
        const numStr = (c.cam_tag || c.camera_id || '').replace(/\D/g, '');
        if (numStr) {
          const num = parseInt(numStr, 10);
          map[String(num)] = c;
          map[`cam${String(num).padStart(2, '0')}`] = c;
        }
      }
    }
    // From NOT_STARTED fallback per_camera_state
    if (fleetHealth?.per_camera_state) {
      for (const c of fleetHealth.per_camera_state) {
        if (!map[c.camera_id]) map[c.camera_id] = c;
      }
    }
    return map;
  }, [fleetHealth]);

  const filtered = cameras.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.camera_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.location.district.toLowerCase().includes(searchTerm.toLowerCase());

    const dept = (c.department_name || c.department_id || 'Police').toLowerCase();
    const matchesDept =
      deptFilter === 'ALL' ||
      (deptFilter === 'POLICE' && (dept.includes('police') || dept.includes('home'))) ||
      (deptFilter === 'GSRTC' && (dept.includes('transport') || dept.includes('gsrtc'))) ||
      (deptFilter === 'MUNICIPAL' && (dept.includes('municipal') || dept.includes('urban'))) ||
      (deptFilter === 'HEALTH' && dept.includes('health')) ||
      (deptFilter === 'PANCHAYAT' && (dept.includes('panchayat') || dept.includes('rural')));

    return matchesSearch && matchesDept;
  });

  const getDeptCount = (deptId: string) => {
    return cameras.filter((c) => {
      const dept = (c.department_name || c.department_id || 'Police').toLowerCase();
      if (deptId === 'POLICE') return dept.includes('police') || dept.includes('home');
      if (deptId === 'GSRTC') return dept.includes('transport') || dept.includes('gsrtc');
      if (deptId === 'MUNICIPAL') return dept.includes('municipal') || dept.includes('urban');
      if (deptId === 'HEALTH') return dept.includes('health');
      if (deptId === 'PANCHAYAT') return dept.includes('panchayat') || dept.includes('rural');
      return true;
    }).length;
  };

  const supervisorRunning = fleetHealth?.running === true;
  const sc = fleetHealth?.scorecard;

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="p-4 rounded bg-sentinel-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">
              Statewide Central CCTV Registry &amp; Fleet Health
            </h1>
            <p className="text-xs text-slate-400">
              Supervisor: {healthLoading ? 'Loading...' : supervisorRunning
                ? <span className="text-emerald-400">RUNNING</span>
                : <span className="text-amber-400">NOT_STARTED</span>}
              {fleetHealth && ` · ${fleetHealth.total_cameras} cameras configured`}
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyber-cyan text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Real Fleet Scorecard — derived from supervisor runtime state */}
      {fleetHealth && (
        <div className="p-3 rounded bg-slate-950 border border-slate-800">
          <div className="text-[10px] text-slate-500 mb-2 uppercase tracking-wider font-bold">
            Fleet Scorecard — {supervisorRunning ? 'Live Supervisor Data' : 'Supervisor Not Started'}
            {!supervisorRunning && (
              <span className="ml-2 text-amber-400">(all counts are 0 — no connections attempted)</span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-[10px]">
            {sc && [
              { label: 'Network', val: sc.network_reachable },
              { label: 'Auth', val: sc.authenticated_verified },
              { label: 'RTSP Session', val: sc.rtsp_session_established },
              { label: 'RTP Media', val: sc.rtp_media_observed },
              { label: 'Decoder Open', val: sc.decoder_open },
              { label: 'Frame Active', val: sc.frame_active },
              { label: 'AI Active', val: sc.ai_active },
              { label: 'Tracking', val: sc.tracking_active },
              { label: 'ANPR Tested', val: sc.anpr_tested },
            ].map((item) => (
              <div key={item.label} className="bg-slate-900 border border-slate-800 rounded p-2">
                <div className="text-slate-500 text-[9px]">{item.label}</div>
                <div className="text-white font-bold text-sm mt-0.5">
                  {item.val}<span className="text-slate-500 text-[9px]">/{fleetHealth.total_cameras}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {[
          { label: 'Police / Home', count: `${getDeptCount('POLICE')} Nodes`, icon: <Shield className="w-3.5 h-3.5 text-cyber-cyan" />, id: 'POLICE' },
          { label: 'GSRTC Transport', count: `${getDeptCount('GSRTC')} Nodes`, icon: <Bus className="w-3.5 h-3.5 text-yellow-400" />, id: 'GSRTC' },
          { label: 'Municipal Corp', count: `${getDeptCount('MUNICIPAL')} Nodes`, icon: <Building2 className="w-3.5 h-3.5 text-blue-400" />, id: 'MUNICIPAL' },
          { label: 'Health Dept', count: `${getDeptCount('HEALTH')} Nodes`, icon: <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />, id: 'HEALTH' },
          { label: 'Panchayat & Rural', count: `${getDeptCount('PANCHAYAT')} Nodes`, icon: <Landmark className="w-3.5 h-3.5 text-purple-400" />, id: 'PANCHAYAT' },
        ].map((d) => (
          <button
            key={d.id}
            onClick={() => setDeptFilter(deptFilter === d.id ? 'ALL' : d.id)}
            className={`p-2 rounded border text-left transition-all flex items-center justify-between cursor-pointer ${
              deptFilter === d.id
                ? 'bg-cyber-cyan text-black border-cyber-cyan font-bold shadow-md'
                : 'bg-sentinel-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {d.icon}
              <span className="truncate text-[11px]">{d.label}</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/40 text-slate-200 shrink-0">
              {d.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="p-3 rounded bg-sentinel-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Camera, Junction, or Dept..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyber-cyan"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="ALL">All 5 Departments</option>
              <option value="POLICE">Home / Police Dept</option>
              <option value="GSRTC">GSRTC (State Transport)</option>
              <option value="MUNICIPAL">Municipal Corporations</option>
              <option value="HEALTH">Health Department</option>
              <option value="PANCHAYAT">Panchayat &amp; Rural</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="ALL">All Gujarat Districts</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Surat">Surat</option>
              <option value="Vadodara">Vadodara</option>
              <option value="Gandhinagar">Gandhinagar</option>
              <option value="Rajkot">Rajkot</option>
              <option value="Bhavnagar">Bhavnagar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center font-mono text-xs text-cyber-cyan">
          Connecting to Camera Catalogue...
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-800 bg-sentinel-900">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Camera Node</th>
                <th className="p-3">Department</th>
                <th className="p-3">District / Junction</th>
                <th className="p-3">Codec / FPS</th>
                <th className="p-3">Runtime Health (Live)</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((cam: CameraNode) => {
                const numMatch = cam.camera_id.match(/\d+/);
                const numVal = numMatch ? parseInt(numMatch[0], 10) : 0;
                const camTagNorm = numVal > 0 ? `cam${String(numVal).padStart(2, '0')}` : '';
                const health =
                  perCameraHealth[cam.camera_id] ||
                  (camTagNorm ? perCameraHealth[camTagNorm] : null) ||
                  perCameraHealth[String(numVal)] ||
                  perCameraHealth[`cam${cam.camera_id}`];

                return (
                  <tr key={cam.camera_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{cam.name}</div>
                      <div className="text-[10px] text-slate-500">{cam.camera_id}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyber-cyan font-bold text-[10px]">
                        {cam.department_name || cam.department_id}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-300">{cam.location.district}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs">{cam.location.address}</div>
                    </td>
                    <td className="p-3">
                      {/* Only show codec/fps if actually observed from the stream */}
                      {health?.codec_observed
                        ? <span className="text-cyber-cyan uppercase font-bold">{health.codec_observed}</span>
                        : <span className="text-slate-600 italic text-[10px]">Not observed</span>}
                      {health?.decode_fps != null && health.decode_fps > 0
                        ? <span className="ml-1 text-slate-400 text-[10px]">@ {health.decode_fps} fps</span>
                        : null}
                    </td>
                    <td className="p-3">
                      {health ? (
                        <div className="flex flex-col gap-1 font-mono text-[9px]">
                          <div className="flex items-center gap-1 flex-wrap">
                            {healthBadge('NET', toBadgeState(health.network_reachable))}
                            {healthBadge('AUTH', toBadgeState(health.authenticated))}
                            {healthBadge('RTSP', toBadgeState(health.rtsp_session_established))}
                            {healthBadge('RTP', toBadgeState(health.rtp_media_observed))}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {healthBadge('DEC', toActiveBadge(health.decoder_open ?? health.frame_active))}
                            {healthBadge('AI', toActiveBadge(health.ai_active))}
                            {healthBadge('TRK', toActiveBadge(health.tracking_active))}
                            <span className="px-1.5 py-0.5 rounded border border-slate-700 text-slate-500 text-[9px]">
                              ANPR:{health.anpr_active ?? 'NOT_TESTED'}
                            </span>
                          </div>
                          {health.last_frame_at && (
                            <div className="text-slate-600 text-[9px] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(health.last_frame_at).toLocaleTimeString()}
                            </div>
                          )}
                          {health.last_error && (
                            <div className="text-red-500 text-[9px] truncate max-w-xs">
                              ⚠ {health.last_error}
                            </div>
                          )}
                        </div>
                      ) : supervisorRunning ? (
                        <span className="text-slate-500 text-[10px] italic">No telemetry (cam not registered)</span>
                      ) : (
                        <span className="text-amber-500 text-[10px] italic flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Supervisor not started
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openContextDrawer({ camera: cam })}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyber-cyan hover:text-black text-slate-200 font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>PREVIEW</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
