import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera,
  Download,
  ShieldCheck,
  Maximize2,
  Minimize2,
  FileCheck,
  Gauge,
  Radio,
  Share2,
} from 'lucide-react';

interface FootageInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameraName: string;
  cameraId: string;
  frameSrc: string;
  isThreat?: boolean;
  onJumpToInvestigation?: (plate: string) => void;
}

export const FootageInspectionModal: React.FC<FootageInspectionModalProps> = ({
  isOpen,
  onClose,
  cameraName,
  cameraId,
  frameSrc,
  isThreat = false,
  onJumpToInvestigation,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      }
      if (e.key === '-') {
        handleZoomOut();
      }
      if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(6, +(prev + 0.5).toFixed(1)));
  const handleZoomOut = () =>
    setZoom((prev) => {
      const next = Math.max(1, +(prev - 0.5).toFixed(1));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // High-Resolution Forensic Snapshot Capture
  const handleTakeSnapshot = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `SENTINEL_EVIDENCE_${cameraId.toUpperCase()}_${timestamp}.jpg`;

      // Fetch the raw image blob
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

      setSnapshotToast(`📸 Snapshot Captured & Downloaded: ${filename}`);
      setTimeout(() => setSnapshotToast(null), 4000);
    } catch (err) {
      setSnapshotToast('⚠️ Error downloading snapshot');
      setTimeout(() => setSnapshotToast(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none animate-fadeIn">
      <div
        ref={containerRef}
        className={`w-full ${
          isFullscreen ? 'h-full max-w-none' : 'max-w-6xl max-h-[92vh]'
        } bg-sentinel-950 border border-slate-700 rounded-lg shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Modal Top Header */}
        <div className="p-3 bg-sentinel-900 border-b border-slate-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyber-cyan"></span>
            </span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                <span>{cameraName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan font-bold">
                  NODE: {cameraId.toUpperCase()}
                </span>
                {isThreat && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyber-crimson/20 border border-cyber-crimson text-cyber-crimson font-bold animate-pulse-fast">
                    HOTLIST APB ACTIVE
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                103.250.160.189 &bull; Real-time AI Object Detection &bull; HSRP License Plate OCR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded bg-slate-900 hover:bg-red-950 hover:text-red-400 text-slate-300 transition-colors"
              title="Close (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Area with Pan & Zoom */}
        <div
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 relative bg-black overflow-hidden flex items-center justify-center ${
            zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
          }`}
        >
          {frameSrc ? (
            <img
              src={frameSrc}
              alt={cameraName}
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                transformOrigin: 'center center',
              }}
              className="max-w-full max-h-full object-contain pointer-events-none"
            />
          ) : (
            <div className="text-slate-500 text-xs">Loading camera footage...</div>
          )}

          {/* Zoom Level Indicator HUD (Top-Left) */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded text-xs text-slate-200 flex items-center gap-3">
            <span>
              Zoom: <b className="text-cyber-cyan">{zoom}x</b>
            </span>
            {zoom > 1 && (
              <span className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">
                Click & Drag to Pan
              </span>
            )}
          </div>

          {/* Snapshot Notification Toast */}
          {snapshotToast && (
            <div className="absolute top-3 right-3 bg-emerald-950 border-2 border-emerald-400 text-emerald-300 px-4 py-2 rounded shadow-2xl text-xs font-bold animate-bounce flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{snapshotToast}</span>
            </div>
          )}
        </div>

        {/* Bottom Operational Toolbar (Zoom Controls & Snapshot Actions) */}
        <div className="p-3 bg-sentinel-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded border border-slate-800">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 text-xs font-bold flex items-center gap-1 transition-all"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>OUT</span>
            </button>
            <span className="px-2 text-xs font-bold text-cyber-cyan min-w-[36px] text-center">
              {zoom}x
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 6}
              className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 text-xs font-bold flex items-center gap-1 transition-all"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>IN</span>
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1 transition-all ml-1 border-l border-slate-800 pl-2"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>
          </div>

          {/* Forensics & Evidence Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTakeSnapshot}
              className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>📸 TAKE FORENSIC SNAPSHOT</span>
            </button>

            {onJumpToInvestigation && (
              <button
                onClick={() => {
                  onClose();
                  onJumpToInvestigation('');
                }}
                className="px-3.5 py-1.5 rounded bg-cyber-blue hover:bg-cyber-cyan hover:text-black text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <FileCheck className="w-4 h-4" />
                <span>360° VEHICLE INVESTIGATION</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
