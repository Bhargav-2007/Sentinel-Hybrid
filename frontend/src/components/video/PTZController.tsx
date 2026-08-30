import React, { useState } from 'react';
import { Camera, PTZCommand } from '../../types/camera';
import { cameraService } from '../../services/cameraService';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Play
} from 'lucide-react';

interface PTZControllerProps {
  camera: Camera | null;
  onClose?: () => void;
}

export const PTZController: React.FC<PTZControllerProps> = ({ camera, onClose }) => {
  const [speed, setSpeed] = useState<number>(4);
  const [activePreset, setActivePreset] = useState<number>(1);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!camera) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center text-xs text-slate-400 font-mono">
        Select a camera from the grid to control PTZ.
      </div>
    );
  }

  const sendCommand = async (action: PTZCommand['action']) => {
    try {
      setStatusMsg(`Dispatching ${action}...`);
      await cameraService.sendPTZCommand(camera.id, { action, speed });
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (e: any) {
      setStatusMsg(`PTZ Error: ${e.message}`);
    }
  };

  const handlePreset = async (presetId: number) => {
    setActivePreset(presetId);
    try {
      setStatusMsg(`Moving to Preset #${presetId}...`);
      await cameraService.sendPTZCommand(camera.id, { action: 'preset_goto', preset_id: presetId });
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (e: any) {
      setStatusMsg(`Preset Error: ${e.message}`);
    }
  };

  return (
    <div className="bg-[#090e1a] border border-slate-800 rounded-xl p-4 flex flex-col gap-4 select-none shadow-xl font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            PTZ TELEMETRY • {camera.camera_code}
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200">
            ✕
          </button>
        )}
      </div>

      {/* Directional Pad */}
      <div className="flex flex-col items-center gap-2 my-2">
        {/* Tilt Up */}
        <button
          onClick={() => sendCommand('tilt_up')}
          className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 flex items-center justify-center transition-all active:scale-95 shadow-md"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* Pan Left, Center Stop, Pan Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => sendCommand('pan_left')}
            className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 flex items-center justify-center transition-all active:scale-95 shadow-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => sendCommand('stop')}
            className="w-10 h-10 rounded-lg bg-red-950/40 border border-red-800/60 hover:border-red-500 text-red-400 hover:text-red-200 flex items-center justify-center text-xs font-bold transition-all active:scale-95 shadow-md"
            title="Stop PTZ Movement"
          >
            STOP
          </button>

          <button
            onClick={() => sendCommand('pan_right')}
            className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 flex items-center justify-center transition-all active:scale-95 shadow-md"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Tilt Down */}
        <button
          onClick={() => sendCommand('tilt_down')}
          className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 flex items-center justify-center transition-all active:scale-95 shadow-md"
        >
          <ArrowDown className="w-5 h-5" />
        </button>
      </div>

      {/* Optical Zoom Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => sendCommand('zoom_in')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-slate-200 hover:text-cyan-300 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
          <span>ZOOM IN</span>
        </button>
        <button
          onClick={() => sendCommand('zoom_out')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-slate-200 hover:text-cyan-300 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
          <span>ZOOM OUT</span>
        </button>
      </div>

      {/* Preset Positions */}
      <div className="flex flex-col gap-1.5 border-t border-slate-800 pt-3">
        <span className="text-[11px] font-bold text-slate-400">GUARD TOUR PRESETS</span>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((pId) => (
            <button
              key={pId}
              onClick={() => handlePreset(pId)}
              className={`py-1.5 rounded text-xs font-bold transition-all ${
                activePreset === pId
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              P{pId}
            </button>
          ))}
        </div>
      </div>

      {/* Status Feedback */}
      {statusMsg && (
        <div className="text-[10px] text-cyan-400 bg-cyan-950/60 p-1.5 rounded border border-cyan-500/20 text-center animate-pulse">
          {statusMsg}
        </div>
      )}
    </div>
  );
};
