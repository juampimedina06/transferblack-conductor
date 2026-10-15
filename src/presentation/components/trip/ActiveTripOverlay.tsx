import React, { useMemo, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  Trip,
  calculateTripDistanceKm,
} from '../../../core/trip/interface/trip.interface';
import {
  completeTrip,
  driverArrived,
  startTrip,
} from '../../../core/trip/actions/trip.actions';
import { useDriverLocation } from '../../maps/hooks/useDriverLocation';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';
import { RideCard, RideCardStatus } from './RideCard';
import { CancelTripModal } from './CancelTripModal';
import { FullScreenPinModal } from './ui/FullScreenPinModal';

export interface ActiveTripOverlayProps {
  trip: Trip;
  onHeightChange?: (height: number) => void;
}

/**
 * Cockpit de viaje en curso (ActiveTripOverlay):
 * Renderiza la nueva tarjeta unificada `RideCard` con Tailwind y Reanimated.
 */
export const ActiveTripOverlay: React.FC<ActiveTripOverlayProps> = ({
  trip,
  onHeightChange,
}) => {
  const insets = useSafeAreaInsets();
  const { location } = useDriverLocation(true);
  const updateTripStatus = useDriverTripStore((state) => state.updateTripStatus);
  const setActiveTrip = useDriverTripStore((state) => state.setActiveTrip);
  const tollsAmount = useDriverTripStore((state) => state.getTripExtrasTotal());

  const [isLoading, setIsLoading] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [isPinError, setIsPinError] = useState(false);
  const [isPinDismissed, setIsPinDismissed] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);

  // El modal de PIN a pantalla completa se muestra automáticamente en punto de retiro si requiere PIN
  const isPinModalVisible = Boolean(
    trip.status === 'driver_arrived' && trip.require_pin && !isPinDismissed
  );

  const { formattedTime, isFinished: isCourtesyExpired } = useCourtesyTimer(5);

  // Mapeo dinámico del estado del viaje a RideCardStatus
  const cardStatus: RideCardStatus = useMemo(() => {
    switch (trip.status) {
      case 'driver_arriving':
        return 'DRIVER_ASSIGNED';
      case 'driver_arrived':
        return 'ARRIVING';
      case 'in_progress':
        return 'IN_PROGRESS';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'DRIVER_ASSIGNED';
    }
  }, [trip.status]);

  const durationMin = trip.dropoff?.durationMinutes || 10;
  const distanceText = useMemo(() => {
    // Si el viaje está en curso, calculamos la distancia restante exacta desde la posición actual del conductor al destino
    if (
      cardStatus === 'IN_PROGRESS' &&
      location?.latitude &&
      trip.dropoff?.latitude &&
      trip.dropoff?.longitude
    ) {
      return calculateTripDistanceKm(
        location.latitude,
        location.longitude,
        trip.dropoff.latitude,
        trip.dropoff.longitude,
        durationMin
      );
    }

    return calculateTripDistanceKm(
      trip.pickup?.latitude,
      trip.pickup?.longitude,
      trip.dropoff?.latitude,
      trip.dropoff?.longitude,
      durationMin
    );
  }, [cardStatus, location, trip, durationMin]);

  const etaText = useMemo(() => {
    if (cardStatus === 'DRIVER_ASSIGNED') {
      return `~${trip.pickup?.etaMinutes || 3} min`;
    }
    if (cardStatus === 'IN_PROGRESS') {
      return `~${durationMin} min`;
    }
    return undefined;
  }, [cardStatus, trip.pickup?.etaMinutes, durationMin]);

  const baseFare = Number(trip.final_fare || trip.estimated_fare || 0);
  const totalFare = baseFare + tollsAmount;
  const netEarnings = trip.driver_earnings || (Math.max(0, baseFare * 0.8) + tollsAmount);

  // Handlers de ciclo de vida del viaje
  const handleArrived = async () => {
    if (!location) {
      Alert.alert(
        'Ubicación no disponible',
        'No se pudo obtener la posición GPS actual. Verificá los permisos de ubicación.'
      );
      return;
    }

    try {
      setIsLoading(true);
      await driverArrived(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateTripStatus('driver_arrived');
      setIsPinDismissed(false);
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', err.message || 'No se pudo notificar la llegada al punto de retiro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!location) {
      Alert.alert('Ubicación no disponible', 'No se pudo obtener la posición GPS actual.');
      return;
    }

    const pin = pinDigits.join('');
    if (trip.require_pin && pin.length !== 4) {
      setIsPinError(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'PIN Incompleto',
        'Por favor ingresá los 4 dígitos del PIN provisto por el pasajero.'
      );
      return;
    }

    try {
      setIsLoading(true);
      await startTrip(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        boarding_pin: trip.require_pin ? pin : undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsPinDismissed(false);
      updateTripStatus('in_progress');
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsPinError(true);
      Alert.alert(
        'Error al iniciar',
        err.message || 'No se pudo iniciar el viaje. Verificá que el PIN sea correcto.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!location) {
      Alert.alert('Ubicación no disponible', 'No se pudo obtener la posición GPS actual.');
      return;
    }

    try {
      setIsLoading(true);
      await completeTrip(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        tolls_amount: tollsAmount > 0 ? tollsAmount : undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateTripStatus('completed');
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error al finalizar', err.message || 'No se pudo finalizar el viaje.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCompleted = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTrip(null);
  };

  const handleCall = () => {
    const phone = trip.passenger?.phone;
    if (phone) {
      void Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono del pasajero no está disponible.');
    }
  };

  const handleChat = () => {
    router.push('/(home)/chat');
  };

  return (
    <>
      <View
        className="absolute bottom-0 left-0 right-0 z-40 w-full"
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        pointerEvents="box-none"
      >
        <RideCard
          status={cardStatus}
          bottomInset={insets.bottom}
          trip={trip}
          etaText={etaText}
          distanceText={distanceText}
          passengerName={trip.passenger?.fullName}
          passengerRating={trip.passenger?.rating}
          passengerPhone={trip.passenger?.phone || undefined}
          passengerPreferences={trip.passenger?.preferences}
          pickupAddress={trip.pickup?.address}
          dropoffAddress={trip.dropoff?.address}
          fareAmount={totalFare}
          earningsAmount={netEarnings}
          paymentMethod={trip.payment_method}
          requirePin={trip.require_pin}
          pinDigits={pinDigits}
          isPinError={isPinError}
          onPinChange={setPinDigits}
          onOpenPinModal={() => setIsPinDismissed(false)}
          progressPercent={trip.status === 'in_progress' ? 65 : 15}
          waitingTimeText={formattedTime}
          isCourtesyExpired={isCourtesyExpired}
          isLoading={isLoading}
          onArrived={handleArrived}
          onStartTrip={handleStartTrip}
          onCompleteTrip={handleCompleteTrip}
          onCancel={() => setIsCancelModalVisible(true)}
          onCall={handleCall}
          onChat={handleChat}
          onConfirmCompleted={handleConfirmCompleted}
          ratingScore={ratingScore}
          onRatingScoreChange={setRatingScore}
        />
      </View>

      <FullScreenPinModal
        visible={
          isPinModalVisible &&
          trip.status === 'driver_arrived' &&
          Boolean(trip.require_pin)
        }
        onClose={() => setIsPinDismissed(true)}
        pinDigits={pinDigits}
        onChangePin={(digits) => {
          setPinDigits(digits);
          if (isPinError) setIsPinError(false);
        }}
        onConfirmStart={async () => {
          await handleStartTrip();
        }}
        isLoading={isLoading}
        isError={isPinError}
        passengerName={trip.passenger?.fullName}
        passengerPhone={trip.passenger?.phone || undefined}
        onChat={handleChat}
      />

      <CancelTripModal
        visible={isCancelModalVisible}
        tripId={trip.id}
        location={location}
        onClose={() => setIsCancelModalVisible(false)}
      />
    </>
  );
};
