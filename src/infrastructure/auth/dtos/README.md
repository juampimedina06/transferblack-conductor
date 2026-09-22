# DTOs (Data Transfer Objects)

## Propósito
Representan la forma exacta ("cruda") en la que la API externa nos envía los datos por la red, o la forma exacta en la que debemos enviárselos.

## Convención de nombres
* Archivos: `*.dto.ts` (ej: `auth-response.dto.ts`, `login-request.dto.ts`).

## Qué va acá
* Interfaces de TypeScript que calzan 1:1 con el JSON del backend (incluyendo claves en `snake_case`, IDs anidados, etc.).

## Qué NO debe ir acá
* Modelos limpios de negocio (esos van en `core/.../models`).
* Funciones de cálculo o lógica. Solo tipados.

## Ejemplo
```ts
export interface AuthResponseDto {
  access_token: string;
  user_data: {
    user_id: string;
    first_name: string;
    last_name: string;
    user_email: string;
    user_role: string;
  };
}
```
