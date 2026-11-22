import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { router } from 'expo-router';
import Constants, { AppOwnership } from 'expo-constants';
import { socket } from '../../../core/socket/socket';
import { useDriverTripStore } from '../store/useDriverTripStore';
import { TripOfferPayload } from '../../../core/trip/interface/trip.interface';
import { syncActiveTripState } from './useActiveTripSync';
import { offerAlarmService } from '../services/offerAlarmService';
import { showBannerNotification } from '../../notifications/store/useBannerNotificationStore';
import { driverOverlay } from '../../../core/overlay/driverOverlay';
import { TRIP_OFFERS_CHANNEL_ID } from '../../../core/push/services/pushNotificationService';

const isExpoGoOnAndroid =
  Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo;

const dismissAllNotificationsSafely = async () => {
  if (isExpoGoOnAndroid) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // No-op en Expo Go o entornos sin módulo nativo
  }
};

const showBackgroundOfferNotificationSafely = async (offer: TripOfferPayload): Promise<void> => {
  if (isExpoGoOnAndroid) return;
  try {
    const Notifications = await import('expo-notifications');
    const fare = Number(offer.fare?.totalFare || offer.fare?.netEarnings || 0);
    const origin = offer.pickup?.address || 'Origen indicado en app';
    const destination = offer.dropoff?.address || 'Destino indicado en app';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nueva oferta de viaje disponible',
        body: `${origin} → ${destination}${fare > 0 ? ` ($${fare.toLocaleString('es-AR')})` : ''}`,
        data: {
          type: 'trip_offer',
          offerId: offer.offerId,
          tripId: offer.tripId,
        },
        categoryIdentifier: 'trip-offer',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 500, 200, 500],
      },
      trigger: Platform.OS === 'android' ? { channelId: TRIP_OFFERS_CHANNEL_ID } : null,
    });
  } catch {
    // No-op en Expo Go o entornos sin módulo nativo
  }
};

export const useTripSocket = () => {
  const enqueueOffer = useDriverTripStore((state) => state.enqueueOffer);
  const cancelOffer = useDriverTripStore((state) => state.cancelOffer);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const setActiveTrip = useDriverTripStore((state) => state.setActiveTrip);
  const updateTripStatus = useDriverTripStore((state) => state.updateTripStatus);

  // Escucha de ofertas entrantes (trip:offer) y eventos globales del conductor
  useEffect(() => {
    const handleConnect = () => {
      syncActiveTripState();
    };
    const handleConnectError = (err: any) => {
      console.warn('[Socket] Error de conexión:', err?.message || err);
    };
    const handleNewOffer = (payload: TripOfferPayload) => {
      enqueueOffer(payload);

      // Cuando la app está minimizada pero el socket sigue vivo (foreground service activo),
      // disparamos explícitamente la tarjeta flotante nativa, alarma y notificación de alta prioridad.
      if (AppState.currentState !== 'active') {
        void offerAlarmService.start();
        void driverOverlay.showOfferOverlay(payload);
        void showBackgroundOfferNotificationSafely(payload);
      }
    };

    const handleScheduledReminder = (payload: {
      tripId: string;
      scheduledAt?: string | null;
      pickupAddress?: string | null;
      dropoffAddress?: string | null;
    }) => {
      const timeStr = payload.scheduledAt
        ? new Date(payload.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        : '';
      const textMsg = timeStr
        ? `Viaje programado a las ${timeStr}. Conectate 20 min antes para confirmar.`
        : 'Tenés un viaje programado próximo. Conectate para confirmar disponibilidad.';

      showBannerNotification({
        type: 'trip',
        title: 'Recordatorio de reserva',
        message: textMsg,
        actionLabel: 'Ver reservas',
        durationMs: 6500,
        onPress: () => router.push('/(home)/scheduled-trips' as any),
      });
    };

    const handleTripAssigned = async (_payload: { tripId: string; chat?: any }) => {
      showBannerNotification({
        type: 'trip',
        title: 'Viaje asignado',
        message: 'Dirigite al punto de encuentro del pasajero.',
      });
      await syncActiveTripState();
    };

    const handleOfferCancel = (payload: { offerId: string; tripId: string; reason: string }) => {
      cancelOffer(payload.offerId || payload.tripId);
      void offerAlarmService.stop();
      void driverOverlay.hideOfferOverlay();
      void dismissAllNotificationsSafely();

      if (AppState.currentState !== 'active' && useDriverTripStore.getState().isAvailable) {
        void driverOverlay.showFloatingBubble('online');
      }

      showBannerNotification({
        type: 'info',
        title: 'Oferta ya no disponible',
        message: 'La solicitud expiró o fue aceptada por otro conductor.',
        durationMs: 3200,
      });
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('trip:offer', handleNewOffer);
    socket.on('trip:offer:cancel', handleOfferCancel);
    socket.on('trip:scheduled_reminder', handleScheduledReminder);
    socket.on('trip:assigned', handleTripAssigned);

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
        showBannerNotification({
          type: 'warning',
          title: 'Viaje cancelado',
          message: 'El viaje fue cancelado por el pasajero o por el sistema.',
          durationMs: 5200,
        });
        socket.emit('ride:leave', { rideId });
        setActiveTrip(null);
      } else if (payload.status === 'completed') {
        socket.emit('ride:leave', { rideId });
        updateTripStatus('completed');
      } else if (payload.status) {
        updateTripStatus(payload.status as any);
      }
    };

    const handleRideJoined = (_payload: { rideId: string }) => {
      // Room join acknowledged by backend
    };

    const handleSocketError = (err: any) => {
      console.warn('[Socket error]:', err);
    };

    // Unirse a la sala si el socket ya está conectado
    joinRideRoom();

    // Si el socket se reconecta, re-unirse a la sala automáticamente
    socket.on('connect', joinRideRoom);
    socket.on('ride:joined', handleRideJoined);
    socket.on('trip:status_changed', handleStatusChanged);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('connect', joinRideRoom);
      socket.off('ride:joined', handleRideJoined);
      socket.off('trip:status_changed', handleStatusChanged);
      socket.off('error', handleSocketError);
      if (socket.connected) {
        socket.emit('ride:leave', { rideId });
      }
    };
  }, [activeTrip?.id, setActiveTrip, updateTripStatus]);
};
