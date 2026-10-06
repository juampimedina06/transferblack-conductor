import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { socket } from '../../../core/socket/socket';
import { useDriverTripStore } from '../store/useDriverTripStore';
import { TripOfferPayload } from '../../../core/trip/interface/trip.interface';
import { syncActiveTripState } from './useActiveTripSync';
import { offerAlarmService } from '../services/offerAlarmService';

export const useTripSocket = () => {
  const enqueueOffer = useDriverTripStore((state) => state.enqueueOffer);
  const cancelOffer = useDriverTripStore((state) => state.cancelOffer);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const setActiveTrip = useDriverTripStore((state) => state.setActiveTrip);
  const updateTripStatus = useDriverTripStore((state) => state.updateTripStatus);

  // Escucha de ofertas entrantes (trip:offer) y eventos globales del conductor
  useEffect(() => {
    const handleConnect = () => {
      console.log('⚡ [Socket] Conectado exitosamente con id:', socket.id);
      syncActiveTripState();
    };
    const handleConnectError = (err: any) => {
      console.warn('⚠️ [Socket] Error de conexión:', err?.message || err);
    };
    const handleNewOffer = (payload: TripOfferPayload) => {
      console.log('🔔 [Socket] OFERTA RECIBIDA:', payload?.tripId, payload);
      enqueueOffer(payload);
    };

    const handleScheduledReminder = (payload: {
      tripId: string;
      scheduledAt?: string | null;
      pickupAddress?: string | null;
      dropoffAddress?: string | null;
    }) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const timeStr = payload.scheduledAt
        ? new Date(payload.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        : '';
      const textMsg = timeStr
        ? `Tenés un viaje programado para las ${timeStr}. Recordá conectarte antes de los 20 min previos para confirmar tu disponibilidad.`
        : 'Tenés un viaje programado próximo. Recordá conectarte para confirmar tu disponibilidad.';

      Alert.alert('Recordatorio de Reserva', textMsg, [
        { text: 'Ver reservas', onPress: () => router.push('/(home)/scheduled-trips' as any) },
        { text: 'Entendido', style: 'cancel' },
      ]);
    };

    const handleTripAssigned = async (_payload: { tripId: string; chat?: any }) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await syncActiveTripState();
    };

    const handleOfferCancel = (payload: { offerId: string; tripId: string; reason: string }) => {
      console.log('🚫 [Socket] OFERTA CANCELADA:', payload);
      cancelOffer(payload.offerId || payload.tripId);
      void offerAlarmService.stop();
      void Notifications.dismissAllNotificationsAsync().catch(() => {});
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('trip:offer', handleNewOffer);
    socket.on('trip:offer:cancel', handleOfferCancel);
    socket.on('trip:scheduled_reminder', handleScheduledReminder);
    socket.on('trip:assigned', handleTripAssigned);

    if (socket.connected) {
      console.log('⚡ [Socket] Ya estaba conectado con id:', socket.id);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('trip:offer', handleNewOffer);
      socket.off('trip:offer:cancel', handleOfferCancel);
      socket.off('trip:scheduled_reminder', handleScheduledReminder);
      socket.off('trip:assigned', handleTripAssigned);
    };
  }, [enqueueOffer, cancelOffer]);

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
  }, [activeTrip?.id, setActiveTrip, updateTripStatus]);
};
