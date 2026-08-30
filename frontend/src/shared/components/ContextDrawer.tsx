import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextDrawerStore } from '../../core/context/contextDrawerStore';
import { 
  X, 
  Camera as CameraIcon, 
  Car, 
  ShieldAlert, 
  Activity, 
  ArrowRight, 
  ExternalLink, 
  Radio, 
  CheckCircle2, 
  FileCheck,
  Search,
  Tv2
} from 'lucide-react';

export const ContextDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isOpen, 
    type, 
    selectedCamera, 
    selectedAlert, 
    selectedPlate, 
    selectedIncidentId, 
    closeDrawer,
    openVehicleDrawer
  } = useContextDrawerStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 bg-[#080d1a] border-l border-slate-800 shadow-2xl flex flex-col font-mono text-xs select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          {type === 'CAMERA' && <CameraIcon className="w-4 h-4 text-cyan-400" />}
          {type === 'VEHICLE' && <Car className="w-4 h-4 text-yellow-300" />}
          {type === 'ALERT' && <ShieldAlert className="w-4 h-4 text-red-400" />}
          {type === 'INCIDENT' && <Activity className="w-4 h-4 text-amber-400" />}
          <span className="font-bold text-slate-100 uppercase tracking-wider">
            {type} CONTEXT DOSSIER
          </span>
        </div>
        <button 
          onClick={closeDrawer}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* CAMERA CONTEXT */}
        {type === 'CAMERA' && selectedCamera && (
          <div className="space-y-4">
            {/* Live Video Preview Box */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 group">
              <video
                src={`https://live.corp8.cloud/stream/${selectedCamera.stream_id || selectedCamera.id || '1'}`}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] text-emerald-400 font-bold border border-slate-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>● LIVE WAN NODE</span>
              </div>
            </div>

            {/* Camera Metadata Card */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-500">CAMERA CODE</span>
                <span className="font-bold text-cyan-300">{selectedCamera.camera_code}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-500">LOCATION</span>
                <span className="text-slate-200 truncate">{selectedCamera.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-500">DEPARTMENT</span>
                <span className="text-slate-300">{selectedCamera.department_id}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-[10px] text-slate-500">RESOLUTION & FPS</span>
                <span className="text-slate-300">{selectedCamera.resolution || '1080p'} @ {selectedCamera.fps || 25}fps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">COORDINATES</span>
                <span className="text-slate-400 text-[10px]">{selectedCamera.latitude}, {selectedCamera.longitude}</span>
              </div>
            </div>

            {/* AI Capabilities */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI PIPELINES ACTIVE</span>
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded text-[10px]">ANPR ●</span>
                <span className="bg-emerald-950 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded text-[10px]">VEHICLE ●</span>
                <span className="bg-purple-950 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded text-[10px]">PERSON ●</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  closeDrawer();
                  navigate(`/live?focus=${selectedCamera.id}`);
                }}
                className="py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors flex items-center justify-center gap-1"
              >
                <Tv2 className="w-3.5 h-3.5" />
                <span>EXPAND LIVE</span>
              </button>
              <button
                onClick={() => {
                  closeDrawer();
                  navigate(`/investigate/vehicle?cam=${selectedCamera.id}`);
                }}
                className="py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition-colors flex items-center justify-center gap-1"
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>TRACE SIGHTINGS</span>
              </button>
            </div>
          </div>
        )}

        {/* VEHICLE CONTEXT */}
        {type === 'VEHICLE' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-center">
              <span className="text-[10px] text-slate-500">TARGET LICENSE REGISTRATION</span>
              <div className="text-xl font-bold text-yellow-300 bg-yellow-950/60 py-1 px-3 rounded border border-yellow-500/40 inline-block">
                {selectedPlate || 'GJ01AB1234'}
              </div>
              <div className="text-[11px] text-red-400 font-bold mt-1">● eGujCop Stolen Auto Hotlist Match</div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase">VAHAN Registry Summary</span>
              <div className="space-y-1.5 pt-1 text-slate-300 text-[11px]">
                <p>Owner: <strong className="text-slate-100">VIKRAMSINGH R. JADEJA</strong></p>
                <p>Class: <strong>Toyota Fortuner (White SUV)</strong></p>
                <p>Insurance: <strong className="text-emerald-400">Valid (2027-04-15)</strong></p>
              </div>
            </div>

            <button
              onClick={() => {
                closeDrawer();
                navigate(`/investigate/vehicle?plate=${selectedPlate || 'GJ01AB1234'}`);
              }}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>OPEN 360° VEHICLE INVESTIGATION</span>
            </button>
          </div>
        )}

        {/* ALERT CONTEXT */}
        {type === 'ALERT' && selectedAlert && (
          <div className="space-y-4">
            <div className="bg-red-950/40 p-4 rounded-xl border border-red-500/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                  {selectedAlert.severity}
                </span>
                <span className="font-bold text-yellow-300 bg-black/60 px-2 py-0.5 rounded border border-yellow-500/30">
                  {selectedAlert.detected_plate}
                </span>
              </div>
              <h3 className="font-bold text-slate-100 text-xs mt-1">{selectedAlert.title}</h3>
              <p className="text-[11px] text-slate-300 font-sans">{selectedAlert.description}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
              <span className="text-[10px] text-slate-500">LOCATION SIGHTED</span>
              <p className="font-bold text-slate-200">{selectedAlert.camera_name}</p>
              <p className="text-slate-400 text-[10px]">{selectedAlert.district}</p>
            </div>

            <button
              onClick={() => {
                closeDrawer();
                navigate(`/alerts?id=${selectedAlert.id}`);
              }}
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              <span>OPEN INCIDENT TRIAGE</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
