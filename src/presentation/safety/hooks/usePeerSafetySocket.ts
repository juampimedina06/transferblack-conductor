import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { socket } from '@/core/socket/socket';
import type {
  IncomingPeerAlertPayload,
  PeerAlertFollowerJoinedPayload,
  PeerAlertLocationPayload,
  PeerAlertResolvedPayload,
} from '@/core/safety/interface/peerAlert.interface';
import { usePeerAlertStore } from '../store/usePeerAlertStore';
import { useBannerNotificationStore } from '@/presentation/notifications/store/useBannerNotificationStore';
import { useDriverSettingsStore } from '@/presentation/settings/store/useDriverSettingsStore';

const isExpoGoAndroid =
  Platform.OS === 'android' && Constants.appOwnership === 'expo';

/**
 * Emite una señal discreta (doble vibración suave + sonido corto de notificación
 * común) para confirmar al conductor en riesgo que un compañero ya lo está siguiendo,
 * sin mostrar sirenas ni carteles llamativos que puedan alertar al pasajero.
 */
const triggerDiscreetBackupConfirmation = async (): Promise<void> => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 180);
  } catch {
    // Ignorar fallos de háptica en dispositivos sin soporte
  }

  if (isExpoGoAndroid) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Transfer Black',
        body: 'Actualización de ruta disponible',
        sound: true,
      },
      trigger: null,
    });
  } catch {
    // Si falla el sonido local, la confirmación háptica ya se ejecutó
  }
};

export function usePeerSafetySocket(): void {
  useEffect(() => {
    const onIncomingAlert = (payload: IncomingPeerAlertPayload) => {
      if (!payload?.alertId) return;
      if (!useDriverSettingsStore.getState().peerSafetyAlertsEnabled) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      usePeerAlertStore.getState().setIncomingAlert(payload);
    };

    const onFollowerJoined = (payload: PeerAlertFollowerJoinedPayload) => {
      if (!payload?.alertId) return;
      usePeerAlertStore
        .getState()
        .updateMyFollowersCount(payload.alertId, payload.followersCount);
      void triggerDiscreetBackupConfirmation();
    };

    const onLocationUpdate = (payload: PeerAlertLocationPayload) => {
      if (!payload?.alertId) return;
      usePeerAlertStore
        .getState()
        .updateFollowingLocation(
          payload.alertId,
          payload.lat,
          payload.lng,
          payload.updatedAt
        );
    };

    const onAlertResolved = (payload: PeerAlertResolvedPayload) => {
      if (!payload?.alertId) return;
      const wasFollowing =
        usePeerAlertStore.getState().followingAlert?.alertId === payload.alertId;
      usePeerAlertStore.getState().handleAlertResolved(payload.alertId);
      if (wasFollowing) {
        useBannerNotificationStore.getState().show({
          title: 'Alerta finalizada',
          message: 'El compañero indicó que ya se encuentra bien.',
          type: 'success',
        });
      }
    };

    socket.on('safety:peer_alert:incoming', onIncomingAlert);
    socket.on('safety:peer_alert:follower_joined', onFollowerJoined);
    socket.on('safety:peer_alert:location', onLocationUpdate);
    socket.on('safety:peer_alert:resolved', onAlertResolved);

    return () => {
      socket.off('safety:peer_alert:incoming', onIncomingAlert);
      socket.off('safety:peer_alert:follower_joined', onFollowerJoined);
      socket.off('safety:peer_alert:location', onLocationUpdate);
      socket.off('safety:peer_alert:resolved', onAlertResolved);
    };
  }, []);
}
