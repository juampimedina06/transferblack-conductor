import { Alert, NativeModules, Platform } from 'react-native';
import type { TripOfferPayload } from '@/core/trip/interface/trip.interface';

export interface DriverOverlayPayload {
  offerId: string;
  tripId: string;
  price: number;
  fare: number;
  origin: string;
  destination: string;
  ttlSeconds: number;
}

interface DriverOverlayNativeModule {
  canDrawOverlays?: () => Promise<boolean>;
  requestOverlayPermission?: () => Promise<boolean>;
  showOfferOverlay?: (payload: DriverOverlayPayload) => Promise<boolean>;
  hideOfferOverlay?: () => Promise<boolean>;
}

const DEFAULT_OVERLAY_TTL_SECONDS = 20;
let hasPromptedOverlayPermissionThisSession = false;

function getNativeDriverOverlay(): DriverOverlayNativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  const nativeModulesRecord = NativeModules as Record<string, unknown> | undefined;
  const candidate = nativeModulesRecord?.DriverOverlay;
  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  return candidate as DriverOverlayNativeModule;
}

/**
 * Reinicia el estado interno de aviso por sesión (solo para pruebas unitarias).
 */
export function resetOverlayPromptStateForTests(): void {
  hasPromptedOverlayPermissionThisSession = false;
}

/**
 * Verifica si la aplicación tiene permiso para mostrar ventanas flotantes sobre otras apps en Android.
 */
export async function canDrawOverlays(): Promise<boolean> {
  const nativeModule = getNativeDriverOverlay();
  if (!nativeModule || typeof nativeModule.canDrawOverlays !== 'function') {
    return false;
  }

  try {
    return Boolean(await nativeModule.canDrawOverlays());
  } catch {
    return false;
  }
}

/**
 * Abre la pantalla de ajustes de Android para habilitar "Mostrar sobre otras apps".
 */
export async function requestOverlayPermission(): Promise<boolean> {
  const nativeModule = getNativeDriverOverlay();
  if (!nativeModule || typeof nativeModule.requestOverlayPermission !== 'function') {
    return false;
  }

  try {
    return Boolean(await nativeModule.requestOverlayPermission());
  } catch {
    return false;
  }
}

/**
 * Si falta permiso de ventana flotante en Android, muestra un aviso explicativo una vez por sesión
 * antes de derivar al usuario a la configuración del sistema.
 */
export async function ensureOverlayPermissionWithPrompt(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const allowed = await canDrawOverlays();
  if (allowed) {
    return true;
  }

  if (hasPromptedOverlayPermissionThisSession) {
    return false;
  }

  hasPromptedOverlayPermissionThisSession = true;

  return new Promise<boolean>((resolve) => {
    let isSettled = false;
    const settle = (value: boolean) => {
      if (!isSettled) {
        isSettled = true;
        resolve(value);
      }
    };

    Alert.alert(
      'Mostrar ofertas sobre otras apps',
      'Para ver una burbuja flotante cuando entra un viaje mientras usás Waze o WhatsApp (estilo DiDi), habilitá el permiso "Mostrar sobre otras apps".',
      [
        {
          text: 'Ahora no',
          style: 'cancel',
          onPress: () => settle(false),
        },
        {
          text: 'Configurar',
          onPress: () => {
            void requestOverlayPermission()
              .then(settle)
              .catch(() => settle(false));
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => settle(false),
      }
    );
  });
}

/**
 * Muestra la burbuja flotante nativa con los datos de la oferta entrante en Android.
 */
export async function showOfferOverlay(offer: TripOfferPayload): Promise<boolean> {
  const nativeModule = getNativeDriverOverlay();
  if (!nativeModule || typeof nativeModule.showOfferOverlay !== 'function') {
    return false;
  }

  let ttlSeconds = offer.ttlSeconds > 0 ? offer.ttlSeconds : DEFAULT_OVERLAY_TTL_SECONDS;
  if (offer.expiresAt) {
    const expiresMs = new Date(offer.expiresAt).getTime();
    if (!Number.isNaN(expiresMs)) {
      const remainingSeconds = Math.floor((expiresMs - Date.now()) / 1000);
      if (remainingSeconds <= 0) {
        return false;
      }
      ttlSeconds =
        offer.ttlSeconds > 0
          ? Math.min(offer.ttlSeconds, remainingSeconds)
          : remainingSeconds;
    }
  }

  const totalFare = Number(offer.fare?.totalFare || offer.fare?.netEarnings || 0);
  const netEarnings = Number(offer.fare?.netEarnings || totalFare);

  try {
    return Boolean(
      await nativeModule.showOfferOverlay({
        offerId: offer.offerId,
        tripId: offer.tripId,
        price: Number.isFinite(totalFare) ? totalFare : 0,
        fare: Number.isFinite(netEarnings) ? netEarnings : 0,
        origin: offer.pickup?.address || 'Origen indicado en app',
        destination: offer.dropoff?.address || 'Destino indicado en app',
        ttlSeconds,
      })
    );
  } catch {
    return false;
  }
}

/**
 * Oculta la burbuja flotante nativa si estuviera visible.
 */
export async function hideOfferOverlay(): Promise<void> {
  const nativeModule = getNativeDriverOverlay();
  if (!nativeModule || typeof nativeModule.hideOfferOverlay !== 'function') {
    return;
  }

  try {
    await nativeModule.hideOfferOverlay();
  } catch {
    // Evitar errores no manejados al limpiar el overlay
  }
}

export const driverOverlay = {
  canDrawOverlays,
  requestOverlayPermission,
  ensureOverlayPermissionWithPrompt,
  showOfferOverlay,
  hideOfferOverlay,
  resetOverlayPromptStateForTests,
};
