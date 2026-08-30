import { useAuthStore } from '../auth/authStore';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8005/api/v1';
export const WS_BASE_URL = (import.meta as any).env?.VITE_WS_BASE_URL || 'ws://localhost:8005/api/v1/ws/live';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { timeout = 10000, ...customConfig } = options;
  const token = useAuthStore.getState().tokens?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customConfig.headers || {}),
  };

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      if (response.status === 401) {
        useAuthStore.getState().logout();
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout (${timeout}ms) for ${endpoint}`);
    }
    throw error;
  }
}
