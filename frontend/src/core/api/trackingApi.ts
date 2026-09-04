import { apiClient } from './client';
import { Vehicle360Dossier } from '../types/tracking';

export const trackingApi = {
  getVehicle360: async (plate: string): Promise<Vehicle360Dossier> => {
    const cleanPlate = plate.replace(/\s+/g, '').toUpperCase();
    try {
      return await apiClient<Vehicle360Dossier>(`/api/v1/orchestrator/vehicle-360/${cleanPlate}`);
    } catch {
      return await apiClient<Vehicle360Dossier>(`/api/v1/orchestrator/vehicle/${cleanPlate}`);
    }
  },

  correlateSightings: async (sightingA: any, sightingB: any) => {
    return await apiClient<any>('/api/v1/orchestrator/correlate', {
      method: 'POST',
      body: JSON.stringify({ sighting_a: sightingA, sighting_b: sightingB }),
    });
  },

  reconstructRoute: async (plate: string, originCamId: string, destCamId: string) => {
    return await apiClient<any>('/api/v1/orchestrator/route-reconstruction', {
      method: 'POST',
      body: JSON.stringify({
        plate: plate.replace(/\s+/g, '').toUpperCase(),
        origin_camera_id: originCamId,
        destination_camera_id: destCamId,
      }),
    });
  },
};
