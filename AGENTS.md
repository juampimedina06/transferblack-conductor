This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Contexto Específico del Proyecto (TransferBlack)

- **Arquitectura y Patrones:** Guiarse por las buenas prácticas del proyecto `productsApp`. Mantener separación de responsabilidades (ej. wrappers de API, acciones, interfaces, stores).
- **Interfaces:** Crear interfaces de TypeScript detalladas y precisas para las respuestas del backend, pero sin generar "ruido" innecesario o sobreingeniería.
- **Dudas sobre la API:** Ante cualquier duda sobre payloads o funcionamiento del backend, buscar e investigar directamente en el código del proyecto `transferblack/backend`.
- **Manejo de Errores:** Todos los mensajes de error mostrados al usuario y su gestión interna DEBEN estar en español.

## Rol y Comportamiento del Agente
- **El humano lidera:** Yo (el usuario) tomo las decisiones de arquitectura y diseño. Tu trabajo es ejecutar, sugerir mejoras puntuales y escribir código que respete mis decisiones.
- **Cero refactorizaciones no solicitadas:** NUNCA refactorices, reestructures o modifiques archivos ajenos al requerimiento exacto que te pedí, a menos que yo te dé luz verde explícitamente.
- **No asumas, preguntá:** Si hay ambigüedad en un requerimiento o falta contexto, DETENETE y preguntame. No intentes adivinar ni inventar implementaciones.
- **Respetá el código existente:** Adaptate al estilo, convenciones de nombrado y patrones del código que ya está escrito en el archivo o módulo. No intentes imponer un patrón nuevo si el proyecto ya usa otro.
## Stack Tecnológico y Dependencias
*(Ajustá esto según lo que uses en tu proyecto)*
- Framework principal: React Native (Expo)
- Lenguaje: TypeScript estricto. No uses `any`, definí las interfaces y tipos correspondientes.
- Estilos: [StyleSheet de React Native / Tailwind / Styled Components] - *Elegí uno y prohibí los demás*.
- Navegación: React Navigation (v6/v7) / Expo Router.
- Estado global: [Zustand / Redux Toolkit / Context API]. No instales otras librerías de manejo de estado.
## Arquitectura y Estructura de Archivos
- Seguimos una arquitectura basada en **[Features / Atomic Design / etc.]**.
- **Componentes de UI:** Van en `src/components/`. Deben ser puros (presentacionales) y no estar acoplados a la lógica de negocio.
- **Lógica de Negocio:** Va en hooks personalizados dentro de `src/hooks/` o en el feature correspondiente.
- **Pantallas/Views:** Van en `src/screens/` o `app/` (si usás Expo Router). Solo deben encargarse de conectar la UI con los hooks o el estado global.
- **Servicios/API:** Todas las llamadas a la API deben estar abstraídas en `src/services/` o `src/api/`. Nunca hagas un `fetch` o llamado a axios directamente desde un componente.
## Reglas de Estilo de Código
- Usá `const` y arrow functions para definir componentes: `const MiComponente = () => {}`.
- Nombrado de archivos: `PascalCase.tsx` para componentes de React, `camelCase.ts` para utilidades y hooks.
- Interfaces: Prefijá con `I` solo si es la convención actual, sino usá nombres descriptivos (ej: `User` en lugar de `IUser`).
- Importaciones: Usá absolute imports (ej: `@/components/...`) si están configurados.
## Restricciones Estrictas
- **NO agregues dependencias** al `package.json` sin consultarme antes.
- **NO modifiques archivos de configuración** (`babel.config.js`, `metro.config.js`, `app.json`, `tsconfig.json`) a menos que el requerimiento sea específicamente sobre eso.

