import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { socket, refreshSocketToken } from '@/core/socket/socket';
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

// Reuses the shared application socket singleton so leaving the chat screen
// never disconnects the driver's main dispatch/telemetry socket session.
export const useChatSocket = ({
  tripId,
  onMessageCreated,
  onMessageRead,
  onReconnect,
}: UseChatSocketProps): UseChatSocketReturn => {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const hasRetriedAuthRef = useRef<boolean>(false);

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
    if (!socket.connected) return;

    socket.emit(
      'chat.join',
      { tripId },
      (ack?: { ok?: boolean; tripId?: string; error?: { code: string; message: string | string[] } }) => {
        if (ack?.ok) {
          hasRetriedAuthRef.current = false;
          onReconnectRef.current();
        } else if (ack?.error) {
          const code = ack.error.code ?? 'UNKNOWN';
          if ((code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED') && !hasRetriedAuthRef.current) {
            hasRetriedAuthRef.current = true;
            void refreshSocketToken().then((freshToken) => {
              if (freshToken) {
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
    let isCancelled = false;

    const handleConnect = () => {
      if (isCancelled) return;
      setIsConnected(true);
      setConnectionError(null);
      joinRoom();
    };

    const handleDisconnect = () => {
      if (isCancelled) return;
      setIsConnected(false);
    };

    const handleConnectError = (err: Error) => {
      if (isCancelled) return;
      setIsConnected(false);
      setConnectionError(err.message ?? 'Error de conexión');
    };

    const handleMessageCreated = (payload: SocketMessageCreatedPayload) => {
      const msgTripId = payload.tripId || (payload as any).trip_id;
      if (msgTripId === tripId) {
        onMessageCreatedRef.current(payload);
      }
    };

    const handleMessageRead = (payload: SocketMessageReadPayload) => {
      const msgTripId = payload.trip_id || (payload as any).tripId;
      if (msgTripId === tripId) {
        onMessageReadRef.current(payload);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('chat.message.created', handleMessageCreated);
    socket.on('chat.message.read', handleMessageRead);

    if (socket.connected) {
      joinRoom();
    } else {
      void authStorage.getAccessToken().then((token) => {
        if (!isCancelled && token && !socket.connected) {
          socket.connect();
        }
      });
    }

    const appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (!socket.connected) {
          socket.connect();
        } else {
          joinRoom();
        }
      }
    });

    return () => {
      isCancelled = true;
      if (socket.connected) {
        socket.emit('chat.leave', { tripId }, () => {});
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('chat.message.created', handleMessageCreated);
      socket.off('chat.message.read', handleMessageRead);
      appStateSubscription.remove();
    };
  }, [tripId, joinRoom]);

  return {
    isConnected,
    connectionError,
  };
};
