import { Platform } from 'react-native';
import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

const DEFAULT_CHANNEL_ID = 'default';
const TRIP_OFFERS_CHANNEL_ID = 'trip-offers';

const isExpoGoOnAndroid =
  Platform.OS === 'android' &&
  (Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === AppOwnership.Expo);

/**
 * Crea los canales de notificación requeridos en Android de forma idempotente y segura al arrancar la app.
 * Evita cargar expo-notifications en Expo Go Android (soporte remoto removido en Expo SDK 53+).
 */
export async function ensureDefaultNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || isExpoGoOnAndroid) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof ExpoNotifications;

    await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
      name: 'TransferBlack Operaciones',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4AF37',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync(TRIP_OFFERS_CHANNEL_ID, {
      name: 'Ofertas de Viajes',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#D4AF37',
      sound: 'default',
    });
  } catch (error) {
    console.warn('⚠️ [NotificationChannel] No se pudo crear el canal de notificación:', error);
  }
}
