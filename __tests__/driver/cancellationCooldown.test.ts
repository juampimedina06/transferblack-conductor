import { describe, it, expect, vi, beforeEach } from 'vitest';
import { driverCancelTrip } from '../../src/core/trip/actions/trip.actions';
import { getDriverStatus } from '../../src/core/driver/actions/driverStatus.actions';
import { useDriverStatusStore } from '../../src/presentation/driver/store/useDriverStatusStore';
import { CANCELLATION_REASONS } from '../../src/core/driver/interface/driverStatus.interface';
import { transferApi } from '../../src/core/api/transferApi';
import { socket } from '../../src/core/socket/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('../../src/core/socket/socket', () => {
  const handlers: Record<string, Function[]> = {};
  return {
    socket: {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = handlers[event] || [];
        handlers[event].push(cb);
      }),
      off: vi.fn((event: string, cb: Function) => {
        if (handlers[event]) {
          handlers[event] = handlers[event].filter((fn) => fn !== cb);
        }
      }),
      emit: vi.fn(),
      // Helper for tests to trigger registered socket listeners
      __trigger: (event: string, payload: any) => {
        if (handlers[event]) {
          handlers[event].forEach((fn) => fn(payload));
        }
      },
    },
  };
});

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
  setOnDocumentExpiryHandler: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] || null),
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

describe('TICKET-05: Cancellation Reasons & 15m Dispatch Cooldown', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
    useDriverStatusStore.setState({
      consecutiveCancellations: 0,
      dispatchSuspendedUntil: null,
      compliance: {
        status: 'compliant',
        nextExpiryAt: null,
        daysUntilNextExpiry: null,
        blockingDocuments: [],
      },
      documents: [],
      isLoading: false,
    });
  });

  describe('CANCELLATION_REASONS configuration', () => {
    it('classifies safety and operational reasons as justified', () => {
      const passengerNoShow = CANCELLATION_REASONS.find((r) => r.code === 'PASSENGER_NO_SHOW');
      const safety = CANCELLATION_REASONS.find((r) => r.code === 'SAFETY_ISSUE');
      const passengerRequest = CANCELLATION_REASONS.find((r) => r.code === 'PASSENGER_REQUEST');
      const vehicleEmergency = CANCELLATION_REASONS.find((r) => r.code === 'VEHICLE_EMERGENCY');

      expect(passengerNoShow?.isJustified).toBe(true);
      expect(safety?.isJustified).toBe(true);
      expect(passengerRequest?.isJustified).toBe(true);
      expect(vehicleEmergency?.isJustified).toBe(true);
    });

    it('classifies unjustified or arbitrary reasons as non-justified', () => {
      const noReason = CANCELLATION_REASONS.find((r) => r.code === 'NO_REASON');
      const other = CANCELLATION_REASONS.find((r) => r.code === 'OTHER');

      expect(noReason?.isJustified).toBe(false);
      expect(other?.isJustified).toBe(false);
    });
  });

  describe('driverCancelTrip action', () => {
    it('sends reasonCode, reason_code and coordinates in request payload', async () => {
      const mockTripId = 'trip-uuid-456';
      const mockResult = {
        data: {
          id: mockTripId,
          status: 'cancelled',
          cancellation: {
            counted: true,
            consecutiveCancellations: 2,
            remainingBeforeSuspension: 1,
            warning: {
              code: 'CANCELLATION_WARNING',
              message: 'Llevas 2 cancelaciones consecutivas sin justificación.',
            },
          },
        },
      };

      (transferApi.post as any).mockResolvedValueOnce(mockResult);

      const res = await driverCancelTrip(mockTripId, {
        reasonCode: 'OTHER',
        reason_code: 'OTHER',
        latitude: -34.6037,
        longitude: -58.3816,
      });

      expect(transferApi.post).toHaveBeenCalledWith(
        `/rides/${mockTripId}/driver-cancel`,
        expect.objectContaining({
          reasonCode: 'OTHER',
          reason_code: 'OTHER',
          latitude: -34.6037,
          longitude: -58.3816,
        })
      );
      expect(res.cancellation.consecutiveCancellations).toBe(2);
    });
  });

  describe('useDriverStatusStore & socket suspension listener', () => {
    it('fetches driver status and updates store state', async () => {
      const mockStatus = {
        driverId: 'driver-123',
        consecutiveCancellations: 1,
        dispatchSuspendedUntil: null,
        compliance: {
          status: 'compliant' as const,
          nextExpiryAt: '2026-12-01T00:00:00.000Z',
          daysUntilNextExpiry: 56,
          blockingDocuments: [],
        },
      };

      (transferApi.get as any).mockResolvedValueOnce({ data: { data: mockStatus } });

      const status = await useDriverStatusStore.getState().fetchStatus();

      expect(status?.consecutiveCancellations).toBe(1);
      expect(useDriverStatusStore.getState().consecutiveCancellations).toBe(1);
      expect(useDriverStatusStore.getState().compliance.status).toBe('compliant');
    });

    it('updates dispatchSuspendedUntil when socket emits driver:dispatch:suspended', () => {
      const cleanup = useDriverStatusStore.getState().initSocketListeners();
      const suspendedUntil = '2026-10-06T12:30:00.000Z';

      // Trigger socket event
      (socket as any).__trigger('driver:dispatch:suspended', {
        dispatchSuspendedUntil: suspendedUntil,
      });

      expect(useDriverStatusStore.getState().dispatchSuspendedUntil).toBe(suspendedUntil);

      cleanup();
    });
  });
});
