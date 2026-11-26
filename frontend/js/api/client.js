// Single place the frontend talks to the backend. Set window.APP_CONFIG.apiBaseUrl per environment.
const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl ?? 'http://127.0.0.1:8000';

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Accept: 'application/json' } });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body.data;
}

export const getHealth = () => apiGet('/api/health');
