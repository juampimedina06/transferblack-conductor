import axios from "axios";

export const transferApi = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para inyectar token de autenticación
transferApi.interceptors.request.use(
  async (config) => {
    // Ejemplo: const token = await SecureStore.getItemAsync('token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para respuestas y manejo de errores globales
transferApi.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
