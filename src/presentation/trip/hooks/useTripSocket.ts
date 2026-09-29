import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { socket } from '../../../core/socket/socket';
import { useDriverTripStore } from '../store/useDriverTripStore';
import { TripOfferPayload } from '../../../core/trip/interface/trip.interface';

export const useTripSocket = () => {
  const setCurrentOffer = useDriverTripStore((state) => state.setCurrentOffer);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const setActiveTrip = useDriverTripStore((state) => state.setActiveTrip);
  const updateTripStatus = useDriverTripStore((state) => state.updateTripStatus);

  // Escucha de ofertas entrantes (trip:offer)
  useEffect(() => {
    const handleConnect = () => {
      console.log('⚡ [Socket] Conectado exitosamente con id:', socket.id);
    };
    const handleConnectError = (err: any) => {
      console.warn('⚠️ [Socket] Error de conexión:', err?.message || err);
    };
    const handleNewOffer = (payload: TripOfferPayload) => {
      console.log('🔔 [Socket] OFERTA RECIBIDA:', payload?.tripId, payload);
      setCurrentOffer(payload);
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('trip:offer', handleNewOffer);

    if (socket.connected) {
      console.log('⚡ [Socket] Ya estaba conectado con id:', socket.id);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('trip:offer', handleNewOffer);
    };
  }, []);

  // Manejo de la sala del viaje activo (ride:join / trip:status_changed / ride:leave)
  useEffect(() => {
    if (!activeTrip?.id) return;

    const rideId = activeTrip.id;

    const joinRideRoom = () => {
      if (socket.connected) {
        socket.emit('ride:join', { rideId });
      }
    };

    const handleStatusChanged = (payload: { status: string; chat?: any }) => {
      if (payload.status === 'cancelled') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Viaje Cancelado',
          'El viaje ha sido cancelado por el pasajero o por el sistema.',
          [{ text: 'Entendido', style: 'default' }]
        );
        socket.emit('ride:leave', { rideId });
        setActiveTrip(null);
      } else if (payload.status === 'completed') {
        socket.emit('ride:leave', { rideId });
        updateTripStatus('completed');
      } else if (payload.status) {
        updateTripStatus(payload.status as any);
      }
    };

    // Unirse a la sala si el socket ya está conectado
    joinRideRoom();

    // Si el socket se reconecta, re-unirse a la sala automáticamente
    socket.on('connect', joinRideRoom);
    socket.on('trip:status_changed', handleStatusChanged);

    return () => {
      socket.off('connect', joinRideRoom);
      socket.off('trip:status_changed', handleStatusChanged);
      if (socket.connected) {
        socket.emit('ride:leave', { rideId });
      }
    };
  }, [activeTrip?.id]);
};
