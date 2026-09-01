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
      const rawId = c.camera_id || c.code || c.id || camTag;

      return {
        camera_id: rawId,
        name: c.name || c.location_name || `Gujarat CCTV ${camTag.toUpperCase()}`,
        department_id: c.department_id || 'HOME',
        department_name: c.department_name || 'Gujarat Police Department',
        location: {
          latitude: c.latitude || c.location?.latitude || (23.0 + (num * 0.015)),
          longitude: c.longitude || c.location?.longitude || (72.5 + (num * 0.012)),
          district: c.district || c.location?.district || 'Ahmedabad City',
          address: c.location_name || c.address || `${c.name || 'Junction Checkpoint'}, Gujarat`,
        },
        camera_type: c.camera_type || 'bullet',
        protocol: 'rtsp',
        rtsp_url: c.rtsp_url || `rtsp://103.250.160.189:8554/stream/${camTag}`,
        webrtc_url: c.webrtc_url || `http://103.250.160.189:8889/stream/${camTag}/whep`,
        hls_url: c.hls_url || `https://cctv.corp8.cloud/${camTag}/index.m3u8`,
        vendor: c.vendor || 'Hikvision',
        codec: c.codec || 'h264',
        resolution: c.resolution || '1920x1080',
        frame_rate: c.frame_rate || 25,
        status: c.status || 'ONLINE',
        is_public_domain: true,
        tags: c.tags || ['traffic', 'gujarat', 'real-feed'],
        metadata: c.metadata || {},
        last_seen_at: c.last_seen_at || new Date().toISOString(),
      };
    });
  },

  getCamera: async (id: string): Promise<CameraNode> => {
    return apiClient<CameraNode>(`/api/v1/cameras/${id}`);
  },

  getCameraHealth: async (id: string): Promise<any> => {
    return apiClient<any>(`/api/v1/cameras/${id}/health`);
  },
};
