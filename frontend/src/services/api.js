import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to attach JWT token and current organization ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tasknest_token');
    const activeOrgId = localStorage.getItem('tasknest_active_org_id');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (activeOrgId) {
      config.headers['x-organization-id'] = activeOrgId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
