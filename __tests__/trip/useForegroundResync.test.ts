import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppStateStatus } from 'react-native';

const {
  mockAppState,
  mockAppStateRemove,
  mockLinkingParse,
  mockLinkingAddEventListener,
  mockLinkingGetInitialURL,
  mockLinkingRemove,
  mockTransferApiGet,
  mockSocket,
  mockAuthStorageGetAccessToken,
  mockNativeDriverOverlay,
  mockVibrationCancel,
  mockUseEffectCleanups,
  appStateListeners,
  linkingListeners,
} = vi.hoisted(() => {
  const appListeners = new Set<(state: AppStateStatus) => void>();
  const urlListeners = new Set<(event: { url: string }) => void>();
  const cleanups: (() => void)[] = [];

  const mockRemoveApp = vi.fn();
  const mockRemoveUrl = vi.fn();

  return {
    appStateListeners: appListeners,
    linkingListeners: urlListeners,
    mockUseEffectCleanups: cleanups,
    mockAppStateRemove: mockRemoveApp,
    mockLinkingRemove: mockRemoveUrl,
    mockAppState: {
      currentState: 'active' as AppStateStatus,
      addEventListener: vi.fn((_event: 'change', cb: (state: AppStateStatus) => void) => {
        appListeners.add(cb);
        return {
          remove: () => {
            mockRemoveApp();
            appListeners.delete(cb);
          },
        };
      }),
    },
    mockLinkingParse: vi.fn((url: string) => {
      const parsed = new URL(url);
      const queryParams: Record<string, string> = {};
      parsed.searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
      const cleanedPath = parsed.pathname.replace(/^\/+/, '');
      return {
        scheme: parsed.protocol.replace(/:$/, '') || null,
        hostname: parsed.hostname || null,
        path: cleanedPath || null,
        queryParams,
      };
    }),
    mockLinkingAddEventListener: vi.fn((_type: 'url', cb: (event: { url: string }) => void) => {
      urlListeners.add(cb);
      return {
        remove: () => {
          mockRemoveUrl();
          urlListeners.delete(cb);
        },
      };
    }),
    mockLinkingGetInitialURL: vi.fn<() => Promise<string | null>>(async () => null),
    mockTransferApiGet: vi.fn(),
    mockSocket: {
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    mockAuthStorageGetAccessToken: vi.fn<() => Promise<string | null>>(async () => 'jwt-token-123'),
    mockNativeDriverOverlay: {
      canDrawOverlays: vi.fn(async () => true),
      requestOverlayPermission: vi.fn(async () => true),
      showOfferOverlay: vi.fn(async () => true),
      hideOfferOverlay: vi.fn(async () => true),
    },
    mockVibrationCancel: vi.fn(),
  };
});

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useRef: <T,>(initialValue: T) => ({ current: initialValue }),
    useEffect: (effect: () => void | (() => void)) => {
      const cleanup = effect();
      if (typeof cleanup === 'function') {
        mockUseEffectCleanups.push(cleanup);
      }
    },
  };
});

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: vi.fn() },
  AppState: mockAppState,
  NativeModules: {
    DriverOverlay: mockNativeDriverOverlay,
  },
  Vibration: {
    vibrate: vi.fn(),
    cancel: mockVibrationCancel,
  },
}));

vi.mock('expo-linking', () => ({
  parse: mockLinkingParse,
  addEventListener: mockLinkingAddEventListener,
  getInitialURL: mockLinkingGetInitialURL,
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

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    get: mockTransferApiGet,
    post: vi.fn(),
  },
}));

vi.mock('../../src/core/socket/socket', () => ({
  socket: mockSocket,
}));

vi.mock('../../src/presentation/auth/store/authStorage', () => ({
  authStorage: {
    getAccessToken: mockAuthStorageGetAccessToken,
    getRefreshToken: vi.fn(async () => null),
    setTokens: vi.fn(),
    removeTokens: vi.fn(),
  },
}));

import {
  getPendingDriverOffers,
  TripRequestError,
} from '../../src/core/trip/actions/trip.actions';
import {
  ActiveTripSummary,
  Trip,
  TripOfferPayload,
} from '../../src/core/trip/interface/trip.interface';
import { driverOverlay } from '../../src/core/overlay/driverOverlay';
import { offerAlarmService } from '../../src/presentation/trip/services/offerAlarmService';
import { useDriverTripStore } from '../../src/presentation/trip/store/useDriverTripStore';
import {
  extractDeepLinkOfferParams,
  reconcileForegroundDriverState,
  useForegroundResync,
} from '../../src/presentation/trip/hooks/useForegroundResync';

