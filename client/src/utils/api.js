import axios from 'axios';

const API_BASE = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || '/api');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sikkimpg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sikkimpg_token');
      localStorage.removeItem('sikkimpg_user');
    }
    return Promise.reject(err);
  }
);

export default api;