## Sincronización con el Backend y Tipado de Datos
- **Fuente de la verdad:** La estructura de la base de datos y los modelos del backend (ej: `profile.model.ts`, `user.model.ts` en la carpeta del backend) son la FUENTE DE LA VERDAD absoluta.
- **Mapeo exacto de Interfaces:** Cuando crees interfaces en el frontend para consumir la API, los nombres de las propiedades y sus tipos (ej: `UUID`, `Date`, `string | null`) deben coincidir EXACTAMENTE con los atributos definidos en los modelos de Sequelize del backend.
- **Tipos nulos y opcionales:** Prestá especial atención a los campos que en el backend admiten `null` (ej: `firstName: string | null;`) o tienen valores por defecto. En el frontend, manejalos adecuadamente con validaciones o encadenamiento opcional (`?.`).
- **Estados y Enums:** Si el backend define un tipo estricto o un enum (como `ProfileStatus = 'active' | 'blocked' | 'deleted'`), tenés que replicar EXACTAMENTE esos literales en el frontend. No inventes estados nuevos.
- **Investigación de Payloads:** Antes de armar un `POST` o `PUT` desde el frontend, revisá los DTOs, validaciones o atributos de creación (ej: `ProfileCreationAttributes`) en el backend para saber exactamente qué campos son obligatorios (`Pick`) y cuáles son opcionales (`Partial<Omit<...>>`). No mandes basura en el body.
- **Convención de Nombres:** Respetá el mapeo entre la base de datos y la API. Si el backend usa `camelCase` en las respuestas de la API (por ejemplo `phoneE164`), usá eso en tus interfaces del frontend, por más que la base de datos subyacente use `underscored: true` (`phone_e164`).

# Frontend Best Practices — React Native / Expo + NativeWind

## Reglas generales
- Nunca dejar `console.log` en código que se commitea.
- No usar `any` en TypeScript salvo justificación explícita comentada.
- Toda función exportada debe tener tipado explícito de params y return.
- Nombres de variables/funciones en inglés, descriptivos, sin abreviaturas ambiguas.
- No dejar código comentado ("código muerto") en el commit final.
- No duplicar lógica: si se repite 2+ veces, extraer a hook/función/util.

## Componentes
- Un componente = una responsabilidad. Si supera ~150 líneas, evaluar split.
- Props tipadas con `interface` o `type`, nunca implícitas.
- No lógica de negocio dentro del JSX: mover a hooks o funciones auxiliares.
- Evitar renders anónimos pesados dentro de `.map()`; extraer a subcomponente.

## NativeWind / Tailwind
- Usar `className` con clases de Tailwind, nunca mezclar con `StyleSheet.create` salvo casos que NativeWind no soporte (ej. algunas animaciones/shadow avanzadas).
- No hardcodear valores de spacing/color fuera de la escala de Tailwind (`p-[13px]` solo si es realmente necesario, preferir `p-3`, `p-4`, etc.).
- Centralizar paleta de colores y spacing custom en `tailwind.config.js`, no repetir valores hex sueltos en el código.
- Evitar strings de clases gigantes e ilegibles: si un componente tiene muchas clases condicionales, extraer con `clsx`/`cva` o splitear en subcomponentes.
- Clases condicionales siempre con `clsx` o template literals claros, nunca concatenación manual propensa a errores (`"bg-" + color` no genera la clase — Tailwind necesita el string completo y estático).
- Revisar que `tailwind.config.js` tenga el `content` bien apuntado a todos los directorios con componentes, o las clases no se generan.
- No usar clases de Tailwind web que no soporta NativeWind (ej. `hover:`, `group-hover:` sin verificar soporte en la versión usada).
- Dark mode: si se usa, manejarlo con el patrón de NativeWind (`dark:`) y no con lógica manual de estilos condicionales.

## Estado y efectos
- No usar `useEffect` para derivar estado que se puede calcular en el render.
- Todo `useEffect` con dependencias externas debe declarar el array completo.
- Evitar estado redundante derivable de otro estado.
- `useCallback`/`useMemo` solo con evidencia de re-render costoso.

## Navegación (Expo Router / React Navigation)
- Tipar los params de cada ruta, nunca `any`.
- No hardcodear rutas como strings sueltos repetidos; centralizar en constantes.

## Listas y performance
- `FlatList`/`FlashList` para listas largas, nunca `.map()` dentro de `ScrollView`.
- `keyExtractor` explícito, nunca índice del array como key si la lista puede reordenarse.

