import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDriverMe } from '../../src/core/driver/actions/driver.actions';
import { transferApi } from '../../src/core/api/transferApi';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    get: vi.fn(),
  },
}));

describe('Driver Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDriverMe', () => {
    it('returns driver operational profile and vehicle from GET /driver/me', async () => {
      const mockData = {
        driverProfile: {
          id: 'driver-uuid-123',
          approvalStatus: 'approved' as const,
          availabilityStatus: 'online' as const,
          ratingAverage: 4.9,
          ratingCount: 38,
        },
        vehicle: {
          id: 'veh-uuid-1',
          driverId: 'driver-uuid-123',
          plate: 'AF123JK',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2023,
          color: 'Negro',
        },
      };

      (transferApi.get as any).mockResolvedValueOnce({
        data: {
          data: mockData,
        },
      });

      const result = await getDriverMe();
      expect(transferApi.get).toHaveBeenCalledWith('/driver/me');
      expect(result.driverProfile.ratingAverage).toBe(4.9);
      expect(result.vehicle?.plate).toBe('AF123JK');
    });

    it('handles driver without assigned vehicle (vehicle null)', async () => {
      const mockData = {
        driverProfile: {
          id: 'driver-uuid-456',
          approvalStatus: 'approved' as const,
          availabilityStatus: 'offline' as const,
          ratingAverage: 5.0,
          ratingCount: 10,
        },
        vehicle: null,
      };

      (transferApi.get as any).mockResolvedValueOnce({
        data: {
          data: mockData,
        },
      });

      const result = await getDriverMe();
      expect(transferApi.get).toHaveBeenCalledWith('/driver/me');
      expect(result.vehicle).toBeNull();
    });
  });
});
