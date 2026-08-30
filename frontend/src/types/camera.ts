export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MAINTENANCE';
export type CameraType = 'ANPR' | 'PTZ' | 'FIXED' | 'DOME' | 'BULLET' | 'BODY_WORN' | 'DRONE';
export type DepartmentCode = 'POLICE' | 'TRANSPORT_RTO' | 'MUNICIPALITY_AMC' | 'BORDER_SECURITY' | 'FOREST_WILDLIFE';

export interface Camera {
  id: string;
  stream_id: string;
  camera_code: string;
  name: string;
  location_name: string;
  district: string;
  station?: string;
  zone?: string;
  latitude: number;
  longitude: number;
  camera_type: CameraType;
  vms_vendor: string;
  department_id: DepartmentCode | string;
  status: CameraStatus;
  rtsp_url: string;
  webrtc_url?: string;
  hls_url?: string;
  codec: string;
  fps: number;
  resolution: string;
  bitrate_kbps: number;
  is_live: boolean;
  ptz_supported?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CameraGeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    camera_code: string;
    name: string;
    location_name: string;
    district: string;
    station: string;
    department_id: string;
    camera_type: CameraType;
    status: CameraStatus;
    hls_url?: string;
    webrtc_url?: string;
  };
}

export interface CameraGeoJSONCollection {
  type: 'FeatureCollection';
  features: CameraGeoJSONFeature[];
}

export interface PTZCommand {
  action: 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down' | 'zoom_in' | 'zoom_out' | 'stop' | 'preset_goto';
  speed?: number;
  preset_id?: number;
}
