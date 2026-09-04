import { apiClient } from './client';
import { ThreatAlert } from '../types/alert';

export const alertsApi = {
  listAlerts: async (): Promise<ThreatAlert[]> => {
    const data = await apiClient<any>('/api/v1/alerts');
    const list = Array.isArray(data) ? data : data.alerts || [];

    return list.map((a: any) => ({
      alert_id: a.id || a.incident_number || a.alert_id,
      camera_id: a.camera_id || '',
      camera_name: a.camera_name || a.location_name || '',
      timestamp: a.created_at || a.detected_at || a.timestamp || new Date().toISOString(),
      target_plate: a.detected_plate || a.target_plate || '',
      threat_score: a.threat_score !== undefined ? a.threat_score : Math.round((a.confidence_score || a.confidence || 0) * 100),
      priority: a.severity || a.priority || 'MEDIUM',
      status: a.status || 'ACTIVE',
      hotlist_category: a.alert_type || a.hotlist_category || 'GENERAL_ALERT',
      fir_number: a.fir_number || '',
      police_station: a.station || a.police_station || a.district || '',
      investigating_officer: a.assigned_officer || a.investigating_officer || '',
      crime_sections: a.crime_sections || [],
      vehicle_make: a.vehicle_make || '',
      vehicle_model: a.vehicle_model || '',
      vehicle_color: a.vehicle_color || '',
      latitude: a.latitude || 0,
      longitude: a.longitude || 0,
      speed_kmh: a.speed_kmh || a.estimated_speed_kmh || 0,
      snapshot_url: a.snapshot_url,
    }));
  },

  acknowledgeAlert: async (alertId: string): Promise<any> => {
    return apiClient<any>(`/api/v1/alerts/${alertId}/acknowledge`, {
      method: 'POST',
    });
  },
};
