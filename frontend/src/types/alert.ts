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
