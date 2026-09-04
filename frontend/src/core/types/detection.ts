export type VehicleClass = 
  | 'car' 
  | 'auto-rickshaw' 
  | 'motorcycle' 
  | 'scooter' 
  | 'truck' 
  | 'bus' 
  | 'person' 
  | 'bicycle';

export interface BoundingBoxCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  height?: number;
  center_x?: number;
  center_y?: number;
}

export interface LicensePlateInfo {
  plate_number: string;
  formatted_plate: string;
  raw_ocr_text?: string;
  confidence: number;
  is_valid_indian_format: boolean;
  is_hotlist_match?: boolean;
  hotlist_category?: string;
}

export interface LiveDetectionEvent {
  event_id: string;
  camera_id: string;
  camera_name?: string;
  timestamp: string;
  pts_timestamp_ms: number;
  class_name: VehicleClass;
  confidence: number;
  bbox: BoundingBoxCoordinates;
  track_id?: number;
  license_plate?: LicensePlateInfo;
  speed_kmh?: number;
  threat_score?: number;
  district?: string;
  vehicle_type?: string | null;
  is_person?: boolean;
  plate_text?: string;
}
