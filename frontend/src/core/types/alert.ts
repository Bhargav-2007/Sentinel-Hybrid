export type AlertPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface ThreatAlert {
  alert_id: string;
  camera_id: string;
  camera_name: string;
  timestamp: string;
  target_plate: string;
  threat_score: number; // 0 - 100
  priority: AlertPriority;
  status: AlertStatus;
  hotlist_category: string;
  fir_number?: string;
  police_station?: string;
  investigating_officer?: string;
  crime_sections?: string[];
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  latitude: number;
  longitude: number;
  speed_kmh?: number;
  snapshot_url?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
}
