// src/api.js
// Thin wrapper around fetch for talking to the backend REST API.

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  signup: (phone, password, name) => request('/api/signup', { method: 'POST', body: { phone, password, name } }),
  login: (phone, password) => request('/api/login', { method: 'POST', body: { phone, password } }),
  logout: (token) => request('/api/logout', { method: 'POST', token }),
  getProfile: (token) => request('/api/profile', { token }),
  updateProfile: (token, patch) => request('/api/profile', { method: 'PUT', body: patch, token }),
  sendMessage: (token, toPhone, text) => request('/api/messages', { method: 'POST', body: { toPhone, text }, token }),
  getHistory: (token, otherPhone) => request(`/api/messages/${encodeURIComponent(otherPhone)}`, { token }),
};

export function wsUrl(token) {
  const base = API_BASE.replace(/^http/, 'ws');
  return `${base}/ws?token=${encodeURIComponent(token)}`;
}

export { API_BASE };
