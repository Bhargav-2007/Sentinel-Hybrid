import React from 'react';
import { Camera } from '../../types/camera';
import { BoundingBox } from '../../types/detection';
import { AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

interface VideoHUDProps {
  camera: Camera;
  detections?: BoundingBox[];
  ptsTimestampMs?: number;
  showOverlay?: boolean;
  isRecording?: boolean;
  recordingDuration?: string;
  sourceType?: 'HLS' | 'CANVAS_SIM' | 'RTSP';
}

export const VideoHUD: React.FC<VideoHUDProps> = ({
  camera,
  detections = [],
  ptsTimestampMs = 1042850,
  showOverlay = true,
  isRecording = false,
  recordingDuration = '00:00:00',
  sourceType = 'CANVAS_SIM',
}) => {
  if (!showOverlay) return null;

  return (
    <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between select-none z-10 font-mono">
      {/* Top Header: Camera Code, District, Telemetry & Recording Badge */}
      <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Live Node Indicator */}
          <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700/80 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-slate-100">{camera.camera_code}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 font-sans truncate max-w-[120px] sm:max-w-none">{camera.district}</span>
          </div>

          {/* Recording Badge */}
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/80 text-red-300 px-2.5 py-1 rounded-md text-[10px] font-bold animate-pulse shadow-lg shadow-red-500/20">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>REC {recordingDuration}</span>
            </div>
          )}
        </div>

        {/* Telemetry PTS & FPS */}
        <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700/80 text-[10px] text-cyan-400 shadow-md">
          <span className="hidden sm:inline">PTS: {ptsTimestampMs}ms</span>
          <span className="hidden sm:inline">•</span>
          <span>{camera.resolution || '1080p'}</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">{camera.fps || 25} FPS</span>
        </div>
      </div>

      {/* Center Dynamic Bounding Boxes (YOLO11 Overlay) */}
      <div className="relative w-full h-full my-auto pointer-events-none">
        {detections.map((box, idx) => {
          const isWatchlist = box.is_watchlist;
          return (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: `${Math.max(0, Math.min(95, box.x1))}%`,
                top: `${Math.max(5, Math.min(90, box.y1))}%`,
                width: `${Math.max(4, Math.min(100 - box.x1, box.x2 - box.x1))}%`,
                height: `${Math.max(4, Math.min(100 - box.y1, box.y2 - box.y1))}%`,
              }}
              className={`border-2 rounded pointer-events-none transition-all duration-100 ${
                isWatchlist
                  ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/50 animate-pulse ring-2 ring-red-400/40'
                  : 'border-cyan-400/90 bg-cyan-500/10 shadow-lg shadow-cyan-500/30'
              }`}
            >
              {/* Top Tag: Class & Confidence */}
              <div
                className={`absolute -top-6 left-0 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 font-mono font-bold whitespace-nowrap shadow-md ${
                  isWatchlist
                    ? 'bg-red-950 text-red-200 border border-red-500/80'
                    : 'bg-slate-950/90 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {isWatchlist && <AlertTriangle className="w-3 h-3 text-red-400 animate-bounce" />}
                <span>{box.class_name.toUpperCase()}</span>
                {box.track_id && <span className="text-yellow-300">#{box.track_id}</span>}
                <span className={isWatchlist ? 'text-red-300' : 'text-emerald-400'}>
                  ({Math.round(box.confidence * 100)}%)
                </span>
              </div>

              {/* Bottom Tag: License Plate & Hotlist Badge */}
              {box.plate_text && (
                <div
                  className={`absolute -bottom-6 left-0 text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap shadow-md flex items-center gap-1 ${
                    isWatchlist
                      ? 'bg-red-950/95 text-yellow-300 border border-red-500 ring-1 ring-red-400/50 animate-pulse'
                      : 'bg-yellow-950/90 text-yellow-300 border border-yellow-500/50'
                  }`}
                >
                  {isWatchlist ? (
                    <>
                      <ShieldAlert className="w-3 h-3 text-red-400" />
                      <span>{box.plate_text} [HOTLIST]</span>
                    </>
                  ) : (
                    <span>{box.plate_text}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Footer: Jurisdiction and Stream Status */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-800 shadow-md">
        <span className="truncate max-w-[200px] sm:max-w-none">{camera.location_name || camera.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 hidden sm:inline">CODEC: {camera.codec?.toUpperCase() || 'H264'}</span>
          <span className="font-bold text-emerald-400">
            {sourceType === 'CANVAS_SIM' ? '● SENTINEL AI FEED (60FPS)' : '● ENCRYPTED WAN STREAM'}
          </span>
        </div>
      </div>
    </div>
  );
};
