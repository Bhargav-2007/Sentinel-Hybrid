import { apiClient } from './client';
import { ThreatAlert } from '../types/alert';

export const alertsApi = {
  listAlerts: async (): Promise<ThreatAlert[]> => {
    const data = await apiClient<any>('/api/v1/alerts');
    const list = Array.isArray(data) ? data : data.alerts || [];

    return list.map((a: any) => ({
      alert_id: a.id || a.incident_number || 'ALT-01',
      camera_id: a.camera_id || 'cam01',
      camera_name: a.camera_name || 'SG Highway Junction',
      timestamp: a.created_at || new Date().toISOString(),
      target_plate: a.detected_plate || a.target_plate || 'GJ01AB1234',
      threat_score: Math.round((a.confidence_score || 0.95) * 100),
      priority: a.severity || 'CRITICAL',
      status: a.status || 'ACTIVE',
      hotlist_category: a.alert_type || 'STOLEN_VEHICLE',
      fir_number: a.fir_number || 'FIR-2026-CR-0881',
      police_station: a.station || `${a.district || 'Ahmedabad City'} Police Station`,
      investigating_officer: a.assigned_officer || 'Inspector R.K. Jadeja',
      crime_sections: ['IPC 379', 'BNS 303 (Theft)'],
      vehicle_make: a.vehicle_make || 'Toyota',
      vehicle_model: a.vehicle_model || 'Fortuner',
      vehicle_color: a.vehicle_color || 'Black',
      latitude: a.latitude || 23.0125,
      longitude: a.longitude || 72.5085,
      speed_kmh: 68.2,
      snapshot_url: a.snapshot_url,
    }));
  },

  acknowledgeAlert: async (alertId: string): Promise<any> => {
    return apiClient<any>(`/api/v1/alerts/${alertId}/ack`, {
      method: 'POST',
    });
  },
};
