# Contexto del Agente (TransferBlack Conductor)

Este archivo sirve como referencia rápida y fuente de la verdad para el comportamiento, contexto del proyecto y el **estado actual de lo que se está construyendo**. Todo agente debe leer este archivo antes de proponer cambios arquitectónicos.

## 1. Estado Actual y Funcionalidades Implementadas

### Flujo de Autenticación y Red (`src/app/auth/`, `src/core/api/transferApi.ts`)
- **Gestión de Sesión:** Manejada de forma centralizada con Zustand (`useAuthStore`). Almacena los datos del usuario logueado y el token (guardado de forma segura en `expo-secure-store`).
- **Resiliencia de Red y Refresh Token:** Cliente Axios (`transferApi`) equipado con interceptor para inyección automática de token y recuperación silenciosa de errores 401:
  - Rotación automática de tokens mediante llamada a `POST /auth/refresh`.
  - Cola de peticiones concurrentes (`failedQueue`) para reintentar requests bloqueados tras la renovación exitosa.
  - Logout limpio y redirección segura si la renovación de token falla o expira.
- **Navegación Condicional:** Basado en el estado del usuario (`isLoggedIn` / `isAuthenticated`), el enrutador bloquea rutas protegidas y redirige al login si la sesión expira.
- **Formularios de Auth:** Implementados con React Hook Form y validados estrictamente con Zod (Email, contraseña, confirmación).

### Flujo de Onboarding (`src/app/onboarding/`)
- **Gestión de Estado:** Todo el progreso del usuario (formularios, documentos subidos) se maneja globalmente con Zustand (`useOnboardingStore`) y se sincroniza con el backend mediante borradores (drafts) a través de react-query.
- **Manejo de Documentos (`DocumentItem.tsx`):** 
  - Soporta subida por cámara, galería (imágenes) y selector de archivos (PDF).
  - Tiene una UI adaptativa (se expande/colapsa según el estado de carga) e incluye visor de imágenes a pantalla completa.
  - **Lógica Estricta de Metadatos:** Los documentos de tipo vehículo (`vehicle_title`, `itv`) bloquean la subida y muestran alertas visuales (⚠️) si el usuario no completa antes la fecha de emisión, vencimiento y número de trámite.
  - Los metadatos ingresados se sincronizan en tiempo real con el store (`onChangeText` y `DatePickerInput`).
- **Navegación Segura:** Se maneja correctamente el stack de navegación de Expo Router, asegurando que el botón "Atrás" no crashee la app si el stack previo está vacío.

### Pantalla de Revisión (`src/app/(home)/pending-approval/`)
- **UI Premium:** Interfaz completamente rediseñada con la paleta de lujo (Gold/Obsidian), indicando claramente que la solicitud del conductor está en auditoría.
- **Pipeline de Progreso:** Muestra visualmente qué pasos ya fueron aprobados y cuáles están en revisión.
- **Gestión de Rechazos:** Si la API devuelve `approvalStatus: 'rejected'`, la pantalla cambia su aura a rojo, muestra el motivo exacto del rechazo devuelto por el equipo de compliance, y habilita un botón para volver al Onboarding a "Modificar Documentos Cargados".
- **Skeletons (UX):** Implementa `PendingApprovalSkeleton` usando `<SkeletonBox />` para evitar pantallas blancas mientras se hace el fetch del perfil.

### Cita Confirmada y Sincronización de Reunión (`src/app/(home)/confirmed-appointment/`)
- **UI VIP Minimalista:** Presentación sobria y refinada de la cita con el equipo de compliance, mostrando fecha, hora y enlace a Google Meet.
- **Polling Reactivo Automático:** Implementa sondeo periódico en segundo plano (cada 5s vía `useFocusEffect` sobre `GET /driver/meeting`) para detectar de forma instantánea la aprobación del administrador desde `admin-web`, transitando de pantalla sin requerir pull-to-refresh manual.
- **Limpieza de Recursos:** Control riguroso de desuscripción de temporizadores e intervalos al salir de foco para evitar fugas de memoria.

