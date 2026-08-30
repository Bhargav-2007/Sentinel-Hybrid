export type OfficerRole = 'ADMIN' | 'SUPERVISOR' | 'DUTY_OFFICER' | 'INVESTIGATOR' | 'DISPATCHER';

export interface Officer {
  id: string;
  officer_id: string;
  badge_number: string;
  full_name: string;
  role: OfficerRole;
  rank: string;
  station: string;
  district: string;
  department_id: string;
  is_active: boolean;
  is_break_glass: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  officer_id: string;
  badge_number: string;
  role: OfficerRole;
  district: string;
  department?: string;
}

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

export interface PTZCommand {
  action: 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down' | 'zoom_in' | 'zoom_out' | 'stop' | 'preset_goto';
  speed?: number;
  preset_id?: number;
}

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ESCALATED' | 'RESOLVED' | 'FALSE_POSITIVE' | 'CLOSED';
export type AlertType = 'STOLEN_VEHICLE' | 'WANTED_SUSPECT' | 'HIT_AND_RUN' | 'BLACK_LISTED' | 'SPEED_VIOLATION' | 'LOITERING';

export interface AlertIncident {
  id: string;
  incident_number: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  camera_id: string;
  camera_name: string;
  district: string;
  station?: string;
  latitude: number;
  longitude: number;
  detected_plate?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  confidence_score: number;
  snapshot_url?: string;
  video_clip_url?: string;
  fir_number?: string;
  watchlist_tag?: string;
  assigned_officer?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  section65b_hmac_hash: string;
  created_at: string;
  updated_at: string;
}

export interface TrajectorySighting {
  id: string;
  camera_id: string;
  camera_name: string;
  district: string;
  latitude: number;
  longitude: number;
  sighted_at: string;
  pts_timestamp_ms: number;
  confidence: number;
  speed_kmh?: number;
  snapshot_url?: string;
}

export interface Vehicle360Profile {
  plate: string;
  vahan_registration?: {
    owner_name: string;
    vehicle_class: string;
    maker_model: string;
    fuel_type: string;
    chassis_number: string;
    engine_number: string;
    insurance_valid_upto: string;
    fitness_valid_upto: string;
    blacklist_status: string;
  };
  watchlist_status?: {
    is_wanted: boolean;
    reason?: string;
    category?: string;
    fir_number?: string;
  };
  trajectory_history?: {
    total_sightings: number;
    first_seen_at: string;
    last_seen_at: string;
    encounters: TrajectorySighting[];
  };
}

export interface WatchlistEntry {
  id: string;
  category: 'STOLEN_VEHICLE' | 'WANTED_FELON' | 'HIT_AND_RUN' | 'SUSPECT_SURVEILLANCE' | 'TRAFFIC_VIOLATOR';
  identifier: string;
  reason: string;
  case_number: string;
  police_station: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source_database: string;
  is_active: boolean;
  alert_count: number;
  created_at: string;
}

export interface LiveRealtimeEvent {
  id: string;
  timestamp: string;
  type: 'ANPR_MATCH' | 'VEHICLE_DETECTED' | 'WATCHLIST_CORRELATION' | 'CAMERA_DEGRADED' | 'CAMERA_RECONNECTED' | 'ALERT_CREATED';
  title: string;
  camera_code: string;
  identifier?: string;
  severity?: AlertSeverity;
  payload?: any;
}

export interface Section65BCertificate {
  certificate_id: string;
  title: string;
  jurisdiction: string;
  issuing_authority: string;
  certifying_officer: {
    officer_id: string;
    badge_number: string;
    rank: string;
    district: string;
  };
  evidence_reference: {
    incident_id: string;
    certification_timestamp: string;
    cryptographic_algorithm: string;
    tamper_evidence_verified: boolean;
  };
  legal_declaration: string;
}
