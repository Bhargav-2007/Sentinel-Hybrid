/**
 * Master API Client for Gujarat Sentinel Hybrid Gateway.
 * All API requests route strictly through the Hybrid Gateway (:8000).
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('sentinel_access_token');
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Clear token and trigger auth logout event if unauthorized
      localStorage.removeItem('sentinel_access_token');
      localStorage.removeItem('sentinel_user');
      window.dispatchEvent(new Event('sentinel:unauthorized'));
      throw new ApiError(401, 'Session expired or invalid credentials.');
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const message = errorData?.detail || errorData?.message || response.statusText || 'API Request Failed';
      throw new ApiError(response.status, message, errorData);
    }

    // Check if response is empty (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    // Check content type
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, error.message || 'Network connection failed. Is Hybrid Gateway online?');
  }
}
