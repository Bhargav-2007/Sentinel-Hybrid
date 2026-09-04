import { apiClient } from './client';

export interface AuditLogEntry {
  id: string;
  officer_badge: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  details: Record<string, any> | string;
  hmac_signature: string;
  timestamp: string;
}

export const auditApi = {
  getLogs: async (limit: number = 50, action?: string): Promise<AuditLogEntry[]> => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (action) {
      params.append('action', action);
    }
    return apiClient<AuditLogEntry[]>(`/api/v1/audit/logs?${params.toString()}`);
  },

  exportSection65B: async (incidentId: string): Promise<any> => {
    return apiClient<any>(`/api/v1/audit/export-section65b/${incidentId}`);
  },
};
