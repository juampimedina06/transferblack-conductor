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

### Bóveda Financiera, Cuenta de Cobro y Retiros (`src/app/(home)/wallet/`, `src/core/wallet/`, `src/presentation/wallet/`)
- **Resumen Financiero (`useWalletStore`, `GET /driver/wallet`):**
  - Muestra saldo disponible para retiro (`available_balance`), saldo contable neto (`balance`), límite de deuda (`debt_limit`) y desglose analítico (`breakdown`).
  - Detección de restricción operativa por deuda acumulada (`is_cash_restricted`).
  - Banner informativo de retiro en curso (`pending_payout` con estados `requested` o `approved`), con enlace directo al historial y bloqueo de nuevas solicitudes mientras haya una en proceso.
  - Accesos directos a "Configurar Cuenta de Cobro" e "Historial de Retiros".
- **Configuración de Medio de Cobro (`src/app/(home)/wallet/payout-method.tsx`):**
  - Consulta y precarga de cuenta existente (`GET /driver/payout-method`) y guardado/actualización (`PUT /driver/payout-method`).
  - Validación con React Hook Form + Zod (`payout-method.schema.ts`):
    - Selector CBU o CVU.
    - CBU/CVU validado estrictamente a 22 dígitos numéricos.
    - Alias de 6 a 50 caracteres.
    - Nombre del titular (mínimo 2 caracteres) y CUIT/DNI (mínimo 6 caracteres).
- **Solicitud de Retiro (`PayoutModal.tsx`, `POST /driver/payouts`):**
  - Validación de medio de cobro configurado: si no existe, bloquea la acción y ofrece redirección inmediata a la pantalla de configuración.
  - Tarjeta de confirmación visual de destino (Alias y CBU/CVU) previo al envío.
  - Control de montos (mayor a 0 y $\le$ `available_balance`) con botón de "Máximo".
  - Envío al endpoint oficial `POST /driver/payouts` con `{ amount: string }` y actualización atómica del estado financiero.
- **Historial de Retiros Paginado (`src/app/(home)/wallet/payout-history.tsx`, `GET /driver/payouts`):**
  - Lista paginada con pull-to-refresh y carga infinita (`page` y `limit=20`).
  - Badges por estado (`requested` = Pendiente, `approved` = En Proceso, `paid` = Pagado, `rejected` = Rechazado).
  - Despliegue de motivo de rechazo (`rejection_reason`), referencia de transferencia bancaria (`transfer_reference`) y botón para abrir comprobante digital (`receipt_url`).
- **Libro Mayor de Transacciones (`GET /driver/wallet/transactions`):**
  - Lista filtrable mediante selector de chips: Todos, Ingresos (`trip_earning`), Comisiones (`trip_commission_debt`), Retiros CBU (`payout`).
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

## 6. Scripts de Desarrollo (`scripts/`)

Todos se ejecutan con `node scripts/<nombre>.mjs` desde la raíz del proyecto.

### 🚀 Disparar viajes

