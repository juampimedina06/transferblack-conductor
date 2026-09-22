# Presentation (Adaptadores Primarios / UI)

## Propósito
Capa encargada de la interacción con el usuario. Muestra información en pantalla, escucha eventos (clicks, inputs, gestos) y despacha acciones invocando a los Casos de Uso del Core o consumiendo el estado global.

## Estructura
* **`<feature>/`** (ej: `auth/`):
  * **`components/`**: Componentes visuales específicos del módulo (ej: `LoginForm.tsx`, `DriverAvatar.tsx`).
  * **`hooks/`**: Custom hooks que conectan la UI con los Casos de Uso o el store (ej: `useLogin.ts`).
* **`store/`**: Estado global de la aplicación (Zustand / Redux / Context, ej: `useAuthStore.ts`).
* **`theme/`**: Tokens de diseño, colores, tipografía y estilos globales.
