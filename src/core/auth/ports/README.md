# Ports (Contratos del Dominio)

## Propósito
En Arquitectura Hexagonal, un **Puerto** es una interfaz que define qué operaciones necesita el Core del mundo exterior para funcionar, sin importar cómo se implementen en la realidad.

## Convención de nombres
* Archivos: `*.port.ts` o `*.repository.port.ts` (ej: `auth.repository.port.ts`, `storage.port.ts`).

## Qué va acá
* Interfaces que definen métodos que la infraestructura debe implementar (ej: `login`, `register`, `logout`).
* Interfaces de servicios externos (ej: `TokenStoragePort`).

## Qué NO debe ir acá
* Implementaciones con Axios, Fetch, SQLite ni AsyncStorage.
* Clases con código ejecutable. Solo interfaces o tipos abstractos.

## Ejemplo
```ts
import { User } from '../models/user.model';

export interface AuthRepositoryPort {
  login(credentials: { email: string; pass: string }): Promise<User>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
}
```
