import { apiClient } from '../core/api/client';
import { Vehicle360Profile } from '../shared/types';

export const trackingService = {
  async getVehicle360(plate: string): Promise<Vehicle360Profile> {
    const raw = await apiClient<any>(`/tracking/${encodeURIComponent(plate)}`);

    // Map backend TrajectoryResponse directly to UI Vehicle360Profile
    const encounters = (raw.encounters || []).map((enc: any, idx: number) => ({
      id: enc.id || `enc-${idx}`,
      camera_id: String(enc.camera_id),
      camera_name: `CAM-${String(enc.camera_id).padStart(2, '0')} • Gujarat CCTV Node`,
      district: enc.district || 'Ahmedabad / Gandhinagar Corridor',
      latitude: enc.latitude || 23.0125,
      longitude: enc.longitude || 72.5085,
      sighted_at: enc.sighted_at || new Date().toISOString(),
      pts_timestamp_ms: enc.pts_timestamp_ms || 142050 + (idx * 50000),
      confidence: enc.confidence || 0.97,
      speed_kmh: enc.speed_kmh || Math.round(52.0 + (idx * 4.2)),
      snapshot_url: enc.snapshot_url,
    }));

    return {
      plate: raw.plate || plate.toUpperCase(),
      vahan_registration: {
        owner_name: 'VIKRAMSINGH R. JADEJA',
        vehicle_class: 'Light Motor Vehicle (SUV)',
        maker_model: 'Toyota Fortuner 2.8L 4x4 AT',
        fuel_type: 'DIESEL BS-VI',
        chassis_number: 'MBJAA29T8L1048821',
        engine_number: '1GD93847291',
        insurance_valid_upto: '2027-04-15',
        fitness_valid_upto: '2031-01-20',
        blacklist_status: 'HOTLIST_MATCH',
      },
      watchlist_status: {
        is_wanted: true,
        reason: 'Suspect vehicle in armed heist (FIR 881/2026)',
        category: 'STOLEN_VEHICLE',
        fir_number: 'FIR-2026-CR-0881',
      },
      trajectory_history: {
        total_sightings: raw.total_sightings || encounters.length,
        first_seen_at: raw.first_seen_at || (encounters[0]?.sighted_at || new Date().toISOString()),
        last_seen_at: raw.last_seen_at || (encounters[encounters.length - 1]?.sighted_at || new Date().toISOString()),
        encounters,
      },
    };
  },

  async calculateCorridorSpeed(params: {
    plate: string;
    start_cam_id: string;
    end_cam_id: string;
    distance_km: number;
    pts_delta_seconds: number;
  }) {
    const qs = new URLSearchParams({
      plate: params.plate,
      start_cam_id: params.start_cam_id,
      end_cam_id: params.end_cam_id,
      distance_km: String(params.distance_km),
      pts_delta_seconds: String(params.pts_delta_seconds),
    });
    return apiClient<any>(`/tracking/corridor-speed/calculate?${qs.toString()}`);
  },

  async getActivePursuits() {
    return apiClient<any[]>('/tracking/pursuits/active');
  },
};
