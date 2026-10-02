import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { LatLng } from '../interface/latLng.interface';

export const getCurrentLocation = async (): Promise<LatLng> => {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled && Platform.OS === 'android') {
      try {
        await Location.enableNetworkProviderAsync();
      } catch {
        // Location provider prompt cancelled by user
      }
    }

    const lastKnown = await Location.getLastKnownPositionAsync({});
    if (lastKnown?.coords) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
      };
    }

    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  } catch {
    throw new Error('No se pudo obtener la ubicación actual del dispositivo.');
  }
};

export const watchCurrentPosition = (
  locationCallback: (location: LatLng) => void,
): Promise<Location.LocationSubscription> => {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000, // Actualiza cada 5 segundos conforme al backend
      distanceInterval: 10,
    },
    ({ coords }) => {
      locationCallback({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    },
  );
};
