import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { authStorage } from '../../../presentation/auth/store/authStorage';
import { useLocationStore } from '../../../presentation/maps/store/useLocationStore';
import { useDriverTripStore } from '../../../presentation/trip/store/useDriverTripStore';
import { transferApi } from '../../api/transferApi';
import { LocationReading } from '../interface/telemetry.interface';

export const BACKGROUND_LOCATION_TASK = 'TRANSFERBLACK_BACKGROUND_LOCATION_TASK';

export interface BackgroundLocationTaskData {
  locations?: Location.LocationObject[];
}

const sanitizeNonNegative = (value: number | null | undefined, max?: number): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  if (max !== undefined && value > max) {
    return null;
  }
  return value;
};

/**
 * Procesa las lecturas de ubicación entregadas por el sistema operativo en segundo plano,
 * actualiza el store local y reporta las coordenadas por HTTP cuando el conductor está
 * disponible o con un viaje activo.
 */
export async function executeBackgroundLocationTask(
  body: TaskManager.TaskManagerTaskBody<BackgroundLocationTaskData>,
): Promise<void> {
  if (!body || body.error || !body.data?.locations?.length) {
    return;
  }

  const latest = body.data.locations[body.data.locations.length - 1];
  if (!latest?.coords) {
    return;
  }

  const { coords } = latest;
  if (
    typeof coords.latitude !== 'number' ||
    !Number.isFinite(coords.latitude) ||
    typeof coords.longitude !== 'number' ||
    !Number.isFinite(coords.longitude)
  ) {
    return;
  }

  const reading: LocationReading = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    heading: sanitizeNonNegative(coords.heading, 360),
    speed: sanitizeNonNegative(coords.speed),
    accuracy: sanitizeNonNegative(coords.accuracy),
    timestamp: Math.round(latest.timestamp || Date.now()),
  };

  useLocationStore.setState({
    lastKnownLocation: {
      latitude: reading.latitude,
      longitude: reading.longitude,
    },
    lastKnownReading: reading,
  });

  const { isAvailable, activeTrip } = useDriverTripStore.getState();
  const isTripActive =
    !!activeTrip?.id &&
    activeTrip.status !== 'completed' &&
    activeTrip.status !== 'cancelled' &&
    activeTrip.status !== 'draft';

  if (!isAvailable && !isTripActive) {
    return;
  }

  const token = await authStorage.getAccessToken();
  if (!token) {
    return;
  }

  try {
    await transferApi.post('/driver/me/location', {
      lat: reading.latitude,
      lng: reading.longitude,
      latitude: reading.latitude,
      longitude: reading.longitude,
      heading: reading.heading,
      speed: reading.speed,
      accuracy: reading.accuracy,
      timestamp: reading.timestamp,
    });
  } catch {
    // Silenciar errores transitorios de red para evitar que la tarea en segundo plano falle
  }
}

try {
  if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    TaskManager.defineTask<BackgroundLocationTaskData>(
      BACKGROUND_LOCATION_TASK,
      executeBackgroundLocationTask,
    );
  }
} catch {
  // Evitar errores en entornos donde TaskManager nativo no está disponible
}

/**
 * Inicia el seguimiento GPS en segundo plano (y el Foreground Service en Android)
 * si el conductor otorgó permisos de ubicación en primer y segundo plano.
 */
export const startBackgroundLocationTracking = async (): Promise<boolean> => {
  try {
    const [foregroundPermission, backgroundPermission] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);

    if (
      foregroundPermission.status !== 'granted' ||
      backgroundPermission.status !== 'granted'
    ) {
      return false;
    }

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (alreadyStarted) {
      return true;
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 10,
      deferredUpdatesInterval: 5000,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.AutomotiveNavigation,
      ...(Platform.OS === 'android'
        ? {
            foregroundService: {
              notificationTitle: 'Transfer Black: Estás en línea recibiendo viajes',
              notificationBody: 'Tu ubicación GPS sigue activa en segundo plano',
              notificationColor: '#D4AF37',
              killServiceOnDestroy: false,
            },
          }
        : {}),
    });

    return true;
  } catch {
    return false;
  }
};

/**
 * Detiene la tarea de ubicación en segundo plano y su Foreground Service si están activos.
 */
export const stopBackgroundLocationTracking = async (): Promise<void> => {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch {
    // Ignorar errores al detener la tarea si ya fue detenida por el sistema
  }
};
