// Single place the frontend talks to the backend. Set window.APP_CONFIG.apiBaseUrl per environment.
const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl ?? 'http://127.0.0.1:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body.data;
}

export const apiGet = (path) => request(path);

export const apiPost = (path, payload) => request(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const getHealth = () => apiGet('/api/health');

export const createDesign = (wardrobeType, dimensions, materialSelections) => apiPost('/api/designs', {
  wardrobe_type: wardrobeType,
  dimensions_mm: dimensions,
  material_selections: materialSelections,
});
