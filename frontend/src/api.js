import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  // Necessario quando frontend e API sono su origini diverse: conserva il
  // cookie HttpOnly che identifica il dispositivo dopo il primo voto.
  withCredentials: true,
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
