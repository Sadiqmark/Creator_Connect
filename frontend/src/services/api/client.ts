import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { auth } from '../../config/firebase';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Dynamic Bearer Token Injection
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // Proceed without token if retrieval fails; backend will return 401
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Error Standardization and Session Expiry Dispatch
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error.response?.data?.error?.code;
    const statusCode = error.response?.status;

    // If token expired, attempt one force-refresh before failing
    if (statusCode === 401 && errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const freshToken = await currentUser.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
    }

    const customError = {
      message: error.response?.data?.error?.message || error.message || 'An unexpected error occurred.',
      code: errorCode || 'UNKNOWN_ERROR',
      statusCode: statusCode || 500,
      requestId: error.response?.data?.error?.requestId,
    };

    return Promise.reject(customError);
  }
);