const BASE_NOW_ISO = '2026-11-20T12:00:00.000Z';
const BASE_NOW_MS = new Date(BASE_NOW_ISO).getTime();

const createSampleOffer = (
  overrides: Partial<TripOfferPayload> = {}
): TripOfferPayload => ({
  tripId: 'trip-1',
  offerId: 'offer-1',
  ttlSeconds: 30,
  expiresAt: new Date(BASE_NOW_MS + 20_000).toISOString(),
  fare: {
    netEarnings: 4000,
    totalFare: 5000,
    commission: 1000,
    currency: 'ARS',
    paymentMethod: 'cash',
  },
  pickup: {
    address: 'Av. Colón 123',
    subtitle: 'Centro',
    etaMinutes: 5,
  },
  dropoff: {
    address: 'Aeropuerto Taravella',
    subtitle: null,
    durationMinutes: 18,
  },
  passenger: {
    fullName: 'Lucía Fernández',
    rating: 4.9,
    category: 'Black',
    preferences: [],
  },
  ...overrides,
});

const sampleActiveTripSummary: ActiveTripSummary = {
  id: 'trip-live-99',
  code: 'TB-LIVE99',
  status: 'driver_arriving',
  origin: { address: 'Origen 1', latitude: -31.41, longitude: -64.18 },
  destination: { address: 'Destino 2', latitude: -31.42, longitude: -64.19 },
  passenger: { id: 'pax-1', firstName: 'Carlos', phone: '+5493511111111' },
  fare: 6500,
  startedAt: null,
  paymentMethod: 'card',
};

const sampleFullTrip: Trip = {
  id: 'trip-live-99',
  public_code: 'TB-LIVE99',
  status: 'driver_arriving',
  service_type_id: 'black',
  payment_method: 'card',
  driver_id: 'drv-1',
  vehicle_id: 'veh-1',
  estimated_fare: '6500',
  final_fare: '6500',
  currency: 'ARS',
  confirmed_at: BASE_NOW_ISO,
  assigned_at: BASE_NOW_ISO,
  driver_arrived_at: '',
  started_at: '',
  finished_at: '',
  cancelled_at: '',
};

const flushMicrotasks = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) {
    await Promise.resolve();
  }
};