## Manejo de errores y async
- Todo `fetch`/async envuelto en try/catch.
- Loading y error states explícitos en cada pantalla que consume datos.
- Validar inputs externos con Zod antes de usarlos.

## Testing
- Toda función utilitaria y hook custom con lógica no trivial debe tener test en Vitest.
- No mergear con tests rotos o skippeados sin ticket asociado.

## Antes de cada commit
- Correr linter y typecheck, cero errores y cero warnings nuevos.
- Revisar que no queden imports sin usar ni clases de Tailwind sin efecto.

## Accesibilidad
- `accessibilityLabel` en botones/iconos sin texto visible.
- Áreas táctiles mínimas de 44x44 (usar `hitSlop` si el elemento es chico).
- Contraste de color suficiente, sobre todo si hay dark mode.

## Formularios
- Validación con Zod compartida entre el schema del form y el que valida la respuesta de la API (un solo source of truth).
- Manejo explícito de teclado (`KeyboardAvoidingView` / `keyboardShouldPersistTaps`) para que no tape inputs.
- Debounce en inputs que disparan búsquedas o validaciones async.

## Imágenes y assets
- Usar `expo-image` en vez de `Image` de RN puro (mejor cache y performance).
- Definir `width`/`height` o `aspectRatio` explícito para evitar layout shift.
- No embeber imágenes pesadas sin optimizar en el bundle.

## Variables de entorno y config
- Nunca hardcodear URLs de API, keys o secrets en el código; usar `.env` + `expo-constants`.
- Separar config por entorno (dev/staging/prod) con `app.config.ts` o eas.json profiles.

## Manejo de errores a nivel app
- Un `ErrorBoundary` global (o por pantalla crítica) para no mostrar pantalla blanca ante un crash.
- Logging de errores centralizado (Sentry o similar) en vez de solo `console.error`.

## Offline / conectividad
- Detectar estado de red (`@react-native-community/netinfo`) y mostrar feedback si no hay conexión, en vez de fallar en silencio.
- Considerar cache/persistencia local (MMKV, AsyncStorage) para datos críticos si la app debe funcionar offline.

## Git / commits
- Commits atómicos con mensaje claro (convención tipo `feat:`, `fix:`, `refactor:`).
- No mezclar cambios de estilo/formato masivo con cambios de lógica en el mismo commit.

## Estructura de carpetas
- Separación clara por feature o por capa (components/, hooks/, screens/, services/, types/) y mantenerla consistente en todo el proyecto.
- No importar entre features "por atajo" saltando la capa de servicios/hooks.

## Seguridad básica
- No loguear tokens, contraseñas ni datos sensibles del usuario, ni en dev.
- Sanitizar/validar cualquier dato que venga de un deep link o input externo antes de usarlo.

## Principio rector: la app tiene que ser fácil y fluida de usar

Antes de dar una tarea por terminada, preguntate: ¿esto le ahorra pasos, dudas o errores al usuario? Si hay una forma más simple de hacerlo con recursos nativos de RN/Expo, usala. Prioridad: claridad > velocidad percibida > estética.

### Feedback y estados
- Toda acción asíncrona muestra estado: cargando (botón deshabilitado + indicador), éxito y error. Nunca pantallas en blanco ni botones que "no hacen nada".
- Skeletons o placeholders en lugar de spinners a pantalla completa cuando se pueda.
- Mensajes de error en español, claros y accionables ("No se pudo subir el DNI. Reintentar"), nunca códigos técnicos crudos.
- Pull-to-refresh en pantallas que muestran datos del back. Empty states con mensaje y acción sugerida.
- Confirmar antes de acciones destructivas o irreversibles.
- `expo-haptics` para confirmaciones y errores importantes (con moderación).

### Formularios
- React Hook Form + Zod: validar al perder foco (`mode: 'onTouched'`), mostrar el error debajo del campo y hacer scroll al primer campo con error.
- Usar siempre el tipo de teclado correcto: `keyboardType`, `inputMode`, `autoCapitalize`, `autoComplete`, `textContentType`, `returnKeyType`.
- Encadenar campos con `onSubmitEditing` + refs (el "siguiente" del teclado pasa al próximo input).
- `KeyboardAvoidingView` + `ScrollView` con `keyboardShouldPersistTaps="handled"`. Ningún campo puede quedar tapado por el teclado.
- Guardar el progreso de wizards largos en Zustand con persist: si el usuario cierra la app, retoma donde quedó.
- Botón de envío deshabilitado con mensaje que explique qué falta, no solo gris sin explicación.
- Pre-completar todo lo que ya se sabe; no pedir dos veces el mismo dato.

