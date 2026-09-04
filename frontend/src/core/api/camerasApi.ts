import { apiClient } from './client';
import { CameraNode } from '../types/camera';

export const camerasApi = {
  listCameras: async (params?: { district?: string; status?: string; limit?: number }): Promise<CameraNode[]> => {
    const query = new URLSearchParams();
    if (params?.district && params.district !== 'ALL') query.set('district', params.district);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());

    const qs = query.toString() ? `?${query.toString()}` : '';
    const data = await apiClient<any>(`/api/v1/cameras${qs}`);
    const list = Array.isArray(data) ? data : data.items || data.cameras || [];

    return list.map((c: any, idx: number) => {
      const num = idx + 1;
      const camTag = `cam${String(num).padStart(2, '0')}`;
      const rawId = c.camera_id || c.stream_id || c.camera_code || c.id || camTag;

      return {
        camera_id: String(rawId),
        name: c.name || c.location_name || `Gujarat CCTV ${camTag.toUpperCase()}`,
        department_id: c.department_id || 'HOME',
        department_name: c.department_name || 'Gujarat Police Department',
        location: {
          latitude: c.latitude || c.location?.latitude || 0,
          longitude: c.longitude || c.location?.longitude || 0,
          district: c.district || c.location?.district || '',
          address: c.location_name || c.address || c.name || '',
        },
        camera_type: c.camera_type || 'bullet',
        protocol: c.protocol || 'rtsp',
        rtsp_url: c.rtsp_url || '',
        webrtc_url: c.webrtc_url || '',
        hls_url: c.hls_url || '',
        vendor: c.vms_vendor || c.vendor || 'Standard VMS',
        // Do NOT default codec/fps — only report what is actually observed from stream
        codec: c.codec || null,
        resolution: c.resolution || null,
        frame_rate: c.fps || c.frame_rate || null,
        status: c.status || 'UNKNOWN',
        is_public_domain: true,
        tags: c.tags || ['traffic', 'gujarat'],
        metadata: c.extra_metadata || c.metadata || {},
        last_seen_at: c.last_seen_at || c.updated_at || null,
      };
    });
  },

  getCamera: async (id: string): Promise<CameraNode> => {
    return apiClient<CameraNode>(`/api/v1/cameras/${id}`);
  },

  getCameraHealth: async (id: string): Promise<any> => {
    return apiClient<any>(`/api/v1/cameras/${id}/health`);
  },

  /** Fleet-wide health summary from the stream supervisor (real runtime state). */
  getFleetHealth: async (): Promise<any> => {
    return apiClient<any>(`/api/v1/cameras/health/summary`);
  },
};