describe('getPendingDriverOffers, extractDeepLinkOfferParams & useForegroundResync', () => {
  beforeEach(async () => {
    await offerAlarmService.stop();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_NOW_MS);

    appStateListeners.clear();
    linkingListeners.clear();
    mockUseEffectCleanups.length = 0;

    mockAppState.currentState = 'active';
    mockSocket.connected = false;
    mockAuthStorageGetAccessToken.mockResolvedValue('jwt-token-123');
    mockLinkingGetInitialURL.mockResolvedValue(null);

    useDriverTripStore.setState({
      isAvailable: false,
      activeTrip: null,
      currentOffer: null,
      offerQueue: [],
    });
  });

  afterEach(async () => {
    while (mockUseEffectCleanups.length > 0) {
      const cleanup = mockUseEffectCleanups.pop();
      cleanup?.();
    }
    await offerAlarmService.stop();
    vi.useRealTimers();
  });

  describe('getPendingDriverOffers', () => {
    it('returns offers and serverNow from GET /driver/me/offers/pending', async () => {
      const offer = createSampleOffer();
      mockTransferApiGet.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {
            offers: [offer],
            serverNow: BASE_NOW_ISO,
          },
        },
      });

      const result = await getPendingDriverOffers();

      expect(mockTransferApiGet).toHaveBeenCalledWith('/driver/me/offers/pending');
      expect(result).toEqual({
        offers: [offer],
        serverNow: BASE_NOW_ISO,
      });
    });

    it('falls back to empty array and current ISO timestamp when response fields are missing', async () => {
      mockTransferApiGet.mockResolvedValueOnce({
        data: {
          status: 'success',
          data: {},
        },
      });

      const result = await getPendingDriverOffers();

      expect(result).toEqual({
        offers: [],
        serverNow: BASE_NOW_ISO,
      });
    });

    it('throws TripRequestError with API message, status and code on failure', async () => {
      mockTransferApiGet.mockRejectedValueOnce({
        response: {
          status: 503,
          data: {
            error: {
              message: 'Servicio temporalmente no disponible',
              code: 'SERVICE_UNAVAILABLE',
            },
          },
        },
      });

      await expect(getPendingDriverOffers()).rejects.toMatchObject({
        name: 'TripRequestError',
        message: 'Servicio temporalmente no disponible',
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
      });
    });

    it('throws TripRequestError with fallback Spanish message when error payload has no message', async () => {
      mockTransferApiGet.mockRejectedValueOnce(new Error('Network Error'));

      let caught: unknown;
      try {
        await getPendingDriverOffers();
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(TripRequestError);
      expect((caught as TripRequestError).message).toBe(
        'Error al consultar ofertas pendientes del conductor'
      );
    });
  });

  describe('extractDeepLinkOfferParams', () => {
    it('parses offerId and tripId from query params', () => {
      expect(
        extractDeepLinkOfferParams(
          'transferblackconductor://?offerId=offer-42&tripId=trip-84'
        )
      ).toEqual({
        offerId: 'offer-42',
        tripId: 'trip-84',
      });
    });

    it('parses offerId from path-based deep link formats', () => {
      expect(
        extractDeepLinkOfferParams('transferblackconductor://offer/offer-500')
      ).toEqual({
        offerId: 'offer-500',
        tripId: null,
      });

      expect(
        extractDeepLinkOfferParams(
          'transferblackconductor://offer/offer-501?tripId=trip-900'
        )
      ).toEqual({
        offerId: 'offer-501',
        tripId: 'trip-900',
      });

      expect(
        extractDeepLinkOfferParams('transferblackconductor:///offer/offer-502')
      ).toEqual({
        offerId: 'offer-502',
        tripId: null,
      });
    });

    it('falls back to URLSearchParams/regex when Linking.parse throws', () => {
      mockLinkingParse.mockImplementationOnce(() => {
        throw new Error('Malformed URI');
      });

      expect(
        extractDeepLinkOfferParams(
          'transferblackconductor://?offerId=offer-fb&tripId=trip-fb'
        )
      ).toEqual({
        offerId: 'offer-fb',
        tripId: 'trip-fb',
      });
    });

    it('returns null params for empty, nullish or unrelated URLs', () => {
      expect(extractDeepLinkOfferParams(null)).toEqual({ offerId: null, tripId: null });
      expect(extractDeepLinkOfferParams(undefined)).toEqual({
        offerId: null,
        tripId: null,
      });
      expect(extractDeepLinkOfferParams('')).toEqual({ offerId: null, tripId: null });
      expect(extractDeepLinkOfferParams('transferblackconductor://')).toEqual({
        offerId: null,
        tripId: null,
      });
    });
  });

  describe('reconcileForegroundDriverState', () => {
    it('hides floating overlay and reconnects disconnected socket when driver is available', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      const hideOverlaySpy = vi.spyOn(driverOverlay, 'hideOfferOverlay');

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          return { data: { status: 'success', data: { offers: [], serverNow: BASE_NOW_ISO } } };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState();

      expect(hideOverlaySpy).toHaveBeenCalledTimes(1);
      expect(mockAuthStorageGetAccessToken).toHaveBeenCalledTimes(1);
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('does not reconnect socket when access token is missing or socket is already connected', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      mockAuthStorageGetAccessToken.mockResolvedValueOnce(null);

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          return { data: { status: 'success', data: { offers: [], serverNow: BASE_NOW_ISO } } };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState();
      expect(mockSocket.connect).not.toHaveBeenCalled();

      mockSocket.connected = true;
      await reconcileForegroundDriverState();
      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('clears stale offers and stops alarm when getPendingDriverOffers returns empty array', async () => {
      const staleOffer = createSampleOffer({ offerId: 'offer-stale', tripId: 'trip-stale' });
      useDriverTripStore.setState({
        isAvailable: true,
        currentOffer: staleOffer,
        offerQueue: [{ offer: createSampleOffer({ offerId: 'offer-q', tripId: 'trip-q' }), receivedAt: BASE_NOW_MS }],
      });
      await offerAlarmService.start();
      const stopAlarmSpy = vi.spyOn(offerAlarmService, 'stop');

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          return {
            data: {
              status: 'success',
              data: { offers: [], serverNow: BASE_NOW_ISO },
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState();

      expect(useDriverTripStore.getState().currentOffer).toBeNull();
      expect(useDriverTripStore.getState().offerQueue).toEqual([]);
      expect(stopAlarmSpy).toHaveBeenCalledTimes(1);
    });

    it('rehydrates valid offers with recalculated ttlSeconds from serverNow and prioritizes deep-linked offerId', async () => {
      useDriverTripStore.setState({ isAvailable: true });

      const expiredOffer = createSampleOffer({
        offerId: 'offer-expired',
        tripId: 'trip-expired',
        ttlSeconds: 30,
        expiresAt: new Date(BASE_NOW_MS - 1000).toISOString(),
      });
      const firstValidOffer = createSampleOffer({
        offerId: 'offer-first',
        tripId: 'trip-first',
        ttlSeconds: 30,
        expiresAt: new Date(BASE_NOW_MS + 18_500).toISOString(),
      });
      const deepLinkedOffer = createSampleOffer({
        offerId: 'offer-target',
        tripId: 'trip-target',
        ttlSeconds: 30,
        expiresAt: new Date(BASE_NOW_MS + 12_900).toISOString(),
      });
      const noExpiresOffer = createSampleOffer({
        offerId: 'offer-no-exp',
        tripId: 'trip-no-exp',
        ttlSeconds: 15,
        expiresAt: null,
      });

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          return {
            data: {
              status: 'success',
              data: {
                offers: [expiredOffer, firstValidOffer, deepLinkedOffer, noExpiresOffer],
                serverNow: BASE_NOW_ISO,
              },
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState({
        deepLinkUrl: 'transferblackconductor://?offerId=offer-target&tripId=trip-target',
      });

      const state = useDriverTripStore.getState();
      expect(state.currentOffer?.offerId).toBe('offer-target');
      expect(state.currentOffer?.ttlSeconds).toBe(12);
      expect(state.offerQueue.map((item) => item.offer.offerId)).toEqual([
        'offer-first',
        'offer-no-exp',
      ]);
      expect(state.offerQueue[0].offer.ttlSeconds).toBe(18);
      expect(state.offerQueue[1].offer.ttlSeconds).toBe(15);
    });

    it('clears offers and stops alarm if syncActiveTripState reveals an active trip', async () => {
      const pendingOffer = createSampleOffer();
      useDriverTripStore.setState({
        isAvailable: true,
        currentOffer: pendingOffer,
      });
      await offerAlarmService.start();
      const stopAlarmSpy = vi.spyOn(offerAlarmService, 'stop');

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return {
            data: { status: 'success', data: { trip: sampleActiveTripSummary } },
          };
        }
        if (url === `/rides/${sampleActiveTripSummary.id}`) {
          return { data: { data: sampleFullTrip } };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState();

      expect(useDriverTripStore.getState().activeTrip?.id).toBe(sampleFullTrip.id);
      expect(useDriverTripStore.getState().currentOffer).toBeNull();
      expect(useDriverTripStore.getState().offerQueue).toEqual([]);
      expect(stopAlarmSpy).toHaveBeenCalledTimes(1);
      expect(mockTransferApiGet).not.toHaveBeenCalledWith('/driver/me/offers/pending');
    });

    it('performs local expiration fallback when getPendingDriverOffers rejects with a network error', async () => {
      const expiredOffer = createSampleOffer({
        offerId: 'offer-local-expired',
        tripId: 'trip-local-expired',
        expiresAt: new Date(BASE_NOW_MS - 2000).toISOString(),
      });
      useDriverTripStore.setState({
        isAvailable: true,
        currentOffer: expiredOffer,
        offerQueue: [],
      });
      await offerAlarmService.start();
      const stopAlarmSpy = vi.spyOn(offerAlarmService, 'stop');

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          throw new Error('Network request failed');
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState();

      expect(useDriverTripStore.getState().currentOffer).toBeNull();
      expect(stopAlarmSpy).toHaveBeenCalledTimes(1);
    });

    it('promotes next valid queued offer and keeps alarm when local offer expired during network error', async () => {
      const expiredOffer = createSampleOffer({
        offerId: 'offer-local-expired',
        tripId: 'trip-local-expired',
        expiresAt: new Date(BASE_NOW_MS - 2000).toISOString(),
      });
      const queuedValidOffer = createSampleOffer({
        offerId: 'offer-queued-valid',
        tripId: 'trip-queued-valid',
        ttlSeconds: 20,
        expiresAt: new Date(BASE_NOW_MS + 15_000).toISOString(),
      });

      useDriverTripStore.setState({
        isAvailable: true,
        currentOffer: expiredOffer,
        offerQueue: [{ offer: queuedValidOffer, receivedAt: BASE_NOW_MS }],
      });
      const stopAlarmSpy = vi.spyOn(offerAlarmService, 'stop');

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          throw new Error('Offline');
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState();

      expect(useDriverTripStore.getState().currentOffer?.offerId).toBe(
        'offer-queued-valid'
      );
      expect(stopAlarmSpy).not.toHaveBeenCalled();
    });

    it('keeps currentOffer when getPendingDriverOffers fails and local offer has not expired yet', async () => {
      const stillValidOffer = createSampleOffer({
        offerId: 'offer-valid-local',
        expiresAt: new Date(BASE_NOW_MS + 10_000).toISOString(),
      });
      useDriverTripStore.setState({
        isAvailable: true,
        currentOffer: stillValidOffer,
      });
      const stopAlarmSpy = vi.spyOn(offerAlarmService, 'stop');

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          throw new Error('Timeout');
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      await reconcileForegroundDriverState();

      expect(useDriverTripStore.getState().currentOffer?.offerId).toBe(
        'offer-valid-local'
      );
      expect(stopAlarmSpy).not.toHaveBeenCalled();
    });
  });

  describe('useForegroundResync hook', () => {
    it('reconciles on background/inactive -> active transitions and avoids duplicate concurrent runs', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      mockAppState.currentState = 'background';

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          return {
            data: { status: 'success', data: { offers: [], serverNow: BASE_NOW_ISO } },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      useForegroundResync();
      expect(mockAppState.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
      expect(mockLinkingAddEventListener).toHaveBeenCalledWith(
        'url',
        expect.any(Function)
      );

      // Disparar transición background -> active y duplicado simultáneo
      for (const listener of appStateListeners) {
        listener('active');
        listener('background');
        listener('active');
      }

      await flushMicrotasks();
      await flushMicrotasks();

      const pendingCalls = mockTransferApiGet.mock.calls.filter(
        ([url]) => url === '/driver/me/offers/pending'
      );
      expect(pendingCalls).toHaveLength(1);
    });

    it('handles incoming Linking url events and initialURL containing offerId/tripId', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      mockLinkingGetInitialURL.mockResolvedValueOnce(
        'transferblackconductor://?offerId=offer-init&tripId=trip-init'
      );

      const initialOffer = createSampleOffer({
        offerId: 'offer-init',
        tripId: 'trip-init',
      });
      const eventOffer = createSampleOffer({
        offerId: 'offer-event',
        tripId: 'trip-event',
      });

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          return {
            data: {
              status: 'success',
              data: {
                offers: [eventOffer, initialOffer],
                serverNow: BASE_NOW_ISO,
              },
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      useForegroundResync();
      await flushMicrotasks();
      await flushMicrotasks();

      expect(useDriverTripStore.getState().currentOffer?.offerId).toBe('offer-init');

      for (const listener of linkingListeners) {
        listener({ url: 'transferblackconductor://?offerId=offer-event&tripId=trip-event' });
      }
      await flushMicrotasks();
      await flushMicrotasks();

      expect(useDriverTripStore.getState().currentOffer?.offerId).toBe('offer-event');

      const cleanup = mockUseEffectCleanups.pop();
      cleanup?.();
      expect(mockAppStateRemove).toHaveBeenCalledTimes(1);
      expect(mockLinkingRemove).toHaveBeenCalledTimes(1);
    });

    it('preserves deepLinkUrl prioritization when Linking event arrives while AppState resync is in flight', async () => {
      useDriverTripStore.setState({ isAvailable: true });
      mockAppState.currentState = 'background';

      const firstOffer = createSampleOffer({ offerId: 'offer-a', tripId: 'trip-a' });
      const linkedOffer = createSampleOffer({ offerId: 'offer-b', tripId: 'trip-b' });

      let resolveFirstActiveTrip!: (value: unknown) => void;
      let activeTripCalls = 0;

      mockTransferApiGet.mockImplementation(async (url: string) => {
        if (url === '/driver/me/active-trip') {
          activeTripCalls += 1;
          if (activeTripCalls === 1) {
            return await new Promise((resolve) => {
              resolveFirstActiveTrip = resolve;
            });
          }
          return { data: { status: 'success', data: { trip: null } } };
        }
        if (url === '/driver/me/offers/pending') {
          return {
            data: {
              status: 'success',
              data: {
                offers: [firstOffer, linkedOffer],
                serverNow: BASE_NOW_ISO,
              },
            },
          };
        }
        throw new Error(`Unexpected GET ${url}`);
      });

      useForegroundResync();

      for (const listener of appStateListeners) {
        listener('active');
      }
      await flushMicrotasks();

      for (const listener of linkingListeners) {
        listener({ url: 'transferblackconductor://?offerId=offer-b&tripId=trip-b' });
      }
      await flushMicrotasks();

      resolveFirstActiveTrip({ data: { status: 'success', data: { trip: null } } });
      await flushMicrotasks();

      expect(useDriverTripStore.getState().currentOffer?.offerId).toBe('offer-b');
    });
  });
});
