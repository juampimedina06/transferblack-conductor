# TransferBlack Conductor (Driver App) 🚗

Aplicación móvil oficial para conductores de **TransferBlack**, construida sobre **React Native** con **Expo**, **TypeScript**, **NativeWind (Tailwind CSS v4)** y **React Native Reanimated**.

El proyecto implementa una arquitectura desacoplada y orientada a capas, priorizando la resiliencia en red, validación estricta de datos con el backend y una experiencia de usuario (UX) fluida y premium.

---

## 📋 Tabla de Contenidos
- [Requisitos del Entorno](#-requisitos-del-entorno)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Troubleshooting: lint no arranca en Windows](#-troubleshooting-lint-no-arranca-en-windows)
- [Flujos Principales Implementados](#-flujos-principales-implementados)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Pila Tecnológica y Decisiones de Diseño](#-pila-tecnológica-y-decisiones-de-diseño)
- [Sistema de Diseño y Tokens](#-sistema-de-diseño-y-tokens)
- [Calidad de Código y Convenciones](#-calidad-de-código-y-convenciones)
- [Pendiente en el Backend](#-pendiente-en-el-backend)
- [Guías de Contribución y Agentes de IA](#-guías-de-contribución-y-agentes-de-ia)

---

## 🛠 Requisitos del Entorno

Para asegurar consistencia entre el equipo y evitar desfasajes en el entorno nativo:

- **Node.js**: `v20.x` o superior (LTS recomendado)
- **npm**: `v10.x` o superior
- **Visual C++ Redistributable (x64)**: **Requerido en Windows.** Sin él, `npm run lint` no arranca. Ver [Troubleshooting](#-troubleshooting-lint-no-arranca-en-windows).
- **Expo CLI**: Integrado en el SDK (`npx expo`)
- **JDK (Java Development Kit)**: JDK 17 (requerido para builds y ejecución nativa en Android)
- **Android Studio & SDK**: Android SDK Platform 34+ (para emuladores y desarrollo nativo)
- **Expo Go / Development Client**: Para validación en dispositivos físicos

---

## 🚀 Instalación y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Variables de Entorno:**
   Crear un archivo `.env` en la raíz tomando como base las variables de conexión con el backend:
   ```env
   EXPO_PUBLIC_API_URL=http:
   ```

3. **Iniciar el servidor de desarrollo (limpiando caché de Metro):**
   ```bash
   npx expo start -c
   ```

4. **Ejecutar en plataformas específicas:**
   - **Android**: `npx expo start --android` (o tecla `a` en terminal)
   - **iOS**: `npx expo start --ios` (o tecla `i` en terminal)
   - **Web**: `npx expo start --web` (o tecla `w` en terminal)

5. **Chequeos de Salud y Diagnóstico:**
   ```bash
   npx expo-doctor
   ```

### 🩺 Troubleshooting: `lint` no arranca en Windows

Si `npm run lint` falla antes de analizar un solo archivo con:

```
Error: Cannot find native binding. npm has a bug related to optional dependencies
(https://github.com/npm/cli/issues/4828). Please try `npm i` again after removing
both package-lock.json and node_modules directory.
```

**No sigas ese consejo: es un mensaje engañoso.** No es un bug de npm y borrar `node_modules` no lo arregla.

La causa real es que falta el **Visual C++ Redistributable**. La cadena de dependencias es:

```text
eslint-config-expo → typescript-eslint → eslint-import-resolver-typescript
  → unrs-resolver → @unrs/resolver-binding-win32-x64-msvc
```

Ese binding es un binario nativo que enlaza contra `VCRUNTIME140_1.dll`. Windows trae `VCRUNTIME140.dll` de fábrica, pero **`_1` solo la instala el Redistributable**. Sin ella, `LoadLibrary` falla con el error 126 y el loader de `unrs-resolver` lo reporta con el mensaje genérico de arriba.

**Solución:**

```bash
winget install --id Microsoft.VCRedist.2015+.x64
```

O descargalo desde <https://aka.ms/vc14/vc_redist.x64.exe> (permalink oficial de Microsoft). Requiere permisos de administrador.

**Para diagnosticar si ya está instalado:**

```bash
node -e "require('@unrs/resolver-binding-win32-x64-msvc'); console.log('OK')"
```

> `npx tsc --noEmit` y `npx vitest` **no** dependen de `unrs-resolver` y funcionan aunque falte el Redistributable. Si el typecheck pasa pero el lint no, el problema es este.

---

## 📱 Flujos Principales Implementados

### 1. Autenticación y Resiliencia de Red
- Manejo centralizado del estado de sesión mediante `useAuthStore` (Zustand).
- **Seguridad primero**: Almacenamiento de tokens (Access y Refresh JWT) en `expo-secure-store` (nunca en AsyncStorage).
- **Rotación Silenciosa de Refresh Token**: Cliente Axios (`transferApi`) intercepta respuestas 401, solicita nuevo token en `POST /auth/refresh` y encola peticiones concurrentes (`failedQueue`) para reejecutarlas automáticamente sin interrumpir la navegación.
- Cierre de sesión limpio y ruteo a `/auth/login` si la renovación del token es rechazada.

### 2. Postulación de Legajo (Wizard de Onboarding)
- **Paso 1 - Perfil (`src/app/onboarding/profile.tsx`)**: Captura de datos personales y teléfono validado con `PhoneInput`, `DatePickerInput` y `Select`.
- **Paso 2 - Vehículo (`src/app/onboarding/vehicle.tsx`)**: Registro de especificaciones del móvil (patente, marca, modelo, año, categoría).
- **Paso 3 - Documentación (`src/app/onboarding/documents.tsx`)**: Subida y verificación de fotos de DNI, licencia, cédula verde/azul, título del vehículo, ITV y póliza de seguro mediante `DocumentScannerModal` (cámara y explorador de archivos).
- **Metadatos Vehiculares Obligatorios**: Validación en cliente de fecha de emisión, vencimiento y número de trámite antes de la carga de títulos e ITV para evitar rechazos del backend.
- **Persistencia de Progreso**: Si el usuario interrumpe el registro, el estado se guarda en `useOnboardingStore` para reanudar sin reescribir datos.

### 3. Sala de Espera (Pending Approval)
- Vista en `src/app/(home)/pending-approval/index.tsx` donde el conductor audita el estado de su postulación.
- Distinción visual clara entre pasos aprobados, pendientes o rechazados con el motivo detallado provisto por compliance.
- Skeletons dedicados (`PendingApprovalSkeleton`) usando `<SkeletonBox />` para evitar pantallas blancas o spinners invasivos durante el chequeo.

### 4. Cita Confirmada y Validación de Entrevista
- Vista en `src/app/(home)/confirmed-appointment/index.tsx` con diseño sobrio y minimalista VIP.
- **Sincronización Automática:** Polling reactivo en segundo plano cada 5s sobre `GET /driver/meeting` vía `useFocusEffect` para detectar al instante la aprobación del administrador en el backoffice sin intervención manual.

### 5. Dashboard del Conductor y Modo Operativo
- Vista principal en `src/app/(home)/index.tsx` con mapa interactivo en modo oscuro full-screen (`CustomMap` vía `react-native-maps`).
- **Orquestación en `(home)/_layout.tsx`**: Guardas de navegación deterministas que validan roles, perfil del chofer (`GET /driver/me`) y estado de reunión para prevenir loops de redirección.
- **Geolocalización en Tiempo Real:** Seguimiento continuo con `expo-location` (`useDriverLocation`) emitiendo coordenadas periódicas a `POST /drivers/me/location`.
- **Conectividad WebSocket:** Integración de `socket.io-client` autenticado por JWT que se activa o suspende según el switch de disponibilidad ("Disponible" / "Desconectado") o viaje activo.
- **Métricas y Seguridad Operativa:** Header superior con ganancias del día (`DashboardCarousel`), botón SOS de emergencias (`EmergencyFAB` y `SecurityModal`) y modal de progreso del chofer (`DriverProgressModal`).

### 6. Despacho y Ciclo de Vida de Viajes en Tiempo Real
- **Recepción y Aceptación de Ofertas**: Escucha de eventos `trip:offer` vía WebSocket gestionados por `useTripSocket` y `useDriverTripStore`. Aceptación directa mediante `POST /rides/:id/accept`.
- **Salas de Socket Dedicadas**: Conexión a la sala `ride:join` al aceptar el viaje, captura de eventos `trip:status_changed` y desuscripción limpia (`ride:leave`) al completar o cancelar.
- **Overlay de Viaje Activo (`ActiveTripOverlay`)**: Panel inferior interactivo colapsable y expandible con gestos (`PanResponder` + `LayoutAnimation`):
  - **Navegación al Origen/Destino**: Enlace rápido a apps externas de navegación (Google Maps / Waze).
  - **Confirmación de Llegada por Deslizamiento (`SwipeToArriveButton`)**: Botón deslizable con haptic feedback que previene pulsaciones accidentales al arribar (`POST /rides/:id/driver-arrived`).
  - **Hoja de Espera (`WaitingBottomSheet`)**: Temporizador de cortesía de 5 minutos (`useCourtesyTimer`) con desglose de preferencias del cliente (clima, música, silencio, equipaje).
  - **Soporte de Pasajeros Tercerizados**: Manejo de viajes corporativos con visualización separada de pasajero y coordinador (`trip.third_party`).
  - **Cancelación Justificada (`driverCancelTrip`)**: Flujo de cancelación con coordenadas y catálogo formal de motivos.
- **Visualización en Mapa (`CustomMap`)**:
  - Marcador de punto de encuentro (Pickup) azul y marcador de destino (Dropoff) oscuro estilo VIP.
  - Trazado de ruta GeoJSON (`Polyline`) con soporte para geometrías `LineString` y `MultiLineString`.
  - Auto-encuadre de cámara (`fitToCoordinates`) englobando conductor, origen y destino.
  - Controles FAB reposicionados dinámicamente mediante resortes de `react-native-reanimated` por encima del panel inferior.

### 7. Bóveda Financiera (Wallet), Configuración de Medio de Cobro y Retiros
- **Módulo de Bóveda en `src/app/(home)/wallet/index.tsx`**: Centro financiero VIP del conductor con visualización en tiempo real de su estado contable (`GET /driver/wallet`).
  - **Saldo Disponible Diferenciado**: Muestra prominentemente el **Saldo Disponible para Retirar** (`available_balance`), contrastado con el saldo total contable (`balance`), límite de deuda (`debt_limit`) y desglose de movimientos (`breakdown`).
  - **Banner de Retiro en Curso (`pending_payout`)**: Notificación visual con estado en tiempo real (`requested` = Pendiente, `approved` = En Proceso) y bloqueo automático del botón de solicitud de retiros mientras exista una abierta.
  - **Accesos Rápidos**: Atajos directos a la configuración de cuenta de cobro y al historial de retiros.
- **Configuración de Medio de Cobro (`src/app/(home)/wallet/payout-method.tsx`)**:
  - Pantalla dedicada con selector CBU / CVU, validación estricta de 22 dígitos numéricos, Alias (6 a 50 car.), Titular y CUIT/DNI.
  - Consulta y precarga de cuenta existente (`GET /driver/payout-method`) y actualización reactiva (`PUT /driver/payout-method`) con React Hook Form + Zod.
- **Solicitud de Retiro (`PayoutModal.tsx`)**:
  - Verificación previa de medio de cobro: si no está configurado, bloquea la acción y guía al conductor a registrarlo.
  - Confirmación visual de destino (Alias y CBU/CVU) antes de confirmar.
  - Validación de monto (mayor a 0 y $\le$ `available_balance`) con atajo de "Máximo".
  - Envío al endpoint oficial `POST /driver/payouts` con `{ amount: string }` y actualización atómica del resumen.
- **Historial de Solicitudes de Retiro (`src/app/(home)/wallet/payout-history.tsx`)**:
  - Lista paginada (`GET /driver/payouts?page=1&limit=20`) con pull-to-refresh y carga infinita.
  - Badges cromáticos por estado (`requested`, `approved`, `paid`, `rejected`).
  - Despliegue de motivo de rechazo (`rejection_reason`), referencia bancaria (`transfer_reference`) y enlace de visualización de comprobante (`receipt_url`).
- **Libro Mayor de Transacciones y Filtros Reactivos**:
  - Consulta de movimientos (`GET /driver/wallet/transactions`) con categorización mediante chips de filtrado:
    - **Todos**: Auditoría cronológica completa del balance.
    - **Ingresos**: Créditos por viajes digitales completados y compensaciones.
    - **Comisiones**: Retenciones y cargos por servicio correspondientes a viajes en efectivo.
    - **Retiros CBU**: Extracciones bancarias solicitadas y su estado de liquidación.
- **Acceso Rápido desde Dashboard**: Píldora de balance en la cabecera superior y tarjeta 1 del carrusel operativo con navegación instantánea a la bóveda y semáforo de estado deudor.

---

## 🏛 Arquitectura del Proyecto

El proyecto sigue una **Arquitectura Hexagonal Simplificada** para desacoplar el motor de negocio de los detalles de infraestructura y presentación:

```text
src/
├── app/                        # Ruteo basado en archivos (Expo Router)
│   ├── (home)/                 # Dashboard operativo y vistas protegidas
│   │   ├── confirmed-appointment/ # Cita de entrevista confirmada y polling
│   │   ├── pending-approval/   # Pantalla de revisión de solicitud
│   │   ├── wallet/             # Bóveda Financiera, retiros y libro mayor
│   │   │   ├── index.tsx       # Resumen de billetera y saldos
│   │   │   ├── payout-method.tsx # Configuración de CBU/CVU y Alias
│   │   │   └── payout-history.tsx # Historial de solicitudes de retiro
│   │   ├── index.tsx           # Dashboard principal con mapa y viajes
│   │   └── _layout.tsx         # Layout con guardas de onboarding y aprobación
│   ├── auth/                   # Autenticación (login, registro)
│   ├── onboarding/             # Wizard de postulación (profile, vehicle, documents)
│   └── _layout.tsx             # Root layout con proveedores globales y ruteo seguro
│
├── core/                       # Reglas de negocio y orquestación
│   ├── api/                    # Cliente HTTP base (Axios / transferApi) con auto-refresh JWT
│   ├── constants/              # Paleta de colores y constantes de tema (theme.ts)
│   ├── location/               # Acciones e interfaces de geolocalización
│   ├── socket/                 # Conexión centralizada Socket.io para tiempo real
│   ├── trip/                   # Casos de uso e interfaces del ciclo de vida del viaje
│   │   ├── actions/            # trip.actions.ts (accept, arrive, start, cancel, complete)
│   │   └── interface/          # trip.interface.ts (Trip, TripOfferPayload, DTOs)
│   └── wallet/                 # Dominio contable y financiero
│       ├── actions/            # wallet.actions.ts (wallet summary, payout methods, payouts history)
│       └── interface/          # wallet.interface.ts (DriverWalletSummary, DriverPayoutMethod, etc.)
│
└── presentation/               # Capa visual (React Native + NativeWind)
    ├── auth/                   # Estado de sesión y almacenamiento seguro (authStorage)
    ├── components/
    │   ├── dashboard/          # ConnectionBottomSheet, DashboardCarousel, EmergencyFAB
    │   ├── maps/               # CustomMap con tema oscuro y controles FAB
    │   ├── trip/               # ActiveTripOverlay, WaitingBottomSheet, SwipeToArriveButton, PinOtpInput
    │   ├── ui/                 # Componentes atómicos (Select, Inputs, SkeletonBox, FAB)
    │   └── wallet/             # Componentes financieros (PayoutModal)
    ├── hooks/                  # useDashboardStats y hooks transversales
    ├── maps/                   # Hooks de ubicación (useDriverLocation) y store de mapa
    ├── onboarding/             # Componentes y stores específicos del onboarding
    ├── providers/              # QueryClientProvider y configuraciones globales
    ├── trip/                   # useDriverTripStore, useTripSocket, useCourtesyTimer
    └── wallet/                 # Capa de presentación financiera
        ├── schemas/            # Schemas Zod de formularios (payout-method.schema.ts)
        └── store/              # useWalletStore (estado global de saldo, cobros e historial)
```

### Reglas Arquitectónicas Innegociables:
- **La UI no consume `transferApi` directamente**: Utiliza hooks de TanStack Query o casos de uso en `core/trip/actions/` o `core/actions/`.
- **Backend como Fuente de Verdad**: Los tipos e interfaces de datos deben respetar fielmente las propiedades de los modelos de Sequelize del backend (`transferblack/backend`).
- **Persistencia Segura**: Tokens en `expo-secure-store`. `AsyncStorage` se reserva exclusivamente para preferencias y estados del viaje (`driver-trip-storage`).

---

## ⚙️ Pila Tecnológica y Decisiones de Diseño

| Tecnología | Rol en el Proyecto | Justificación |
|---|---|---|
| **Expo Router** | Navegación | Ruteo declarativo, tipado y optimizado para deep links. |
| **react-native-maps** | Visualización Geográfica | Renderizado nativo de mapas de alto rendimiento con tema oscuro VIP. |
| **expo-location** | Geolocalización | Captura de coordenadas y suscripción periódica en segundo plano. |
| **socket.io-client** | Comunicación en Tiempo Real | Canal bidireccional de baja latencia para disponibilidad, ofertas y salas de viaje. |
| **Zustand** | Estado Global y UI | Liviano, sin boilerplate, con persistencia selectiva y selectores de renderizado. |
| **TanStack Query** | Caché y Estado Asíncrono | Manejo automático de revalidación, reintentos y estados de carga. |
| **React Hook Form + Zod** | Formularios | Validación reactiva al perder foco (`onTouched`) y tipado inferido seguro. |
| **NativeWind v4** | Estilos | Implementación de Tailwind CSS compilada eficientemente a estilos nativos. |
| **Reanimated** | Animaciones | Ejecución fluida en el UI thread para transiciones, skeletons y reposicionamiento elástico de FABs. |
| **Expo Secure Store** | Almacenamiento seguro | Cifrado a nivel de hardware para tokens sensibles. |

### 💎 UX First: Skeletons > Spinners
- **Prohibido el uso de `ActivityIndicator` como pantalla de carga completa**: Todo componente o pantalla con contenido predecible que consulte datos asíncronos debe implementar su Skeleton correspondiente usando `<SkeletonBox />`.
- Esto garantiza **cero layout shift** y una experiencia percibida como instantánea.
- Los spinners quedan restringidos únicamente a acciones puntuales de botones (ej. durante el submit de un formulario o llamada async individual).

---

## 🎨 Sistema de Diseño y Tokens

### Paleta de Colores
Definida en `tailwind.config.js` y aplicada mediante clases de Tailwind:
- `obsidian`: `#0A0A0C` — Fondo y superficies oscuras primarias (ej: `bg-obsidian`)
- `gold`: `#D4AF37` — Color acento y llamados a la acción principales (ej: `text-gold`, `bg-gold`)
- `platinum`: `#E4E4E5` — Tipografía de alto contraste (ej: `text-platinum`)
- `ash`: `#8E8E93` — Textos secundarios y placeholders (ej: `text-ash`)
- `charcoal`: `#2C2C2E` — Bordes, divisores y tarjetas elevadas (ej: `bg-charcoal`, `border-charcoal`)

*Nota: No utilizar códigos hexadecimales sueltos en el código.*

### Tipografía (Montserrat)
Tipografía oficial en todos los módulos con sus variantes:
- `font-montserrat`: Regular (400)
- `font-montserrat-medium`: Medium (500)
- `font-montserrat-semibold`: SemiBold (600)
- `font-montserrat-bold`: Bold (700)

---

## 🔍 Calidad de Código y Convenciones

Antes de subir cambios o generar una PR, se debe verificar que no existan errores de tipado ni de estilo:

```bash
# Comprobación de tipos estricta con TypeScript
npx tsc --noEmit

# Análisis estático con ESLint
npm run lint
```

- **TypeScript Estricto**: No usar `any`. Toda interfaz de API o componente debe estar tipada.
- **Manejo de Errores**: Todo mensaje de error que llegue al conductor debe expresarse en español claro y comprensible, evitando tecnicismos.
- **Accesibilidad**: Botones e iconos interactivos deben contar con `accessibilityLabel` y cumplir con un área táctil mínima de 44x44 pt.

> ✅ **Baseline del lint**: `npm run lint` termina con **0 errores y 0 warnings** en `src/`, y sale con código 0. El typecheck también está limpio (`tsc --noEmit` sale con 0) y `npx vitest` corre 28 tests en 4 archivos. El detalle de lo que se corrigió está en [`context.md`](./context.md) → *Tooling y Calidad de Código*.
>
> Ojo: `npm run lint` solo mira `src/`. Los scripts de `scripts/` no entran, así que si los tocás corré `npx eslint scripts/<archivo>` aparte. Ahí queda 1 error preexistente: `get_driver_coords.mjs` importa `pg`, que no está declarado en `package.json`.

---

## ✅ Sincronización de Viaje Activo y Cola de Ofertas

### 1. Sincronización automática de viaje activo (`GET /driver/me/active-trip`)
- **Endpoint**: `GET /api/v1/driver/me/active-trip` protegido con `authorizeRoles('driver')`.
- **Integración frontend**:
  - Implementada la acción `getActiveTrip()` en [`trip.actions.ts`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/core/trip/actions/trip.actions.ts).
  - El hook [`useActiveTripSync.ts`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/presentation/trip/hooks/useActiveTripSync.ts) se ejecuta al montar el Dashboard y tras cada reconexión del WebSocket (`socket.on('connect')`).
  - **Rehidratación**: Si el backend devuelve un viaje activo (`assigned`, `driver_arriving`, `driver_arrived` o `in_progress`), la app consulta `getTripById` para obtener geometría, mapa y chat, montando inmediatamente `ActiveTripOverlay`.
  - **Limpieza de fantasmas**: Si el backend devuelve `trip: null` y la app tenía un viaje en curso en memoria local, este se limpia automáticamente para liberar al chofer y evitar errores 409 (`DRIVER_HAS_ACTIVE_TRIP`).

### 2. Cola FIFO de Ofertas de Viaje
- **Problema previo**: Cuando varios viajes estaban en estado `searching` en la misma zona, el backend emitía múltiples eventos `trip:offer` casi simultáneos, pisando la oferta visible antes de que el conductor pudiera responderla.
- **Solución implementada**:
  - Cola FIFO en [`useDriverTripStore.ts`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/presentation/trip/store/useDriverTripStore.ts) (`offerQueue`).
  - Deduplicación estricta por `tripId`.
  - Al rechazar una oferta o expirar el timer, se presenta la siguiente con sus **15 segundos completos** (`ttlSeconds`).
  - Contador visual `+N en espera` en [`ConnectionBottomSheet.tsx`](file:///c:/Users/Juampi/Downloads/Programacion/react-native/freelance/transferblack-conductor/src/presentation/components/dashboard/ConnectionBottomSheet.tsx).
  - Vaciado total de la cola al aceptar un viaje o apagar disponibilidad.

### Mientras tanto: script de rescate
`scripts/complete_stuck_trip.mjs` (**no se ejecutó automáticamente**) loguea al conductor dueño del viaje y dispara el mismo `POST /rides/:id/complete` que usaría la app, previa confirmación interactiva.

```bash
node scripts/complete_stuck_trip.mjs
node scripts/complete_stuck_trip.mjs --trip-id <uuid> --public-code <code>
node scripts/complete_stuck_trip.mjs --yes
```

Hace preflight del estado real del viaje, verifica que el conductor autenticado sea el dueño, avisa si el pago es `voucher` (que se consume al completar) y vuelve a leer el viaje al final para verificar. Ojo: `in_progress` **no** se puede cancelar desde el chofer (`canDriverCancelTrip` lo excluye), así que completar es la única salida.

---

## 🤝 Guías de Contribución y Agentes de IA

Si colaborás en este repositorio o interactuás como agente de IA:
1. Consultá [`context.md`](./context.md) para el estado actual de las funcionalidades, pantallas y contratos de datos.
2. Respetá las directivas de [`AGENTS.md`](./AGENTS.md) sobre sincronización de interfaces, restricciones de dependencias y el estándar de UX.
