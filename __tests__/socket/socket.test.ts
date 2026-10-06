import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSocketAuth } from '../../src/core/socket/socket';
import { authStorage } from '../../src/presentation/auth/store/authStorage';

vi.mock('../../src/presentation/auth/store/authStorage', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
  },
}));

describe('Socket Client Auth & Sanitization (TICKET-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides the current JWT token in auth payload when present', async () => {
    (authStorage.getAccessToken as any).mockResolvedValueOnce('valid-jwt-token-123');

    const auth = await getSocketAuth();
    expect(auth).toEqual({ token: 'valid-jwt-token-123' });
    expect(authStorage.getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('returns undefined token when no access token is stored', async () => {
    (authStorage.getAccessToken as any).mockResolvedValueOnce(null);

    const auth = await getSocketAuth();
    expect(auth).toEqual({ token: undefined });
  });

  it('handles authStorage exceptions gracefully without crashing', async () => {
    (authStorage.getAccessToken as any).mockRejectedValueOnce(new Error('Storage failure'));

    const auth = await getSocketAuth();
    expect(auth).toEqual({ token: undefined });
  });
});
