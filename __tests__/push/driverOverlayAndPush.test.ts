import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ExpoNotifications from 'expo-notifications';
import {
  canDrawOverlays,
  driverOverlay,
  ensureOverlayPermissionWithPrompt,
  hideOfferOverlay,
  requestOverlayPermission,
  resetOverlayPromptStateForTests,
  showOfferOverlay,
} from '../../src/core/overlay/driverOverlay';
import { isPushTripCancel, parsePushTripOffer } from '../../src/core/push/utils/pushOfferParser';
import {
  BACKGROUND_NOTIFICATION_TASK,
  TRIP_OFFERS_CHANNEL_ID,
  processBackgroundNotificationPayload,
  pushNotificationService,
  setNotificationsModuleForTests,
} from '../../src/core/push/services/pushNotificationService';
import { offerAlarmService } from '../../src/presentation/trip/services/offerAlarmService';
import { useDriverTripStore } from '../../src/presentation/trip/store/useDriverTripStore';
import { TripOfferPayload } from '../../src/core/trip/interface/trip.interface';

const {
  mockPlatform,
  mockAlert,
  mockNativeDriverOverlay,
  mockScheduleNotificationAsync,
  mockDismissAllNotificationsAsync,
  mockSetNotificationChannelAsync,
  mockGetPermissionsAsync,
  mockRequestPermissionsAsync,
  mockGetDevicePushTokenAsync,
  mockAddPushTokenListener,
  mockAddNotificationReceivedListener,
  mockAddNotificationResponseReceivedListener,
  mockRegisterTaskAsync,
  mockSetNotificationHandler,
  mockIsTaskDefined,
  mockDefineTask,
  mockIsTaskRegisteredAsync,
  mockRegisterDriverPushToken,
  mockRevokeDriverPushToken,
  mockFetchStatus,
  mockFetchDocuments,
} = vi.hoisted(() => ({
  mockPlatform: { OS: 'android' as 'android' | 'ios' },
  mockAlert: vi.fn(),
  mockNativeDriverOverlay: {
    canDrawOverlays: vi.fn<() => Promise<boolean>>(),
    requestOverlayPermission: vi.fn<() => Promise<boolean>>(),
    showOfferOverlay: vi.fn<(payload: Record<string, unknown>) => Promise<boolean>>(),
    hideOfferOverlay: vi.fn<() => Promise<boolean>>(),
  },
  mockScheduleNotificationAsync: vi.fn(async () => 'notif-id-1'),
  mockDismissAllNotificationsAsync: vi.fn(async () => undefined),
  mockSetNotificationChannelAsync: vi.fn(async () => null),
  mockGetPermissionsAsync: vi.fn(async () => ({ granted: false, status: 'undetermined' })),
  mockRequestPermissionsAsync: vi.fn(async () => ({ granted: true, status: 'granted' })),
  mockGetDevicePushTokenAsync: vi.fn(async () => ({ data: 'fcm-token-123', type: 'fcm' })),
  mockAddPushTokenListener: vi.fn(() => ({ remove: vi.fn() })),
  mockAddNotificationReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  mockAddNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  mockRegisterTaskAsync: vi.fn(async () => undefined),
  mockSetNotificationHandler: vi.fn(),
  mockIsTaskDefined: vi.fn(() => false),
  mockDefineTask: vi.fn(),
  mockIsTaskRegisteredAsync: vi.fn(async () => false),
  mockRegisterDriverPushToken: vi.fn(async () => ({ success: true })),
  mockRevokeDriverPushToken: vi.fn(async () => ({ success: true })),
  mockFetchStatus: vi.fn(async () => null),
  mockFetchDocuments: vi.fn(async () => []),
}));

