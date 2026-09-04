import { apiClient } from './client';
import { PoliceCase, CaseCreatePayload } from '../types/case';

export const casesApi = {
  listCases: async (): Promise<PoliceCase[]> => {
    const data = await apiClient<any>('/api/v1/cases');
    return Array.isArray(data) ? data : data.cases || [];
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

  exportReportUrl: (caseId: string) => `/api/v1/cases/${caseId}/export/report`,
  exportJsonUrl: (caseId: string) => `/api/v1/cases/${caseId}/export/json`,
  exportCsvUrl: (caseId: string) => `/api/v1/cases/${caseId}/export/csv`,
};
