import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import axios from 'axios';
import { useAuthStore } from '../../src/presentation/auth/store/useAuthStore';
import { authStorage } from '../../src/presentation/auth/store/authStorage';

vi.mock('axios');
vi.mock('../../src/presentation/auth/store/authStorage', () => ({
  authStorage: {
    getRefreshToken: vi.fn(),
    getAccessToken: vi.fn(),
    removeTokens: vi.fn(),
    setTokens: vi.fn(),
  },
}));

describe('Auth Logout Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls POST /auth/logout with refresh_token and purges local storage', async () => {
    (authStorage.getRefreshToken as any).mockResolvedValueOnce('mock-refresh-token');
    (authStorage.getAccessToken as any).mockResolvedValueOnce('mock-access-token');
    (axios.post as any).mockResolvedValueOnce({ status: 204 });

    // Set initial user in store
    useAuthStore.setState({
      user: {
        id: 'user-1',
        email: 'driver@test.com',
        first_name: 'Juan',
        last_name: 'Chofer',
        roles: ['driver'],
      } as any,
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    expect(authStorage.getRefreshToken).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      { refresh_token: 'mock-refresh-token' },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-access-token',
        }),
      })
    );
    expect(authStorage.removeTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('still clears local storage if backend /auth/logout fails', async () => {
    (authStorage.getRefreshToken as any).mockResolvedValueOnce('mock-refresh-token');
    (authStorage.getAccessToken as any).mockResolvedValueOnce('mock-access-token');
    (axios.post as any).mockRejectedValueOnce(new Error('Network error'));

    useAuthStore.setState({
      user: { id: 'user-1' } as any,
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    expect(authStorage.removeTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
