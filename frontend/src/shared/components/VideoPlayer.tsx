import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, ShieldAlert, Cpu, Radio, Camera, ZoomIn } from 'lucide-react';
import { FootageInspectionModal } from './FootageInspectionModal';

interface VideoPlayerProps {
  streamUrl?: string;
  cameraName: string;
  cameraId: string;
  overlayText?: string;
  isThreat?: boolean;
  onInspect?: () => void;
  aspectRatio?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  cameraName,
  cameraId,
  overlayText,
  isThreat = false,
  onInspect,
  aspectRatio = 'aspect-video',
}) => {
  const navigate = useNavigate();
  const [frameSrc, setFrameSrc] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isMountedRef = useRef(true);

  // Extract number from any ID format (CAM-GJ-04 -> 4 -> cam04)
  const match = cameraId.match(/\d+/);
  const numId = match ? parseInt(match[0], 10) : 1;
  const clampedNum = Math.max(1, Math.min(30, numId));
  const camTag = `cam${String(clampedNum).padStart(2, '0')}`;

  const snapshotBase = `http://localhost:8000/api/v1/streams/${camTag}/snapshot`;

  useEffect(() => {
    isMountedRef.current = true;
    let timerId: any = null;

    const fetchNextFrame = async () => {
      try {
        const res = await fetch(`${snapshotBase}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const blob = await res.blob();
          if (isMountedRef.current) {
            const objectUrl = URL.createObjectURL(blob);
            setFrameSrc((prev) => {
              if (prev && prev.startsWith('blob:')) {
                URL.revokeObjectURL(prev);
              }
              return objectUrl;
            });
          }
        }
      } catch (err) {
        // Soft retry
      }

      if (isMountedRef.current) {
        timerId = setTimeout(fetchNextFrame, 120); // ~8-10 FPS per matrix tile for smooth multi-camera playback
      }
    };

    fetchNextFrame();

    return () => {
      isMountedRef.current = false;
      if (timerId) clearTimeout(timerId);
      setFrameSrc((prev) => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return '';
      });
    };
  }, [snapshotBase]);

  const handleQuickSnapshot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!frameSrc) return;
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `SENTINEL_EVIDENCE_${camTag.toUpperCase()}_${timestamp}.jpg`;
      const res = await fetch(frameSrc);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Soft ignore
    }
  };

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className={`relative ${aspectRatio} bg-black rounded border overflow-hidden group select-none transition-all cursor-pointer ${
          isThreat
            ? 'border-cyber-crimson shadow-glow-crimson'
            : 'border-slate-800 hover:border-cyber-cyan/80'
        }`}
      >
        {/* Real Live Annotated Video Frame from In-Memory Hub */}
        {frameSrc ? (
          <img
            src={frameSrc}
            alt={cameraName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-4 text-center">
            <Cpu className="w-8 h-8 text-cyber-cyan animate-pulse mb-2" />
            <p className="text-xs font-mono text-slate-200 font-bold">{cameraName}</p>
            <p className="text-[10px] font-mono text-slate-500 mt-1">Connecting to 103.250.160.189:8554...</p>
          </div>
        )}

        {/* Top Stream HUD Header */}
        <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isThreat ? 'bg-cyber-crimson' : 'bg-emerald-400'
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isThreat ? 'bg-cyber-crimson' : 'bg-emerald-500'
                }`}
              ></span>
            </span>
            <span className="text-xs font-mono font-bold text-white tracking-wide truncate max-w-[200px]">
              {cameraName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 border border-cyber-cyan/40 text-cyber-cyan font-bold tracking-wider flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
              LIVE RTSP
            </span>
          </div>
        </div>

        {/* APB Alert Threat Sighting Tag */}
        {isThreat && (
          <div className="absolute top-8 left-2 z-10 px-2 py-0.5 rounded bg-cyber-crimson text-white text-[10px] font-bold font-mono tracking-wider flex items-center gap-1 shadow-glow-crimson animate-pulse-fast">
            <ShieldAlert className="w-3 h-3" />
            <span>HOTLIST APB: WANTED TARGET</span>
          </div>
        )}

        {/* Bottom Controls Bar (Visible on Hover) */}
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between z-10">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
            <span className="bg-black/60 px-1.5 py-0.5 rounded border border-slate-700">
              Node: {camTag.toUpperCase()}
            </span>
            <span className="text-emerald-400 font-bold">ANPR ON</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleQuickSnapshot}
              className="p-1 rounded bg-slate-900/90 hover:bg-emerald-600 text-white text-[10px] font-mono font-bold flex items-center gap-1 transition-all border border-slate-700 hover:border-emerald-400"
              title="Quick Snapshot"
            >
              <Camera className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="px-2 py-1 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white text-[11px] font-mono font-bold flex items-center gap-1 transition-all"
              title="Open Digital PTZ Zoom & Snapshot Modal"
            >
              <ZoomIn className="w-3 h-3" />
              <span>ZOOM / SNAPSHOT</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive PTZ Zoom & Forensic Snapshot Modal */}
      <FootageInspectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cameraName={cameraName}
        cameraId={camTag}
        frameSrc={frameSrc}
        isThreat={isThreat}
        onJumpToInvestigation={(plate) => navigate(`/investigate?plate=${plate}`)}
      />
    </>
  );
};
