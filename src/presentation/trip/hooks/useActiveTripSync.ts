import { useEffect, useCallback } from 'react';
import { getActiveTrip, getTripById } from '../../../core/trip/actions/trip.actions';
import { useDriverTripStore } from '../store/useDriverTripStore';

/**
 * Consulta `GET /driver/me/active-trip` para reconciliar el estado del viaje activo
 * con el backend. Rehidrata el viaje completo si existe, o elimina viajes fantasmas locales
 * si en el backend ya concluyó o no existe.
 */
export const syncActiveTripState = async (): Promise<void> => {
  try {
    const activeSummary = await getActiveTrip();
    const currentActive = useDriverTripStore.getState().activeTrip;

    if (activeSummary) {
      if (!currentActive || currentActive.id !== activeSummary.id || currentActive.status !== activeSummary.status) {
        const freshTrip = await getTripById(activeSummary.id);
        if (freshTrip.status === 'cancelled') {
          useDriverTripStore.getState().setActiveTrip(null);
        } else {
          useDriverTripStore.getState().setActiveTrip(freshTrip);
        }
      }
    } else {
      // Backend indica sin viaje activo: si localmente había uno en curso, se limpia
      if (currentActive && currentActive.status !== 'completed' && currentActive.status !== 'cancelled') {
        useDriverTripStore.getState().setActiveTrip(null);
      }
    }
  } catch (error: any) {
    if (
      error?.status === 404 ||
      error?.status === 403 ||
      error?.response?.status === 404 ||
      error?.response?.status === 403
    ) {
      useDriverTripStore.getState().setActiveTrip(null);
    }
  }
};

export const useActiveTripSync = () => {
  const sync = useCallback(() => {
    syncActiveTripState();
  }, []);

  useEffect(() => {
    syncActiveTripState();
  }, []);

  return { syncActiveTrip: sync };
};
