import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { registerDriverPushToken, revokeDriverPushToken } from '../actions/pushToken.actions';
import { parsePushTripOffer, isPushTripCancel, isPushDocumentEvent } from '../utils/pushOfferParser';
import { offerAlarmService } from '@/presentation/trip/services/offerAlarmService';
import { useDriverTripStore } from '@/presentation/trip/store/useDriverTripStore';
import { useDriverStatusStore } from '@/presentation/driver/store/useDriverStatusStore';

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_TRIP_OFFER_TASK';
export const TRIP_OFFERS_CHANNEL_ID = 'trip-offers';

// Handler global para notificaciones en foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const isOffer = data?.type === 'trip:offer';

    return {
      shouldShowAlert: true,
      shouldPlaySound: !isOffer, // La alarma continua gestiona el sonido para ofertas
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

// Definición de la tarea en background con TaskManager
try {
  if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
      if (error) {
        console.warn('⚠️ [PushBackground] Error en background notification task:', error);
        return;
      }

      const rawData = (data as any)?.notification?.data || (data as any)?.data;
      if (!rawData) return;

      if (isPushDocumentEvent(rawData)) {
        console.log('📋 [PushBackground] Evento de documentación recibido:', rawData);
        void useDriverStatusStore.getState().fetchStatus();
        void useDriverStatusStore.getState().fetchDocuments();
        return;
      }

      if (isPushTripCancel(rawData)) {
        console.log('🚫 [PushBackground] Cancelación recibida en background:', rawData);
        await offerAlarmService.stop();
        await Notifications.dismissAllNotificationsAsync().catch(() => {});
        useDriverTripStore.getState().cancelOffer(rawData.offerId || rawData.tripId);
        return;
      }

      const offer = parsePushTripOffer(rawData);
      if (offer) {
        console.log('🔔 [PushBackground] Oferta válida recibida en background:', offer.offerId);

        // Disparar alarma continua
        await offerAlarmService.start();

        // Encolar oferta en el store
        useDriverTripStore.getState().enqueueOffer(offer);

        // Presentar notificación local visible de máxima prioridad para despertar la pantalla
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚕 ¡Nueva Oferta de Viaje Disponible!',
            body: `${offer.pickup.address} ➔ ${offer.dropoff.address} ($${offer.fare.totalFare})`,
            data: rawData,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 200, 500],
          },
          trigger: null,
        });
      }
    });
  }
} catch (e) {
  console.warn('⚠️ [PushNotificationService] Error definiendo TaskManager task:', e);
}

class PushNotificationService {
  private isInitialized = false;
  private currentDeviceToken: string | null = null;
  private tokenListenerSubscription: any = null;
  private notificationReceivedSubscription: any = null;
  private notificationResponseSubscription: any = null;

  /**
   * Configura canales de Android, permisos, listeners y registra el token nativo en el backend.
   */
  async initialize(): Promise<string | null> {
    if (this.isInitialized) return this.currentDeviceToken;

    try {
      // 1. Configurar canal de notificación prioritario en Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(TRIP_OFFERS_CHANNEL_ID, {
          name: 'Ofertas de viaje',
          description: 'Notificaciones de alta prioridad para asignación de viajes',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#D4AF37',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      }

      // 2. Solicitar permisos de notificación
      const permissions = await Notifications.getPermissionsAsync();
      let isGranted = permissions.granted || permissions.status === 'granted';

      if (!isGranted) {
        const request = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowCriticalAlerts: true,
          },
        });
        isGranted = request.granted || request.status === 'granted';
      }

      if (!isGranted) {
        console.warn('⚠️ [PushService] Permisos de notificación denegados.');
        return null;
      }

      // 3. Registrar Background Task
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
        if (!isRegistered) {
          await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        }
      } catch (taskErr) {
        console.warn('⚠️ [PushService] No se pudo registrar la tarea en background:', taskErr);
      }

      // 4. Obtener Device Push Token nativo (FCM / APNs)
      const tokenResult = await Notifications.getDevicePushTokenAsync();
      const nativeToken = tokenResult.data;
      this.currentDeviceToken = nativeToken;

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      // 5. Enviar al backend vía PUT /drivers/me/push-token
      await registerDriverPushToken({
        token: nativeToken,
        platform,
        provider: 'fcm',
      });

      console.log('✅ [PushService] Token nativo registrado en backend exitosamente');

      // 6. Listener para cambios de token del sistema
      this.tokenListenerSubscription = Notifications.addPushTokenListener(async (tokenData) => {
        const refreshedToken = tokenData.data;
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
      this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
        async (notification) => {
          const rawData = notification.request.content.data;
          if (!rawData) return;

          if (isPushDocumentEvent(rawData)) {
            console.log('📋 [PushForeground] Evento de documentación recibido:', rawData);
            void useDriverStatusStore.getState().fetchStatus();
            void useDriverStatusStore.getState().fetchDocuments();
            return;
          }

          if (isPushTripCancel(rawData)) {
            await offerAlarmService.stop();
            await Notifications.dismissAllNotificationsAsync().catch(() => {});
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
      this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const rawData = response.notification.request.content.data;
          if (!rawData) return;

          if (isPushDocumentEvent(rawData)) {
            void useDriverStatusStore.getState().fetchStatus();
            void useDriverStatusStore.getState().fetchDocuments();
            return;
          }

          const offer = parsePushTripOffer(rawData);
          if (offer) {
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
      if (this.currentDeviceToken) {
        await revokeDriverPushToken(this.currentDeviceToken).catch(() => {});
      } else {
        await revokeDriverPushToken().catch(() => {});
      }

      await offerAlarmService.stop();
      await Notifications.dismissAllNotificationsAsync().catch(() => {});

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
