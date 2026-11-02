import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDriverMe, deleteDriverAccount } from '../../src/core/driver/actions/driver.actions';
import { transferApi } from '../../src/core/api/transferApi';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    get: vi.fn(),
    delete: vi.fn(),
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

  describe('deleteDriverAccount', () => {
    it('calls DELETE /driver/me with password and optional reason', async () => {
      const mockResponse = {
        status: 'success' as const,
        message: 'Cuenta de conductor eliminada correctamente',
      };

      (transferApi.delete as any).mockResolvedValueOnce({
        data: mockResponse,
      });

      const result = await deleteDriverAccount({
        password: 'SecurePassword123!',
        reason: 'Ya no dispongo de tiempo para conducir',
      });

      expect(transferApi.delete).toHaveBeenCalledWith('/driver/me', {
        data: {
          password: 'SecurePassword123!',
          reason: 'Ya no dispongo de tiempo para conducir',
        },
      });
      expect(result.status).toBe('success');
      expect(result.message).toContain('eliminada correctamente');
    });

    it('handles backend rejection when driver has debt or active trip', async () => {
      (transferApi.delete as any).mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            error: {
              code: 'CANNOT_DELETE_ACTIVE_TRIP',
              message: 'No podés eliminar tu cuenta mientras tengas un viaje en curso',
            },
          },
        },
      });

      await expect(
        deleteDriverAccount({
          password: 'Password123',
        })
      ).rejects.toEqual(
        expect.objectContaining({
          response: expect.objectContaining({
            status: 409,
          }),
        })
      );
    });
  });
});