### Permisos, cámara y archivos
- Explicar para qué se pide el permiso antes de mostrar el diálogo del sistema.
- Si se deniega: mensaje claro + botón a `Linking.openSettings()`. Nunca crashear ni dejar la pantalla muerta.
- Ofrecer siempre alternativa (cámara, galería, archivo) según corresponda.
- Comprimir y redimensionar imágenes antes de subir (`expo-image-manipulator`, calidad ~0.7) y mostrar preview con opción de reemplazar.
- Mostrar progreso de subida y permitir reintentar solo lo que falló.

### Navegación
- Expo Router con `router.replace` para flujos que no deben volver atrás (onboarding, login, sala de espera).
- Guards en los layouts según estado del usuario; contemplar deep links y back del sistema.
- Mantener el flujo lo más corto posible; indicar progreso ("Paso 2 de 3").
- Restaurar el estado de sesión al abrir la app con `expo-splash-screen` (mantener el splash hasta resolver auth y estado del perfil, sin parpadeos).

### Red y errores
- Manejar sin conexión con `@react-native-community/netinfo`: aviso visible y reintento automático al volver.
- TanStack Query: `staleTime` razonable, `retry` acotado, refetch al volver a foco (`focusManager` + `AppState`), invalidación tras mutaciones.
- Updates optimistas donde el riesgo sea bajo.
- Interceptor de Axios: 401 → refresh de token → si falla, logout limpio con mensaje.

### Performance
- Listas con `FlashList` (o `FlatList` bien configurada): `keyExtractor`, `getItemType`, sin funciones inline pesadas en `renderItem`.
- Imágenes con `expo-image` (cache, placeholder, transición).
- `useCallback`/`useMemo` solo donde haya un problema medido; evitar re-renders con selectores de Zustand.
- Animaciones con `react-native-reanimated` (thread de UI), no con `Animated` en JS para cosas complejas.

### Accesibilidad y adaptación
- `accessibilityLabel`, `accessibilityRole` y `accessibilityState` en elementos interactivos.
- Áreas táctiles mínimas de 44x44 pt (`hitSlop` si el elemento es chico).
- `react-native-safe-area-context` para notch y barras del sistema.
- Respetar el tamaño de fuente del sistema; no fijar alturas que rompan con texto grande.
- Soportar teclado en pantallas chicas y orientación cuando aplique.
- Textos de UI siempre en español, tono simple y directo.

### Guardado de datos
- Tokens y datos sensibles en `expo-secure-store`, nunca en AsyncStorage.
- AsyncStorage solo para preferencias y progreso de formularios.

### Al proponer soluciones
- Si una tarea permite una forma más cómoda para el usuario (autocompletar, escanear, elegir de una lista en vez de tipear, recordar la última opción), proponerla explícitamente en lugar de implementar solo lo literal que se pidió.
- Ante una decisión de UX ambigua, elegir la opción con menos fricción y dejarlo anotado.
- No agregar librerías nuevas si Expo/RN ya resuelve el caso; si hace falta una, justificarla en una línea.

## Checklist de UX (revisar antes de cerrar cada tarea)

Marcá cada punto. Si algo no aplica, decilo en una línea. Si algo falla, corregilo antes de dar la tarea por terminada.

### Estados y feedback
- [ ] Toda acción asíncrona tiene estado de carga, éxito y error visibles.
- [ ] No hay pantallas en blanco en ningún caso (cargando, vacío, error, sin conexión).
- [ ] Los mensajes de error están en español y dicen qué hacer, sin códigos técnicos.
- [ ] Los botones se deshabilitan mientras se procesa (no se puede tocar dos veces).
- [ ] Las acciones destructivas piden confirmación.

