# Contexto del Agente (TransferBlack Conductor)

Este archivo sirve como referencia rápida y fuente de la verdad para el comportamiento, contexto del proyecto y el **estado actual de lo que se está construyendo**. Todo agente debe leer este archivo antes de proponer cambios arquitectónicos.

## 1. Estado Actual y Funcionalidades Implementadas

### Flujo de Autenticación (`src/app/auth/`)
- **Gestión de Sesión:** Manejada de forma centralizada con Zustand (`useAuthStore`). Almacena los datos del usuario logueado y el token (guardado de forma segura en `expo-secure-store`).
- **Navegación Condicional:** Basado en el estado del usuario (`isLoggedIn`), el enrutador bloquea rutas protegidas y redirige al login si la sesión expira o devuelve un error 401.
- **Formularios de Auth:** Implementados con React Hook Form y validados estrictamente con Zod (Email, contraseña, confirmación).

### Flujo de Onboarding (`src/app/onboarding/`)
- **Gestión de Estado:** Todo el progreso del usuario (formularios, documentos subidos) se maneja globalmente con Zustand (`useOnboardingStore`) y se sincroniza con el backend mediante borradores (drafts) a través de react-query.
- **Manejo de Documentos (`DocumentItem.tsx`):** 
  - Soporta subida por cámara, galería (imágenes) y selector de archivos (PDF).
  - Tiene una UI adaptativa (se expande/colapsa según el estado de carga) e incluye visor de imágenes a pantalla completa.
  - **Lógica Estricta de Metadatos:** Los documentos de tipo vehículo (`vehicle_title`, `itv`) bloquean la subida y muestran alertas visuales (⚠️) si el usuario no completa antes la fecha de emisión, vencimiento y número de trámite.
  - Los metadatos ingresados se sincronizan en tiempo real con el store (`onChangeText` y `DatePickerInput`).
- **Navegación Segura:** Se maneja correctamente el stack de navegación de Expo Router, asegurando que el botón "Atrás" no crashee la app si el stack previo está vacío.

### Pantalla de Revisión (`src/app/pending-approval/`)
- **UI Premium:** Interfaz completamente rediseñada con la paleta de lujo (Gold/Obsidian), indicando claramente que la solicitud del conductor está en auditoría.
- **Pipeline de Progreso:** Muestra visualmente qué pasos ya fueron aprobados y cuáles están en revisión.
- **Gestión de Rechazos:** Si la API devuelve `approvalStatus: 'rejected'`, la pantalla cambia su aura a rojo, muestra el motivo exacto del rechazo devuelto por el equipo de compliance, y habilita un botón para volver al Onboarding a "Modificar Documentos Cargados".
- **Skeletons (UX):** Implementa `PendingApprovalSkeleton` usando `<SkeletonBox />` para evitar pantallas blancas mientras se hace el fetch del perfil.

### Cita Confirmada y Sincronización de Reunión (`src/app/confirmed-appointment/`)
- **UI VIP Minimalista:** Presentación sobria y refinada de la cita con el equipo de compliance, mostrando fecha, hora y enlace a Google Meet.
- **Polling Reactivo Automático:** Implementa sondeo periódico en segundo plano (cada 5s vía `useFocusEffect` sobre `GET /driver/meeting`) para detectar de forma instantánea la aprobación del administrador desde `admin-web`, transitando de pantalla sin requerir pull-to-refresh manual.
- **Limpieza de Recursos:** Control riguroso de desuscripción de temporizadores e intervalos al salir de foco para evitar fugas de memoria.

### Dashboard de Conducción y Mapa en Vivo (`src/app/(home)/`)
- **Mapa Interactivo:** Componente `CustomMap` (`react-native-maps`) con tema nocturno personalizado (`darkMapStyle`), renderizado a pantalla completa.
- **Geolocalización Continua:** Hook `useDriverLocation` (`expo-location`) con precisión alta (`Accuracy.High`), actualización cada 10 metros / 10 segundos y transmisión automática al endpoint `POST /drivers/me/location` cuando el conductor está disponible.
- **Controles FAB:** Botones flotantes de acción rápida para centrar la cámara en la posición actual y activar/desactivar el modo de seguimiento (`isFollowingUser`).
- **Control de Disponibilidad:** Switch de estado ("Disponible" / "Desconectado") que controla el ciclo de vida del socket y la geolocalización activa.
- **Guardas de Navegación Deterministas:** El layout raíz de `(home)` consulta directamente `GET /driver/me` para comprobar `approvalStatus === 'approved'`, erradicando loops infinitos entre el panel y `/pending-approval`.

### Comunicación en Tiempo Real (`src/core/socket/`)
- **Cliente Socket.io:** Instancia centralizada (`socket.ts`) con reconexión automática y desconexión controlada.
- **Autenticación por Token:** Inyección dinámica de credenciales (`socket.auth = { token }`) obtenidas de `authStorage` al ponerse en estado disponible, desconectando en reposo o al cerrar sesión.

## 2. Arquitectura y Stack
- **Framework:** React Native + Expo + Expo Router (Navegación basada en archivos en `src/app/`).
- **Mapas y Ubicación:** `react-native-maps` con Google Maps Provider + `expo-location`.
- **WebSockets:** `socket.io-client` para eventos en tiempo real.
- **Estilos:** NativeWind v4 (Tailwind CSS).
- **Estado Global:** Zustand (`useAuthStore`, `useOnboardingStore`).
- **Mutaciones/Data Fetching:** `@tanstack/react-query` y Axios (`transferApi`).
- **Formularios:** React Hook Form + Zod para validación.

## 3. Reglas de Estilo y UI (UX Premium)
- **Tema:** Dark mode nativo por defecto. Colores principales: Obsidian (`#0A0A0C`), Gold (`#D4AF37`), Platinum (`#E4E4E5`), Ash (`#8E8E93`), Charcoal (`#2C2C2E`). No usar hex sueltos, siempre clases de Tailwind (`bg-obsidian`, `text-gold`).
- **Loading States (CRÍTICO):** 
  - **Prohibido** usar `ActivityIndicator` (spinners) para bloquear pantallas enteras o listas. 
  - **Obligatorio** usar `<SkeletonBox />` (basado en `react-native-reanimated`) para crear skeletons dedicados que repliquen el layout final de la pantalla.
  - `ActivityIndicator` solo está permitido para acciones cortas (ej. subida de un archivo o botón de submit).
- **Tipografía:** Usar exclusivamente las clases globales de Montserrat (`font-montserrat`, `font-montserrat-semibold`, etc.).

## 4. Backend y API (Fuente de la Verdad)
- Todos los payloads y modelos en el frontend DEBEN coincidir exactamente con los DTOs y validaciones de Zod del backend.
- En documentos vehiculares (`vehicle_title`, `itv`), es mandatorio enviar metadatos (`documentNumber`, `issuedAt`, `expiresAt`) o el backend arrojará error 400.

## 5. Manejo de Errores y Feedback
- Nunca dejar botones muertos o errores crudos del servidor.
- Todo mensaje de error debe estar en español y ser amigable.
- Usar confirmaciones (Alert) antes de acciones destructivas (ej. eliminar documentos).
