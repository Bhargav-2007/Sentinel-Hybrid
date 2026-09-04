export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'CONNECTING';
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
  codec: string;
  resolution: string;
  frame_rate: number;
  status: CameraStatus;
  is_public_domain: boolean;
  tags: string[];
  metadata?: CameraMetadata;
  last_seen_at?: string;
  active_alerts_count?: number;
}
