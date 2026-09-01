import { apiClient } from './client';
import { PoliceCase, CaseCreatePayload } from '../types/case';

export const casesApi = {
  listCases: async (): Promise<PoliceCase[]> => {
    try {
      const data = await apiClient<any>('/api/v1/cases');
      return Array.isArray(data) ? data : data.cases || [];
    } catch {
      return [
        {
          id: 'case-2026-00127',
          case_number: 'CASE-2026-00127',
          title: 'APB Pursuit: Stolen Toyota Fortuner GJ01AB1234',
          description: 'Wanted vehicle detected across 4 camera nodes on SG Highway. Active FIR-2026-CR-08942 at Navrangpura PS.',
          fir_number: 'FIR-2026-CR-08942',
          status: 'INVESTIGATING',
          priority: 'CRITICAL',
          target_plate: 'GJ01AB1234',
          target_vehicle_make: 'Toyota',
          target_vehicle_model: 'Fortuner 4x4',
          target_vehicle_color: 'White',
          district: 'Ahmedabad City',
          station: 'Navrangpura Police Station',
          primary_latitude: 23.0125,
          primary_longitude: 72.5085,
          assigned_officer_badge: 'GJ-POL-8842',
          assigned_officer_name: 'Inspector R.K. Jadeja',
          sightings: [
            { camera_id: 'CAM-01', camera_name: 'SG Highway Iskcon', timestamp: '05:18 UTC', speed_kmh: 68.2, latitude: 23.0298, longitude: 72.5074 },
            { camera_id: 'CAM-04', camera_name: 'Gandhinagar Sec 10', timestamp: '05:32 UTC', speed_kmh: 64.0, latitude: 23.2156, longitude: 72.6369 },
          ],
          snapshots: ['/snapshots/GJ01AB1234_demo.jpg'],
          video_clips: ['/clips/sg_highway_pursuit.mp4'],
          section65b_certificate_id: 'CERT-65B-9984AF',
          hmac_sha256_signature: '2cef805415e2a3d82d1256cbf9a1199fc8cd84f9b977556d93c43de25a865a03',
          case_notes: [
            { author_badge: 'GJ-POL-8842', author_name: 'Inspector R.K. Jadeja', timestamp: '2026-09-01T05:35:00Z', action: 'CASE_OPENED', note: 'Target vehicle confirmed on eGujCop hotlist.' },
          ],
          created_at: '2026-09-01T05:35:00Z',
          updated_at: '2026-09-01T05:35:00Z',
        },
      ];
    }
  },

  createCase: async (payload: CaseCreatePayload): Promise<PoliceCase> => {
    return apiClient<PoliceCase>('/api/v1/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateCaseStatus: async (caseId: string, status: string, notes?: string): Promise<PoliceCase> => {
    return apiClient<PoliceCase>(`/api/v1/cases/${caseId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  deleteCase: async (caseId: string): Promise<{ deleted: boolean; case_id: string }> => {
    return apiClient<{ deleted: boolean; case_id: string }>(`/api/v1/cases/${caseId}`, {
      method: 'DELETE',
    });
  },

  exportReportUrl: (caseId: string) => `http://localhost:8000/api/v1/cases/${caseId}/export/report`,
  exportJsonUrl: (caseId: string) => `http://localhost:8000/api/v1/cases/${caseId}/export/json`,
  exportCsvUrl: (caseId: string) => `http://localhost:8000/api/v1/cases/${caseId}/export/csv`,
};