| Script | Comando | Qué hace |
|---|---|---|
| `dispatch_dean_funes_empalme.mjs` | `node scripts/dispatch_dean_funes_empalme.mjs` | **Radar natural (no toca el estado de ningún chofer).** Parte de Deán Funes / Horizonte (`-31.4508, -64.1205`) y termina en Barrio Empalme (`-31.4405, -64.1262`). Antes de cotizar saca una foto del radar con el heatmap de admin y aborta si no hay choferes `online` en 5 km. Después despacha y **espera** a que alguien acepte, imprimiendo nombre, email y teléfono de quien lo tomó. Flags: `--origin-lat/lng`, `--dest-lat/lng`, `--passenger-email/password`, `--watch-seconds`, `--no-watch`, `--force`. |
| `dispatch_to_jp.mjs` | `node scripts/dispatch_to_jp.mjs` | Pone a los conductores demo en offline, cotiza un viaje cuyo origen es tu ubicación GPS actual (`-31.4431, -64.1143`), lo confirma con pago en efectivo + PIN y lo despacha. El viaje debería llegar a tu app. |
| `dispatch_ride.mjs` | `node scripts/dispatch_ride.mjs` | Igual que el anterior pero usa como pasajero a "Bruno Díaz" y parte desde Barrio Deán Funes Horizonte. |
| `dispatch_voucher.mjs` | `node scripts/dispatch_voucher.mjs` | Despacha un viaje corporativo con pago por voucher (`DEMO-OPS-2026`) como pasajero "Carla". El viaje acredita como ganancia digital en la bóveda del chofer. |
| `request-test-trip.mjs` | `node scripts/request-test-trip.mjs` | Lee la URL de la API desde `.env`, cotiza y confirma un viaje como "Ana" (no dispara el despacho, solo crea el viaje en estado `searching`). |
| `create_scheduled_trips.mjs` | `node scripts/create_scheduled_trips.mjs` | **Crea viajes reservados/programados con pasajeros demo (Bruno, Ana, Carla) y los asigna al conductor (`prueba2@gmail.com` por defecto)** vía admin (`POST /api/v1/admin/scheduled-trips`). Flags opcionales: `--driver <id-o-email>`. |

> ⚠️ Para que el viaje te llegue en la app, tenés que estar **conectado** (switch "Disponible" en verde) antes de correr el script.

> 🐛 **Bug conocido en `dispatch_to_jp.mjs` y `dispatch_voucher.mjs`**: siempre muestran "Resultado del despacho" como si fuera un fallo. El endpoint `POST /rides/:id/dispatch` responde **202 Accepted**, no 200, y esos scripts chequean `!== 200`. El dispatch sí funciona. `dispatch_dean_funes_empalme.mjs` ya acepta 200 y 202. **No tocar salvo que se pida explícitamente.**

### ❌ Cancelar / limpiar viajes

| Script | Comando | Qué hace |
|---|---|---|
| `cancel_trip.mjs` | `node scripts/cancel_trip.mjs` | Cancela un viaje específico hardcodeado (editá el `tripId` dentro del script). Usa el pasajero Bruno para autenticarse. |
| `check_and_cancel_driver_active_trips.mjs` | `node scripts/check_and_cancel_driver_active_trips.mjs` | Login como admin, lista todos los viajes activos del sistema, cancela los del conductor hardcodeado y limpia todos los que queden en estado `searching`. Útil para limpiar el entorno antes de una sesión de pruebas. |
| `complete_stuck_trip.mjs` | `node scripts/complete_stuck_trip.mjs` | **Rescata un viaje trabado en `in_progress`.** Login como el conductor dueño (`conductor.test@transferblack.com`) y dispara el `POST /rides/:id/complete` real. Hace preflight, verifica que el conductor autenticado sea el dueño del viaje, pide confirmación (o `--yes`), avisa si el pago es `voucher` y relee el viaje al final. Flags: `--trip-id`, `--public-code`, `--lat`, `--lng`, `--yes`. Ojo: completar **liquida el pago**, y en voucher lo consume. |

### 🔍 Consultar estado

| Script | Comando | Qué hace |
|---|---|---|
| `check_driver_trips.mjs` | `node scripts/check_driver_trips.mjs` | Lista todos los viajes del sistema (admin) y filtra los del conductor. Imprime también todos los viajes activos (no `completed`/`cancelled`). |
| `check_driver.mjs` | `node scripts/check_driver.mjs` | Consulta el heatmap de telemetría del admin (posiciones GPS de conductores). |
| `get_driver_coords.mjs` | `node scripts/get_driver_coords.mjs` | Consulta directamente la DB (Supabase) las coordenadas GPS guardadas del conductor y su estado de disponibilidad. Requiere acceso a la DB. |
| `check_user_vehicle.mjs` | `node scripts/check_user_vehicle.mjs` | Consulta en la DB el perfil de conductor y vehículos asociados a `jpmedinagomez1@gmail.com`. Requiere acceso a la DB. |
| `test_driver_me.mjs` | `node scripts/test_driver_me.mjs` | Genera un JWT firmado localmente (con el secret del backend) y llama a `GET /driver/me`. Solo funciona en local. |
| `test_login.mjs` | `node scripts/test_login.mjs` | Login de Bruno (`bruno@demo.transferblack.com`) e imprime la respuesta completa. Útil para verificar que la API esté levantada. |
| `test_user_me.mjs` | `node scripts/test_user_me.mjs` | Prueba varias contraseñas comunes para `jpmedinagomez1@gmail.com` y si alguna pega, llama a `GET /driver/me`. |

