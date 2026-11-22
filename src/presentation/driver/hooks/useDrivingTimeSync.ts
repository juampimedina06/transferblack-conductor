import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';

import { socket } from '@/core/socket/socket';
import { stopBackgroundLocationTracking } from '@/core/location/tasks/backgroundLocationTask';
import { driverOverlay } from '@/core/overlay/driverOverlay';
import type {
  DrivingTimeWarningPayload,
  FatigueLockPayload,
} from '@/core/driver/interface/drivingTime.interface';
import { useDrivingTimeStore } from '@/presentation/driver/store/useDrivingTimeStore';
import { useDriverTripStore } from '@/presentation/trip/store/useDriverTripStore';
import { showBannerNotification } from '@/presentation/notifications/store/useBannerNotificationStore';

const formatTimeHHMM = (isoString: string | null): string => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/**
 * Sincroniza el estado de jornada de conducción (Ordenanza N° 13.549: 12h máx / 6h descanso)
 * con GET /driver/me/driving-time y los eventos en tiempo real de Socket.IO.
 */
export function useDrivingTimeSync(): void {
  const isAvailable = useDriverTripStore((state) => state.isAvailable);
  const activeTripStatus = useDriverTripStore((state) => state.activeTrip?.status ?? null);

  // Sincronización inicial, al cambiar disponibilidad/viaje y al volver a primer plano
  useEffect(() => {
    void useDrivingTimeStore.getState().fetchDrivingTime();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void useDrivingTimeStore.getState().fetchDrivingTime();
      }
    });

    return () => {
      sub.remove();
    };
  }, [isAvailable, activeTripStatus]);

  // Refresco periódico mientras el conductor está en línea (cada 2 minutos)
  useEffect(() => {
    if (!isAvailable) return;
    const interval = setInterval(() => {
      void useDrivingTimeStore.getState().fetchDrivingTime();
    }, 120_000);
    return () => clearInterval(interval);
  }, [isAvailable]);

  // Listeners Socket.IO para avisos preventivos y bloqueo por fatiga
  useEffect(() => {
    const onDrivingWarning = (payload: DrivingTimeWarningPayload) => {
      if (!payload) return;
      useDrivingTimeStore.getState().applyWarning(payload);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const mins = Math.max(1, Math.round(payload.remainingMinutes));
      const label = mins >= 60 ? `${Math.round(mins / 60)} h` : `${mins} min`;

      showBannerNotification({
        type: 'warning',
        title: 'Límite de jornada próximo',
        message: `Te quedan ${label} de conducción antes del descanso obligatorio de 6 horas.`,
        durationMs: 7000,
      });
    };

    const onFatigueLock = (payload: FatigueLockPayload) => {
      if (!payload) return;
      useDrivingTimeStore.getState().applyFatigueLock(payload);
      useDriverTripStore.getState().setIsAvailable(false);
      void stopBackgroundLocationTracking();
      void driverOverlay.hideOfferOverlay();
      void driverOverlay.hideFloatingBubble();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const untilLabel = formatTimeHHMM(payload.restUntil);
      showBannerNotification({
        type: 'warning',
        title: 'Descanso obligatorio activado',
        message: untilLabel
          ? `Alcanzaste las 12 h de conducción. Podrás volver a conectarte a partir de las ${untilLabel}.`
          : 'Alcanzaste las 12 h de conducción. Cumplí el descanso obligatorio de 6 h para reconectarte.',
        durationMs: 8500,
      });
    };

    socket.on('driver:driving_time_warning', onDrivingWarning);
    socket.on('driver:fatigue_lock', onFatigueLock);

    return () => {
      socket.off('driver:driving_time_warning', onDrivingWarning);
      socket.off('driver:fatigue_lock', onFatigueLock);
    };
  }, []);
}
