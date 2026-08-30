import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { cameraService } from '../../services/cameraService';
import { alertService } from '../../services/alertService';
import { watchlistService } from '../../services/watchlistService';
import { aiDetectionService } from '../../services/aiDetectionService';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { 
  Car, 
  Search, 
  ShieldAlert, 
  Radio, 
  Zap, 
  CheckCircle2, 
  Play
} from 'lucide-react';

export const LiveANPRPage: React.FC = () => {
  const navigate = useNavigate();
  const { openVehicleDrawer } = useContextDrawerStore();
  const [filterPlate, setFilterPlate] = useState('');
  const [isInferencing, setIsInferencing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Fetch real cameras from backend
  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras-anpr'],
    queryFn: () => cameraService.listCameras({ limit: 10 }),
  });

  // Fetch real alerts from backend
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts-anpr'],
    queryFn: () => alertService.listAlerts({ limit: 20 }),
  });

  // Fetch real watchlists from backend
  const { data: watchlists = [] } = useQuery({
    queryKey: ['watchlists-anpr'],
    queryFn: () => watchlistService.listWatchlists(),
  });

  const runLiveInference = async (cam: any) => {
    setIsInferencing(true);
    try {
      // Grab current live video frame from the active video player
      const video = document.querySelector('video') as HTMLVideoElement | null;
      let imageBase64: string | undefined;

      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
        }
      }

      const res = await aiDetectionService.detectFull({
        camera_id: cam.camera_code || 'CAM-01',
        image_base64: imageBase64,
        return_annotated_image: true,
      });
      setAiResult(res);
    } catch (e: any) {
      console.error('Live inference error:', e);
    } finally {
      setIsInferencing(false);
    }
  };

  const currentCam = cameras[0] || null;

  return (
    <div className="flex flex-col gap-5 max-w-[1920px] mx-auto select-none font-mono text-xs">
      {/* Top Banner: Real Database Metrics */}
      <div className="bg-[#090e1a] border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-cyan-400" />
            <h1 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              LIVE ANPR TELEMETRY & INDIAN HSRP OCR ENGINE
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-400 font-bold">● AI ENGINE (:8006) CONNECTED</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">ACTIVE CAMERAS</span>
            <div className="text-xl font-bold text-slate-100 mt-0.5">{cameras.length} Nodes</div>
            <span className="text-[10px] text-cyan-400">● live.corp8.cloud Ingest</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">DATABASE ALERTS</span>
            <div className="text-xl font-bold text-cyan-300 mt-0.5">{alerts.length} Incidents</div>
            <span className="text-[10px] text-slate-400">● Real Database Records</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">WATCHLIST ENTRIES</span>
            <div className="text-xl font-bold text-red-400 mt-0.5">{watchlists.length} Hotlists</div>
            <span className="text-[10px] text-red-400 font-bold">▲ eGujCop / VAHAN</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold">OCR INFERENCE</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">PaddleOCR</div>
            <span className="text-[10px] text-emerald-400 font-bold">● YOLO11 + ByteTrack</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Live Video Feed + Run Inference Trigger (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase">
              LIVE ANPR STREAM ({currentCam?.camera_code || 'CAM-01'})
            </span>
            <button
              onClick={() => currentCam && runLiveInference(currentCam)}
              disabled={isInferencing}
              className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isInferencing ? 'RUNNING YOLO11...' : 'RUN LIVE INFERENCE (:8006)'}</span>
            </button>
          </div>

          <div className="h-[360px] rounded-xl overflow-hidden border border-slate-800">
            {currentCam && <VideoPlayer camera={currentCam} showHUD={true} />}
          </div>

          {aiResult && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-cyan-500/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-cyan-400 font-bold">LIVE INFERENCE RESULT (:8006)</span>
                <span className="text-slate-400 text-[10px]">{aiResult.inference_time_ms} ms</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <span>People: <strong className="text-cyan-300">{aiResult.total_people}</strong></span>
                <span>Vehicles: <strong className="text-yellow-300">{aiResult.total_vehicles}</strong></span>
                <span>Plates: <strong className="text-emerald-400">{aiResult.total_plates}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Database Sighting & Alert Table (6 cols) */}
        <div className="lg:col-span-6 bg-[#090e1a] border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                DATABASE APB SIGHTINGS ({alerts.length})
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={filterPlate}
                  onChange={(e) => setFilterPlate(e.target.value)}
                  placeholder="Filter plate..."
                  className="pl-8 pr-2 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {alerts
                .filter((a) => !filterPlate || (a.detected_plate && a.detected_plate.includes(filterPlate.toUpperCase())))
                .map((alt) => (
                  <div
                    key={alt.id}
                    onClick={() => {
                      if (alt.detected_plate) openVehicleDrawer(alt.detected_plate);
                    }}
                    className="p-3 rounded-xl border bg-slate-950 border-slate-800 hover:border-cyan-500/50 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-yellow-300 text-xs bg-yellow-950/60 px-2 py-0.5 rounded border border-yellow-500/40">
                          {alt.detected_plate || 'PLATE-DETECT'}
                        </span>
                        <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded text-[9px] font-bold">
                          {alt.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 font-sans">{alt.title}</p>
                      <p className="text-[10px] text-slate-500 font-sans">{alt.camera_name} • {alt.district}</p>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-emerald-400 font-bold">{(alt.confidence_score * 100).toFixed(1)}%</span>
                      <span className="text-[10px] text-slate-500 mt-1">{new Date(alt.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-2 flex items-center justify-between">
            <span>Direct database correlation active. Click any plate to open full trace.</span>
            <button
              onClick={() => navigate('/investigate/vehicle?plate=GJ01AB1234')}
              className="text-cyan-400 hover:underline font-bold"
            >
              Open Full Search ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
