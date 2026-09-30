import { useEffect, useRef, useCallback } from 'react';
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
  const isConnectedRef = useRef(false);
  const connectionErrorRef = useRef<string | null>(null);

  // We expose a stable snapshot via a forceUpdate pattern; callers that need
  // live state should subscribe via a state atom in the parent. The hook itself
  // stays pure (no setState) so it doesn't trigger extra renders on the chat list.
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

    socket.emit('chat.join', { tripId }, (ack: { ok: boolean; tripId?: string; error?: { code: string; message: string } }) => {
      if (ack.ok) {
        // Successfully joined — trigger catch-up fetch
        onReconnectRef.current();
      } else {
        const code = ack.error?.code ?? 'UNKNOWN';
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
        // Errors are surfaced via connection state — no loop retry
      }
    });
  }, [tripId]);

  useEffect(() => {
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

    const connect = async () => {
      const token = await authStorage.getAccessToken();
      if (!token) return;

      const url = process.env.EXPO_PUBLIC_API_URL ?? '';

      const socket = io(url, {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket'],
        autoConnect: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        isConnectedRef.current = true;
        connectionErrorRef.current = null;
        joinRoom();
      });

      socket.on('disconnect', () => {
        isConnectedRef.current = false;
      });

      socket.on('connect_error', (err: Error) => {
        isConnectedRef.current = false;
        connectionErrorRef.current = err.message ?? 'Error de conexión';
      });

      socket.on('chat.message.created', (payload: SocketMessageCreatedPayload) => {
        if (payload.tripId === tripId) {
          onMessageCreatedRef.current(payload);
        }
      });

      socket.on('chat.message.read', (payload: SocketMessageReadPayload) => {
        if (payload.trip_id === tripId) {
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
        socket.emit('chat.leave', { tripId });
        socket.disconnect();
        socketRef.current = null;
      }
      appStateSubscription?.remove();
    };
  }, [tripId, joinRoom]);

  return {
    isConnected: isConnectedRef.current,
    connectionError: connectionErrorRef.current,
  };
};
