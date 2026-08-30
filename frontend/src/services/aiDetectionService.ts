export interface AIDetectionPayload {
  camera_id?: string;
  image_base64?: string;
  image_url?: string;
  stream_url?: string;
  confidence_threshold?: number;
  return_annotated_image?: boolean;
}

export interface DetectedObject {
  track_id?: number;
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface LicensePlateDetection {
  plate_text: string;
  raw_text?: string;
  confidence: number;
  bbox: [number, number, number, number];
  is_valid_format?: boolean;
}

export interface FullDetectionResponse {
  camera_id: string;
  inference_time_ms: number;
  total_people: number;
  total_vehicles: number;
  total_plates: number;
  objects: DetectedObject[];
  plates: LicensePlateDetection[];
  annotated_image_base64?: string;
}

const AI_API_URL = (import.meta as any).env?.VITE_AI_API_URL || 'http://localhost:8006';

export const aiDetectionService = {
  async detectFull(payload: AIDetectionPayload): Promise<FullDetectionResponse> {
    const res = await fetch(`${AI_API_URL}/detect/full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`AI Service error: HTTP ${res.status}`);
    return res.json();
  },

  async detectPersonVehicle(payload: AIDetectionPayload) {
    const res = await fetch(`${AI_API_URL}/detect/person-vehicle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`AI Service error: HTTP ${res.status}`);
    return res.json();
  },

  async detectANPR(payload: AIDetectionPayload) {
    const res = await fetch(`${AI_API_URL}/detect/anpr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`AI Service error: HTTP ${res.status}`);
    return res.json();
  },

  async getHealth() {
    const res = await fetch(`${AI_API_URL}/health`);
    if (!res.ok) throw new Error(`AI Service health error: HTTP ${res.status}`);
    return res.json();
  },
};