### Formularios
- [ ] Cada input tiene el teclado correcto (`keyboardType`, `inputMode`, `autoCapitalize`, `autoComplete`).
- [ ] "Siguiente" en el teclado pasa al próximo campo; el último envía.
- [ ] El teclado no tapa ningún campo ni el botón de envío.
- [ ] Los errores aparecen debajo de cada campo y se hace scroll al primero con error.
- [ ] Si el botón de envío está deshabilitado, se explica qué falta.
- [ ] El progreso del wizard se persiste y se retoma al reabrir la app.
- [ ] No se pide dos veces un dato que ya se tiene.

### Permisos y archivos
- [ ] Se explica para qué se pide cada permiso antes del diálogo del sistema.
- [ ] El caso "denegado" tiene mensaje y botón a `Linking.openSettings()`.
- [ ] Las imágenes se comprimen antes de subir y hay preview con opción de reemplazar.
- [ ] Se muestra progreso de subida y se puede reintentar solo lo que falló.

### Navegación
- [ ] Los flujos sin vuelta atrás usan `router.replace`.
- [ ] Hay guard por estado de usuario y funciona con deep links y back del sistema.
- [ ] El splash se mantiene hasta resolver auth y perfil (sin parpadeos ni pantallas intermedias).
- [ ] El usuario sabe en qué paso está y cuántos faltan.

### Red
- [ ] Sin conexión: aviso visible y reintento automático al volver.
- [ ] Refetch al volver a foco y pull-to-refresh donde hay datos del back.
- [ ] 401 hace refresh de token; si falla, logout limpio con mensaje.

### Performance y fluidez
- [ ] Listas con `FlashList` o `FlatList` bien configurada.
- [ ] Imágenes con `expo-image`.
- [ ] No hay re-renders innecesarios (selectores de Zustand, sin funciones pesadas inline).
- [ ] Las animaciones no traban (Reanimated donde haga falta).

### Accesibilidad
- [ ] Los elementos interactivos tienen `accessibilityLabel` y `accessibilityRole`.
- [ ] Las áreas táctiles son de al menos 44x44 pt.
- [ ] Safe areas respetadas (notch y barras del sistema).
- [ ] El layout aguanta fuente grande del sistema sin romperse.

### Seguridad de datos
- [ ] Tokens en `expo-secure-store`, nunca en AsyncStorage.
- [ ] No se loguean datos sensibles (tokens, documentos, datos personales).

### Cierre de tarea
- [ ] Probé el camino feliz y al menos un camino de error.
- [ ] Probé en pantalla chica y con teclado abierto.
- [ ] Anoté las decisiones de UX que tomé por mi cuenta y cualquier mejora que quedó pendiente.
- [ ] Propuse al menos una mejora que le ahorre pasos al usuario, si la había.

## Loading states — usar Skeletons, no spinners
- Prohibido usar `ActivityIndicator` como loading state de pantallas o listas con contenido predecible (perfil, cards, listas, detalle). Reservarlo solo para acciones puntuales muy cortas (ej. submit de un botón).
- Cada pantalla/componente que consume datos async debe tener su propio Skeleton que replique el layout final (mismo alto, mismo ancho aproximado, misma cantidad de "bloques") para evitar layout shift al cargar los datos reales.
- Usar una librería de skeleton (ej. `moti/skeleton`, `react-native-reanimated-skeleton`, o un componente propio con `Animated`/Reanimated + NativeWind) en vez de reinventar la animación en cada pantalla.
- Crear un componente base reutilizable, ej. `<SkeletonBox className="h-4 w-32 rounded-md" />`, y componer los skeletons de cada pantalla a partir de ese bloque.
- El skeleton debe vivir en el mismo archivo o carpeta que el componente que representa (ej. `UserCard.tsx` + `UserCardSkeleton.tsx`), no centralizado en un solo archivo gigante.
- Mismo criterio para listas: renderizar N skeletons (3-6) en vez de un solo spinner centrado en pantalla.
- Si el fetch falla, no dejar el skeleton infinito: siempre debe resolver a estado de error o vacío con feedback claro. 