import * as Location from 'expo-location';
import { LatLng } from '../interface/latLng.interface';

export const getCurrentLocation = async (): Promise<LatLng> => {
  try {
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
  } catch (error) {
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
