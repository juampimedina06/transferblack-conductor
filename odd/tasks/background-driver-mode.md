# Feature: Background Driver Mode (DiDi-Style Operation)

## Objective
Enable reliable background operation for the TransferBlack Driver App when the driver is `available` (online) or on an active trip, ensuring continuous GPS reporting via Foreground Service, high-priority push wake-up with a floating overlay bubble on Android (and standard notification with attempted time-sensitive permission on iOS), a heartbeat-aware Socket.IO grace period in the backend, and instant REST + WebSocket reconciliation upon returning to the foreground.

## Problem & Why
When a driver goes `available` and minimizes the app (e.g., to use Waze or WhatsApp) or turns off the screen:
1. The OS suspends the JS thread and disconnects the Socket.IO connection, halting `watchPositionAsync` and `setInterval` telemetry pings.
2. After `SOCKET_DISCONNECT_GRACE_MS` (45s), `socket-server.ts` transitions the driver to `OFFLINE` even if the driver is still working in the background.
3. Incoming trip offers (`trip:offer`) cannot reach the suspended WebSocket, and current push handling lacks a floating overlay bubble (`SYSTEM_ALERT_WINDOW`) on Android, lacks `aps.alert` on iOS, and has no REST endpoint to validate whether an offer is still pending when returning to the app.

## Scope & Constraints
- **Frontend Repository**: `c:\Users\Juampi\Downloads\Programacion\react-native\freelance\transferblack-conductor` (branch: `feature/segundoPlano`, base commit: `a833e607a7c3392405ce14c2775b7e0468a50d83`).
- **Backend Repository**: `c:\Users\Juampi\Downloads\Programacion\react-native\freelance\Transfer-Black\backend` (branch: `feature/segundoPlano`, base commit: `2bcf78cd8c7def6ff3d4bee09d0acce738f6f1c9`).
- **No new npm dependencies**: Implement using existing packages (`expo-location`, `expo-task-manager`, `expo-notifications`, `socket.io-client`) plus a native Kotlin module (`DriverOverlayModule`) in `android/` with a Config Plugin (`plugins/withDriverOverlay.js`).
- **iOS Notification Policy**: Attempt to request `allowTimeSensitive: true` on iOS client permissions with a clear comment that the entitlement is not active yet in Apple Developer, and send standard `aps.alert` + `sound: 'default'` + `content-available: 1` from the backend so iPhones notify reliably without requiring the active entitlement.
- **TDD & Verification Configuration**:
  - TDD Mode: `off` (standard functional verification + Vitest unit tests for new logic; source: project default, no `strict_tdd` configured).
  - Test Runner (Frontend): `npx vitest run`, `npx tsc --noEmit`, `npx expo lint`.
  - Test Runner (Backend): `npx vitest run`, `npx tsc --noEmit`.
  - Delivery Strategy: `ask-on-risk` (forecast: ~650 authored lines split across 2 repositories; each repository stays around ~300–380 lines per repo branch).
  - RDD State: `on` (global default).

## Actionable Task Checklist

- [x] **TASK-1 (Backend)**: REST background location endpoint (`POST /api/v1/driver/me/location` & `/api/v1/drivers/me/location`), HTTP heartbeat awareness in `socket-server.ts` grace period (45–60s), pending offers validation endpoint (`GET /api/v1/driver/me/offers/pending`), and high-priority FCM/APNs push payload improvements (`NEW_TRIP_OFFER` / `trip:offer`, dynamic TTL, iOS `aps.alert` + `sound: 'default'`).
  - **Route**: `delegated` (Trigger: writer trigger — touches 4+ non-trivial backend files + tests; model: `pro`).
  - **Acceptance Criteria**:
    - `POST /api/v1/driver/me/location` (and `/api/v1/drivers/me/location`) authenticates driver, updates location via `LocationService.updateDriverLocation`, records HTTP heartbeat timestamp, and refreshes availability if needed.
    - `socket-server.ts` checks recent HTTP location heartbeat before marking a disconnected driver `OFFLINE` when the 45–60s grace timer fires.
    - `GET /api/v1/driver/me/offers/pending` returns active pending offers (`expires_at > NOW()`) formatted for the driver app along with `serverNow`.
    - `Outbox.Worker.ts` and `push-notification.service.ts` include `eventType: 'NEW_TRIP_OFFER'`, `type: 'trip:offer'`, `fare`, `price`, `origin`, `destination`, `expiresAt`, dynamic `ttlSeconds`, and valid iOS `aps.alert` + `sound: 'default'` + `content-available: 1`.
  - **Checks**: `npx tsc --noEmit` (0 errors) and `npx vitest run` (4 target test files / 27 tests passed; 16 regression files / 113 tests passed) in `../Transfer-Black/backend`.
  - **Evidence**: Commit `bd4d8b9d20b99b8ed03d41d24e1cd371c2bde117` on `feature/segundoPlano` (`../Transfer-Black/backend`). RDD assessment: `unavailable` (`antigravity` runtime not eligible for immutable receipt review).

