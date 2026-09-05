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

type BadgeState = 'OK' | 'FAIL' | 'NOT_TESTED' | 'UNKNOWN' | 'ACTIVE' | 'INACTIVE';

function healthBadge(label: string, state: BadgeState) {
  const styles: Record<BadgeState, string> = {
    OK:       'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40',
    ACTIVE:   'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40',
    FAIL:     'bg-[#da3633]/15 text-[#f85149] border-[#da3633]/40',
    INACTIVE: 'bg-[#da3633]/15 text-[#f85149] border-[#da3633]/40',
    NOT_TESTED: 'bg-[#21262d] text-[#8b949e] border-[#30363d]',
    UNKNOWN:  'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/40',
  };
  return (
    <span className={`px-1.5 py-0.2 rounded border text-[9px] font-mono font-medium ${styles[state]}`}>
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

  const { data: fleetHealth, isLoading: healthLoading } = useQuery<FleetHealthSummary>({
    queryKey: ['fleet-health'],
    queryFn: () => camerasApi.getFleetHealth(),
    refetchInterval: 5000,
  });

  const perCameraHealth = React.useMemo(() => {
    const map: Record<string, any> = {};
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
    <div className="space-y-4">
      {/* GitHub Subhead Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-[#f0f6fc] tracking-tight">
              Statewide CCTV Registry &amp; Fleet Operations
            </h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-[#30363d] text-[#8b949e] bg-[#161b22]">
              CSITMS REGISTRY
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-1 font-mono">
            Supervisor Telemetry:{' '}
            {healthLoading ? (
              'Probing nodes...'
            ) : supervisorRunning ? (
              <span className="text-[#3fb950] font-medium">ACTIVE &bull; 103.250.160.189</span>
            ) : (
              <span className="text-[#d29922] font-medium">STANDBY</span>
            )}
            {fleetHealth && ` &bull; ${fleetHealth.total_cameras} Feeds Configured`}
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="gh-btn cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Registry</span>
        </button>
      </div>

      {/* GitHub Telemetry Scorecard Box */}
      {fleetHealth && (
        <div className="gh-box">
          <div className="gh-box-header">
            <div className="text-xs font-semibold text-[#f0f6fc] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#58a6ff]"></span>
              Fleet Telemetry Scorecard &bull; {supervisorRunning ? 'Live Stream Verification' : 'Supervisor Standby'}
            </div>
            {!supervisorRunning && (
              <span className="text-xs text-[#d29922] font-mono">Awaiting stream handshake</span>
            )}
          </div>
          <div className="p-3 bg-[#0d1117] grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
            {sc && [
              { label: 'Network Reachable', val: sc.network_reachable },
              { label: 'Auth Verified', val: sc.authenticated_verified },
              { label: 'RTSP Sessions', val: sc.rtsp_session_established },
              { label: 'RTP Media Data', val: sc.rtp_media_observed },
              { label: 'Decoder Open', val: sc.decoder_open },
              { label: 'Frame Ingestion', val: sc.frame_active },
              { label: 'AI Inference', val: sc.ai_active },
              { label: 'Object Tracking', val: sc.tracking_active },
              { label: 'ANPR Evaluated', val: sc.anpr_tested },
            ].map((item) => (
              <div key={item.label} className="bg-[#161b22] border border-[#30363d] rounded-md p-2">
                <div className="text-[#8b949e] text-[10px] truncate">{item.label}</div>
                <div className="text-[#f0f6fc] font-bold text-base font-mono mt-0.5 flex items-baseline gap-1">
                  <span>{item.val}</span>
                  <span className="text-[#8b949e] text-[10px] font-normal">/{fleetHealth.total_cameras}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Quick Stats as GitHub Topic Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {[
          { label: 'Gujarat Police', count: `${getDeptCount('POLICE')}`, icon: <Shield className="w-3.5 h-3.5 text-[#58a6ff]" />, id: 'POLICE' },
          { label: 'GSRTC Transport', count: `${getDeptCount('GSRTC')}`, icon: <Bus className="w-3.5 h-3.5 text-[#d29922]" />, id: 'GSRTC' },
          { label: 'Municipal Corps', count: `${getDeptCount('MUNICIPAL')}`, icon: <Building2 className="w-3.5 h-3.5 text-[#a371f7]" />, id: 'MUNICIPAL' },
          { label: 'Health & Medical', count: `${getDeptCount('HEALTH')}`, icon: <HeartPulse className="w-3.5 h-3.5 text-[#3fb950]" />, id: 'HEALTH' },
          { label: 'Panchayat & Rural', count: `${getDeptCount('PANCHAYAT')}`, icon: <Landmark className="w-3.5 h-3.5 text-[#8b949e]" />, id: 'PANCHAYAT' },
        ].map((d) => (
          <button
            key={d.id}
            onClick={() => setDeptFilter(deptFilter === d.id ? 'ALL' : d.id)}
            className={`p-2 rounded-md border text-left transition-colors flex items-center justify-between cursor-pointer ${
              deptFilter === d.id
                ? 'bg-[#1f6feb] text-white border-[#1f6feb] font-semibold'
                : 'bg-[#161b22] border-[#30363d] text-[#c9d1d9] hover:border-[#8b949e]'
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              {d.icon}
              <span className="truncate text-xs">{d.label}</span>
            </div>
            <span className="gh-counter text-[10px]">
              {d.count}
            </span>
          </button>
        ))}
      </div>

      {/* GitHub Filters & Search Bar */}
      <div className="p-2.5 rounded-md bg-[#161b22] border border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8b949e]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Node, Junction, District..."
            className="w-full pl-8 pr-3 py-1 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#8b949e]" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[#21262d] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="POLICE">Gujarat Police</option>
              <option value="GSRTC">GSRTC Transport</option>
              <option value="MUNICIPAL">Municipal Corps</option>
              <option value="HEALTH">Health &amp; Medical</option>
              <option value="PANCHAYAT">Panchayat &amp; Rural</option>
            </select>
          </div>

          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-[#21262d] border border-[#30363d] rounded-md px-2 py-1 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] cursor-pointer"
          >
            <option value="ALL">All Districts</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Surat">Surat</option>
            <option value="Vadodara">Vadodara</option>
            <option value="Gandhinagar">Gandhinagar</option>
            <option value="Rajkot">Rajkot</option>
            <option value="Bhavnagar">Bhavnagar</option>
          </select>
        </div>
      </div>

      {/* GitHub Style Asset Browser Table */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-xs text-[#58a6ff]">
          Loading State Surveillance Catalogue...
        </div>
      ) : (
        <div className="gh-box">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
              <tr>
                <th className="p-3 font-semibold text-[11px]">CAMERA NODE</th>
                <th className="p-3 font-semibold text-[11px]">DEPARTMENT</th>
                <th className="p-3 font-semibold text-[11px]">LOCATION</th>
                <th className="p-3 font-semibold text-[11px]">CODEC &amp; STREAM</th>
                <th className="p-3 font-semibold text-[11px]">RUNTIME STATUS</th>
                <th className="p-3 text-right font-semibold text-[11px]">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
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
                  <tr key={cam.camera_id} className="hover:bg-[#161b22]/60 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-[#f0f6fc] text-xs hover:text-[#58a6ff] transition-colors">{cam.name}</div>
                      <div className="text-[10px] font-mono text-[#8b949e] mt-0.5">{cam.camera_id}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full border border-[#30363d] bg-[#161b22] text-[#c9d1d9] font-medium text-[10px] whitespace-nowrap">
                        {cam.department_name || cam.department_id}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-[#c9d1d9] font-medium">{cam.location.district}</div>
                      <div className="text-[10px] text-[#8b949e] truncate max-w-xs mt-0.5">{cam.location.address}</div>
                    </td>
                    <td className="p-3 font-mono">
                      {health?.codec_observed ? (
                        <span className="text-[#58a6ff] uppercase font-medium text-[11px]">{health.codec_observed}</span>
                      ) : (
                        <span className="text-[#8b949e] italic text-[10px]">H.264</span>
                      )}
                      {health?.decode_fps != null && health.decode_fps > 0 ? (
                        <span className="ml-1 text-[#8b949e] text-[10px]">@ {health.decode_fps} fps</span>
                      ) : null}
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
                            <span className="px-1.5 py-0.2 rounded border border-[#30363d] text-[#8b949e] text-[9px]">
                              ANPR:{health.anpr_active ?? 'OFF'}
                            </span>
                          </div>
                          {health.last_frame_at && (
                            <div className="text-[#8b949e] text-[9px] flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-[#8b949e]" />
                              {new Date(health.last_frame_at).toLocaleTimeString()}
                            </div>
                          )}
                          {health.last_error && (
                            <div className="text-[#f85149] text-[9px] truncate max-w-xs mt-0.5">
                              ⚠ {health.last_error}
                            </div>
                          )}
                        </div>
                      ) : supervisorRunning ? (
                        <span className="text-[#8b949e] text-[10px] italic">Handshaking telemetry...</span>
                      ) : (
                        <span className="text-[#d29922] text-[10px] italic flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-[#d29922]" />
                          Supervisor offline
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openContextDrawer({ camera: cam })}
                        className="gh-btn cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
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
