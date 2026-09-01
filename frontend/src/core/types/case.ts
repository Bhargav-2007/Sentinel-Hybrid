export type CaseStatus = 
  | 'OPEN' 
  | 'INVESTIGATING' 
  | 'EVIDENCE_COLLECTED' 
  | 'UNDER_REVIEW' 
  | 'RESOLVED' 
  | 'CLOSED';

export type CasePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CaseNote {
  author_badge: string;
  author_name: string;
  timestamp: string;
  action: string;
  note: string;
}

export interface PoliceCase {
  id: string;
  case_number: string;
  title: string;
  description: string;
  fir_number: string;
  status: CaseStatus;
  priority: CasePriority;
  target_plate: string;
  target_vehicle_make: string;
  target_vehicle_model: string;
  target_vehicle_color: string;
  district: string;
  station: string;
  primary_latitude: number;
  primary_longitude: number;
  assigned_officer_badge: string;
  assigned_officer_name: string;
  sightings: any[];
  snapshots: string[];
  video_clips: string[];
  section65b_certificate_id: string;
  hmac_sha256_signature: string;
  case_notes: CaseNote[];
  created_at: string;
  updated_at: string;
}

export interface CaseCreatePayload {
  title: string;
  description: string;
  target_plate: string;
  fir_number?: string;
  priority: CasePriority;
  district?: string;
  station?: string;
  target_vehicle_make?: string;
  target_vehicle_model?: string;
  target_vehicle_color?: string;
}
