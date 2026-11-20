import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Location from 'expo-location';
import type * as TaskManager from 'expo-task-manager';
import { authStorage } from '../../src/presentation/auth/store/authStorage';
import { useLocationStore } from '../../src/presentation/maps/store/useLocationStore';
import { useDriverTripStore } from '../../src/presentation/trip/store/useDriverTripStore';
import { transferApi } from '../../src/core/api/transferApi';
import { Trip } from '../../src/core/trip/interface/trip.interface';
import {
  checkBackgroundLocationPermission,
  requestBackgroundLocationPermission,
} from '../../src/core/location/actions/permissions.actions';
import { PermissionStatus } from '../../src/core/location/interface/permission.interface';
import {
  BACKGROUND_LOCATION_TASK,
  BackgroundLocationTaskData,
  executeBackgroundLocationTask,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '../../src/core/location/tasks/backgroundLocationTask';

const {
  mockPlatform,
  mockAlert,
  mockOpenSettings,
  mockIsTaskDefined,
  mockDefineTask,
} = vi.hoisted(() => ({
  mockPlatform: { OS: 'android' as 'android' | 'ios' },
  mockAlert: vi.fn(),
  mockOpenSettings: vi.fn(),
  mockIsTaskDefined: vi.fn(() => false),
  mockDefineTask: vi.fn(),
}));

vi.mock('react-native', () => ({
  Platform: mockPlatform,
  Alert: { alert: mockAlert },
  Linking: { openSettings: mockOpenSettings },
}));

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key];
      }),
      clear: vi.fn(async () => {
        store = {};
      }),
    },
  };
});

vi.mock('expo-location', () => ({
  Accuracy: {
    High: 4,
  },
  ActivityType: {
    AutomotiveNavigation: 2,
  },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  getForegroundPermissionsAsync: vi.fn(),
  requestForegroundPermissionsAsync: vi.fn(),
  getBackgroundPermissionsAsync: vi.fn(),
  requestBackgroundPermissionsAsync: vi.fn(),
  hasStartedLocationUpdatesAsync: vi.fn(),
  startLocationUpdatesAsync: vi.fn(),
  stopLocationUpdatesAsync: vi.fn(),
}));

vi.mock('expo-task-manager', () => ({
  isTaskDefined: mockIsTaskDefined,
  defineTask: mockDefineTask,
}));

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    post: vi.fn(),
  },
}));

vi.mock('../../src/presentation/auth/store/authStorage', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setTokens: vi.fn(),
    removeTokens: vi.fn(),
  },
}));

interface MockAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

const createPermissionResponse = (
  status: Location.PermissionStatus,
): Location.LocationPermissionResponse => ({
  status,
  expires: 'never',
  granted: status === Location.PermissionStatus.GRANTED,
  canAskAgain: status !== Location.PermissionStatus.DENIED,
});

const createLocationObject = (
  overrides: Partial<Location.LocationObjectCoords> & { timestamp?: number } = {},
): Location.LocationObject => {
  const { timestamp = 1730524595123.6, ...coordOverrides } = overrides;
  return {
    coords: {
      latitude: -34.6037,
      longitude: -58.3816,
      altitude: 25,
      accuracy: 8,
      altitudeAccuracy: 3,
      heading: 180,
      speed: 12.5,
      ...coordOverrides,
    },
    timestamp,
  };
};

const createTaskBody = (
  data: BackgroundLocationTaskData,
  error: TaskManager.TaskManagerError | null = null,
): TaskManager.TaskManagerTaskBody<BackgroundLocationTaskData> => ({
  data,
  error,
  executionInfo: {
    eventId: 'evt-1',
    taskName: BACKGROUND_LOCATION_TASK,
  },
});

const createMockTrip = (status: Trip['status']): Trip => ({
  id: 'trip-active-1',
  public_code: 'TB-100',
  status,
  service_type_id: 'vip',
  payment_method: 'card',
  driver_id: 'driver-1',
  vehicle_id: 'vehicle-1',
  estimated_fare: '5000',
  final_fare: '0',
  currency: 'ARS',
  confirmed_at: '2026-11-20T10:00:00.000Z',
  assigned_at: '2026-11-20T10:00:00.000Z',
  driver_arrived_at: '',
  started_at: '2026-11-20T10:05:00.000Z',
  finished_at: '',
  cancelled_at: '',
});