### 💰 Bóveda financiera

| Script | Comando | Qué hace |
|---|---|---|
| `test_wallet_payout.mjs` | `node scripts/test_wallet_payout.mjs` | Login como `conductor.test@transferblack.com`, consulta la bóveda y si hay saldo positivo intenta solicitar un retiro. |
| `inject_test_balance.mjs` | `node scripts/inject_test_balance.mjs` | Inyecta `$25.000 ARS` directamente en la DB al conductor de prueba (doble entrada contable). Requiere acceso a la DB del backend. |
| `resolve_payout.mjs` | `node scripts/resolve_payout.mjs` | Aprueba un retiro específico (hardcodeado) como admin, marcándolo como `paid` con referencia de transferencia. |
| `credit_driver_voucher.mjs` | `node scripts/credit_driver_voucher.mjs` | Simula el flujo completo de un viaje corporativo con voucher: conecta el socket del conductor, despacha, acepta, completa y verifica que el saldo quede acreditado en la bóveda. |

### 🔧 Utilidades

| Script | Comando | Qué hace |
|---|---|---|
| `set_drivers_offline.mjs` | `node scripts/set_drivers_offline.mjs` | Pone en offline a todos los conductores demo excepto `jpmedinagomez1@gmail.com`. Lo mismo que hace internamente `dispatch_to_jp.mjs` al principio. |
| `update-backend-script.mjs` | `node scripts/update-backend-script.mjs` | Genera y escribe el script `dispatch-test-offer.ts` en el directorio del backend. No toca la API, solo actualiza el archivo fuente del script de prueba del backend. |
| `reset-project.js` | `node scripts/reset-project.js` | Resetea el proyecto a estado inicial moviendo `src/` y `scripts/` a `/example/`. **NO CORRER** salvo que quieras borrar todo. |

### Cuentas demo útiles

| Email | Password | Rol |
|---|---|---|
| `jpmedinagomez1@gmail.com` | *(ver `.env` o probá con el script `test_user_me.mjs`)* | Conductor principal (vos) |
| `conductor.test@transferblack.com` | `Test1234` | Conductor de prueba |
| `bruno@demo.transferblack.com` | `Demo1234` | Pasajero demo |
| `carla@demo.transferblack.com` | `Demo1234` | Pasajera corporativa |
| `ana@demo.transferblack.com` | `Demo1234` | Pasajera demo |
| `admin@transferblack.com` | `Admin123456!` | Admin |
| `martin/lucia/diego/sofia@demo.transferblack.com` | `Demo1234` | Conductores demo (ocupan slots del despacho) |

## 7. Tooling y Calidad de Código

### Estado actual de los chequeos

