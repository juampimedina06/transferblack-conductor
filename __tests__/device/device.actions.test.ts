import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerDevice } from '../../src/core/device/actions/device.actions';
import { transferApi } from '../../src/core/api/transferApi';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    post: vi.fn(),
  },
}));

describe('Device Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('sends POST /devices with validated payload and returns device response', async () => {
      const mockPayload = {
        push_token: 'ExponentPushToken[AbCdEf123456]',
        platform: 'android' as const,
        provider: 'expo' as const,
        device_id: 'Pixel 7 Pro',
      };

      const mockResponse = {
        id: 'device-uuid-999',
        platform: 'android' as const,
        provider: 'expo' as const,
        device_id: 'Pixel 7 Pro',
        last_seen_at: '2026-10-04T12:00:00.000Z',
        revoked_at: null,
        created_at: '2026-10-04T12:00:00.000Z',
      };

      (transferApi.post as any).mockResolvedValueOnce({
        data: {
          data: mockResponse,
        },
      });

      const result = await registerDevice(mockPayload);
      expect(transferApi.post).toHaveBeenCalledWith('/devices', mockPayload);
      expect(result.id).toBe('device-uuid-999');
      expect(result.provider).toBe('expo');
    });
  });
});
