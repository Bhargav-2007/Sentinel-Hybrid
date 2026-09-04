import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Grid3X3, Grid2X2, Cpu, Eye, Filter, Tv2, AlertTriangle } from 'lucide-react';
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
  // Only count cameras with real frame activity from the supervisor
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
    <div className="space-y-4 font-mono">
      {/* Action Bar & Grid Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded bg-sentinel-900/90 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-cyan">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Statewide Live Camera Matrix</span>
              {/* Show only real active frame count from supervisor — not camera DB count */}
              {supervisorRunning ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold">
                  {activeFrameCount} FRAME-ACTIVE / {fleetHealth?.total_cameras ?? 0} CONFIGURED
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-400 font-bold">
                  SUPERVISOR NOT STARTED
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              RTSP TCP Gateway: 103.250.160.189:8554 · WHEP: 103.250.160.189:8889
              {supervisorRunning && ` · AI Active: ${activeAiCount}/${fleetHealth?.total_cameras ?? 0}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan"
            >
              <option value="ALL">All 5 Departments</option>
              <option value="POLICE">Police / Home</option>
              <option value="GSRTC">GSRTC Transport</option>
              <option value="MUNICIPAL">Municipal Corp</option>
              <option value="HEALTH">Health Dept</option>
              <option value="PANCHAYAT">Panchayat &amp; Rural</option>
            </select>
          </div>

          {/* District Filter */}
          <div className="flex items-center gap-2">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyber-cyan"
            >
              <option value="ALL">All Districts</option>
              <option value="Ahmedabad">Ahmedabad City</option>
              <option value="Surat">Surat City</option>
              <option value="Vadodara">Vadodara</option>
              <option value="Gandhinagar">Gandhinagar</option>
              <option value="Rajkot">Rajkot</option>
            </select>
          </div>

          {/* Grid Layout Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={() => setGridMode('2x2')}
              className={`p-1.5 rounded transition-colors ${
                gridMode === '2x2' ? 'bg-cyber-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="2x2 Grid (4 Cameras)"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('3x3')}
              className={`p-1.5 rounded transition-colors ${
                gridMode === '3x3' ? 'bg-cyber-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="3x3 Grid (9 Cameras)"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('4x4')}
              className={`p-1.5 rounded transition-colors ${
                gridMode === '4x4' ? 'bg-cyber-cyan text-black font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="4x4 Grid (16 Cameras)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setGridMode('all30')}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition-colors flex items-center gap-1 ${
                gridMode === 'all30' ? 'bg-cyber-cyan text-black' : 'text-slate-400 hover:text-white'
              }`}
              title="All 30 Cameras Grid"
            >
              <Tv2 className="w-3.5 h-3.5" />
              <span>ALL 30</span>
            </button>
          </div>
        </div>
      </div>

      {/* Video Wall Matrix */}
      {isLoading ? (
        <div className="h-96 flex items-center justify-center bg-sentinel-900/60 rounded border border-slate-800">
          <div className="text-center font-mono text-xs text-cyber-cyan space-y-2">
            <Cpu className="w-8 h-8 animate-spin mx-auto text-cyber-cyan" />
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
            // Look up real supervisor telemetry for this specific camera
            const health = perCameraHealth[camTag] || perCameraHealth[cam.camera_id];

            // Determine true state labels from real telemetry
            const netOk = health?.network_reachable === true;
            const authOk = health?.authenticated === true;
            const rtpOk = health?.rtp_media_observed === true;
            const decOk = health?.decoder_open === true;
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
                className="cursor-pointer group"
              >
                <VideoPlayer
                  cameraId={camTag}
                  cameraName={cam.name}
                  isThreat={cam.metadata?.live_status === 'ALERT'}
                  overlayText={`NODE ${camTag.toUpperCase()}`}
                  onInspect={() => openContextDrawer({ camera: cam, plate: latestPlate, health })}
                />
                {/* Per-camera health bar — derived from real supervisor telemetry */}
                <div className="mt-1 bg-slate-950/90 border border-slate-800 rounded px-2 py-1 space-y-1 font-mono">
                  <div className="flex items-center justify-between text-[9px]">
                    {health ? (
                      <>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={netOk ? 'text-emerald-400 font-bold' : 'text-red-500 font-bold'}>
                            NET:{netOk ? 'OK' : health.network_reachable === false ? 'FAIL' : 'NOT_TESTED'}
                          </span>
                          <span className="text-slate-700">|</span>
                          <span className={authOk ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                            AUTH:{authOk ? 'OK' : 'NOT_TESTED'}
                          </span>
                          <span className="text-slate-700">|</span>
                          <span className={rtpOk ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
                            RTP:{rtpOk ? 'OK' : 'NOT_TESTED'}
                          </span>
                          <span className="text-slate-700">|</span>
                          <span className={decOk ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
                            DEC:{decOk ? 'OK' : 'NOT_TESTED'}
                          </span>
                          <span className="text-slate-700">|</span>
                          <span className={aiOk ? 'text-emerald-400 font-bold' : frameOk ? 'text-amber-400 font-bold' : 'text-slate-600'}>
                            AI:{aiOk ? 'ACTIVE' : frameOk ? 'PENDING' : 'NOT_STARTED'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {decodeFps !== null && decodeFps > 0 && (
                            <span className="text-slate-400">{decodeFps} fps</span>
                          )}
                          {aiFps !== null && aiFps > 0 && (
                            <span className="text-cyber-cyan">AI:{aiFps} fps</span>
                          )}
                          {hasError && (
                            <span title={hasError}>
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <span className="text-slate-600 italic">
                        {supervisorRunning ? 'No telemetry yet...' : 'Supervisor not started'}
                      </span>
                    )}
                  </div>

                  {/* AI Vision Sighting Telemetry: Persons, Vehicle Types & Plates */}
                  {health && (detectedPeople > 0 || detectedVehicles > 0 || latestPlate) && (
                    <div className="flex items-center justify-between text-[8.5px] pt-0.5 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {detectedPeople > 0 && (
                          <span className="text-cyan-300 font-semibold flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            {detectedPeople} {detectedPeople === 1 ? 'PERSON' : 'PEOPLE'}
                          </span>
                        )}
                        {detectedVehicles > 0 && (
                          <span className="text-emerald-300 font-semibold flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {detectedVehicles} {latestVehType ? latestVehType.toUpperCase() : 'VEHICLE'}
                          </span>
                        )}
                      </div>
                      {latestPlate && (
                        <span className="px-1.5 py-0.2 rounded bg-yellow-950/80 border border-yellow-500/50 text-yellow-300 font-bold tracking-wider text-[8px]">
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
