import { apiClient } from '../core/api/client';
import { AlertIncident, Section65BCertificate } from '../shared/types';

export interface AlertFilters {
  status?: string;
  severity?: string;
  alert_type?: string;
  district?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const alertService = {
  async listAlerts(filters: AlertFilters = {}): Promise<AlertIncident[]> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.severity && filters.severity !== 'ALL') params.append('severity', filters.severity);
    if (filters.alert_type) params.append('alert_type', filters.alert_type);
    if (filters.district) params.append('district', filters.district);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<AlertIncident[]>(`/alerts${qs}`);
  },

  async getAlertById(id: string): Promise<AlertIncident> {
    return apiClient<AlertIncident>(`/alerts/${id}`);
  },

  async acknowledgeAlert(id: string, officerId?: string, notes?: string): Promise<AlertIncident> {
    const qs = notes ? `?notes=${encodeURIComponent(notes)}` : '';
    return apiClient<AlertIncident>(`/alerts/${id}/acknowledge${qs}`, {
      method: 'POST',
    });
  },

  async investigateAlert(id: string, officerId?: string, notes?: string): Promise<AlertIncident> {
    const qs = notes ? `?notes=${encodeURIComponent(notes)}` : '';
    return apiClient<AlertIncident>(`/alerts/${id}/investigate${qs}`, {
      method: 'POST',
    });
  },

  async escalateAlert(id: string, notes?: string): Promise<AlertIncident> {
    const qs = notes ? `?notes=${encodeURIComponent(notes)}` : '';
    return apiClient<AlertIncident>(`/alerts/${id}/escalate${qs}`, {
      method: 'POST',
    });
  },

  async resolveAlert(id: string, officerIdOrNotes?: string, resolutionNotes?: string): Promise<AlertIncident> {
    const note = resolutionNotes || officerIdOrNotes || 'Resolved';
    const qs = `?notes=${encodeURIComponent(note)}`;
    return apiClient<AlertIncident>(`/alerts/${id}/resolve${qs}`, {
      method: 'POST',
    });
  },

  async markFalsePositive(id: string, officerId?: string, reason?: string): Promise<AlertIncident> {
    const note = reason || 'False positive';
    const qs = `?notes=${encodeURIComponent(note)}`;
    return apiClient<AlertIncident>(`/alerts/${id}/resolve${qs}`, {
      method: 'POST',
    });
  },

  async exportSection65BCertificate(incidentId: string): Promise<Section65BCertificate> {
    return apiClient<Section65BCertificate>(`/audit/export-section65b/${incidentId}`);
  },
};
