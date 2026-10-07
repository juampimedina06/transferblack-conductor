import { useEffect, useRef, useState } from 'react';
import { checkLocationPermission, requestLocationPermission } from '../../../core/location/actions/permissions.actions';
import { LatLng } from '../../../core/location/interface/latLng.interface';
import { PermissionStatus } from '../../../core/location/interface/permission.interface';
import { useLocationStore } from '../store/useLocationStore';

export const useDriverLocation = (isAvailable: boolean): { location: LatLng | null; errorMsg: string | null } => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { lastKnownLocation, getLocation } = useLocationStore();
  const lastLocationRef = useRef<LatLng | null>(null);

  // Mantener referencia actualizada de la última ubicación
  useEffect(() => {
    lastLocationRef.current = lastKnownLocation;
  }, [lastKnownLocation]);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      try {
        const permission = await checkLocationPermission();
        if (cancelled) return;
        if (permission !== PermissionStatus.GRANTED) {
          const requested = await requestLocationPermission();
          if (cancelled) return;
          if (requested !== PermissionStatus.GRANTED) {
            setErrorMsg('Permiso de ubicación denegado.');
            return;
          }
        }
        const loc = await getLocation();
        if (cancelled) return;
        if (!loc) {
          setErrorMsg('No se pudo obtener la ubicación actual.');
        }
      } catch (err: any) {
        if (!cancelled) setErrorMsg(err?.message || 'Error al inicializar ubicación.');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [getLocation]);

  return { location: lastKnownLocation, errorMsg };
};
