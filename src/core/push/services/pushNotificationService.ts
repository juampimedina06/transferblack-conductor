import { Platform } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';
import * as Device from 'expo-device';
import type * as ExpoNotifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { registerDriverPushToken, revokeDriverPushToken } from '../actions/pushToken.actions';
import {
  isPushDocumentEvent,
  isPushTripCancel,
  parsePushTripOffer,
} from '../utils/pushOfferParser';
import { driverOverlay } from '../../overlay/driverOverlay';
import { offerAlarmService } from '../../../presentation/trip/services/offerAlarmService';
import { useDriverTripStore } from '../../../presentation/trip/store/useDriverTripStore';
import { useDriverStatusStore } from '../../../presentation/driver/store/useDriverStatusStore';

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_TRIP_OFFER_TASK';
export const TRIP_OFFERS_CHANNEL_ID = 'trip-offers';

type ExtendedIosNotificationPermissionsRequest =
  ExpoNotifications.IosNotificationPermissionsRequest & {
    allowTimeSensitive?: boolean;
  };

interface NotificationSubscription {
  remove?: () => void;
}

const isExpoGoOnAndroid =
  Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo;

let Notifications: typeof ExpoNotifications | null = null;

/**
 * Permite inyectar un mock de expo-notifications en pruebas unitarias donde require() nativo no pasa por Vite.
 */
export function setNotificationsModuleForTests(
  notificationsModule: typeof ExpoNotifications | null
): void {
  Notifications = notificationsModule;
}

if (!isExpoGoOnAndroid) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
  } catch (err) {
    console.warn('⚠️ [PushNotificationService] expo-notifications no disponible:', err);
  }
}

// Handler global para notificaciones en foreground
if (Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: Notifications?.AndroidNotificationPriority?.MAX,
        };
      },
    });
  } catch (err) {
    console.warn('⚠️ [PushNotificationService] Error configurando notificationHandler:', err);
  }
}

function extractRawNotificationPayload(taskData: unknown): Record<string, unknown> | null {
  if (!taskData || typeof taskData !== 'object') {
    return null;
  }

  const payload = taskData as Record<string, unknown>;
  const notification = payload.notification as Record<string, unknown> | undefined;
  const request = notification?.request as Record<string, unknown> | undefined;
  const content = request?.content as Record<string, unknown> | undefined;

  const candidate =
    (content?.data as Record<string, unknown> | undefined) ??
    (notification?.data as Record<string, unknown> | undefined) ??
    (payload.data as Record<string, unknown> | undefined);

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  if (
    typeof candidate.dataString === 'string' &&
    !candidate.type &&
    !candidate.eventType
  ) {
    try {
      const parsed: unknown = JSON.parse(candidate.dataString);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Si dataString no es JSON válido, usar el objeto candidate tal como llegó
    }
  }

  return candidate;
}

/**
 * Procesa el payload de una notificación recibida en segundo plano o fuera de foco:
 * actualiza estados de cumplimiento, cancela ofertas tomadas o dispara alarma + burbuja flotante + push local.
 */
export async function processBackgroundNotificationPayload(
  rawData: Record<string, unknown> | null | undefined
): Promise<void> {
  if (!rawData) {
    return;
  }

  if (isPushDocumentEvent(rawData)) {
    void useDriverStatusStore.getState().fetchStatus();
    void useDriverStatusStore.getState().fetchDocuments();
    return;
  }

  if (isPushTripCancel(rawData)) {
    await driverOverlay.hideOfferOverlay();
    await offerAlarmService.stop();
    await Notifications?.dismissAllNotificationsAsync().catch(() => {});
    useDriverTripStore.getState().cancelOffer(rawData.offerId || rawData.tripId);
    return;
  }

  const offer = parsePushTripOffer(rawData);
  if (offer) {
    // Disparar alarma continua
    await offerAlarmService.start();

    // Encolar oferta en el store
    useDriverTripStore.getState().enqueueOffer(offer);

    // Mostrar burbuja flotante nativa sobre otras apps en Android
    await driverOverlay.showOfferOverlay(offer);

    // Presentar notificación local visible de máxima prioridad para despertar la pantalla
    if (Notifications?.scheduleNotificationAsync) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚕 ¡Nueva Oferta de Viaje Disponible!',
          body: `${offer.pickup.address} ➔ ${offer.dropoff.address} ($${offer.fare.totalFare})`,
          data: rawData,
          categoryIdentifier: 'trip-offer',
          sound: 'default',
          priority: Notifications?.AndroidNotificationPriority?.MAX ?? 'max',
          vibrate: [0, 500, 200, 500],
        },
        // En Expo SDK 57, channelId se envía en trigger (ChannelAwareTriggerInput) para usar el canal trip-offers en Android
        trigger: Platform.OS === 'android' ? { channelId: TRIP_OFFERS_CHANNEL_ID } : null,
      });
    }
  }
}