vi.mock('react-native', () => ({
  Platform: mockPlatform,
  Alert: { alert: mockAlert },
  NativeModules: {
    DriverOverlay: mockNativeDriverOverlay,
  },
  Vibration: {
    vibrate: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('expo-constants', () => ({
  default: { appOwnership: null },
  AppOwnership: { Expo: 'expo' },
}));

vi.mock('expo-device', () => ({
  isDevice: true,
}));

vi.mock('expo-notifications', () => ({
  AndroidNotificationPriority: {
    MAX: 'max',
  },
  AndroidImportance: {
    MAX: 5,
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1,
  },
  setNotificationHandler: mockSetNotificationHandler,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  dismissAllNotificationsAsync: mockDismissAllNotificationsAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getDevicePushTokenAsync: mockGetDevicePushTokenAsync,
  addPushTokenListener: mockAddPushTokenListener,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  registerTaskAsync: mockRegisterTaskAsync,
}));

vi.mock('expo-task-manager', () => ({
  isTaskDefined: mockIsTaskDefined,
  defineTask: mockDefineTask,
  isTaskRegisteredAsync: mockIsTaskRegisteredAsync,
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

vi.mock('../../src/core/push/actions/pushToken.actions', () => ({
  registerDriverPushToken: mockRegisterDriverPushToken,
  revokeDriverPushToken: mockRevokeDriverPushToken,
}));

vi.mock('../../src/presentation/driver/store/useDriverStatusStore', () => ({
  useDriverStatusStore: {
    getState: () => ({
      fetchStatus: mockFetchStatus,
      fetchDocuments: mockFetchDocuments,
    }),
  },
}));

interface MockAlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

const createSampleOffer = (overrides: Partial<TripOfferPayload> = {}): TripOfferPayload => ({
  tripId: 'trip-101',
  offerId: 'offer-202',
  ttlSeconds: 20,
  expiresAt: new Date(Date.now() + 20_000).toISOString(),
  fare: {
    netEarnings: 36000,
    totalFare: 45000,
    commission: 9000,
    currency: 'ARS',
    paymentMethod: 'electronic',
  },
  pickup: {
    address: 'Av. del Libertador 4200',
    subtitle: null,
    etaMinutes: 4,
  },
  dropoff: {
    address: 'Aeroparque Jorge Newbery',
    subtitle: null,
    durationMinutes: 18,
  },
  passenger: {
    fullName: 'María López',
    rating: 4.95,
    category: 'Black',
    preferences: [],
  },
  ...overrides,
});

const initialIsTaskDefinedCalls = [...mockIsTaskDefined.mock.calls];
const initialDefineTaskCalls = [...mockDefineTask.mock.calls];

const mockNotificationsModule = {
  AndroidNotificationPriority: {
    MAX: 'max',
  },
  AndroidImportance: {
    MAX: 5,
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1,
  },
  setNotificationHandler: mockSetNotificationHandler,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  dismissAllNotificationsAsync: mockDismissAllNotificationsAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getDevicePushTokenAsync: mockGetDevicePushTokenAsync,
  addPushTokenListener: mockAddPushTokenListener,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  registerTaskAsync: mockRegisterTaskAsync,
} as unknown as typeof ExpoNotifications;

describe('driverOverlay bridge, pushOfferParser & background push processing', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockPlatform.OS = 'android';
    resetOverlayPromptStateForTests();
    setNotificationsModuleForTests(mockNotificationsModule);
    await offerAlarmService.stop();
    useDriverTripStore.setState({
      isAvailable: true,
      activeTrip: null,
      currentOffer: null,
      offerQueue: [],
    });
  });

  afterEach(async () => {
    await offerAlarmService.stop();
  });

  describe('background task registration', () => {
    it('defines BACKGROUND_NOTIFICATION_TASK at module load', () => {
      expect(initialIsTaskDefinedCalls).toContainEqual([BACKGROUND_NOTIFICATION_TASK]);
      expect(initialDefineTaskCalls).toContainEqual([
        BACKGROUND_NOTIFICATION_TASK,
        expect.any(Function),
      ]);
    });
  });

  describe('driverOverlay', () => {
    it('returns false / no-ops safely on iOS without touching native module or Alert', async () => {
      mockPlatform.OS = 'ios';

      await expect(canDrawOverlays()).resolves.toBe(false);
      await expect(requestOverlayPermission()).resolves.toBe(false);
      await expect(ensureOverlayPermissionWithPrompt()).resolves.toBe(false);
      await expect(showOfferOverlay(createSampleOffer())).resolves.toBe(false);
      await expect(hideOfferOverlay()).resolves.toBeUndefined();

      expect(mockNativeDriverOverlay.canDrawOverlays).not.toHaveBeenCalled();
      expect(mockNativeDriverOverlay.requestOverlayPermission).not.toHaveBeenCalled();
      expect(mockNativeDriverOverlay.showOfferOverlay).not.toHaveBeenCalled();
      expect(mockNativeDriverOverlay.hideOfferOverlay).not.toHaveBeenCalled();
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('delegates canDrawOverlays and requestOverlayPermission to DriverOverlay native module on Android', async () => {
      mockNativeDriverOverlay.canDrawOverlays.mockResolvedValueOnce(true);
      mockNativeDriverOverlay.requestOverlayPermission.mockResolvedValueOnce(true);

      await expect(canDrawOverlays()).resolves.toBe(true);
      await expect(requestOverlayPermission()).resolves.toBe(true);

      expect(mockNativeDriverOverlay.canDrawOverlays).toHaveBeenCalledTimes(1);
      expect(mockNativeDriverOverlay.requestOverlayPermission).toHaveBeenCalledTimes(1);
    });

    it('ensureOverlayPermissionWithPrompt skips alert when permission is already granted', async () => {
      mockNativeDriverOverlay.canDrawOverlays.mockResolvedValueOnce(true);

      await expect(ensureOverlayPermissionWithPrompt()).resolves.toBe(true);
      expect(mockAlert).not.toHaveBeenCalled();
    });

    it('ensureOverlayPermissionWithPrompt shows Spanish alert once per session and opens settings on Configurar', async () => {
      mockNativeDriverOverlay.canDrawOverlays.mockResolvedValue(false);
      mockNativeDriverOverlay.requestOverlayPermission.mockResolvedValueOnce(true);

      mockAlert.mockImplementationOnce(
        (_title: string, _msg: string, buttons?: MockAlertButton[]) => {
          const configBtn = buttons?.find((b) => b.text === 'Configurar');
          configBtn?.onPress?.();
        }
      );

      await expect(ensureOverlayPermissionWithPrompt()).resolves.toBe(true);
      expect(mockAlert).toHaveBeenCalledWith(
        'Mostrar ofertas sobre otras apps',
        'Para ver una burbuja flotante cuando entra un viaje mientras usás Waze o WhatsApp (estilo DiDi), habilitá el permiso "Mostrar sobre otras apps".',
        expect.any(Array),
        expect.any(Object)
      );
      expect(mockNativeDriverOverlay.requestOverlayPermission).toHaveBeenCalledTimes(1);

      // Segunda llamada en la misma sesión no vuelve a mostrar el alert
      await expect(ensureOverlayPermissionWithPrompt()).resolves.toBe(false);
      expect(mockAlert).toHaveBeenCalledTimes(1);
    });

    it('ensureOverlayPermissionWithPrompt resolves false when user taps Ahora no', async () => {
      mockNativeDriverOverlay.canDrawOverlays.mockResolvedValueOnce(false);
      mockAlert.mockImplementationOnce(
        (_title: string, _msg: string, buttons?: MockAlertButton[]) => {
          const dismissBtn = buttons?.find((b) => b.text === 'Ahora no');
          dismissBtn?.onPress?.();
        }
      );

      await expect(ensureOverlayPermissionWithPrompt()).resolves.toBe(false);
      expect(mockNativeDriverOverlay.requestOverlayPermission).not.toHaveBeenCalled();
    });

    it('showOfferOverlay forwards normalized payload to native module and skips expired offers', async () => {
      mockNativeDriverOverlay.showOfferOverlay.mockResolvedValueOnce(true);
      const validOffer = createSampleOffer();

      await expect(showOfferOverlay(validOffer)).resolves.toBe(true);
      expect(mockNativeDriverOverlay.showOfferOverlay).toHaveBeenCalledWith({
        offerId: 'offer-202',
        tripId: 'trip-101',
        price: 45000,
        fare: 36000,
        origin: 'Av. del Libertador 4200',
        destination: 'Aeroparque Jorge Newbery',
        ttlSeconds: expect.any(Number),
      });

      const expiredOffer = createSampleOffer({
        expiresAt: new Date(Date.now() - 5_000).toISOString(),
      });
      await expect(showOfferOverlay(expiredOffer)).resolves.toBe(false);
      expect(mockNativeDriverOverlay.showOfferOverlay).toHaveBeenCalledTimes(1);
    });

    it('hideOfferOverlay invokes native module hideOfferOverlay on Android', async () => {
      mockNativeDriverOverlay.hideOfferOverlay.mockResolvedValueOnce(true);

      await hideOfferOverlay();
      expect(mockNativeDriverOverlay.hideOfferOverlay).toHaveBeenCalledTimes(1);
    });
  });

  describe('parsePushTripOffer & isPushTripCancel', () => {
    const baseNow = new Date('2026-11-20T12:00:00.000Z').getTime();

    it('accepts NEW_TRIP_OFFER via type or eventType and parses numeric/string fare & price', () => {
      const payload = {
        type: 'NEW_TRIP_OFFER',
        eventType: 'NEW_TRIP_OFFER',
        offerId: 'offer-new-1',
        tripId: 'trip-new-1',
        expiresAt: '2026-11-20T12:00:20.000Z',
        origin: 'Palermo Soho',
        destination: 'Puerto Madero',
        price: '48000',
        fare: '38400',
      };

      const parsed = parsePushTripOffer(payload, baseNow);
      expect(parsed).not.toBeNull();
      expect(parsed?.offerId).toBe('offer-new-1');
      expect(parsed?.tripId).toBe('trip-new-1');
      expect(parsed?.ttlSeconds).toBe(20);
      expect(parsed?.fare.totalFare).toBe(48000);
      expect(parsed?.fare.netEarnings).toBe(38400);
    });

    it('parses fare when passed as JSON string or object { totalFare, netEarnings }', () => {
      const jsonFarePayload = {
        eventType: 'NEW_TRIP_OFFER',
        offerId: 'offer-json-1',
        tripId: 'trip-json-1',
        expiresAt: '2026-11-20T12:00:15.000Z',
        fare: JSON.stringify({ totalFare: 52000, netEarnings: 41600 }),
      };

      const parsedJson = parsePushTripOffer(jsonFarePayload, baseNow);
      expect(parsedJson?.fare.totalFare).toBe(52000);
      expect(parsedJson?.fare.netEarnings).toBe(41600);

      const objectFarePayload = {
        type: 'trip:offer',
        offerId: 'offer-obj-1',
        tripId: 'trip-obj-1',
        expiresAt: '2026-11-20T12:00:15.000Z',
        fare: { totalFare: 60000, netEarnings: 48000 },
      };

      const parsedObj = parsePushTripOffer(objectFarePayload, baseNow);
      expect(parsedObj?.fare.totalFare).toBe(60000);
      expect(parsedObj?.fare.netEarnings).toBe(48000);
    });

    it('falls back to fare when price is empty string', () => {
      const payload = {
        type: 'trip:offer',
        eventType: 'NEW_TRIP_OFFER',
        offerId: 'offer-fallback-1',
        tripId: 'trip-fallback-1',
        expiresAt: '2026-11-20T12:00:20.000Z',
        price: '',
        fare: '35000',
      };

      const parsed = parsePushTripOffer(payload, baseNow);
      expect(parsed?.fare.totalFare).toBe(35000);
      expect(parsed?.fare.netEarnings).toBe(35000);
    });

    it('recognizes cancellation payloads with type trip:offer:cancel or eventType TRIP_OFFER_CANCELLED', () => {
      expect(
        isPushTripCancel({
          type: 'trip:offer:cancel',
          offerId: 'offer-1',
          tripId: 'trip-1',
        })
      ).toBe(true);

      expect(
        isPushTripCancel({
          eventType: 'TRIP_OFFER_CANCELLED',
          offerId: 'offer-2',
          tripId: 'trip-2',
        })
      ).toBe(true);

      expect(
        isPushTripCancel({
          eventType: 'OTHER_EVENT',
          offerId: 'offer-2',
          tripId: 'trip-2',
        })
      ).toBe(false);
    });
  });

  describe('processBackgroundNotificationPayload', () => {
    it('starts alarm, enqueues offer, shows native overlay, and schedules high-priority notification on new offer', async () => {
      const startAlarmSpy = vi.spyOn(offerAlarmService, 'start');
      const showOverlaySpy = vi
        .spyOn(driverOverlay, 'showOfferOverlay')
        .mockResolvedValueOnce(true);

      const rawOfferPayload = {
        type: 'trip:offer',
        eventType: 'NEW_TRIP_OFFER',
        offerId: 'offer-bg-1',
        tripId: 'trip-bg-1',
        expiresAt: new Date(Date.now() + 25_000).toISOString(),
        ttlSeconds: '25',
        origin: 'Av. Santa Fe 3200',
        destination: 'Ezeiza Terminal A',
        price: '75000',
        fare: '60000',
      };

      await processBackgroundNotificationPayload(rawOfferPayload);

      expect(startAlarmSpy).toHaveBeenCalledTimes(1);
      expect(useDriverTripStore.getState().currentOffer?.offerId).toBe('offer-bg-1');
      expect(showOverlaySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          offerId: 'offer-bg-1',
          tripId: 'trip-bg-1',
        })
      );
      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.objectContaining({
          data: rawOfferPayload,
          categoryIdentifier: 'trip-offer',
          sound: 'default',
          priority: 'max',
          vibrate: [0, 500, 200, 500],
        }),
        trigger: { channelId: TRIP_OFFERS_CHANNEL_ID },
      });
    });

    it('hides overlay, stops alarm, dismisses notifications, and cancels offer on cancel payload', async () => {
      useDriverTripStore.getState().enqueueOffer(
        createSampleOffer({
          offerId: 'offer-cancel-1',
          tripId: 'trip-cancel-1',
        })
      );

      const stopAlarmSpy = vi.spyOn(offerAlarmService, 'stop');
      const hideOverlaySpy = vi
        .spyOn(driverOverlay, 'hideOfferOverlay')
        .mockResolvedValueOnce();

      await processBackgroundNotificationPayload({
        type: 'trip:offer:cancel',
        eventType: 'TRIP_OFFER_CANCELLED',
        offerId: 'offer-cancel-1',
        tripId: 'trip-cancel-1',
        reason: 'taken',
      });

      expect(hideOverlaySpy).toHaveBeenCalledTimes(1);
      expect(stopAlarmSpy).toHaveBeenCalledTimes(1);
      expect(mockDismissAllNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(useDriverTripStore.getState().currentOffer).toBeNull();
    });

    it('ignores expired offer payloads without triggering alarm, overlay, or local notification', async () => {
      const startAlarmSpy = vi.spyOn(offerAlarmService, 'start');
      const showOverlaySpy = vi.spyOn(driverOverlay, 'showOfferOverlay');

      await processBackgroundNotificationPayload({
        type: 'NEW_TRIP_OFFER',
        offerId: 'offer-expired',
        tripId: 'trip-expired',
        expiresAt: new Date(Date.now() - 10_000).toISOString(),
        price: '30000',
      });

      expect(startAlarmSpy).not.toHaveBeenCalled();
      expect(showOverlaySpy).not.toHaveBeenCalled();
      expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
      expect(useDriverTripStore.getState().currentOffer).toBeNull();
    });

    it('requests allowTimeSensitive on iOS during pushNotificationService.initialize()', async () => {
      mockPlatform.OS = 'ios';
      await pushNotificationService.revoke();

      await pushNotificationService.initialize();

      expect(mockRequestPermissionsAsync).toHaveBeenCalledWith({
        ios: expect.objectContaining({
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowTimeSensitive: true,
        }),
      });
      expect(mockRegisterDriverPushToken).toHaveBeenCalledWith({
        token: 'fcm-token-123',
        platform: 'ios',
        provider: 'fcm',
      });

      await pushNotificationService.revoke();
    });
  });
});
