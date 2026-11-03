import { create } from "axios";
import { authStorage } from '../../presentation/auth/store/authStorage';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { refreshSocketToken } from '../socket/socket';

export const transferApi = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para inyectar token de autenticación
transferApi.interceptors.request.use(
  async (config) => {
    const token = await authStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

type DocumentExpiryHandler = () => void;
let documentExpiryHandler: DocumentExpiryHandler | null = null;

export const setOnDocumentExpiryHandler = (handler: DocumentExpiryHandler | null) => {
  documentExpiryHandler = handler;
};

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor para respuestas y manejo de errores globales (401 refresh token, reintentos de timeout)
transferApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // Manejo de timeouts y cold-starts del backend (Render) en peticiones GET o registro de push
    const isTimeoutOrNetwork =
      error.code === 'ECONNABORTED' ||
      error.message?.toLowerCase().includes('timeout') ||
      (!error.response && error.message?.toLowerCase().includes('network'));

    if (
      isTimeoutOrNetwork &&
      originalRequest &&
      (originalRequest.method?.toLowerCase() === 'get' || originalRequest.url?.includes('/driver/me/push-token'))
    ) {
      originalRequest._networkRetryCount = (originalRequest._networkRetryCount || 0) + 1;
      if (originalRequest._networkRetryCount <= 2) {
        const delayMs = originalRequest._networkRetryCount * 2000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return transferApi(originalRequest);
      }
    }

    const isForbidden = status === 403 && (
      error.response?.data?.error?.code === 'FORBIDDEN' ||
      error.response?.data?.code === 'FORBIDDEN' ||
      error.response?.data?.error?.message === 'No tienes permisos para realizar esta accion'
    );

    if (
      (status === 401 || isForbidden) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return transferApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshSocketToken();

        if (!newAccessToken) {
          throw new Error('No access token returned from refresh');
        }

        transferApi.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return transferApi(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Only logout automatically if session is unauthenticated (401), not on permission check (403)
        if (!isForbidden) {
          await useAuthStore.getState().logout();
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    if (status === 429) {
      const headers = error.response?.headers;
      const rawRetryAfter =
        typeof headers?.get === 'function'
          ? headers.get('retry-after')
          : headers?.['retry-after'] ?? headers?.['Retry-After'];

      const parsedSeconds = rawRetryAfter ? parseInt(String(rawRetryAfter), 10) : NaN;
      const retryAfterSeconds =
        !isNaN(parsedSeconds) && parsedSeconds > 0
          ? parsedSeconds
          : error.response?.data?.error?.details?.retry_after_seconds ?? 60;

      (error as any).retryAfterSeconds = retryAfterSeconds;

      if (!error.response.data) {
        error.response.data = {};
      }
      if (!error.response.data.error) {
        error.response.data.error = {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Demasiados intentos. Esperá ${retryAfterSeconds} segundos antes de volver a intentar.`,
          details: { retry_after_seconds: retryAfterSeconds },
        };
      } else {
        if (!error.response.data.error.code) {
          error.response.data.error.code = 'RATE_LIMIT_EXCEEDED';
        }
        if (!error.response.data.error.details) {
          error.response.data.error.details = {};
        }
        error.response.data.error.details.retry_after_seconds = retryAfterSeconds;
      }
    }

    const errorCode =
      error.response?.data?.error?.code ||
      error.response?.data?.code ||
      error.response?.data?.error;

    if (
      status === 403 &&
      (errorCode === 'DOCUMENTS_EXPIRED' ||
        errorCode === 'SUSPENDED_DOCUMENTS' ||
        String(error.response?.data?.message || '').toLowerCase().includes('documento'))
    ) {
      documentExpiryHandler?.();
    }

    return Promise.reject(error);
  }
);
