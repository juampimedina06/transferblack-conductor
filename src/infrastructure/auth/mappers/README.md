# Mappers (Transformadores de Datos)

## Propósito
El Mapper es el puente traductor entre el mundo externo (DTO) y el mundo interno (Model del Core). Aisla a la aplicación para que, si el backend cambia los nombres de sus campos, solo tengamos que tocar el mapper y NADA de la UI ni del Core se rompa.

## Convención de nombres
* Archivos: `*.mapper.ts` (ej: `auth.mapper.ts`, `user.mapper.ts`).

## Qué va acá
* Funciones puras que reciben un `DTO` y retornan una entidad de `Model`.
* Opcionalmente, funciones inversas para enviar datos limpios en formato DTO (`toDto`).

## Ejemplo
```ts
import { AuthResponseDto } from '../dtos/auth-response.dto';
import { User } from '@/core/auth/models/user.model';

export const userFromDtoToModel = (dto: AuthResponseDto): User => {
  return {
    id: dto.user_data.user_id,
    fullName: `${dto.user_data.first_name} ${dto.user_data.last_name}`,
    email: dto.user_data.user_email,
    role: dto.user_data.user_role === 'driver' ? 'driver' : 'admin',
  };
};
```
