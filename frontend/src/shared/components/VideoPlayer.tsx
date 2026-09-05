import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import {
  ShieldAlert,
  Cpu,
  Radio,
  Camera,
  ZoomIn,
  Volume2,
  VolumeX,
  RefreshCw,
  Maximize2,
  Minimize2,
  Layers,
} from 'lucide-react';
import { FootageInspectionModal } from './FootageInspectionModal';

export type VideoTransport = 'WHEP' | 'HLS' | 'SNAPSHOT';

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const snapshotTimerRef = useRef<any>(null);

  // Derive standardized camTag (cam01..cam30)
  const match = cameraId.match(/\d+/);
  const numId = match ? parseInt(match[0], 10) : 1;
  const clampedNum = Math.max(1, Math.min(30, numId));
  const camTag = `cam${String(clampedNum).padStart(2, '0')}`;

  const apiBase = (import.meta as any).env?.VITE_API_URL || '';
  const snapshotUrl = `${apiBase}/api/v1/streams/${camTag}/snapshot`;
  const whepUrl = `${apiBase}/api/v1/streams/${camTag}/whep`;
  const hlsUrl = `${apiBase}/api/v1/streams/${camTag}/hls/index.m3u8`;

  // State
  const [transport, setTransport] = useState<VideoTransport>('WHEP');
  const [activeTransport, setActiveTransport] = useState<VideoTransport>('WHEP');
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const [frameSrc, setFrameSrc] = useState<string>('');
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasVideoMedia, setHasVideoMedia] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [isWaitingKeyframe, setIsWaitingKeyframe] = useState(false);

  // Clean up all WebRTC, HLS, and Snapshot timers
  const teardownPipelines = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((s) => pcRef.current?.removeTrack(s));
        pcRef.current.close();
      } catch (e) {
        // ignore
      }
      pcRef.current = null;
    }

    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        // ignore
      }
      hlsRef.current = null;
    }

    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute('src');
    }

    setHasVideoMedia(false);
    setIsWaitingKeyframe(false);
  }, []);

  // Snapshot Engine (Runs for SNAPSHOT mode or as fallback)
  const startSnapshotLoop = useCallback(() => {
    if (!isMountedRef.current) return;
    setActiveTransport('SNAPSHOT');
    setConnectionStatus('Snapshot Active');

    const fetchFrame = async () => {
      if (!isMountedRef.current) return;
      try {
        const res = await fetch(`${snapshotUrl}?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const blob = await res.blob();
          if (isMountedRef.current) {
            const objectUrl = URL.createObjectURL(blob);
            setFrameSrc((prev) => {
              if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
              return objectUrl;
            });
            setConnectionStatus('Snapshot 10 FPS');
          }
        }
      } catch (err) {
        setConnectionStatus('Reconnecting...');
      }

      if (isMountedRef.current) {
        snapshotTimerRef.current = setTimeout(fetchFrame, 120);
      }
    };

    fetchFrame();
  }, [snapshotUrl]);

  // HLS Engine (Via hls.js or native Safari HLS)
  const startHls = useCallback(() => {
    if (!isMountedRef.current || !videoRef.current) return;
    teardownPipelines();
    setActiveTransport('HLS');
    setConnectionStatus('HLS Initializing...');
    setIsWaitingKeyframe(true);

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        maxBufferLength: 6,
        manifestLoadingTimeOut: 3000,
        levelLoadingTimeOut: 3000,
      });
      hlsRef.current = hls;

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isMountedRef.current) return;
        setConnectionStatus('HLS Live');
        setIsWaitingKeyframe(false);
        setHasVideoMedia(true);
        video.play().catch(() => { });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.warn(`HLS fatal error on ${camTag}:`, data.type);
          hls.destroy();
          // Fallback to snapshot
          startSnapshotLoop();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        if (!isMountedRef.current) return;
        setConnectionStatus('HLS Native Live');
        setIsWaitingKeyframe(false);
        setHasVideoMedia(true);
        video.play().catch(() => { });
      });
      video.addEventListener('error', () => {
        startSnapshotLoop();
      });
    } else {
      // Fallback
      startSnapshotLoop();
    }
  }, [hlsUrl, camTag, teardownPipelines, startSnapshotLoop]);

  // WebRTC WHEP Engine (Performs true SDP negotiation, ICE/DTLS handshake)
  const startWhep = useCallback(async () => {
    if (!isMountedRef.current || !videoRef.current) return;
    teardownPipelines();
    setActiveTransport('WHEP');
    setConnectionStatus('WHEP SDP Offer...');
    setIsWaitingKeyframe(true);

    const video = videoRef.current;

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
      });
      pcRef.current = pc;

      // Add recvonly transceivers for video and audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        if (!isMountedRef.current) return;
        if (event.streams && event.streams[0]) {
          video.srcObject = event.streams[0];
          setHasVideoMedia(true);
          setIsWaitingKeyframe(false);
          setConnectionStatus('WHEP Live (WebRTC)');
          video.play().catch(() => { });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!isMountedRef.current) return;
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          setConnectionStatus('ICE Connected');
        } else if (state === 'failed' || state === 'disconnected') {
          console.warn(`WHEP ICE disconnected on ${camTag}, falling back to HLS`);
          startHls();
        }
      };

      // Create browser SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Timeout guard: if WHEP negotiation doesn't resolve in 3.5 seconds, fallback to HLS/Snapshot
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && (!hasVideoMedia || pc.iceConnectionState === 'new')) {
          console.info(`WHEP negotiation timeout for ${camTag}; gracefully activating HLS`);
          startHls();
        }
      }, 3500);

      const response = await fetch(whepUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`WHEP endpoint returned ${response.status} for ${camTag}, switching to HLS`);
        startHls();
        return;
      }

      const answerSdp = await response.text();
      if (!isMountedRef.current) return;

      if (answerSdp && answerSdp.includes('v=0')) {
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: 'answer',
            sdp: answerSdp,
          })
        );
        setConnectionStatus('WHEP Negotiated');
      } else {
        startHls();
      }
    } catch (err) {
      console.warn(`WHEP SDP exchange failed for ${camTag}:`, err);
      startHls();
    }
  }, [whepUrl, camTag, teardownPipelines, startHls, hasVideoMedia]);

  // Main Effect: Orchestrate selected transport
  useEffect(() => {
    isMountedRef.current = true;

    if (transport === 'WHEP') {
      startWhep();
    } else if (transport === 'HLS') {
      startHls();
    } else {
      startSnapshotLoop();
    }

    return () => {
      isMountedRef.current = false;
      teardownPipelines();
    };
  }, [transport, reconnectKey, startWhep, startHls, startSnapshotLoop, teardownPipelines]);

  // Handle Fullscreen
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  // Handle Audio Mute
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  // Handle Quick Snapshot / Evidence Capture (Section 65B)
  const handleQuickSnapshot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `SENTINEL_EVIDENCE_${camTag.toUpperCase()}_${timestamp}.jpg`;

      // If video element is active, capture straight from canvas for instant zero-latency capture
      if (videoRef.current && hasVideoMedia && videoRef.current.videoWidth > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
          }, 'image/jpeg', 0.95);
          return;
        }
      }

      // Otherwise fetch from snapshot engine
      const fetchSrc = frameSrc || `${snapshotUrl}?t=${Date.now()}`;
      const res = await fetch(fetchSrc);
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
      console.warn('Snapshot capture failed:', err);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        onClick={() => setIsModalOpen(true)}
        className={`relative ${aspectRatio} bg-[#0d1117] rounded-md border overflow-hidden group select-none transition-all cursor-pointer ${isThreat
            ? 'border-[#da3633] ring-1 ring-[#da3633] shadow-md shadow-[#da3633]/20'
            : 'border-[#30363d] hover:border-[#58a6ff]/70 shadow-sm'
          }`}
      >
        {/* Native HTML5 Video Element for WebRTC (WHEP) and HLS Media */}
        <video
          ref={videoRef}
          autoPlay
          muted={isMuted}
          playsInline
          className={`w-full h-full object-cover ${hasVideoMedia && activeTransport !== 'SNAPSHOT' ? 'block' : 'hidden'
            }`}
          onWaiting={() => setIsWaitingKeyframe(true)}
          onPlaying={() => setIsWaitingKeyframe(false)}
        />

        {/* Snapshot / Fallback Stream Image */}
        {(!hasVideoMedia || activeTransport === 'SNAPSHOT') && frameSrc ? (
          <img
            src={frameSrc}
            alt={cameraName}
            className="w-full h-full object-cover"
          />
        ) : null}

        {/* Connecting / Standby Placeholder */}
        {!hasVideoMedia && !frameSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1117] text-[#8b949e] p-3 text-center">
            <Cpu className="w-6 h-6 text-[#58a6ff] animate-pulse mb-1.5" />
            <p className="text-[11px] font-mono text-[#8b949e]">
              RTSP over TCP Transport
            </p>
          </div>
        )}

        {/* Keyframe / GOP Waiting HUD Alert (Only when active video is waiting for decode keyframe) */}
        {isWaitingKeyframe && hasVideoMedia && (
          <div className="absolute top-9 left-2 z-20 px-2 py-0.5 rounded bg-[#161b22]/90 border border-[#d29922]/50 text-[#d29922] text-[9.5px] font-mono flex items-center gap-1 shadow-sm">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#d29922]" />
            <span>GOP sync...</span>
          </div>
        )}

        {/* Top Stream HUD Bar */}
        <div className="absolute top-0 inset-x-0 p-2 bg-gradient-to-b from-[#0d1117]/95 via-[#0d1117]/60 to-transparent flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isThreat ? 'bg-[#f85149]' : 'bg-[#3fb950]'
                  }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${isThreat ? 'bg-[#da3633]' : 'bg-[#238636]'
                  }`}
              ></span>
            </span>
            <span className="text-xs font-semibold text-[#f0f6fc] tracking-tight truncate max-w-[150px] sm:max-w-[200px]">
              {cameraName}
            </span>
          </div>

          {/* Transport Switcher Pills (GitHub Primer Style) */}
          <div
            className="flex items-center gap-1 bg-[#161b22]/90 border border-[#30363d] rounded-md p-0.5 text-[9px] font-mono shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTransport('WHEP')}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium ${transport === 'WHEP'
                  ? 'bg-[#1f6feb] text-white'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              title="WebRTC WHEP (Sub-second low latency SDP)"
            >
              WHEP
            </button>
            <button
              onClick={() => setTransport('HLS')}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium ${transport === 'HLS'
                  ? 'bg-[#1f6feb] text-white'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              title="HLS (HTTP Live Streaming m3u8 fallback)"
            >
              HLS
            </button>
            <button
              onClick={() => setTransport('SNAPSHOT')}
              className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium ${transport === 'SNAPSHOT'
                  ? 'bg-[#1f6feb] text-white'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
                }`}
              title="Direct Snapshot Pipeline (10 FPS Matrix Engine)"
            >
              SNAP
            </button>
          </div>
        </div>

        {/* Hotlist Threat Sightings Badge */}
        {isThreat && (
          <div className="absolute top-8 left-2 z-10 px-2 py-0.5 rounded bg-[#da3633] text-white text-[9.5px] font-bold tracking-wide flex items-center gap-1 border border-[#f85149] shadow-md animate-pulse">
            <ShieldAlert className="w-3 h-3 text-white" />
            <span>STATE HOTLIST SIGHTING</span>
          </div>
        )}

        {/* Active Protocol & PTS Live Indicator Badge */}
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 pointer-events-none">
          <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-[#0d1117]/85 border border-[#30363d] text-[#8b949e] flex items-center gap-1">
            <Radio className="w-2 h-2 text-[#3fb950] animate-pulse" />
            <span className="text-[#3fb950] font-semibold">{activeTransport}</span>
            <span className="text-[#6e7681]">&bull;</span>
            <span className="text-[#c9d1d9]">{connectionStatus}</span>
          </span>
        </div>

        {/* Bottom Action Controls (Visible on Hover - GitHub Primer dark) */}
        <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-[#0d1117]/95 via-[#0d1117]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-[#8b949e]">
            <span className="bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] text-[#c9d1d9]">
              {camTag.toUpperCase()}
            </span>
            <span className="text-[#3fb950] font-medium hidden sm:inline">PTS SYNC</span>
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Reconnect / Refresh */}
            <button
              onClick={() => setReconnectKey((k) => k + 1)}
              className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] hover:border-[#8b949e] transition-all cursor-pointer"
              title="Reconnect Stream Session"
            >
              <RefreshCw className="w-3 h-3" />
            </button>

            {/* Audio Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] hover:border-[#8b949e] transition-all cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-[#58a6ff]" />}
            </button>

            {/* Evidence Snapshot */}
            <button
              onClick={handleQuickSnapshot}
              className="p-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[10px] font-medium flex items-center gap-1 transition-all border border-[#2ea043] shadow-sm cursor-pointer"
              title="Capture Section 65B Certified Snapshot"
            >
              <Camera className="w-3 h-3" />
            </button>

            {/* Inspect / PTZ Zoom Modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onInspect) onInspect();
                else setIsModalOpen(true);
              }}
              className="px-2 py-0.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-[10px] font-medium flex items-center gap-1 transition-all border border-[#388bfd] shadow-sm cursor-pointer"
              title="Inspect Stream & Digital PTZ"
            >
              <ZoomIn className="w-3 h-3" />
              <span className="hidden sm:inline">PTZ</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] hover:border-[#8b949e] transition-all cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
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
        frameSrc={frameSrc || `${snapshotUrl}?t=${Date.now()}`}
        isThreat={isThreat}
        onJumpToInvestigation={(plate) => navigate(`/investigate?plate=${plate}`)}
      />
    </>
  );
};
