import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { authStorage } from '@/presentation/auth/store/authStorage';
import {
  SocketMessageCreatedPayload,
  SocketMessageReadPayload,
} from '@/core/chat/interface/chat.interface';

interface UseChatSocketProps {
  tripId: string;
  onMessageCreated: (payload: SocketMessageCreatedPayload) => void;
  onMessageRead: (payload: SocketMessageReadPayload) => void;
  onReconnect: () => void;
}

interface UseChatSocketReturn {
  isConnected: boolean;
  connectionError: string | null;
}

// We keep a ref-based approach so callers don't need to manage Socket state.
export const useChatSocket = ({
  tripId,
  onMessageCreated,
  onMessageRead,
  onReconnect,
}: UseChatSocketProps): UseChatSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Callbacks are kept in refs so a new inline function from the caller does not
  // tear down and re-create the socket on every render.
  const onMessageCreatedRef = useRef(onMessageCreated);
  const onMessageReadRef = useRef(onMessageRead);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onMessageCreatedRef.current = onMessageCreated;
  }, [onMessageCreated]);

  useEffect(() => {
    onMessageReadRef.current = onMessageRead;
  }, [onMessageRead]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  const joinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    socket.emit(
      'chat.join',
      { tripId },
      (ack?: { ok?: boolean; tripId?: string; error?: { code: string; message: string | string[] } }) => {
        if (ack?.ok) {
          // Successfully joined room ride_<tripId> — trigger catch-up fetch
          onReconnectRef.current();
        } else if (ack?.error) {
          const code = ack.error.code ?? 'UNKNOWN';
          if (code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED') {
            // Try refreshing token once and reconnect
            authStorage.getAccessToken().then((token) => {
              if (token && socket) {
                socket.auth = { token: `Bearer ${token}` };
                socket.disconnect();
                socket.connect();
              }
            });
          }
        }
      },
    );
  }, [tripId]);

  useEffect(() => {
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

    const connect = async () => {
      const token = await authStorage.getAccessToken();
      if (!token) return;

      const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.100:3000/api/v1';
      const socketUrl = rawUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');

      const socket = io(socketUrl, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
        joinRoom();
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('connect_error', (err: Error) => {
        setIsConnected(false);
        setConnectionError(err.message ?? 'Error de conexión');
      });

      socket.on('chat.message.created', (payload: SocketMessageCreatedPayload) => {
        const msgTripId = payload.tripId || (payload as any).trip_id;
        if (msgTripId === tripId) {
          onMessageCreatedRef.current(payload);
        }
      });

      socket.on('chat.message.read', (payload: SocketMessageReadPayload) => {
        const msgTripId = payload.trip_id || (payload as any).tripId;
        if (msgTripId === tripId) {
          onMessageReadRef.current(payload);
        }
      });
    };

    connect();

    // Re-join + catch-up when app comes back to foreground
    appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const socket = socketRef.current;
        if (socket && !socket.connected) {
          socket.connect();
        } else if (socket && socket.connected) {
          joinRoom();
        }
      }
    });

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.emit('chat.leave', { tripId }, () => {});
        socket.disconnect();
        socketRef.current = null;
      }
      appStateSubscription?.remove();
    };
  }, [tripId, joinRoom]);

  return {
    isConnected,
    connectionError,
  };
};
