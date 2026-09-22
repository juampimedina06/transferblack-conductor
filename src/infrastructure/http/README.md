# HTTP Client

## Propósito
Centraliza la configuración de la conexión de red (generalmente Axios o Fetch).

## Qué va acá
* Instancia configurada de Axios con `baseURL`, `timeout` y headers por defecto.
* Interceptores de request (para adjuntar el token JWT automáticamente).
* Interceptores de response (para refresco automático de token o manejo de errores 401/500).

## Ejemplo
```ts
import axios from 'axios';

export const httpClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```
