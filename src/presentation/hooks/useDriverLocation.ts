import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { transferApi } from '../../core/api/transferApi';
import { useAuthStore } from '../auth/store/useAuthStore';

export const useDriverLocation = (isAvailable: boolean) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const user = useAuthStore((state) => state.user);

  const startWatching = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso de ubicación denegado.');
        return;
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Actualiza cada 10 metros
          timeInterval: 10000,  // O cada 10 segundos
        },
        (newLocation) => {
          setLocation(newLocation);
          if (isAvailable) {
            // Emitir ubicación al backend si está disponible
            sendLocationToBackend(newLocation);
          }
        }
      );
    } catch (e) {
      console.error('Error al solicitar ubicación:', e);
    }
  };

  const stopWatching = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const sendLocationToBackend = async (loc: Location.LocationObject) => {
    try {
      await transferApi.post('/drivers/me/location', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      console.error('Error enviando ubicación al backend:', e);
    }
  };

  useEffect(() => {
    if (isAvailable) {
      startWatching();
    } else {
      stopWatching();
    }

    return () => {
      stopWatching();
    };
  }, [isAvailable]);

  // Si no está disponible pero necesitamos al menos saber la ubicación actual inicial
  useEffect(() => {
    if (!isAvailable && !location) {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        }
      })();
    }
  }, []);

  return { location, errorMsg };
};
