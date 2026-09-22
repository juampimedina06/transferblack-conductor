# Core (El Hexágono / Dominio)

## Propósito
Representa el corazón del negocio y las reglas de la aplicación. Es completamente **agnóstico** a la tecnología externa: no conoce React, React Native, Axios, Firebase, AsyncStorage ni librerías de UI.

## Regla de Oro
> **El Core nunca debe importar nada de `infrastructure/` ni de `presentation/`.**

## Estructura por Feature (ejemplo: `auth/`)
* **`models/`**: Entidades y objetos de valor del negocio (ej: `user.model.ts`).
* **`ports/`**: Interfaces y contratos que el Core exige al exterior (ej: `auth.repository.port.ts`).
* **`use-cases/`**: Lógica de aplicación que orquesta el negocio (ej: `login.use-case.ts`).
