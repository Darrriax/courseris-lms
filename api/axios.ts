import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8001';
const COURSE_SERVICE_URL = import.meta.env.VITE_COURSE_SERVICE_URL || 'http://localhost:8002';
const LEARNING_SERVICE_URL = import.meta.env.VITE_LEARNING_SERVICE_URL || 'http://localhost:8003';

export const authApi: AxiosInstance = axios.create({
  baseURL: AUTH_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const courseApi: AxiosInstance = axios.create({
  baseURL: COURSE_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const learningApi: AxiosInstance = axios.create({
  baseURL: LEARNING_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
const attachToken = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

[authApi, courseApi, learningApi].forEach((api) => {
  api.interceptors.request.use(attachToken, (error) => {
    return Promise.reject(error);
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
      return Promise.reject(error);
    }
  );
});