// Definición de la tarea en background con TaskManager
try {
  if (!isExpoGoOnAndroid && !TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
      if (error) {
        console.warn('⚠️ [PushBackground] Error en background notification task:', error);
        return;
      }

      const rawData = extractRawNotificationPayload(data);
      if (!rawData) {
        return;
      }

      await processBackgroundNotificationPayload(rawData);
    });
  }
} catch (e) {
  console.warn('⚠️ [PushNotificationService] Error definiendo TaskManager task:', e);
}

class PushNotificationService {
  private isInitialized = false;
  private currentDeviceToken: string | null = null;
  private tokenListenerSubscription: NotificationSubscription | null = null;
  private notificationReceivedSubscription: NotificationSubscription | null = null;
  private notificationResponseSubscription: NotificationSubscription | null = null;

  /**
   * Configura canales de Android, permisos, listeners y registra el token nativo en el backend.
   */
  async initialize(): Promise<string | null> {
    if (this.isInitialized) return this.currentDeviceToken;

    if (isExpoGoOnAndroid) {
      return null;
    }

    if (!Notifications) {
      return null;
    }

    const notif = Notifications;

    try {
      // 1. Configurar canal de notificación prioritario en Android
      if (Platform.OS === 'android') {
        await notif.setNotificationChannelAsync(TRIP_OFFERS_CHANNEL_ID, {
          name: 'Ofertas de viaje',
          description: 'Notificaciones de alta prioridad para asignación de viajes',
          importance: notif.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#D4AF37',
          lockscreenVisibility: notif.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      }

      // 2. Solicitar permisos de notificación
      const permissions = await notif.getPermissionsAsync();
      let isGranted = permissions.granted || permissions.status === 'granted';

      if (!isGranted) {
        // Se solicita permiso time-sensitive en iOS, pero el entitlement no está activo por ahora en Apple Developer; en iPhone opera con notificación estándar.
        const iosPermissions: ExtendedIosNotificationPermissionsRequest = {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowTimeSensitive: true,
          allowCriticalAlerts: true,
        };

        const request = await notif.requestPermissionsAsync({
          ios: iosPermissions,
        });
        isGranted = request.granted || request.status === 'granted';
      }

      if (!isGranted) {
        return null;
      }

      // En simuladores (especialmente iOS) no se soportan notificaciones remotas en background ni push tokens nativos
      if (!Device.isDevice) {
        console.info(
          'ℹ️ [PushService] Ejecutando en simulador: omitiendo registro de tarea en segundo plano y token nativo (requiere dispositivo físico).'
        );
        this.isInitialized = true;
        return null;
      }

      // 3. Registrar Background Task
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
          BACKGROUND_NOTIFICATION_TASK
        );
        if (!isRegistered) {
          await notif.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        }
      } catch (taskErr) {
        console.warn(
          '⚠️ [PushService] No se pudo registrar la tarea en background (verificar "Actualización en 2° plano" en Ajustes de iOS):',
          taskErr
        );
      }

      // 4. Obtener Device Push Token nativo (FCM / APNs)
      const tokenResult = await notif.getDevicePushTokenAsync();
      const nativeToken = String(tokenResult.data);
      this.currentDeviceToken = nativeToken;

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      // 5. Enviar al backend vía PUT /driver/me/push-token (compatible con schema 'fcm')
      try {
        await registerDriverPushToken({
          token: nativeToken,
          platform,
          provider: 'fcm',
        });
      } catch (tokenErr) {
        console.warn(
          '⚠️ [PushService] Primer intento de registrar push token falló, reintentando en background:',
          tokenErr
        );
        setTimeout(() => {
          void registerDriverPushToken({
            token: nativeToken,
            platform,
            provider: 'fcm',
          }).catch((retryErr) => {
            console.warn(
              '⚠️ [PushService] Reintento de push token falló definitivamente:',
              retryErr
            );
          });
        }, 3000);
      }

      // 6. Listener para cambios de token del sistema
      this.tokenListenerSubscription = notif.addPushTokenListener(async (tokenData) => {
        const refreshedToken = String(tokenData.data);
        if (refreshedToken && refreshedToken !== this.currentDeviceToken) {
          this.currentDeviceToken = refreshedToken;
          await registerDriverPushToken({
            token: refreshedToken,
            platform,
            provider: 'fcm',
          }).catch((err) => console.warn('Error refrescando push token:', err));
        }
      });

      // 7. Listener para notificaciones recibidas en foreground
      this.notificationReceivedSubscription = notif.addNotificationReceivedListener(
        async (notification) => {
          const rawData = notification.request.content.data;
          if (!rawData) return;

          if (isPushDocumentEvent(rawData)) {
            void useDriverStatusStore.getState().fetchStatus();
            void useDriverStatusStore.getState().fetchDocuments();
            return;
          }

          if (isPushTripCancel(rawData)) {
            void driverOverlay.hideOfferOverlay();
            await offerAlarmService.stop();
            await notif.dismissAllNotificationsAsync().catch(() => {});
            useDriverTripStore.getState().cancelOffer(rawData.offerId || rawData.tripId);
            return;
          }

          const offer = parsePushTripOffer(rawData);
          if (offer) {
            await offerAlarmService.start();
            useDriverTripStore.getState().enqueueOffer(offer);
          }
        }
      );

      // 8. Listener para taps en la notificación
      this.notificationResponseSubscription = notif.addNotificationResponseReceivedListener(
        async (response) => {
          const rawData = response.notification.request.content.data;
          if (!rawData) return;

          if (isPushDocumentEvent(rawData)) {
            void useDriverStatusStore.getState().fetchStatus();
            void useDriverStatusStore.getState().fetchDocuments();
            return;
          }

          if (isPushTripCancel(rawData)) {
            void driverOverlay.hideOfferOverlay();
            await offerAlarmService.stop();
            useDriverTripStore.getState().cancelOffer(rawData.offerId || rawData.tripId);
            return;
          }

          const offer = parsePushTripOffer(rawData);
          if (offer) {
            void driverOverlay.hideOfferOverlay();
            useDriverTripStore.getState().enqueueOffer(offer);
          }
        }
      );

      this.isInitialized = true;
      return nativeToken;
    } catch (error) {
      console.warn('⚠️ [PushService] Error inicializando notificaciones push:', error);
      return null;
    }
  }

  /**
   * Revoca el token en el backend y limpia suscripciones al cerrar sesión.
   */
  async revoke(): Promise<void> {
    try {
      const revokePromise = this.currentDeviceToken
        ? revokeDriverPushToken(this.currentDeviceToken)
        : revokeDriverPushToken();

      await Promise.race([
        revokePromise,
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]).catch(() => {});

      await driverOverlay.hideOfferOverlay();
      await offerAlarmService.stop();
      if (Notifications?.dismissAllNotificationsAsync) {
        await Notifications.dismissAllNotificationsAsync().catch(() => {});
      }

      if (this.tokenListenerSubscription?.remove) {
        this.tokenListenerSubscription.remove();
      }
      if (this.notificationReceivedSubscription?.remove) {
        this.notificationReceivedSubscription.remove();
      }
      if (this.notificationResponseSubscription?.remove) {
        this.notificationResponseSubscription.remove();
      }

      this.isInitialized = false;
      this.currentDeviceToken = null;
    } catch (error) {
      console.warn('⚠️ [PushService] Error revocando push token:', error);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
