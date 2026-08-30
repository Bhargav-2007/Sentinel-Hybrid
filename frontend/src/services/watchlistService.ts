import { apiClient } from '../core/api/client';
import { WatchlistEntry } from '../shared/types';

export const watchlistService = {
  async listWatchlists(category?: string): Promise<WatchlistEntry[]> {
    const qs = category ? `?category=${category}` : '';
    return apiClient<WatchlistEntry[]>(`/watchlists${qs}`);
  },

  async checkPlate(plate: string): Promise<{ is_wanted: boolean; match?: any; confidence?: number }> {
    const result = await apiClient<any>(`/watchlists/check/${encodeURIComponent(plate)}`);
    return {
      is_wanted: Boolean(result.is_match || result.is_wanted || result.match_found),
      match: result.matched_entry || result.match || result,
      confidence: result.confidence_score || result.confidence || 0.98,
    };
  },

  async createEntry(entry: Partial<WatchlistEntry>): Promise<WatchlistEntry> {
    return apiClient<WatchlistEntry>('/watchlists', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
  },

  async deactivateEntry(id: string): Promise<any> {
    return apiClient<any>(`/watchlists/${id}`, {
      method: 'DELETE',
    });
  },
};
