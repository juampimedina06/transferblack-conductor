import { io, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.100:3000/api/v1';
const SOCKET_URL = API_BASE_URL.replace('/api/v1', '');

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
});
