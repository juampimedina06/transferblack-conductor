import { useEffect, useRef } from 'react';
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
  const isBubbleVisibleRef = useRef<boolean>(false);

  const isTripLive =
    !!activeTrip &&
    activeTrip.status !== 'completed' &&
    activeTrip.status !== 'cancelled';

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const hideBubble = (): void => {
      isBubbleVisibleRef.current = false;
      void driverOverlay.hideFloatingBubble();
    };

    const showBubble = (status: 'online' | 'trip'): void => {
      if (isBubbleVisibleRef.current) {
        return;
      }
      isBubbleVisibleRef.current = true;
      void driverOverlay.showFloatingBubble(status).then((shown) => {
        if (!shown) {
          isBubbleVisibleRef.current = false;
        }
      });
    };

    // Al montar en primer plano (o tras recargar Metro), asegurar que no quede ninguna esfera previa
    if (AppState.currentState === 'active' || (!isAvailable && !isTripLive)) {
      hideBubble();
    }

    const syncBubbleForAppState = (nextState: AppStateStatus): void => {
      if (nextState === 'active') {
        hideBubble();
        return;
      }

      // Solo disparar en 'background' (evita doble disparo consecutivo inactive -> background en Android)
      if (nextState === 'background') {
        if (isTripLive) {
          showBubble('trip');
        } else if (isAvailable) {
          showBubble('online');
        } else {
          hideBubble();
        }
      }
    };

    const subscription = AppState.addEventListener('change', syncBubbleForAppState);

    return () => {
      subscription.remove();
    };
  }, [isAvailable, isTripLive]);
}
