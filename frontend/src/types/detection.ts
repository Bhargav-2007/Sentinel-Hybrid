export type DetectionClass = 'person' | 'vehicle' | 'license_plate' | 'bag' | 'weapon';

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  class_name: DetectionClass | string;
  track_id?: number;
  plate_text?: string;
  is_watchlist?: boolean;
  color?: string;
}

export interface FrameDetectionEvent {
  stream_id: string;
  camera_code: string;
  timestamp_utc: string;
  pts_ms: number;
  detections: BoundingBox[];
  plate_reads?: {
    raw_text: string;
    cleaned_plate: string;
    confidence: number;
    ocr_engine: string;
  }[];
}
