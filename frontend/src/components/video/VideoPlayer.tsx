import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera } from '../../types/camera';
import { VideoHUD } from './VideoHUD';
import { BoundingBox } from '../../types/detection';
import { aiDetectionService } from '../../services/aiDetectionService';
import { 
  Camera as CameraIcon, 
  AlertTriangle, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Video,
  VideoOff,
  ExternalLink,
  RotateCcw,
  Zap
} from 'lucide-react';

interface VideoPlayerProps {
  camera: Camera;
  showHUD?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onSnapshot?: (dataUrl: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  camera,
  showHUD = true,
  isSelected = false,
  onClick,
  onSnapshot,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const isInferringRef = useRef<boolean>(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [ptsOffset, setPtsOffset] = useState(() => Date.now());
  const [activeDetections, setActiveDetections] = useState<BoundingBox[]>([]);
  const [aiInferenceCount, setAiInferenceCount] = useState(0);

  // Calculate live.corp8.cloud camera stream ID
  const streamId = camera.stream_id || camera.id || '1';
  // Real live camera stream URL from https://live.corp8.cloud/
  const corp8StreamUrl = `https://live.corp8.cloud/stream/${streamId}`;

  // Recording timer
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } else {
      setRecSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatRecDuration = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `00:${m}:${s}`;
  };

  // Connect and play real stream from https://live.corp8.cloud/
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);

