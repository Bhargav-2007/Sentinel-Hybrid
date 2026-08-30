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
