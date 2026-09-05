import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Grid3X3, Grid2X2, Cpu, Eye, Filter, Tv2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { camerasApi } from '../../core/api/camerasApi';
import { VideoPlayer } from '../../shared/components/VideoPlayer';
import { useUIStore } from '../../stores/uiStore';
import { CameraNode, FleetHealthSummary } from '../../core/types/camera';

export const LiveOperationsPage: React.FC = () => {
  const { gridMode, setGridMode, openContextDrawer } = useUIStore();
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const { data: rawCameras = [], isLoading } = useQuery({
    queryKey: ['cameras', districtFilter],
    queryFn: () => camerasApi.listCameras(districtFilter !== 'ALL' ? { district: districtFilter } : undefined),
    refetchInterval: 20000,
  });

  // Fetch real fleet health — poll every 5 seconds
  const { data: fleetHealth } = useQuery<FleetHealthSummary>({
    queryKey: ['fleet-health-live'],
    queryFn: () => camerasApi.getFleetHealth(),
    refetchInterval: 5000,
  });

  // Build per-camera health lookup from supervisor telemetry
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
    return map;
  }, [fleetHealth]);

  const supervisorRunning = fleetHealth?.running === true;
  const sc = fleetHealth?.scorecard;
  const activeFrameCount = sc?.frame_active ?? 0;
  const activeAiCount = sc?.ai_active ?? 0;

  const cameras = rawCameras.filter((c) => {
    const dept = (c.department_name || c.department_id || 'Police').toLowerCase();
    return (
      deptFilter === 'ALL' ||
      (deptFilter === 'POLICE' && (dept.includes('police') || dept.includes('home'))) ||
      (deptFilter === 'GSRTC' && (dept.includes('transport') || dept.includes('gsrtc') || dept.includes('rto'))) ||
      (deptFilter === 'MUNICIPAL' && (dept.includes('municipal') || dept.includes('urban') || dept.includes('amc'))) ||
      (deptFilter === 'HEALTH' && dept.includes('health')) ||
      (deptFilter === 'PANCHAYAT' && (dept.includes('panchayat') || dept.includes('rural')))
    );
  });

  const displayCount =
    gridMode === '2x2' ? 4 : gridMode === '3x3' ? 9 : gridMode === '4x4' ? 16 : 30;
  const activeCameras = cameras.slice(0, displayCount);

  return (
    <div className="space-y-4">
      {/* GitHub Subhead Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-[#21262d]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg font-semibold text-[#f0f6fc] tracking-tight">
              Statewide CCTV Operations Grid
            </h1>
            {supervisorRunning ? (
              <span className="px-2 py-0.5 rounded-full border border-[#238636]/40 bg-[#238636]/15 text-[#3fb950] text-xs font-medium inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse"></span>
                {activeFrameCount} Active / {fleetHealth?.total_cameras ?? 0} Configured
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full border border-[#d29922]/40 bg-[#d29922]/15 text-[#d29922] text-xs font-medium inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Supervisor Standby
              </span>
            )}
          </div>
          <p className="text-xs text-[#8b949e] mt-1 font-mono">
            RTSP Gateway: 103.250.160.189:8554 &bull; WHEP Low-Latency &bull; AI Pipeline: {activeAiCount} Nodes Active
          </p>
        </div>

        {/* GitHub Filter Controls & Button Groups */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#8b949e]" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-[#21262d] border border-[#30363d] rounded-md px-2.5 py-1 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] cursor-pointer"
            >
              <option value="ALL">All Departments (5)</option>
              <option value="POLICE">Gujarat Police</option>
              <option value="GSRTC">GSRTC Transit</option>
              <option value="MUNICIPAL">Municipal Corps</option>
              <option value="HEALTH">Health &amp; Emergency</option>
              <option value="PANCHAYAT">Panchayat &amp; Rural</option>
            </select>
          </div>

          {/* District Filter */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-[#21262d] border border-[#30363d] rounded-md px-2.5 py-1 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] cursor-pointer"
          >
            <option value="ALL">All Districts</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Surat">Surat</option>
            <option value="Vadodara">Vadodara</option>
            <option value="Gandhinagar">Gandhinagar</option>
            <option value="Rajkot">Rajkot</option>
          </select>

          {/* GitHub Style Segmented Button Group */}
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setGridMode('2x2')}
              className={`px-2.5 py-1 text-xs font-medium border border-[#30363d] rounded-l-md transition-colors cursor-pointer ${
                gridMode === '2x2'
                  ? 'bg-[#1f6feb] text-white font-semibold'
                  : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
              }`}
              title="2x2 Multi-View"
            >
              <Grid2X2 className="w-3.5 h-3.5 inline mr-1" />
              2x2
            </button>
            <button
              onClick={() => setGridMode('3x3')}
              className={`px-2.5 py-1 text-xs font-medium border-t border-b border-r border-[#30363d] -ml-px transition-colors cursor-pointer ${
                gridMode === '3x3'
                  ? 'bg-[#1f6feb] text-white font-semibold'
                  : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
              }`}
              title="3x3 Sector Grid"
            >
              <Grid3X3 className="w-3.5 h-3.5 inline mr-1" />
              3x3
            </button>
            <button
              onClick={() => setGridMode('4x4')}
              className={`px-2.5 py-1 text-xs font-medium border-t border-b border-r border-[#30363d] -ml-px transition-colors cursor-pointer ${
                gridMode === '4x4'
                  ? 'bg-[#1f6feb] text-white font-semibold'
                  : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
              }`}
              title="4x4 Matrix"
            >
              <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />
              4x4
            </button>
            <button
              onClick={() => setGridMode('all30')}
              className={`px-2.5 py-1 text-xs font-medium border-t border-b border-r border-[#30363d] rounded-r-md -ml-px transition-colors cursor-pointer ${
                gridMode === 'all30'
                  ? 'bg-[#1f6feb] text-white font-semibold'
                  : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
              }`}
              title="All 30 Feeds"
            >
              <Tv2 className="w-3.5 h-3.5 inline mr-1" />
              All 30
            </button>
          </div>
        </div>
      </div>

      {/* Video Wall Matrix */}
      {isLoading ? (
        <div className="h-96 flex items-center justify-center bg-[#161b22] rounded-md border border-[#30363d]">
          <div className="text-center font-mono text-xs text-[#58a6ff] space-y-2">
            <Cpu className="w-8 h-8 animate-spin mx-auto text-[#58a6ff]" />
            <p>Connecting to Sentinel Camera Grid (103.250.160.189)...</p>
          </div>
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            gridMode === '2x2'
              ? 'grid-cols-1 md:grid-cols-2'
              : gridMode === '3x3'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : gridMode === '4x4'
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
          }`}
        >
          {activeCameras.map((cam: CameraNode, idx: number) => {
            const camNumber = idx + 1;
            const camTag = `cam${String(camNumber).padStart(2, '0')}`;
            const health = perCameraHealth[camTag] || perCameraHealth[cam.camera_id];

            const netOk = health?.network_reachable === true;
            const authOk = health?.authenticated === true;
            const rtpOk = health?.rtp_media_observed === true;
            const frameOk = health?.frame_active === true;
            const aiOk = health?.ai_active === true;
            const decodeFps = health?.decode_fps ?? null;
            const aiFps = health?.ai_fps ?? null;
            const hasError = health?.last_error;

            const detectedPeople = health?.detected_people ?? 0;
            const detectedVehicles = health?.detected_vehicles ?? 0;
            const latestPlate = health?.latest_plate_text;
            const latestVehType = health?.latest_vehicle_type;

            return (
              <div
                key={cam.camera_id}
                onClick={() => openContextDrawer({ camera: cam, plate: latestPlate, health })}
                className="cursor-pointer group rounded-md border border-[#30363d] hover:border-[#8b949e] bg-[#161b22] overflow-hidden transition-all shadow-sm"
              >
                <VideoPlayer
                  cameraId={camTag}
                  cameraName={cam.name}
                  isThreat={cam.metadata?.live_status === 'ALERT'}
                  overlayText={`NODE ${camTag.toUpperCase()}`}
                  onInspect={() => openContextDrawer({ camera: cam, plate: latestPlate, health })}
                />
                {/* Per-camera health & telemetry bar in GitHub Box Row style */}
                <div className="bg-[#161b22] border-t border-[#21262d] p-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono">
                    {health ? (
                      <>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-medium border ${
                            netOk ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40' : 'bg-[#da3633]/15 text-[#f85149] border-[#da3633]/40'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${netOk ? 'bg-[#3fb950]' : 'bg-[#f85149]'}`}></span>
                            NET:{netOk ? 'OK' : 'OFF'}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-medium border ${
                            authOk ? 'bg-[#21262d] text-[#c9d1d9] border-[#30363d]' : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'
                          }`}>
                            AUTH:{authOk ? 'OK' : 'PEND'}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-medium border ${
                            rtpOk ? 'bg-[#1f6feb]/15 text-[#58a6ff] border-[#1f6feb]/40' : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'
                          }`}>
                            RTP:{rtpOk ? 'OK' : 'INIT'}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8.5px] font-medium border ${
                            aiOk ? 'bg-[#238636]/15 text-[#3fb950] border-[#238636]/40' : frameOk ? 'bg-[#d29922]/15 text-[#d29922] border-[#d29922]/40' : 'bg-[#0d1117] text-[#8b949e] border-[#30363d]'
                          }`}>
                            AI:{aiOk ? 'ACTIVE' : frameOk ? 'DEC' : 'OFF'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {decodeFps !== null && decodeFps > 0 && (
                            <span className="text-[#8b949e] text-[9px] font-mono">{decodeFps} fps</span>
                          )}
                          {aiFps !== null && aiFps > 0 && (
                            <span className="text-[#58a6ff] text-[9px] font-mono font-medium">ai:{aiFps}</span>
                          )}
                          {hasError && (
                            <span title={hasError} className="p-0.5 rounded bg-[#da3633]/20 border border-[#da3633]">
                              <AlertTriangle className="w-2.5 h-2.5 text-[#f85149]" />
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-[#8b949e] italic text-[9px]">
                        {supervisorRunning ? 'Handshaking telemetry...' : 'Supervisor offline'}
                      </span>
                    )}
                  </div>

                  {/* AI Vision Sighting Telemetry */}
                  {health && (detectedPeople > 0 || detectedVehicles > 0 || latestPlate) && (
                    <div className="flex items-center justify-between text-[9px] pt-1 border-t border-[#21262d]">
                      <div className="flex items-center gap-2 flex-wrap">
                        {detectedPeople > 0 && (
                          <span className="text-[#58a6ff] font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]"></span>
                            {detectedPeople} {detectedPeople === 1 ? 'Person' : 'People'}
                          </span>
                        )}
                        {detectedVehicles > 0 && (
                          <span className="text-[#3fb950] font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]"></span>
                            {detectedVehicles} {latestVehType ? latestVehType.toUpperCase() : 'VEHICLE'}
                          </span>
                        )}
                      </div>
                      {latestPlate && (
                        <span className="px-1.5 py-0.2 rounded border border-[#d29922]/40 bg-[#d29922]/15 text-[#d29922] font-semibold tracking-wider font-mono text-[9px]">
                          {latestPlate}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
