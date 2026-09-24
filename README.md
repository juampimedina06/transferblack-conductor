# TransferBlack Conductor (Driver App) 🚗

Aplicación móvil para conductores de **TransferBlack**, desarrollada con **React Native**, **Expo**, **TypeScript** y estilada con **NativeWind (Tailwind CSS)** bajo una arquitectura hexagonal simplificada.

---

## 🛠 Requisitos del Entorno

Para asegurar consistencia entre ambos desarrolladores del proyecto, se recomienda utilizar el siguiente entorno:

- **Node.js**: `v20.x` o superior (LTS)
- **npm**: `v10.x` o superior
- **Git**: versión actualizada
- **Expo CLI**: `npx expo`
- **JDK (Java Development Kit)**: JDK 17 (para compilaciones nativas Android)
- **Android Studio & SDK**: Android SDK Platform 34+ (si se ejecutan emuladores o builds locales)
- **Expo Go**: Para pruebas rápidas en dispositivo físico

---

## 🚀 Scripts y Ejecución

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor de desarrollo (Expo Router con limpieza de caché):**
   ```bash
   npx expo start -c
   ```

3. **Ejecutar en plataformas específicas:**
   - **Android**: presionar `a` en la terminal de Expo o ejecutar `npx expo run:android`
   - **iOS**: presionar `i` en la terminal de Expo o ejecutar `npx expo run:ios`
   - **Web**: presionar `w` en la terminal de Expo

---

## 🏛 Arquitectura del Proyecto

El proyecto sigue una **Arquitectura Hexagonal Simplificada** para separar responsabilidades y permitir un desarrollo desacoplado y mantenible:

```text
src/
├── core/                   # Lógica central del negocio y operaciones de la app
│   ├── actions/            # Casos de uso y acciones de negocio
│   └── api/                # Cliente HTTP base (Axios / transferApi)
│
├── infrastructure/         # Adaptadores técnicos y fuentes externas
│   ├── interfaces/         # Tipos y DTOs provenientes de las APIs
│   └── mappers/            # Transformadores de DTOs externos a modelos de la app
│
└── presentation/           # Interfaz de usuario (UI)
    ├── components/         # Componentes visuales reutilizables
    ├── hooks/              # Custom hooks vinculados a la presentación
    └── screens/            # Pantallas de la aplicación
```

### Reglas Clave de Arquitectura:
- **La UI (`presentation/`) NO debe importar directamente `transferApi`**: debe consumir las funciones expuestas en `core/actions/`.
- **`infrastructure/`** se encarga de tipar y mapear las respuestas de la API antes de que lleguen a la lógica del negocio.

---

## 🎨 Design Tokens

### Colores
Configurados como clases de utilidad en Tailwind:
- `obsidian`: `#0A0A0C` (ej: `bg-obsidian`)
- `gold`: `#D4AF37` (ej: `text-gold`, `bg-gold`)
- `platinum`: `#E4E4E5` (ej: `text-platinum`)
- `ash`: `#8E8E93` (ej: `text-ash`)
- `charcoal`: `#2C2C2E` (ej: `border-charcoal`, `bg-charcoal`)

*Nota: No utilizar los valores hexadecimales directamente en pantallas o componentes.*

### Tipografía (Montserrat)
Fuente oficial única del proyecto con soporte para pesos:
- **Regular** (`400`)
- **Medium** (`500`)
- **SemiBold** (`600`)
- **Bold** (`700`)

### Jerarquía Tipográfica (Clases Globales)
- `h1`: `text-4xl md:text-5xl font-montserrat-bold` (36–48px, Bold)
- `h2`: `text-2xl md:text-3xl font-montserrat-bold` (24–30px, Bold)
- `h3`: `text-lg md:text-xl font-montserrat-semibold` (18–20px, SemiBold)
- `body-large`: `text-base font-montserrat-medium` (16px, Medium)
- `body-large-bold`: `text-base font-montserrat-bold` (16px, Bold)
- `body-regular`: `text-sm font-montserrat` (14px, Regular)
- `caption`: `text-xs font-montserrat` (12px, Regular)
- `caption-medium`: `text-xs font-montserrat-medium` (12px, Medium)

---

## ⚙️ Stack y Decisiones Técnicas

### Estado Global y Mutaciones
- **Zustand**: Utilizado para el estado global de la app (ej: `useAuthStore`, `useOnboardingStore`). Evitar el prop-drilling.
- **TanStack Query (React Query)**: Para el manejo de llamadas a la API, caché de solicitudes, y mutaciones de datos.
- **Axios**: Cliente HTTP configurado con interceptores para manejar tokens e invalidación de sesión.

### Loading States (UX Premium)
- **Skeletons > Spinners**: Está PROHIBIDO usar `ActivityIndicator` (spinners) como estado de carga principal para pantallas o listas.
- Cada vista que dependa de una llamada asíncrona debe implementar un Skeleton usando `<SkeletonBox />` (basado en `react-native-reanimated`) que replique la estructura final de la UI para evitar parpadeos y *layout shifts*.
- Los spinners (`ActivityIndicator`) están reservados únicamente para acciones cortas (como presionar el botón de "Guardar" o "Subir archivo").

### Formularios y Validación
- **React Hook Form**: Gestión del estado interno de los formularios.
- **Zod**: Esquemas de validación estrictos. Todo payload enviado desde la app debe estar fuertemente tipado e inferido a partir de esquemas de Zod que **deben coincidir exactamente** con las validaciones del backend.

---

## 🤝 Contribución y Guía para Agentes (IA)
Si sos un desarrollador o agente de IA trabajando en este proyecto, asegurate de leer **ambos** archivos de reglas antes de proponer cambios:
1. `AGENTS.md`: Contiene las reglas completas de arquitectura, UX, y comportamiento que debés seguir al pie de la letra.
2. `context.md`: Contexto rápido y fuente de verdad técnica de alto nivel de TransferBlack.
