import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';
import * as Device from 'expo-device';
import { router, useRootNavigationState } from 'expo-router';
import type * as ExpoNotifications from 'expo-notifications';

import { registerDevice } from '@/core/device/actions/device.actions';
import { pushDeviceStorage } from '@/infrastructure/storage/pushDeviceStorage';

// En Expo SDK 53+, Android eliminó el soporte de push remotas en Expo Go.
// Importar estáticamente expo-notifications en Expo Go Android lanza un error irrecuperable.
const isExpoGoOnAndroid =
  Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo;

export interface PushNotificationPayload {
  request: {
    identifier: string;
    content: {
      title?: string | null;
      body?: string | null;
      data?: Record<string, unknown>;
    };
  };
}

export interface PushNotificationResponse {
  notification: PushNotificationPayload;
}

// Objeto de módulo dinámico tipado de expo-notifications
let Notifications: typeof ExpoNotifications | null = null;

if (!isExpoGoOnAndroid) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');

    // Handler global para definir cómo se comportan las notificaciones cuando la app está en primer plano
    Notifications?.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    console.warn('expo-notifications no disponible en este entorno:', err);
  }
}

export interface SendPushOptions {
  to: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface UsePushNotificationsResult {
  expoPushToken: string;
  isRegistering: boolean;
  isRegistered: boolean;
  permissionGranted: boolean;
  isExpoGoOnAndroid: boolean;
  notifications: PushNotificationPayload[];
  errorMessage: string | null;
  syncDeviceToken: (forceToken?: string, interactive?: boolean) => Promise<boolean>;
  sendPushNotification: (options: SendPushOptions) => Promise<void>;
}

/**
 * Función auxiliar para enviar push de prueba directamente vía Expo Push Service (como en pushApp)
 */
export async function sendPushNotification(options: SendPushOptions): Promise<void> {
  const { to, title, body, data } = options;

  const message = {
    to,
    sound: 'default',
    title,
    body,
    data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

function allowsNotifications(
  status: { granted?: boolean; ios?: { status?: number } } | null | undefined
): boolean {
  if (!status) return false;
  return Boolean(
    status.granted ||
      status.ios?.status === 2 || // PROVISIONAL
      status.ios?.status === 3 // EPHEMERAL
  );
}

/**
 * Obtiene el token de Expo y lo registra en el backend
 */
async function registerForPushNotificationsAsync(
  isInteractive = false
): Promise<{
  token: string | null;
  permissionGranted: boolean;
  deniedPermanently: boolean;
  isExpoGoWarning: boolean;
}> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return { token: null, permissionGranted: false, deniedPermanently: false, isExpoGoWarning: false };
  }

  if (isExpoGoOnAndroid) {
    console.info(
      'TransferBlack: Push notifications en Android requieren Development Build (removido de Expo Go en SDK 53).'
    );
    return { token: null, permissionGranted: false, deniedPermanently: false, isExpoGoWarning: true };
  }

  if (!Notifications) {
    return { token: null, permissionGranted: false, deniedPermanently: false, isExpoGoWarning: false };
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TransferBlack Operaciones',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4AF37',
        sound: 'default',
      });
    }

    const existingPermissions = await Notifications.getPermissionsAsync();
    let currentPermissions = existingPermissions;

    if (!allowsNotifications(existingPermissions)) {
      currentPermissions = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    }

    const isGranted = allowsNotifications(currentPermissions);

    if (!isGranted) {
      const isDeniedPermanently = !currentPermissions.canAskAgain;
      console.warn('Permisos de notificaciones push no concedidos por el usuario');
      return { token: null, permissionGranted: false, deniedPermanently: isDeniedPermanently, isExpoGoWarning: false };
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      '2956340e-d243-4b85-81a0-03d74a419a48';

    const pushTokenString = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      )
    ).data;

    return { token: pushTokenString, permissionGranted: true, deniedPermanently: false, isExpoGoWarning: false };
  } catch (error) {
    console.error('Error al obtener Expo Push Token:', error);
    return { token: null, permissionGranted: false, deniedPermanently: false, isExpoGoWarning: false };
  }
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationPayload[]>([]);
  const pendingRouteRef = useRef<string | null>(null);

  const rootNavigationState = useRootNavigationState();

  const syncDeviceToken = useCallback(
    async (forceToken?: string, interactive = false): Promise<boolean> => {
      if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
        return false;
      }

      setIsRegistering(true);
      setErrorMessage(null);

      try {
        const result = forceToken
          ? { token: forceToken, permissionGranted: true, deniedPermanently: false, isExpoGoWarning: false }
          : await registerForPushNotificationsAsync(interactive);

        setPermissionGranted(result.permissionGranted);

        if (result.isExpoGoWarning && interactive) {
          Alert.alert(
            'Aviso de Entorno (Expo Go)',
            'En Android, Expo eliminó las notificaciones push remotas dentro de Expo Go a partir de SDK 53. Para recibir notificaciones en un dispositivo Android real se requiere una Development Build (npx expo run:android).',
            [{ text: 'Entendido' }]
          );
        }

        if (!result.token) {
          if (interactive && result.deniedPermanently) {
            Alert.alert(
              'Permisos de Notificaciones',
              'Las notificaciones están desactivadas para TransferBlack Conductor. Para enterarte a tiempo de nuevas ofertas de viajes y mensajes de pasajeros, habilitá los permisos desde los ajustes de tu dispositivo.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
              ]
            );
          }
          setIsRegistering(false);
          return false;
        }

        const token = result.token;
        setExpoPushToken(token);

        // Si ya registramos este mismo token previamente, no reenviamos al backend
        const lastSaved = await pushDeviceStorage.getLastToken();
        if (lastSaved === token) {
          setIsRegistered(true);
          setIsRegistering(false);
          return true;
        }

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        const provider =
          token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')
            ? 'expo'
            : 'fcm';

        const deviceId = Device.modelName || Device.deviceName || undefined;

        // Registrar en backend: POST /api/v1/devices
        const response = await registerDevice({
          push_token: token,
          platform,
          provider,
          device_id: deviceId,
        });

        await pushDeviceStorage.saveToken(token, response.id);
        setIsRegistered(true);
        setIsRegistering(false);
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo registrar el dispositivo para notificaciones push.';
        setErrorMessage(message);
        setIsRegistering(false);
        return false;
      }
    },
    []
  );

  // Registro inicial al montar (microtask async para evitar sincronía en el cuerpo del efecto)
  useEffect(() => {
    let isCancelled = false;
    registerForPushNotificationsAsync(false).then((result) => {
      if (!isCancelled && result.token) {
        syncDeviceToken(result.token);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [syncDeviceToken]);

  // Manejador centralizado para navegación al interactuar con la notificación
  const handleNotificationNavigation = useCallback(
    (response: unknown) => {
      const res = response as PushNotificationResponse | undefined;
      const data = res?.notification?.request?.content?.data;
      if (!data) return;

      let targetRoute: string | null = null;
      if (data.chatId || data.type === 'chat') {
        targetRoute = '/chat';
      } else if (data.tripId || data.type === 'trip_offer' || data.type === 'new_offer') {
        targetRoute = '/(home)';
      } else if (data.scheduledTripId || data.type === 'scheduled_trip') {
        targetRoute = '/(home)/scheduled-trips';
      }

      if (targetRoute) {
        if (rootNavigationState?.key) {
          router.push(targetRoute as any);
        } else {
          pendingRouteRef.current = targetRoute;
        }
      }
    },
    [rootNavigationState?.key]
  );

  // Listeners de notificaciones entrantes e interacción del usuario (como en pushApp)
  useEffect(() => {
    if (!Notifications) return;

    const notificationListener = Notifications.addNotificationReceivedListener?.((notification: unknown) => {
      setNotifications((prev) => [...prev, notification as PushNotificationPayload]);
    }) as { remove?: () => void } | undefined;

    const responseListener =
      Notifications.addNotificationResponseReceivedListener?.(handleNotificationNavigation) as
        | { remove?: () => void }
        | undefined;

    // Si la app fue lanzada desde una notificación en frío
    const lastResponsePromise = Notifications.getLastNotificationResponseAsync?.() as
      | Promise<unknown>
      | undefined;

    lastResponsePromise?.then((response: unknown) => {
      if (response) {
        handleNotificationNavigation(response);
      }
    });

    return () => {
      notificationListener?.remove?.();
      responseListener?.remove?.();
    };
  }, [handleNotificationNavigation]);

  // Ejecuta la redirección si había una ruta pendiente una vez montado el navegador
  useEffect(() => {
    if (rootNavigationState?.key && pendingRouteRef.current) {
      const target = pendingRouteRef.current;
      pendingRouteRef.current = null;
      router.push(target as any);
    }
  }, [rootNavigationState?.key]);

  return {
    expoPushToken,
    isRegistering,
    isRegistered,
    permissionGranted,
    isExpoGoOnAndroid,
    notifications,
    errorMessage,
    syncDeviceToken,
    sendPushNotification,
  };
}
