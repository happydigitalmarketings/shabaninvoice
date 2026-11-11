import axios from 'axios';
import { store } from '../store/store';
import { logout } from '../store/authSlice';
import { getApiBaseUrl } from '../utils/apiUrl';

const axiosClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
axiosClient.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (expired/invalid token) globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
