export interface TrajectoryPoint {
  camera_id: string;
  camera_name?: string;
  latitude: number;
  longitude: number;
  sighted_at: string;
  pts_ms?: number;
  speed_kmh?: number;
  confidence?: number;
}

export interface VehicleTrajectoryData {
  plate: string;
  clean_plate: string;
  first_seen_at: string;
  last_seen_at: string;
  total_sightings: number;
  last_camera_id: string;
  last_latitude: number;
  last_longitude: number;
  path_geojson: TrajectoryPoint[];
}

export interface VahanDossier {
  plate_number: string;
  owner_name: string;
  vehicle_category?: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color?: string;
  vehicle_class: string;
  fuel_type: string;
  registration_date: string;
  insurance_valid_upto: string;
  puc_valid_upto: string;
  rto_location: string;
  chassis_number: string;
  engine_number: string;
  blacklist_status: string;
  data_source: string;
}

export interface CriminalRecordInfo {
  queried_plate: string;
  is_wanted: boolean;
  category?: string;
  fir_number?: string;
  police_station?: string;
  investigating_officer?: string;
  crime_sections?: string[];
  hotlist_timestamp?: string;
  data_source: string;
}

export interface Vehicle360Dossier {
  plate: string;
  vahan: VahanDossier;
  criminal_record: CriminalRecordInfo;
  trajectory: VehicleTrajectoryData;
  sightings_history: TrajectoryPoint[];
  threat_score: number;
  priority: string;
}
