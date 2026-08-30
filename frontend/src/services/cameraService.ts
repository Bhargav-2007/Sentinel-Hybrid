import { apiClient } from '../core/api/client';
import { Camera, PTZCommand } from '../shared/types';

export interface CameraFilters {
  department_id?: string;
  district?: string;
  status?: string;
  camera_type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const cameraService = {
  async listCameras(filters: CameraFilters = {}): Promise<Camera[]> {
    const params = new URLSearchParams();
    if (filters.department_id && filters.department_id !== 'ALL') params.append('department_id', filters.department_id);
    if (filters.district) params.append('district', filters.district);
    if (filters.status) params.append('status', filters.status);
    if (filters.camera_type) params.append('camera_type', filters.camera_type);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<Camera[]>(`/cameras${qs}`);
  },

  async getCameraById(id: string): Promise<Camera> {
    return apiClient<Camera>(`/cameras/${id}`);
  },

  async getCameraGeoJSON(): Promise<any> {
    return apiClient<any>('/cameras/geojson');
  },

  async onboard50SandboxFeeds(): Promise<Camera[]> {
    return apiClient<Camera[]>('/cameras/onboard-50', {
      method: 'POST',
    });
  },

  async createCamera(camera: Partial<Camera>): Promise<Camera> {
    return apiClient<Camera>('/cameras', {
      method: 'POST',
      body: JSON.stringify(camera),
    });
  },

  async updateCamera(id: string, camera: Partial<Camera>): Promise<Camera> {
    return apiClient<Camera>(`/cameras/${id}`, {
      method: 'PUT',
      body: JSON.stringify(camera),
    });
  },

  async sendPTZCommand(cameraId: string, command: PTZCommand): Promise<{ status: string }> {
    const params = new URLSearchParams();
    if (command.action === 'pan_left') params.append('pan', '-1.0');
    if (command.action === 'pan_right') params.append('pan', '1.0');
    if (command.action === 'tilt_up') params.append('tilt', '1.0');
    if (command.action === 'tilt_down') params.append('tilt', '-1.0');
    if (command.action === 'zoom_in') params.append('zoom', '1.0');
    if (command.action === 'zoom_out') params.append('zoom', '-1.0');
    if (command.preset_id) params.append('preset', `PRESET_${command.preset_id}`);

    return apiClient<{ status: string }>(`/cameras/${cameraId}/ptz?${params.toString()}`, {
      method: 'POST',
    });
  },
};