| Comando | Estado | Notas |
|---|---|---|
| `npx tsc --noEmit` | ✅ sale con 0 | Typecheck limpio. |
| `npx vitest` | ✅ funciona | Vitest 5.0.2, no depende de `unrs-resolver`. |
| `npm run lint` | ✅ sale con 0 | **0 errores y 0 warnings en `src/`.** |'''

### Requisito de sistema: Visual C++ Redistributable (Windows)

`npm run lint` **no arranca** si falta el Visual C++ Redistributable. El mensaje que tira (`Cannot find native binding. npm has a bug related to optional dependencies... npm i`) **es engañoso**: no es un bug de npm y borrar `node_modules` no lo arregla.

Causa real, cadena de dependencias:

```text
eslint-config-expo → typescript-eslint → eslint-import-resolver-typescript
  → unrs-resolver → @unrs/resolver-binding-win32-x64-msvc
```

El binding nativo enlaza contra `VCRUNTIME140_1.dll`. Windows trae `VCRUNTIME140.dll` de fábrica pero **`_1` solo la instala el Redistributable**. Sin ella, `LoadLibrary` falla con error 126.

```bash
winget install --id Microsoft.VCRedist.2015+.x64
node -e "require('@unrs/resolver-binding-win32-x64-msvc'); console.log('OK')"   # debe imprimir OK
```

> `tsc` y `vitest` no pasan por `unrs-resolver`: si el typecheck pasa y el lint no, es esto.

### Deuda de lint: cerrada (0 errores, 0 warnings)

La deuda que había antes **ya no está**. These eran los hallazgos y cómo se resolvieron:

| Ubicación | Regla | Resolución |
|---|---|---|
| `ChatScreen.tsx` | `react-hooks/rules-of-hooks` | 🔴 **Era un bug real, no estilo.** El `if (!activeTrip \|\| !user) return null` estaba **antes** de `useState` y de 9 hooks más, así que al llegar el viaje async cambiaba la cantidad de hooks registrados y React corrompía su estado interno. Split en wrapper + `ChatView` con hooks incondicionales. |
| `useChatSocket.ts` | `react-hooks/refs` | Los refs se leían en render, así que la UI no re-renderizaba al cambiar la conexión. Ahora es `useState`. |
| `pending-approval/index.tsx` | `react-hooks/refs` | `isUploadingRef.current` se escribía en render. Ahora se sincroniza con un `useEffect`. |
| `ChatMessageList.tsx` | `react-hooks/static-components` | `ListFooter` se creaba en render vía `useCallback` y se remontaba en cada render. Ahora es un componente top-level. |
| `useDashboardStats.ts`, `DocumentItem.tsx`, `PinOtpInput.tsx`, `useCourtesyTimer.ts`, `CustomMap.tsx`, `_layout.tsx`, `use-color-scheme.web.ts` | `react-hooks/set-state-in-effect` | `setState` síncrono dentro de un `useEffect`. Ver abajo el patrón. |
| 12 imports muertos + 3 `catch` sin usar | `no-unused-vars` | Borrados; los `catch` pasaron a optional catch binding. |
| 7 usos de `Array<T>` | `array-type` | Migrados a `T[]`. |
| `yearNumber` sin usar en `confirmed-appointment` | `no-unused-vars` | La fecha se armaba a mano y salía "lunes, 5 enero", ambigua si el turno no es de este año. Ahora se formatea en un solo `toLocaleDateString('es-AR', { weekday, day, month, year })` que incluye el año. Ojo: se sacó la clase `capitalize` de NativeWind porque ponía "De" en mayúscula ("5 De Enero De 2026"); ahora se capitaliza solo el primer carácter. |
| 5 falsos positivos de Axios | `import/no-named-as-default-member` | Resueltos con named imports (`create`, `isAxiosError`), sin tocar `eslint.config.js`. |
| 20 casos de `exhaustive-deps` | `react-hooks/exhaustive-deps` | Caso por caso, nunca con `--fix` ciego. Ver abajo. |

**Patrón para "resetear estado cuando cambia una prop"** (`DocumentItem`, `PinOtpInput`, `useCourtesyTimer`): comparar contra el valor previo guardado en `useState` y ajustar **durante el render**, no en un efecto. React re-renderiza antes de pintar, así que nunca se ve el valor viejo. Ojo: el valor previo va en `useState`, **no en `useRef`**, porque `react-hooks/refs` prohíbe leer y escribir refs durante el render.

**Cuándo NO va en deps sino en un ref**: si el callback viene como arrow inline del padre y meterlo en deps reiniciaría un efecto con efectos visibles. Pasó en `useOfferTimer` (reiniciaba la animación de la cuenta regresiva) y en `SplashVideoScreen` (re-armaba el timeout de seguridad). Patrón: ref que se actualiza en un `useEffect` aparte, y el efecto principal no depende del callback.

**`useDashboardStats` se reescribió con `useQuery`** de `@tanstack/react-query`, que ya estaba instalado y montado vía `QueryProvider`. Eso eliminó el efecto, el estado de loading manual y el bug de triple fetch (tres effects superpuestos disparaban hasta 3 requests en el mount). No es una dependencia nueva.

### Alcance del lint

Ojo, `npm run lint` y `npx eslint .` **no lintean lo mismo**:

| Comando | Alcance | Resultado |
|---|---|---|
| `npm run lint` (`expo lint`) | solo `src/` | **0 errores, 0 warnings** |
| `npx eslint .` | `src/` **+ `scripts/`** | 1 error, 1 warning |

`eslint.config.js` **sí** cubre `scripts/`; lo que lo salta es el target por defecto de `expo lint`. Si tocás un script de `scripts/`, corre `npx eslint scripts/<archivo>` explícitamente o el cambio pasa inadvertido.

Hallazgos que solo aparecen con `npx eslint .` (preexistentes, en `scripts/`, **fuera del alcance de la limpieza de `src/`**):

- `scripts/get_driver_coords.mjs:1` → `import/no-unresolved`: no encuentra el módulo `pg` (no está en `package.json`; el script quedó sin dependencia declarada). Ojo: sin `pg` el script tampoco funciona en runtime.
- `scripts/credit_driver_voucher.mjs:49` → `no-unused-vars`: `'offerPromise' is assigned a value but never used`.

Los `.mjs` de `scripts/` tampoco entran al programa de TypeScript (`allowJs` off), así que `tsc --noEmit` no los cubre. Para verificarlos: `node --check <archivo>` y ejecutarlos de verdad contra la API.

`scripts/dispatch_dean_funes_empalme.mjs` pasa limpio en ambos.

## 8. Contratos del API de Despacho (referencia para scripts)

Contratos verificados leyendo el backend (`transferblack/backend`, solo lectura) y probando contra la API real:

- **`POST /rides/:tripId/dispatch` responde `202 Accepted`**, no 200. Body plano `{ tripId, offersCreated }`, **sin** wrapper `{ data }`. Para viajes en efectivo excluye choferes con `is_cash_restricted = true`.
- **El radar busca los 5 choferes `online` más cercanos dentro de 5000 m del PICKUP.** Si no hay ninguno: `409 NO_DRIVERS_AVAILABLE`.
- **No existe endpoint REST para listar quién recibió una oferta.** `app.trip_driver_offers` solo se expone por websocket (`trip.driver_offers_created`, sala del chofer) y por outbox. Lo único accesible es el conteo de `offersCreated`.
- **Para ver quién tomó el viaje**: `GET /admin/rides?search=<public_code>&limit=5` (el `search` matchea `publicCode`), filtrar por `id === tripId` y leer `driver: { id, email, firstName, lastName, phone }`. Envelope plano `{ total, page, limit, totalPages, data }`, sin wrapper.
- **`GET /admin/telemetry/heatmap`** devuelve `{ cells, meta }` plano y **descarta posiciones con más de 120 s** (`DEFAULT_STALE_SECONDS`). El query de dispatch, en cambio, **no** filtra por freshness. Es una foto indicativa del radar, no un conteo exacto. `cellSize` por defecto `0.005` grados (~550 m).
- **`GET /rides/:tripId`** (pasajero) expone `boarding_pin` y `driver_id`. El pin se oculta al chofer: `boarding_pin: trip.driverId === callerUserId ? null : trip.boardingPin`.
- **`POST /rides/:tripId/confirm` exige `requireVerifiedEmail`** y un `Idempotency-Key`. El body del quote es `strict`: `address_text`, `place_id`, `latitude`, `longitude` y nada más.
- **Los choferes demo quedan `online` en la DB aunque no tengan socket conectado** y ocupan los 5 slots del radar. `set_drivers_offline.mjs` los fuerza a `offline` conectando y desconectando el socket.
- **`POST /rides/:tripId/complete`** exige `authorizeRoles('driver')` y body `driverTransitionSchema` (`strict`): solo `{ latitude, longitude }` y `boarding_pin` opcional. Responde `200 { data: trip }`. **El `Idempotency-Key` se ignora en esta ruta**: la app manda `${tripId}-complete-${Date.now()}`, que no es un UUID válido, y no revienta porque el handler nunca llama a `requireIdempotencyKey` (esa validación solo corre en `confirm`). Para scripts, mandar un `crypto.randomUUID()` igual.
- **`GET /rides/:tripId` con el token del conductor** devuelve el viaje con `public_code`, `status`, `payment_method`, `driver_id`, `started_at`, `finished_at`, `final_fare`. Devuelve **403** si el viaje es de otro conductor. Es el preflight más simple para scripts: mismo contrato que la app.
- **`GET /admin/rides` devuelve camelCase** (`publicCode`, `createdAt`, `estimatedFare`) y **no trae** `payment_type`, `started_at` ni `finished_at`. No lo uses para verificar liquidaciones; solo para saber a quién le cayó un viaje.
- **`GET /driver/me`** responde `{ data: { driverProfile: { id, availabilityStatus, ... }, vehicle, driverDocuments, vehicleDocuments } }`. El id del conductor es `data.driverProfile.id`, no `data.id`.
- **Un viaje en `in_progress` no lo puede cancelar el chofer**: `canDriverCancelTrip` excluye ese estado y `POST /rides/:id/cancel` es solo de pasajero/admin. La única salida es `complete`.

## 9. Diagnóstico: viajes huérfanos en `in_progress` (RESUELTO)

**Síntoma original**: el conductor quedaba con un viaje asignado que la app no mostraba o perdía tras logout/reinicio. El radar le seguía mandando ofertas y **todas** fallaban con `409 DRIVER_HAS_ACTIVE_TRIP`.

**Causa raíz (backend)**: en el momento del `connect`, `socket-server.ts` forzaba `availabilityStatus = ONLINE` y pisaba el `in_trip` que había escrito la aceptación. Además, no existía un endpoint para consultar el viaje activo del conductor.

**Resolución en backend**:
1. **Endpoint `GET /api/v1/driver/me/active-trip`**: Implementado con `authorizeRoles('driver')`. Devuelve `{ status: 'success', data: { trip: ActiveTripSummary | null } }`.
2. **Preservación de `in_trip`**: Guard en conexión de socket (`setAvailabilityStatusIfNot(userId, IN_TRIP, ONLINE)`).

**Resolución en frontend (`transferblack-conductor`)**:
1. **Acción `getActiveTrip()`**: En [`trip.actions.ts`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/core/trip/actions/trip.actions.ts) consumiendo `GET /driver/me/active-trip`.
2. **Hook y función `useActiveTripSync` / `syncActiveTripState`**: En [`useActiveTripSync.ts`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/presentation/trip/hooks/useActiveTripSync.ts).
   - Se ejecuta al montar el Dashboard ([`(home)/index.tsx`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/app/%28home%29/index.tsx)) y al reconectarse el WebSocket (`socket.on('connect')` en [`useTripSocket.ts`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/presentation/trip/hooks/useTripSocket.ts)).
   - Si el backend retorna un viaje activo, obtiene la entidad completa vía `getTripById(id)` y monta `ActiveTripOverlay` de inmediato.
   - Si el backend retorna `trip: null`, limpia cualquier viaje fantasma local con `setActiveTrip(null)`, liberando al chofer.
3. **Cola FIFO de ofertas con TTL completo**:
   - `offerQueue` en [`useDriverTripStore.ts`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/presentation/trip/store/useDriverTripStore.ts) con deduplicación por `tripId`.
   - Cuando hay múltiples viajes en `searching`, no se pisan entre sí. Cada uno espera en cola y al mostrarse recibe sus 15 segundos completos (`ttlSeconds`).
   - Badge visual `+N en espera` en [`ConnectionBottomSheet.tsx`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/presentation/components/dashboard/ConnectionBottomSheet.tsx).
   - Suite de 52 tests automatizados pasando en Vitest (`__tests__/trip/activeTripSync.test.ts` y `__tests__/trip/useDriverTripStore.test.ts`).
