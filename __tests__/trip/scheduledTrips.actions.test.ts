import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDriverScheduledTrips, ratePassenger, TripRequestError } from '../../src/core/trip/actions/trip.actions';
import { transferApi } from '../../src/core/api/transferApi';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Scheduled Trips & Rating Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDriverScheduledTrips', () => {
    it('returns scheduled trips array when API responds successfully', async () => {
      const mockTrips = [
        {
          id: 'sched-1',
          code: 'TB-SCHED1',
          status: 'scheduled',
          bookingType: 'scheduled',
          scheduledAt: '2026-10-04T15:00:00.000Z',
          origin: { address: 'Origen A', latitude: -31.4, longitude: -64.1 },
          destination: { address: 'Destino B', latitude: -31.5, longitude: -64.2 },
          passenger: { id: 'pass-1', firstName: 'Carlos', phone: '+549351000' },
          thirdPartyName: null,
          thirdPartyPhone: null,
          fare: 5000,
          netEarnings: 4000,
          currency: 'ARS',
          isRecurring: false,
        },
      ];

      (transferApi.get as any).mockResolvedValueOnce({
        data: {
          status: 'success',
          data: { trips: mockTrips },
        },
      });

      const result = await getDriverScheduledTrips();
      expect(transferApi.get).toHaveBeenCalledWith('/driver/me/scheduled-trips');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sched-1');
    });

    it('throws TripRequestError on failure', async () => {
      (transferApi.get as any).mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: { message: 'Server error', code: 'SERVER_ERROR' } },
        },
      });

      await expect(getDriverScheduledTrips()).rejects.toThrow(TripRequestError);
    });
  });

  describe('ratePassenger', () => {
    it('sends rating and trimmed comment correctly', async () => {
      (transferApi.post as any).mockResolvedValueOnce({
        data: { status: 'success' },
      });

      const res = await ratePassenger('trip-123', {
        rating: 5,
        comment: '  Excelente viaje  ',
      });

      expect(transferApi.post).toHaveBeenCalledWith('/rides/trip-123/rate-passenger', {
        rating: 5,
        comment: 'Excelente viaje',
      });
      expect(res).toEqual({ status: 'success' });
    });

    it('sends rating without comment if comment is empty or omitted', async () => {
      (transferApi.post as any).mockResolvedValueOnce({
        data: { status: 'success' },
      });

      await ratePassenger('trip-123', {
        rating: 4,
        comment: '   ',
      });

      expect(transferApi.post).toHaveBeenCalledWith('/rides/trip-123/rate-passenger', {
        rating: 4,
      });
    });
  });
});
