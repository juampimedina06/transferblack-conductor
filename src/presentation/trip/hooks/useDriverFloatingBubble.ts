import { useEffect } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { driverOverlay } from '../../../core/overlay/driverOverlay';
import { useDriverTripStore } from '../store/useDriverTripStore';

/**
 * Muestra automáticamente la esfera flotante nativa en Android al minimizar la app
 * mientras el conductor está en línea o con un viaje activo, y la oculta al volver.
 */
export function useDriverFloatingBubble(): void {
  const isAvailable = useDriverTripStore((state) => state.isAvailable);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);

  const isTripLive =
    !!activeTrip &&
    activeTrip.status !== 'completed' &&
    activeTrip.status !== 'cancelled';

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const syncBubbleForAppState = (nextState: AppStateStatus): void => {
      if (nextState === 'active') {
        void driverOverlay.hideFloatingBubble();
        return;
      }

      if (nextState === 'background' || nextState === 'inactive') {
        if (isTripLive) {
          void driverOverlay.showFloatingBubble('trip');
        } else if (isAvailable) {
          void driverOverlay.showFloatingBubble('online');
        } else {
          void driverOverlay.hideFloatingBubble();
        }
      }
    };

    if (!isAvailable && !isTripLive) {
      void driverOverlay.hideFloatingBubble();
    }

    const subscription = AppState.addEventListener('change', syncBubbleForAppState);

    return () => {
      subscription.remove();
    };
  }, [isAvailable, isTripLive]);
}
