import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Aggiunge il token JWT alle richieste se presente in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
