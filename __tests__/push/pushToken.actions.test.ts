import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerDriverPushToken,
  revokeDriverPushToken,
} from '../../src/core/push/actions/pushToken.actions';
import { transferApi } from '../../src/core/api/transferApi';

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Driver Push Token Actions (TICKET-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerDriverPushToken', () => {
    it('sends PUT /drivers/me/push-token with validated body', async () => {
      const mockPayload = {
        token: 'fcm-device-native-token-abc-123',
        platform: 'android' as const,
        provider: 'fcm' as const,
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'token-uuid-1',
          token: mockPayload.token,
          platform: mockPayload.platform,
          provider: mockPayload.provider,
        },
      };

      (transferApi.put as any).mockResolvedValueOnce({ data: mockResponse });

      const result = await registerDriverPushToken(mockPayload);
      expect(transferApi.put).toHaveBeenCalledWith('/drivers/me/push-token', mockPayload);
      expect(result.success).toBe(true);
      expect(result.data?.token).toBe(mockPayload.token);
    });

    it('rejects invalid payload failing Zod validation', async () => {
      const invalidPayload = {
        token: '',
        platform: 'windows' as any,
        provider: 'fcm' as const,
      };

      await expect(registerDriverPushToken(invalidPayload)).rejects.toThrow();
      expect(transferApi.put).not.toHaveBeenCalled();
    });
  });

  describe('revokeDriverPushToken', () => {
    it('sends DELETE /drivers/me/push-token without token body when not provided', async () => {
      (transferApi.delete as any).mockResolvedValueOnce({
        data: { success: true, message: 'Tokens revoked' },
      });

      const result = await revokeDriverPushToken();
      expect(transferApi.delete).toHaveBeenCalledWith('/drivers/me/push-token', {
        data: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('sends DELETE /drivers/me/push-token with token body when specified', async () => {
      (transferApi.delete as any).mockResolvedValueOnce({
        data: { success: true },
      });

      const result = await revokeDriverPushToken('specific-token');
      expect(transferApi.delete).toHaveBeenCalledWith('/drivers/me/push-token', {
        data: { token: 'specific-token' },
      });
      expect(result.success).toBe(true);
    });
  });
});
