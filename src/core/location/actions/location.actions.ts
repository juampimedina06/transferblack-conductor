import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { LatLng } from '../interface/latLng.interface';
import { LocationReading } from '../interface/telemetry.interface';

export const getCurrentReading = async (): Promise<LocationReading> => {
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
        heading: lastKnown.coords.heading ?? null,
        speed: lastKnown.coords.speed ?? null,
        accuracy: lastKnown.coords.accuracy ?? null,
        timestamp: lastKnown.timestamp || Date.now(),
      };
    }

    const { coords, timestamp } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: coords.heading ?? null,
      speed: coords.speed ?? null,
      accuracy: coords.accuracy ?? null,
      timestamp: timestamp || Date.now(),
    };
  } catch {
    throw new Error('No se pudo obtener la ubicación actual del dispositivo.');
  }
};

export const getCurrentLocation = async (): Promise<LatLng> => {
  const reading = await getCurrentReading();
  return {
    latitude: reading.latitude,
    longitude: reading.longitude,
  };
};

export const watchCurrentPosition = (
  locationCallback: (location: LocationReading) => void,
): Promise<Location.LocationSubscription> => {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 1,
    },
    ({ coords, timestamp }) => {
      locationCallback({
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading ?? null,
        speed: coords.speed ?? null,
        accuracy: coords.accuracy ?? null,
        timestamp: timestamp || Date.now(),
      });
    },
  );
};
