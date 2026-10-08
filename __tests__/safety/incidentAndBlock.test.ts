import { describe, it, expect, beforeEach, vi } from 'vitest';

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

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    post: vi.fn(),
  },
}));

import { useSafetyStore } from '../../src/presentation/safety/store/useSafetyStore';
import { useDriverTripStore } from '../../src/presentation/trip/store/useDriverTripStore';
import { reportTripIncident } from '../../src/core/safety/actions/incident.actions';
import { transferApi } from '../../src/core/api/transferApi';
import * as tripActions from '../../src/core/trip/actions/trip.actions';

describe('Safety & Incident Reporting: Passenger Blocking & Trip Extras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSafetyStore.getState().clearBlockedPassengers();
    useDriverTripStore.getState().clearTripExtras();
  });

  describe('useSafetyStore', () => {
    it('blocks a passenger and prevents future matching', () => {
      expect(useSafetyStore.getState().isPassengerBlocked('pass-123')).toBe(false);

      useSafetyStore.getState().blockPassenger({
        passengerId: 'pass-123',
        passengerName: 'Pasajero Conflictivo',
        blockedAt: '2026-10-07T12:00:00.000Z',
        reason: 'Agresión verbal',
        tripId: 'trip-999',
      });

      expect(useSafetyStore.getState().isPassengerBlocked('pass-123')).toBe(true);
      expect(useSafetyStore.getState().isPassengerBlocked('pass-456')).toBe(false);

      const records = useSafetyStore.getState().blockedPassengers;
      expect(records).toHaveLength(1);
      expect(records[0].passengerId).toBe('pass-123');
    });

    it('unblocks a passenger correctly', () => {
      useSafetyStore.getState().blockPassenger({
        passengerId: 'pass-123',
        blockedAt: '2026-10-07T12:00:00.000Z',
        reason: 'Error',
        tripId: 'trip-999',
      });

      expect(useSafetyStore.getState().isPassengerBlocked('pass-123')).toBe(true);

      useSafetyStore.getState().unblockPassenger('pass-123');
      expect(useSafetyStore.getState().isPassengerBlocked('pass-123')).toBe(false);
    });
  });

  describe('useDriverTripStore - Extras & Peajes', () => {
    it('adds tolls and extra charges, computing sum dynamically', () => {
      expect(useDriverTripStore.getState().getTripExtrasTotal()).toBe(0);

      useDriverTripStore.getState().addTripExtra({
        category: 'toll',
        label: 'Peaje Autopista',
        amount: 2500,
        notes: 'Peaje Carlos Paz',
      });

      expect(useDriverTripStore.getState().getTripExtrasTotal()).toBe(2500);

      useDriverTripStore.getState().addTripExtra({
        category: 'parking',
        label: 'Estacionamiento',
        amount: 1500,
      });

      expect(useDriverTripStore.getState().getTripExtrasTotal()).toBe(4000);
      expect(useDriverTripStore.getState().tripExtras).toHaveLength(2);
    });

    it('removes a specific extra charge by id', () => {
      useDriverTripStore.getState().addTripExtra({
        category: 'toll',
        label: 'Peaje',
        amount: 2000,
      });

      const extras = useDriverTripStore.getState().tripExtras;
      expect(extras).toHaveLength(1);

      useDriverTripStore.getState().removeTripExtra(extras[0].id);
      expect(useDriverTripStore.getState().tripExtras).toHaveLength(0);
      expect(useDriverTripStore.getState().getTripExtrasTotal()).toBe(0);
    });
  });

  describe('reportTripIncident', () => {
    it('dispatches incident report, rates 1 star with block flag, and stores blocked passenger', async () => {
      vi.mocked(transferApi.post).mockResolvedValueOnce({
        data: { success: true, incidentId: 'inc-01' },
      });

      const rateSpy = vi.spyOn(tripActions, 'ratePassenger').mockResolvedValueOnce({
        success: true,
      });

      const result = await reportTripIncident({
        tripId: 'trip-abc',
        passengerId: 'pass-danger-1',
        passengerName: 'Usuario Problemático',
        category: 'violent_aggressive',
        description: 'El pasajero se puso violento al solicitar el pago',
        blockPassenger: true,
        reportedAt: '2026-10-07T12:15:00.000Z',
      });

      expect(result.success).toBe(true);
      expect(result.blockApplied).toBe(true);

      // Verifies ratePassenger was called with rating 1 and block_matching
      expect(rateSpy).toHaveBeenCalledWith('trip-abc', expect.objectContaining({
        rating: 1,
        block_matching: true,
        incident_type: 'violent_aggressive',
      }));

      // Verifies passenger was recorded in local safety store
      expect(useSafetyStore.getState().isPassengerBlocked('pass-danger-1')).toBe(true);
    });
  });
});
