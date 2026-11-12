import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string | null) => void; reject: (error: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((promise) => (error ? promise.reject(error) : promise.resolve(token)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string }>) => {
    const request = error.config as InternalAxiosRequestConfig & { _retry?: boolean } | undefined;
    if (error.response?.status === 401 && request && !request._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve: (token) => resolve(token ? api(request) : reject(error)), reject });
        });
      }

      request._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        useAuthStore.getState().setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        request.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(request);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject({
      message: error.response?.data?.error || error.message || 'Request failed',
      status: error.response?.status,
      retryable: !error.response || error.response.status >= 500,
    });
  }
);

export default api;
