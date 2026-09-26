import { useEffect, useRef, useState } from 'react';
import { socket } from '../../../core/socket/socket';
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
    const initLocation = async (): Promise<void> => {
      const permission = await checkLocationPermission();
      if (permission !== PermissionStatus.GRANTED) {
        const requested = await requestLocationPermission();
        if (requested !== PermissionStatus.GRANTED) {
          setErrorMsg('Permiso de ubicación denegado.');
          return;
        }
      }
      await getLocation();
    };

    initLocation();
  }, []);

  // Emisión periódica de ubicación por WebSocket cada 5 segundos cuando el conductor está disponible
  useEffect(() => {
    if (!isAvailable) return;

    const emitLocation = (): void => {
      const currentLoc = lastLocationRef.current;
      if (currentLoc && socket.connected) {
        socket.emit('driver:location_update', {
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        });
      }
    };

    // Emitir inmediatamente al quedar disponible si ya tenemos posición
    emitLocation();

    // Intervalo de 5 segundos conforme al backend (throttle mínimo del backend: 3s)
    const intervalId = setInterval(emitLocation, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAvailable]);

  return { location: lastKnownLocation, errorMsg };
};
