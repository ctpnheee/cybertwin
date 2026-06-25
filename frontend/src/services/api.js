const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error || `Erreur API ${response.status}`;
    const error = new Error(message);
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const api = {
  get: (path) => request(path),

  post: (path, body = {}) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    }),

  put: (path, body = {}) =>
    request(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),

  delete: (path) =>
    request(path, {
      method: 'DELETE'
    })
};

export default api;