- [x] **TASK-2 (Mobile — Background Location & Foreground Service)**: Configure `app.json` (`isAndroidForegroundServiceEnabled`, `isIosBackgroundLocationEnabled`, `SYSTEM_ALERT_WINDOW`), progressive background location permissions, and `TRANSFERBLACK_BACKGROUND_LOCATION_TASK` with `Location.startLocationUpdatesAsync` + Android Foreground Service posting to `/driver/me/location`.
  - **Route**: `delegated` (Trigger: writer trigger — touches 4+ non-trivial frontend files + tests; model: `pro`).
  - **Acceptance Criteria**:
    - `app.json` includes `isAndroidForegroundServiceEnabled: true`, `isIosBackgroundLocationEnabled: true`, and `android.permission.SYSTEM_ALERT_WINDOW`.
    - `permissions.actions.ts` requests foreground permission first, shows a clear Spanish rationale before requesting background permission, and offers `Linking.openSettings()` if denied.
    - `backgroundLocationTask.ts` defines `TRANSFERBLACK_BACKGROUND_LOCATION_TASK` at module load, updates `useLocationStore`, and posts coordinates to `POST /driver/me/location` when `isAvailable` or `activeTrip` is active.
    - Switching availability to `available` starts the Foreground Service ("Transfer Black: Estás en línea recibiendo viajes") and switching to `offline` (with no active trip) or logging out stops it.
  - **Checks**: `npx tsc --noEmit` (0 errors), `npx expo lint` (0 errors), and `npx vitest run __tests__/location/backgroundLocationTask.test.ts` (23/23 tests passed).
  - **Evidence**: Commit `e151f1060a55367c7b605752487939d22ecb5c50` on `feature/segundoPlano` (`transferblack-conductor`). RDD assessment: `unavailable` (`antigravity` runtime not eligible for immutable receipt review).

- [x] **TASK-3 (Mobile — Android Floating Bubble Overlay, High-Priority Push Wake-up & iOS Time-Sensitive Attempt)**: Native Kotlin `DriverOverlayModule` (`SYSTEM_ALERT_WINDOW` floating bubble over other apps + `ACTION_MANAGE_OVERLAY_PERMISSION` flow), Config Plugin `plugins/withDriverOverlay.js`, TypeScript bridge `driverOverlay.ts`, and background push wake-up integration.
  - **Route**: `delegated` (Trigger: writer trigger — touches native Kotlin files, config plugin, push service, and parser + tests; model: `pro`).
  - **Acceptance Criteria**:
    - Native Kotlin module `DriverOverlayModule` + `DriverOverlayPackage` registered in `MainApplication.kt` and backed by `plugins/withDriverOverlay.js` + `plugins/android/`.
    - Exposes `canDrawOverlays()`, `requestOverlayPermission()`, `showOfferOverlay(payload)`, and `hideOfferOverlay()`.
    - When driver goes `available` on Android for the first time without overlay permission, shows a clear Spanish explanation prompt to enable "Mostrar sobre otras apps" (`ACTION_MANAGE_OVERLAY_PERMISSION`).
    - `pushOfferParser.ts` accepts both `type: 'trip:offer'` and `type: 'NEW_TRIP_OFFER'` and parses `fare` or `price`.
    - `pushNotificationService.ts` attempts `allowTimeSensitive: true` on iOS (commented as inactive entitlement fallback to standard notification), uses `channelId: TRIP_OFFERS_CHANNEL_ID` on Android local wake-up notification, triggers `driverOverlay.showOfferOverlay` in background, and hides the overlay on `trip:offer:cancel` or offer dismissal.
  - **Checks**: `npx tsc --noEmit` (0 errors), `npx expo lint` (0 errors), and `npx vitest run __tests__/push/driverOverlayAndPush.test.ts` (16/16 tests passed; 240/240 total suite tests passed).
  - **Evidence**: Commit `33e0a6f2590f66c90d4cb24da58aa7351c875373` on `feature/segundoPlano` (`transferblack-conductor`). RDD assessment: `unavailable` (`antigravity` runtime not eligible for immutable receipt review).

- [x] **TASK-4 (Mobile — AppState Foreground Resync, REST Offer Validation & Deep Linking)**: Implement `getPendingDriverOffers` REST action and `useForegroundResync` hook to reconnect Socket.IO, hide floating overlay, reconcile active trip, and validate pending offers via REST upon returning to foreground or tapping the floating bubble / notification.
  - **Route**: `delegated` (Trigger: writer trigger — touches trip actions, resync hook, dashboard screen, and tests; model: `pro`).
  - **Acceptance Criteria**:
    - `getPendingDriverOffers()` calls `GET /driver/me/offers/pending`.
    - `useForegroundResync` listens to `AppState` transitions (`background`/`inactive` -> `active`) and incoming deep links (`transferblackconductor://`), dismisses the floating overlay, reconnects `socket` if disconnected while `isAvailable || activeTrip`, runs `syncActiveTripState()`, and reconciles `useDriverTripStore` offers against `getPendingDriverOffers()` so expired/taken offers are never shown.
    - Integrated into `src/app/(home)/index.tsx`.
  - **Checks**: `npx tsc --noEmit` (0 errors), `npx expo lint` (0 errors), and `npx vitest run __tests__/trip/useForegroundResync.test.ts` (19/19 tests passed; 34 test files / 259 total tests passed).
  - **Evidence**: Commit `be387f0e0af9e79d978f4fcc4578f0e1672eb1bd` on `feature/segundoPlano` (`transferblack-conductor`). RDD assessment: `unavailable` (`antigravity` runtime not eligible for immutable receipt review).

## Progress & Next Step
- **Current Status**: All 4 ODD tasks completed, verified, and committed on `feature/segundoPlano` in both backend and frontend repositories.
- **Next Step**: Ready for native development build (`npx expo run:android` / `eas build --profile development`) and user `git push` / PR review.
