# TransferBlack Conductor (Driver App) 🚗

Aplicación móvil oficial para conductores de **TransferBlack**, construida sobre **React Native** con **Expo**, **TypeScript**, **NativeWind (Tailwind CSS v3)** y **React Native Reanimated**.

El proyecto implementa una arquitectura desacoplada y orientada a capas, priorizando la resiliencia en red, validación estricta de datos con el backend y una experiencia de usuario (UX) fluida y premium.

---

## 📋 Tabla de Contenidos
- [Requisitos del Entorno](#-requisitos-del-entorno)
- [Instalación y Ejecución](#-instalación-y-ejecución)
- [Flujos Principales Implementados](#-flujos-principales-implementados)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Pila Tecnológica y Decisiones de Diseño](#-pila-tecnológica-y-decisiones-de-diseño)
- [Sistema de Diseño y Tokens](#-sistema-de-diseño-y-tokens)
- [Calidad de Código y Convenciones](#-calidad-de-código-y-convenciones)
- [Guías de Contribución y Agentes de IA](#-guías-de-contribución-y-agentes-de-ia)

---

## 🛠 Requisitos del Entorno

Para asegurar consistencia entre el equipo y evitar desfasajes en el entorno nativo:

- **Node.js**: `v20.x` o superior (LTS recomendado)
- **npm**: `v10.x` o superior
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
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
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

---

## 📱 Flujos Principales Implementados

### 1. Autenticación y Gestión de Sesión
- Manejo centralizado del estado de sesión mediante `useAuthStore` (Zustand).
- **Seguridad primero**: Almacenamiento de tokens (Access y Refresh JWT) en `expo-secure-store` (nunca en AsyncStorage).
- Interceptores de Axios para renovación transparente de tokens y ruteo automático ante sesiones vencidas.

### 2. Postulación de Legajo (Wizard de Onboarding)
- **Paso 1 - Perfil (`src/app/onboarding/profile.tsx`)**: Captura de datos personales y teléfono validado con `PhoneInput`, `DatePickerInput` y `Select`.
- **Paso 2 - Vehículo (`src/app/onboarding/vehicle.tsx`)**: Registro de especificaciones del móvil (patente, marca, modelo, año, categoría).
- **Paso 3 - Documentación (`src/app/onboarding/documents.tsx`)**: Subida y verificación de fotos de DNI, licencia, cédula verde/azul, título del vehículo, ITV y póliza de seguro mediante `DocumentScannerModal` (cámara y explorador de archivos).
- **Persistencia de Progreso**: Si el usuario interrumpe el registro, el estado se guarda en `useOnboardingStore` para reanudar sin reescribir datos.

### 3. Sala de Espera (Pending Approval)
- Vista en `src/app/pending-approval/index.tsx` donde el conductor consulta el estado de su postulación.
- Incluye opciones de contacto directo con soporte y actualización manual (*pull-to-refresh* o botón de reintento).
- Skeletons dedicados para eliminar pantallas en blanco o spinners invasivos durante el chequeo de estado.

### 4. Cita Confirmada y Validación de Entrevista
- Vista en `src/app/confirmed-appointment/index.tsx` con diseño sobrio y minimalista VIP.
- **Sincronización Automática:** Polling reactivo en segundo plano cada 5s sobre `GET /driver/meeting` vía `useFocusEffect` para detectar al instante la aprobación del administrador en el backoffice sin intervención manual.

### 5. Dashboard del Conductor y Modo Operativo
- Vista principal en `src/app/(home)/index.tsx` con mapa interactivo en modo oscuro full-screen (`CustomMap` vía `react-native-maps`).
- **Geolocalización en Tiempo Real:** Seguimiento continuo con `expo-location` (`useDriverLocation`) emitiendo coordenadas periódicas a `POST /drivers/me/location`.
- **Conectividad WebSocket:** Integración de `socket.io-client` autenticado por JWT que se activa o suspende según el switch de disponibilidad ("Disponible" / "Desconectado").
- **Guardas de Navegación Deterministas:** Sincronización en `(home)/_layout.tsx` consultando directamente `GET /driver/me` para evitar loops de redirección.

---

## 🏛 Arquitectura del Proyecto

El proyecto sigue una **Arquitectura Hexagonal Simplificada** para desacoplar el motor de negocio de los detalles de infraestructura y presentación:

```text
src/
├── app/                        # Ruteo basado en archivos (Expo Router)
│   ├── (home)/                 # Dashboard operativo del conductor con mapa
│   ├── confirmed-appointment/  # Cita de entrevista confirmada y polling
│   ├── onboarding/             # Wizard de postulación (profile, vehicle, documents)
│   ├── pending-approval/       # Pantalla de revisión de solicitud
│   └── _layout.tsx             # Root layout con proveedores globales y ruteo seguro
│
├── core/                       # Reglas de negocio y orquestación
│   ├── actions/                # Casos de uso desacoplados de la UI
│   ├── api/                    # Cliente HTTP base (Axios / transferApi)
│   ├── constants/              # Paleta de colores y constantes de tema
│   └── socket/                 # Conexión centralizada Socket.io para tiempo real
│
├── infrastructure/             # Adaptadores de comunicación externa
│   ├── interfaces/             # Modelos y DTOs tipados exactamente con el backend
│   └── mappers/                # Transformadores de datos DTO a dominio
│
└── presentation/               # Capa visual (React Native + NativeWind)
    ├── auth/                   # Estado de sesión y almacenamiento seguro
    ├── components/
    │   ├── maps/               # CustomMap con dark theme y controles FAB
    │   └── ui/                 # Componentes atómicos (Select, Inputs, SkeletonBox, FAB)
    ├── hooks/                  # useDriverLocation y hooks transversales
    ├── onboarding/             # Componentes y stores específicos del onboarding
    └── providers/              # QueryClientProvider y configuraciones globales
```

### Reglas Arquitectónicas Innegociables:
- **La UI no consume `transferApi` directamente**: Utiliza hooks de TanStack Query o casos de uso en `core/actions/`.
- **Backend como Fuente de Verdad**: Los tipos en `infrastructure/interfaces/` deben respetar fielmente las propiedades de los modelos de Sequelize del backend (`transferblack/backend`).

---

## ⚙️ Pila Tecnológica y Decisiones de Diseño

| Tecnología | Rol en el Proyecto | Justificación |
|---|---|---|
| **Expo Router** | Navegación | Ruteo declarativo, tipado y optimizado para deep links. |
| **react-native-maps** | Visualización Geográfica | Renderizado nativo de mapas de alto rendimiento con tema oscuro VIP. |
| **expo-location** | Geolocalización | Captura de coordenadas y suscripción periódica en segundo plano. |
| **socket.io-client** | Comunicación en Tiempo Real | Canal bidireccional de baja latencia para disponibilidad y despacho. |
| **Zustand** | Estado Global y UI | Liviano, sin boilerplate, con selectores para evitar re-renders. |
| **TanStack Query** | Caché y Estado Asíncrono | Manejo automático de revalidación, reintentos y estados de carga. |
| **React Hook Form + Zod** | Formularios | Validación reactiva al perder foco (`onTouched`) y tipado inferido seguro. |
| **NativeWind v4** | Estilos | Implementación de Tailwind CSS compilada eficientemente a estilos de React Native. |
| **Reanimated** | Animaciones | Ejecución fluida en el UI thread para transiciones y skeletons. |
| **Expo Secure Store** | Almacenamiento seguro | Cifrado a nivel de hardware para tokens sensibles. |

### 💎 UX First: Skeletons > Spinners
- **Prohibido el uso de `ActivityIndicator` como pantalla de carga completa**: Todo componente o pantalla con contenido predecible que consulte datos asíncronos debe implementar su Skeleton correspondiente usando `<SkeletonBox />`.
- Esto garantiza **cero layout shift** y una experiencia percibida como instantánea.
- Los spinners quedan restringidos únicamente a acciones puntuales de botones (ej. durante el submit de un formulario).

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

---

## 🤝 Guías de Contribución y Agentes de IA

Si colaborás en este repositorio o interactuás como agente de IA:
1. Consultá [`context.md`](./context.md) para el estado actual de las funcionalidades, pantallas y contratos de datos.
2. Respetá las directivas de [`AGENTS.md`](./AGENTS.md) sobre sincronización de interfaces, restricciones de dependencias y el estándar de UX.