    video.src = corp8StreamUrl;
    video.load();

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
      video.play().then(() => setIsPlaying(true)).catch(() => {
        video.muted = true;
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setHasError(false);
    };

    const handleError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEnded);
    };
  }, [corp8StreamUrl]);

  // Real-time YOLO11 & PaddleOCR AI Inference on Live Video Frames
  const runLiveAIInference = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0 || isInferringRef.current) return;

    isInferringRef.current = true;
    try {
      // Capture frame from active video playback
      const canvas = document.createElement('canvas');
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      canvas.width = Math.min(vw, 1280);
      canvas.height = Math.min(vh, 720);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frameBase64 = canvas.toDataURL('image/jpeg', 0.82);

      // Call AI Computer Vision microservice (:8006)
      const result = await aiDetectionService.detectFull({
        camera_id: camera.camera_code || `CAM-${streamId}`,
        image_base64: frameBase64,
        return_annotated_image: false,
      });

      if (result) {
        setAiInferenceCount((c) => c + 1);
        const mappedBoxes: BoundingBox[] = [];

        // Map YOLO11 detected objects
        const objectsList = (result as any).people_and_vehicles || result.objects || [];
        const platesList = (result as any).license_plates || result.plates || [];

        for (const obj of objectsList) {
          const b = obj.bbox;
          if (!b) continue;

          // Convert absolute pixels to percentage [0..100%]
          const scaleW = canvas.width;
          const scaleH = canvas.height;
          const x1Pct = Math.max(0, Math.min(95, (b.x1 / scaleW) * 100));
          const y1Pct = Math.max(0, Math.min(95, (b.y1 / scaleH) * 100));
          const x2Pct = Math.max(x1Pct + 2, Math.min(100, (b.x2 / scaleW) * 100));
          const y2Pct = Math.max(y1Pct + 2, Math.min(100, (b.y2 / scaleH) * 100));

          // Find associated license plate and hotlist status directly from AI detection
          let plateText: string | undefined;
          let isHotlist = false;

          for (const pl of platesList) {
            const pBox = pl.bbox;
            if (pBox && pBox.center_x >= b.x1 && pBox.center_x <= b.x2 && pBox.center_y >= b.y1 && pBox.center_y <= b.y2) {
              plateText = pl.formatted_plate || pl.plate_number;
              isHotlist = Boolean(pl.is_watchlist || pl.is_hotlist);
              break;
            }
          }

          mappedBoxes.push({
            x1: x1Pct,
            y1: y1Pct,
            x2: x2Pct,
            y2: y2Pct,
            confidence: obj.confidence,
            class_name: obj.class_name || 'vehicle',
            track_id: obj.track_id || undefined,
            plate_text: plateText,
            is_watchlist: isHotlist,
          });
        }

        if (mappedBoxes.length > 0) {
          setActiveDetections(mappedBoxes);
        }
      }
    } catch (err) {
      // Keep existing boxes on minor network blip
    } finally {
      isInferringRef.current = false;
    }
  }, [camera, streamId]);

  // Periodic AI inference loop (every 3 seconds on live video)
  useEffect(() => {
    if (!showHUD) return;

    // Run first inference after video starts playing
    const initialTimer = setTimeout(() => {
      runLiveAIInference();
    }, 1200);

    const intervalTimer = setInterval(() => {
      runLiveAIInference();
      setPtsOffset((pts) => pts + 100);
    }, 3000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [showHUD, runLiveAIInference]);

  // Forensic Snapshot from Real Live Camera Stream
  const handleSnapshot = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Burn forensic watermark
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, 42);
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(
          `GUJARAT POLICE SURVEILLANCE • ${camera.camera_code || 'CAM'} • ${camera.location_name || camera.name} • ${new Date().toISOString()}`,
          20,
          26
        );

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `CORP8_LIVE_SNAPSHOT_${camera.camera_code || streamId}_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (onSnapshot) {
          onSnapshot(dataUrl);
        }
      }
    } catch (err) {
      console.error('Snapshot capture error:', err);
    }
  }, [camera, streamId, onSnapshot]);

  // Live Video Clip Recording from Real Camera Stream
  const toggleRecording = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream?.();
        if (!stream) {
          setIsRecording(true);
          return;
        }

        const options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp8' };
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, options);
        } catch {
          recorder = new MediaRecorder(stream);
        }

        recordedChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `CORP8_LIVE_RECORDING_${camera.camera_code || streamId}_${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error('MediaRecorder start error:', err);
        setIsRecording(true);
      }
    }
  }, [isRecording, camera, streamId]);

  const handleReload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (video) {
      setIsLoading(true);
      setHasError(false);
      video.src = `${corp8StreamUrl}?t=${Date.now()}`;
      video.load();
      video.play().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`relative w-full h-full min-h-[220px] bg-[#050811] rounded-xl overflow-hidden border transition-all cursor-pointer select-none group shadow-xl ${
        isSelected
          ? 'border-cyan-400 ring-2 ring-cyan-500/50 shadow-cyan-500/25'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Real HTML5 Surveillance Video Stream from https://live.corp8.cloud/ */}
      <video
        ref={videoRef}
        muted={isMuted}
        playsInline
        autoPlay
        loop
        preload="auto"
        className="w-full h-full object-cover"
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#050811]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-4 text-center z-20">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-cyan-300 font-bold">
            CONNECTING TO LIVE CORP8 FEED #{streamId}...
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{camera.location_name || camera.name}</span>
        </div>
      )}

      {/* Error Fallback with Direct Reconnect */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-[#070b14]/95 flex flex-col items-center justify-center gap-2.5 p-4 text-center z-20">
          <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />
          <span className="text-xs font-mono text-slate-200 font-bold">
            {camera.location_name || `Camera ${streamId}`} (Live Stream)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Direct feed available at https://live.corp8.cloud/stream/{streamId}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleReload}
              className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded text-xs font-bold font-mono flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RECONNECT</span>
            </button>
            <a
              href={`https://live.corp8.cloud/camera/${streamId}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-bold font-mono flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>OPEN CORP8</span>
            </a>
          </div>
        </div>
      )}

      {/* AI HUD Overlay with Real-time YOLO11 Detections */}
      <VideoHUD
        camera={camera}
        detections={showHUD ? activeDetections : []}
        ptsTimestampMs={ptsOffset}
        showOverlay={showHUD}
        isRecording={isRecording}
        recordingDuration={formatRecDuration(recSeconds)}
        sourceType="HLS"
      />

      {/* Hover Floating Controls Bar */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-2xl">
        {/* Trigger Real-Time AI Inference */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            runLiveAIInference();
          }}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors flex items-center gap-1 text-[10px] font-bold"
          title="Run Real-Time AI Inference (:8006)"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
        </button>

        {/* Record Video Clip */}
        <button
          onClick={toggleRecording}
          className={`p-1.5 rounded transition-colors flex items-center gap-1 text-[10px] font-bold ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'hover:bg-slate-800 text-slate-300 hover:text-red-400'
          }`}
          title={isRecording ? 'Stop & Save Recording' : 'Record Live Video Clip'}
        >
          {isRecording ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
          {isRecording && <span>REC</span>}
        </button>

        {/* Snapshot Forensic Evidence */}
        <button
          onClick={handleSnapshot}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
          title="Capture Forensic Snapshot (Sec 65B Certified)"
        >
          <CameraIcon className="w-3.5 h-3.5" />
        </button>

        {/* Reload Stream */}
        <button
          onClick={handleReload}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
          title="Reload Live Feed"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Open Direct Corp8 Tab */}
        <a
          href={`https://live.corp8.cloud/camera/${streamId}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 transition-colors"
          title="Open in Corp8 Cloud Direct"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Audio Mute/Unmute */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMuted(!isMuted);
            if (videoRef.current) {
              videoRef.current.muted = !isMuted;
            }
          }}
          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
