import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { authStorage } from '@/presentation/auth/store/authStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.100:3000/api/v1';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');

const isJwtExpiring = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary = typeof atob === 'function' ? atob(base64) : '';
    if (!binary) return false;
    const parsed = JSON.parse(binary);
    if (!parsed.exp) return false;
    // Consider expiring if less than 60s left
    return parsed.exp * 1000 - Date.now() < 60_000;
  } catch {
    return false;
  }
};

export const refreshSocketToken = async (): Promise<string | null> => {
  try {
    const refreshToken = await authStorage.getRefreshToken();
    if (!refreshToken) return null;

    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 8000 }
    );
    const tokens = response.data?.data?.tokens || response.data?.tokens;
    const newAccessToken = tokens?.access_token;
    const newRefreshToken = tokens?.refresh_token;

    if (newAccessToken) {
      await authStorage.setTokens(newAccessToken, newRefreshToken || refreshToken);
      return newAccessToken;
    }
    return null;
  } catch {
    return null;
  }
};

export const getSocketAuth = async (): Promise<{ token?: string }> => {
  try {
    let token = await authStorage.getAccessToken();
    if (token && isJwtExpiring(token)) {
      const refreshed = await refreshSocketToken();
      if (refreshed) {
        token = refreshed;
      }
    }
    return { token: token || undefined };
  } catch {
    return { token: undefined };
  }
};

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket'],
  auth: (cb: (data: { token?: string }) => void) => {
    getSocketAuth().then(cb);
  },
});

socket.on('connect_error', async (err: any) => {
  const errMsg = String(err?.message || '');
  if (errMsg.includes('INVALID_TOKEN') || errMsg.includes('MISSING_TOKEN')) {
    const freshToken = await refreshSocketToken();
    if (freshToken) {
      socket.auth = { token: freshToken };
      socket.connect();
    }
  }
});