const initialIsTaskDefinedCalls = [...mockIsTaskDefined.mock.calls];
const initialDefineTaskCalls = [...mockDefineTask.mock.calls];

describe('backgroundLocationTask & background permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform.OS = 'android';
    useLocationStore.setState({
      lastKnownLocation: null,
      lastKnownReading: null,
      userLocationList: [],
      watchSubscription: null,
    });
    useDriverTripStore.setState({
      isAvailable: false,
      activeTrip: null,
      currentOffer: null,
      offerQueue: [],
    });
  });

  describe('module registration', () => {
    it('registers the background location task when not yet defined', () => {
      expect(initialIsTaskDefinedCalls).toContainEqual([BACKGROUND_LOCATION_TASK]);
      expect(initialDefineTaskCalls).toContainEqual([
        BACKGROUND_LOCATION_TASK,
        executeBackgroundLocationTask,
      ]);
    });
  });

  describe('executeBackgroundLocationTask', () => {
    it('returns early when task body contains an error', async () => {
      await executeBackgroundLocationTask(
        createTaskBody(
          { locations: [createLocationObject()] },
          { code: 'E_LOC', message: 'Location unavailable' },
        ),
      );

      expect(useLocationStore.getState().lastKnownLocation).toBeNull();
      expect(transferApi.post).not.toHaveBeenCalled();
    });

    it('returns early when locations array is missing or empty', async () => {
      await executeBackgroundLocationTask(createTaskBody({ locations: [] }));
      await executeBackgroundLocationTask(createTaskBody({}));

      expect(useLocationStore.getState().lastKnownLocation).toBeNull();
      expect(transferApi.post).not.toHaveBeenCalled();
    });

    it('updates useLocationStore but skips HTTP post when driver is offline and has no active trip', async () => {
      await executeBackgroundLocationTask(
        createTaskBody({
          locations: [createLocationObject({ latitude: -34.61, longitude: -58.39 })],
        }),
      );

      expect(useLocationStore.getState().lastKnownLocation).toEqual({
        latitude: -34.61,
        longitude: -58.39,
      });
      expect(authStorage.getAccessToken).not.toHaveBeenCalled();
      expect(transferApi.post).not.toHaveBeenCalled();
    });

    it('skips HTTP post when activeTrip is completed, cancelled, or draft and driver is not available', async () => {
      const inactiveStatuses: Trip['status'][] = ['completed', 'cancelled', 'draft'];

      for (const status of inactiveStatuses) {
        useDriverTripStore.setState({
          isAvailable: false,
          activeTrip: createMockTrip(status),
        });

        await executeBackgroundLocationTask(
          createTaskBody({ locations: [createLocationObject()] }),
        );
      }

      expect(transferApi.post).not.toHaveBeenCalled();
    });

    it('skips HTTP post when access token is missing', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      vi.mocked(authStorage.getAccessToken).mockResolvedValueOnce(null);

      await executeBackgroundLocationTask(
        createTaskBody({ locations: [createLocationObject()] }),
      );

      expect(authStorage.getAccessToken).toHaveBeenCalledTimes(1);
      expect(transferApi.post).not.toHaveBeenCalled();
    });

    it('posts latest reading to /driver/me/location when driver is available', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      vi.mocked(authStorage.getAccessToken).mockResolvedValueOnce('jwt-access-token');
      vi.mocked(transferApi.post).mockResolvedValueOnce({ data: { status: 'success' } });

      const first = createLocationObject({
        latitude: -34.6,
        longitude: -58.38,
        timestamp: 1730524590000,
      });
      const latest = createLocationObject({
        latitude: -34.605,
        longitude: -58.385,
        heading: 92,
        speed: 14.2,
        accuracy: 6,
        timestamp: 1730524595123.7,
      });

      await executeBackgroundLocationTask(
        createTaskBody({ locations: [first, latest] }),
      );

      expect(useLocationStore.getState().lastKnownLocation).toEqual({
        latitude: -34.605,
        longitude: -58.385,
      });
      expect(useLocationStore.getState().lastKnownReading).toEqual({
        latitude: -34.605,
        longitude: -58.385,
        heading: 92,
        speed: 14.2,
        accuracy: 6,
        timestamp: 1730524595124,
      });
      expect(transferApi.post).toHaveBeenCalledWith('/driver/me/location', {
        lat: -34.605,
        lng: -58.385,
        latitude: -34.605,
        longitude: -58.385,
        heading: 92,
        speed: 14.2,
        accuracy: 6,
        timestamp: 1730524595124,
      });
    });

    it('posts to /driver/me/location during an active trip even if isAvailable is false', async () => {
      useDriverTripStore.setState({
        isAvailable: false,
        activeTrip: createMockTrip('in_progress'),
      });
      vi.mocked(authStorage.getAccessToken).mockResolvedValueOnce('jwt-access-token');
      vi.mocked(transferApi.post).mockResolvedValueOnce({ data: { status: 'success' } });

      await executeBackgroundLocationTask(
        createTaskBody({
          locations: [
            createLocationObject({
              heading: -1,
              speed: -1,
              accuracy: null,
              timestamp: 1730524600000,
            }),
          ],
        }),
      );

      expect(transferApi.post).toHaveBeenCalledWith('/driver/me/location', {
        lat: -34.6037,
        lng: -58.3816,
        latitude: -34.6037,
        longitude: -58.3816,
        heading: null,
        speed: null,
        accuracy: null,
        timestamp: 1730524600000,
      });
    });

    it('silently catches network errors from transferApi.post', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      vi.mocked(authStorage.getAccessToken).mockResolvedValueOnce('jwt-access-token');
      vi.mocked(transferApi.post).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        executeBackgroundLocationTask(
          createTaskBody({ locations: [createLocationObject()] }),
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('startBackgroundLocationTracking', () => {
    it('returns false when foreground or background permissions are not granted', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.DENIED),
      );

      const started = await startBackgroundLocationTracking();

      expect(started).toBe(false);
      expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('returns true immediately when background location updates are already running', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(true);

      const started = await startBackgroundLocationTracking();

      expect(started).toBe(true);
      expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('starts location updates with Android foregroundService notification when granted', async () => {
      mockPlatform.OS = 'android';
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(false);
      vi.mocked(Location.startLocationUpdatesAsync).mockResolvedValueOnce();

      const started = await startBackgroundLocationTracking();

      expect(started).toBe(true);
      expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
        BACKGROUND_LOCATION_TASK,
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
          deferredUpdatesInterval: 5000,
          showsBackgroundLocationIndicator: true,
          pausesUpdatesAutomatically: false,
          activityType: Location.ActivityType.AutomotiveNavigation,
          foregroundService: {
            notificationTitle: 'Transfer Black: Estás en línea recibiendo viajes',
            notificationBody: 'Tu ubicación GPS sigue activa en segundo plano',
            notificationColor: '#D4AF37',
            killServiceOnDestroy: false,
          },
        },
      );
    });

    it('starts location updates without foregroundService on iOS', async () => {
      mockPlatform.OS = 'ios';
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(false);
      vi.mocked(Location.startLocationUpdatesAsync).mockResolvedValueOnce();

      const started = await startBackgroundLocationTracking();

      expect(started).toBe(true);
      expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith(
        BACKGROUND_LOCATION_TASK,
        expect.not.objectContaining({
          foregroundService: expect.anything(),
        }),
      );
    });

    it('returns false if startLocationUpdatesAsync throws', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(false);
      vi.mocked(Location.startLocationUpdatesAsync).mockRejectedValueOnce(
        new Error('Foreground service blocked'),
      );

      const started = await startBackgroundLocationTracking();

      expect(started).toBe(false);
    });
  });

  describe('stopBackgroundLocationTracking', () => {
    it('stops location updates when task is active', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(true);
      vi.mocked(Location.stopLocationUpdatesAsync).mockResolvedValueOnce();

      await stopBackgroundLocationTracking();

      expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledWith(
        BACKGROUND_LOCATION_TASK,
      );
    });

    it('does not call stopLocationUpdatesAsync when task is not running', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(false);

      await stopBackgroundLocationTracking();

      expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('swallows native errors when stopping location updates', async () => {
      vi.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(true);
      vi.mocked(Location.stopLocationUpdatesAsync).mockRejectedValueOnce(
        new Error('Task already unregistered'),
      );

      await expect(stopBackgroundLocationTracking()).resolves.toBeUndefined();
    });
  });

  describe('checkBackgroundLocationPermission & requestBackgroundLocationPermission', () => {
    it('maps background permission statuses correctly', async () => {
      vi.mocked(Location.getBackgroundPermissionsAsync)
        .mockResolvedValueOnce(createPermissionResponse(Location.PermissionStatus.GRANTED))
        .mockResolvedValueOnce(createPermissionResponse(Location.PermissionStatus.DENIED))
        .mockResolvedValueOnce(
          createPermissionResponse(Location.PermissionStatus.UNDETERMINED),
        );

      await expect(checkBackgroundLocationPermission()).resolves.toBe(
        PermissionStatus.GRANTED,
      );
      await expect(checkBackgroundLocationPermission()).resolves.toBe(
        PermissionStatus.DENIED,
      );
      await expect(checkBackgroundLocationPermission()).resolves.toBe(
        PermissionStatus.UNDETERMINED,
      );
    });

    it('returns DENIED when foreground permission request fails', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.UNDETERMINED),
      );
      vi.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.DENIED),
      );

      const status = await requestBackgroundLocationPermission();

      expect(status).toBe(PermissionStatus.DENIED);
      expect(Location.getBackgroundPermissionsAsync).not.toHaveBeenCalled();
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('returns GRANTED immediately if foreground and background permissions are already granted', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );

      const status = await requestBackgroundLocationPermission();

      expect(status).toBe(PermissionStatus.GRANTED);
      expect(mockAlert).not.toHaveBeenCalled();
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('shows Spanish rationale alert and returns DENIED without OS prompt when user taps Cancelar', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.UNDETERMINED),
      );
      mockAlert.mockImplementationOnce(
        (_title: string, _msg: string, buttons?: MockAlertButton[]) => {
          const cancelBtn = buttons?.find((b) => b.text === 'Cancelar');
          cancelBtn?.onPress?.();
        },
      );

      const status = await requestBackgroundLocationPermission();

      expect(status).toBe(PermissionStatus.DENIED);
      expect(mockAlert).toHaveBeenCalledWith(
        'Ubicación en segundo plano',
        'TransferBlack necesita acceso a tu ubicación "Todo el tiempo" para mantenerte en línea, reportar el recorrido y enviarte ofertas de viaje cercanas aunque uses otras aplicaciones o apagues la pantalla.',
        expect.any(Array),
      );
      expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests background permission when user taps Continuar and returns GRANTED', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.UNDETERMINED),
      );
      mockAlert.mockImplementationOnce(
        (_title: string, _msg: string, buttons?: MockAlertButton[]) => {
          const continueBtn = buttons?.find((b) => b.text === 'Continuar');
          continueBtn?.onPress?.();
        },
      );
      vi.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );

      const status = await requestBackgroundLocationPermission();

      expect(status).toBe(PermissionStatus.GRANTED);
      expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('shows settings alert with Linking.openSettings when background permission is denied after rationale', async () => {
      vi.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.GRANTED),
      );
      vi.mocked(Location.getBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.UNDETERMINED),
      );
      mockAlert
        .mockImplementationOnce(
          (_title: string, _msg: string, buttons?: MockAlertButton[]) => {
            const continueBtn = buttons?.find((b) => b.text === 'Continuar');
            continueBtn?.onPress?.();
          },
        )
        .mockImplementationOnce(
          (_title: string, _msg: string, buttons?: MockAlertButton[]) => {
            const settingsBtn = buttons?.find((b) => b.text === 'Abrir ajustes');
            expect(buttons?.some((b) => b.text === 'Cancelar')).toBe(true);
            settingsBtn?.onPress?.();
          },
        );
      vi.mocked(Location.requestBackgroundPermissionsAsync).mockResolvedValueOnce(
        createPermissionResponse(Location.PermissionStatus.DENIED),
      );

      const status = await requestBackgroundLocationPermission();

      expect(status).toBe(PermissionStatus.DENIED);
      expect(mockAlert).toHaveBeenCalledTimes(2);
      expect(mockOpenSettings).toHaveBeenCalledTimes(1);
    });
  });
});
