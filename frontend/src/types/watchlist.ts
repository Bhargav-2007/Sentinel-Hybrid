export type WatchlistCategory = 'STOLEN_VEHICLE' | 'WANTED_FELON' | 'HIT_AND_RUN' | 'SUSPECT_SURVEILLANCE' | 'TRAFFIC_VIOLATOR';
export type WatchlistPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface WatchlistEntry {
  id: string;
  category: WatchlistCategory;
  identifier: string; // Plate Number or Face Hash
  reason: string;
  case_number: string;
  police_station: string;
  priority: WatchlistPriority;
  source_database: string;
  is_active: boolean;
  alert_count: number;
  created_at: string;
}
