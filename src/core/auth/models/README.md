# Models (Entidades de Dominio)

## Propósito
Define las estructuras de datos puras que representan el negocio dentro de la aplicación. Son los modelos limpios con los que trabaja la lógica interna y la UI.

## Convención de nombres
* Archivos: `*.model.ts` (ej: `user.model.ts`, `auth-session.model.ts`).

## Qué va acá
* Interfaces o tipos que representan entidades de la app (ej: `User`, `DriverProfile`).
* Enums de negocio (ej: `UserRole`, `AccountStatus`).

## Qué NO debe ir acá
* Tipos o interfaces de respuestas crudas del backend (eso son DTOs y van en `infrastructure/.../dtos`).
* Librerías externas, decoradores o referencias a bases de datos o red.

## Ejemplo
```ts
export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'driver' | 'admin';
}
```