### Dashboard de Conducción y Mapa en Vivo (`src/app/(home)/`)
- **Orquestación en `(home)/_layout.tsx`:** Guard centralizado que consulta `GET /users/me`, valida roles (`driver`), verifica el perfil de conductor (`GET /driver/me`) y reuniones activas (`GET /driver/meeting`), derivando con precisión al dashboard o a las pantallas correspondientes de espera/onboarding.
- **Mapa Interactivo:** Componente `CustomMap` (`react-native-maps`) con tema nocturno personalizado (`darkMapStyle`), renderizado a pantalla completa.
- **Geolocalización Continua:** Hook `useDriverLocation` (`expo-location`) con precisión alta (`Accuracy.High`), actualización cada 10 metros / 10 segundos y transmisión automática al endpoint `POST /drivers/me/location` cuando el conductor está disponible o en viaje activo.
- **Controles FAB Dinámicos:** Botones flotantes de acción rápida (centrar cámara, seguimiento, alternar visualización de ruta) reposicionados reactivamente mediante resortes de `react-native-reanimated` según la altura del bottom sheet activo.
- **Control de Disponibilidad:** Switch de estado ("Disponible" / "Desconectado") que controla el ciclo de vida del socket y la geolocalización activa.
- **Métricas y Seguridad:** Header superior con switch de ganancias (`$stats.earningsToday`), `DashboardCarousel`, acceso a `EmergencyFAB` (modal de seguridad SOS) y progreso de conductor (`DriverProgressModal`).

### Ciclo de Vida del Viaje y Despacho en Tiempo Real (`src/core/trip/`, `src/presentation/trip/`, `src/presentation/components/trip/`)
- **Almacén Centralizado de Viajes (`useDriverTripStore`):** Zustand con persistencia en `AsyncStorage` (`driver-trip-storage`) para retener el viaje en curso (`activeTrip`) y timestamp de llegada (`arrivedAt`) ante recargas de la app.
- **Suscripción WebSocket de Viaje (`useTripSocket`):**
  - Escucha de ofertas entrantes (`trip:offer`) asignadas al store.
  - Sincronización a salas de socket del viaje (`ride:join` al montarse o reconectarse).
  - Manejo de cambios de estado (`trip:status_changed`), alertas y respuesta háptica ante cancelación (`cancelled`) o finalización (`completed`), liberando la sala (`ride:leave`).
- **Acciones del Ciclo de Vida (`trip.actions.ts`):**
  - `acceptTripOffer`: Aceptación de oferta (`POST /rides/:id/accept`).
  - `driverArriving`: Notificación de trayecto al punto de encuentro (`POST /rides/:id/driver-arriving`).
  - `driverArrived`: Notificación de llegada al punto de encuentro (`POST /rides/:id/driver-arrived`).
  - `startTrip`: Inicio del viaje (`POST /rides/:id/start`) con validación opcional de PIN de abordaje de 4 dígitos.
  - `driverCancelTrip`: Cancelación justificada por el conductor (`POST /rides/:id/driver-cancel`) con código de motivo, notas y coordenadas.
  - `completeTrip`: Finalización del viaje (`POST /rides/:id/complete`).
  - `getTripById`: Re-sincronización del viaje al inicio (`GET /rides/:id`).
- **Overlay de Viaje Activo (`ActiveTripOverlay` y `ActiveTripTopHeader`):**
  - Panel deslizante interactivo con gestos (`PanResponder` + `LayoutAnimation`) para colapsar/expandir la información.
  - Navegación externa directa: Integración para abrir destino o pickup en Google Maps o Waze.
  - Botón de llegada por deslizamiento (`SwipeToArriveButton`): Evita toques accidentales y confirma el arribo con feedback háptico.
  - Soporte de preferencias del pasajero: Identificación de íconos para climatización, música, silencio, conversación y equipaje.
  - Soporte de viajes a terceros / corporativos: Muestra diferenciada de pasajero y coordinador (`trip.chat.is_third_party_trip` y `trip.third_party`).
- **Hoja de Espera y PIN de Seguridad (`WaitingBottomSheet` y `PinOtpInput`):**
  - Temporizador de cortesía de 5 minutos (`useCourtesyTimer`) tras arribar al punto de encuentro.
  - Validación de PIN OTP de 4 dígitos (`PinOtpInput`) requerido para habilitar el inicio seguro del viaje.
- **Trazado y Representación en Mapa (`CustomMap`):**
  - Marcador de punto de encuentro (Pickup) azul con icono de pasajero.
  - Marcador de destino (Dropoff) oscuro estilo VIP.
  - Trazado de ruta GeoJSON (`Polyline`) soportando geometrías `LineString` y `MultiLineString`.
  - Auto-ajuste de cámara (`fitToCoordinates`) englobando conductor, origen y destino.

