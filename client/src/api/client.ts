import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

interface RetryConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig;

    if (!config) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;

    const shouldRetry = 
      config.__retryCount < MAX_RETRIES &&
      (!error.response || RETRYABLE_STATUS_CODES.includes(error.response.status));

    if (shouldRetry) {
      config.__retryCount += 1;
      
      const delay = RETRY_DELAY * config.__retryCount;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return apiClient(config);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth';
    }

    return Promise.reject(error);
  }
);
