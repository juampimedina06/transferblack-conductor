import { io, Socket } from 'socket.io-client';
import { authStorage } from '@/presentation/auth/store/authStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.100:3000/api/v1';
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');

export const getSocketAuth = async (): Promise<{ token?: string }> => {
  try {
    const token = await authStorage.getAccessToken();
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
  transports: ['websocket', 'polling'],
  auth: (cb: (data: { token?: string }) => void) => {
    getSocketAuth().then(cb);
  },
});