### Comunicación en Tiempo Real (`src/core/socket/`)
- **Cliente Socket.io:** Instancia centralizada (`socket.ts`) con reconexión automática y desconexión controlada.
- **Autenticación por Token:** Inyección dinámica de credenciales (`socket.auth = { token }`) obtenidas de `authStorage` al ponerse en estado disponible o tener viaje activo, desconectando en reposo o al cerrar sesión.

### Bóveda Financiera y Retiros (`src/app/(home)/wallet/`, `src/core/wallet/`, `src/presentation/wallet/`)
- **Resumen Financiero (`useWalletStore`, `GET /driver/wallet`):**
  - Muestra saldo contable neto (`balance`), saldo disponible para retiro (`available_for_payout`) y deuda acumulada por comisiones de viajes en efectivo (`cash_commission_debt`).
  - Detección de bloqueo operativo por deuda (`is_cash_restricted`) contra el umbral de la plataforma (`cash_restriction_threshold`).
- **Retiros a CBU (`PayoutModal.tsx`, `POST /driver/wallet/payout`):**
  - Envío del monto formateado estrictamente como string con dos decimales (`{ amount: Number(val).toFixed(2) }`) según el schema Zod del backend.
  - Previsualización del CBU/Alias bancario del chofer y confirmaciones con háptica.
- **Libro Mayor de Transacciones (`GET /driver/wallet/transactions`):**
  - Lista filtrable mediante selector de chips: Todos, Ingresos (`trip_earning`), Comisiones (`cash_trip_commission`), Retiros CBU (`payout`).
- **Integración en Dashboard:**
  - Header pill con saldo en tiempo real y alerta de deuda.
  - Tarjeta 1 de `DashboardCarousel` con balance y acceso directo a la pantalla de la bóveda.

## 2. Arquitectura y Stack
- **Framework:** React Native + Expo + Expo Router (Navegación basada en archivos en `src/app/`).
- **Mapas y Ubicación:** `react-native-maps` con Google Maps Provider + `expo-location`.
- **WebSockets:** `socket.io-client` para eventos en tiempo real (disponibilidad, ofertas, estados de viaje).
- **Estilos:** NativeWind v4 (Tailwind CSS).
- **Estado Global:** Zustand (`useAuthStore`, `useOnboardingStore`, `useDriverTripStore`, `useLocationStore`, `useWalletStore`).
- **Mutaciones/Data Fetching:** `@tanstack/react-query` y Axios (`transferApi` con interceptores y auto-refresh).
- **Formularios:** React Hook Form + Zod para validación.

## 3. Reglas de Estilo y UI (UX Premium)
- **Tema:** Dark mode nativo por defecto. Colores principales: Obsidian (`#0A0A0C`), Gold (`#D4AF37`), Platinum (`#E4E4E5`), Ash (`#8E8E93`), Charcoal (`#2C2C2E`). No usar hex sueltos, siempre clases de Tailwind (`bg-obsidian`, `text-gold`).
- **Loading States (CRÍTICO):** 
  - **Prohibido** usar `ActivityIndicator` (spinners) para bloquear pantallas enteras o listas. 
  - **Obligatorio** usar `<SkeletonBox />` (basado en `react-native-reanimated`) para crear skeletons dedicados que repliquen el layout final de la pantalla.
  - `ActivityIndicator` solo está permitido para acciones cortas (ej. subida de un archivo o botón de submit).
- **Tipografía:** Usar exclusivamente las clases globales de Montserrat (`font-montserrat`, `font-montserrat-semibold`, etc.).

## 4. Backend y API (Fuente de la Verdad)
- Todos los payloads y modelos en el frontend DEBEN coincidir exactamente con los DTOs y validaciones de Zod del backend (`transferblack/backend`).
- En documentos vehiculares (`vehicle_title`, `itv`), es mandatorio enviar metadatos (`documentNumber`, `issuedAt`, `expiresAt`) o el backend arrojará error 400.
- El ciclo de vida de los viajes sigue estrictamente los estados del backend: `assigned`, `driver_arriving`, `driver_arrived`, `in_progress`, `completed`, `cancelled`.

## 5. Manejo de Errores y Feedback
- Nunca dejar botones muertos o errores crudos del servidor.
- Todo mensaje de error debe estar en español y ser amigable.
- Usar confirmaciones (Alert) antes de acciones destructivas (ej. eliminar documentos o cancelar viajes).
