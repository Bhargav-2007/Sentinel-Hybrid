export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'CONNECTING' | 'UNKNOWN' | 'CONFIGURED';
export type StreamProtocol = 'webrtc' | 'hls' | 'rtsp';

export interface CameraLocation {
  latitude: number;
  longitude: number;
  district: string;
  address?: string;
  junction?: string;
}

export interface CameraMetadata {
  source?: string;
  stream_id?: string;
  webrtc_url?: string;
  hls_url?: string;
  bitrate_kbps?: number;
  live_status?: string;
}

/** Per-camera runtime health from the stream supervisor. */
export interface CameraRuntimeHealth {
  camera_id: string;
  name: string;
  network_reachable: string;  // 'true' | 'false' | 'NOT_TESTED'
  authenticated: string;
  rtsp_session_established: string;
  rtp_media_observed: string;
  decoder_open: string;
  frame_active: string;
  ai_active: string;
  tracking_active: string;
  anpr_active: string;
}

/** Fleet health summary from the stream supervisor. */
export interface FleetHealthSummary {
  total_cameras: number;
  running: boolean;
  supervisor_state?: string;
  scorecard: {
    network_reachable: number;
    authenticated_verified: number;
    rtsp_session_established: number;
    rtp_media_observed: number;
    decoder_open: number;
    frame_active: number;
    ai_active: number;
    tracking_active: number;
    anpr_tested: number;
  };
  per_camera_state?: CameraRuntimeHealth[];
  cameras?: any[];
  aggregate_rates?: {
    total_decode_fps: number;
    total_ai_fps: number;
    total_frames_dropped: number;
  };
  message?: string;
}

export interface CameraNode {
  camera_id: string;
  name: string;
  department_id: string;
  department_name?: string;
  location: CameraLocation;
  camera_type: string;
  protocol: StreamProtocol;
  rtsp_url: string;
  webrtc_url?: string;
  hls_url?: string;
  vendor: string;
  /** Null until observed from the actual stream */
  codec: string | null;
  /** Null until observed from the actual stream */
  resolution: string | null;
  /** Null until observed from the actual stream */
  frame_rate: number | null;
  status: CameraStatus;
  is_public_domain: boolean;
  tags: string[];
  metadata?: CameraMetadata;
  last_seen_at?: string | null;
  active_alerts_count?: number;
}
