# Use Cases (Casos de Uso)

## Propósito
Representa una acción específica que un actor (usuario, sistema) puede ejecutar en la aplicación. Orquesta el flujo de negocio invocando a los puertos.

## Convención de nombres
* Archivos: `<accion>.use-case.ts` (ej: `login.use-case.ts`, `logout.use-case.ts`, `refresh-session.use-case.ts`).

## Qué va acá
* Funciones o clases que encapsulan una única regla de negocio.
* Reciben dependencias a través de los puertos (inyección de dependencias).

## Qué NO debe ir acá
* Llamadas directas a APIs (usa el puerto correspondiente).
* Lógica de UI (renders, hooks de React, navegación, alerts).

## Ejemplo
```ts
import { AuthRepositoryPort } from '../ports/auth.repository.port';
import { User } from '../models/user.model';

export const loginUseCase = async (
  authRepository: AuthRepositoryPort,
  credentials: { email: string; pass: string }
): Promise<User> => {
  // Aquí se pueden aplicar validaciones previas de negocio
  if (!credentials.email.includes('@')) {
    throw new Error('Email inválido');
  }
  return await authRepository.login(credentials);
};
```
