import { apiClient } from './client';
import { Vehicle360Dossier } from '../types/tracking';

export const trackingApi = {
  getVehicle360: async (plate: string): Promise<Vehicle360Dossier> => {
    const cleanPlate = plate.replace(/\s+/g, '').toUpperCase();
    return await apiClient<Vehicle360Dossier>(`/api/v1/orchestrator/vehicle/${cleanPlate}`);
  },
};
