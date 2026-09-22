# Repositories (Implementación de Puertos)

## Propósito
Implementa la interfaz del Puerto definida en el Core (`AuthRepositoryPort`). Se conecta a la API real mediante el cliente HTTP, obtiene el DTO crudo y lo transforma usando el Mapper correspondiente antes de devolverlo.

## Convención de nombres
* Archivos: `*.<tecnologia>.repository.ts` o `*.repository.ts` (ej: `auth.api.repository.ts`).

## Qué va acá
* Clases o funciones que hacen llamadas de red y cumplen con la firma del puerto del Core.

## Ejemplo
```ts
import { AuthRepositoryPort } from '@/core/auth/ports/auth.repository.port';
import { User } from '@/core/auth/models/user.model';
import { httpClient } from '../../http/http.client';
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { userFromDtoToModel } from '../mappers/auth.mapper';

export class AuthApiRepository implements AuthRepositoryPort {
  async login(credentials: { email: string; pass: string }): Promise<User> {
    const { data } = await httpClient.post<AuthResponseDto>('/auth/login', credentials);
    return userFromDtoToModel(data);
  }

  async logout(): Promise<void> {
    await httpClient.post('/auth/logout');
  }

  async getCurrentUser(): Promise<User | null> {
    const { data } = await httpClient.get<AuthResponseDto>('/auth/me');
    return userFromDtoToModel(data);
  }
}
```
