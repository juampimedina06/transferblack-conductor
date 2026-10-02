import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  PanResponder,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../../../core/constants/theme';
import { completeTrip, driverArrived, driverCancelTrip, startTrip } from '../../../core/trip/actions/trip.actions';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { useDriverLocation } from '../../maps/hooks/useDriverLocation';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { SwipeToArriveButton } from './SwipeToArriveButton';
import { SwipeToFinishButton } from './SwipeToFinishButton';
import { WaitingBottomSheet } from './WaitingBottomSheet';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const getPreferenceIcon = (pref: string): keyof typeof Ionicons.glyphMap => {
  const lower = pref.toLowerCase();
  if (lower.includes('aire') || lower.includes('clima') || lower.includes('temp') || lower.includes('frio') || lower.includes('calor')) {
    return 'snow-outline';
  }
  if (lower.includes('silencio') || lower.includes('mudo') || lower.includes('quiet') || lower.includes('tranquil')) {
    return 'volume-mute-outline';
  }
  if (lower.includes('música') || lower.includes('musica') || lower.includes('radio') || lower.includes('cancion')) {
    return 'musical-notes-outline';
  }
  if (lower.includes('convers') || lower.includes('charla') || lower.includes('hablar')) {
    return 'chatbubbles-outline';
  }
  if (lower.includes('equipaje') || lower.includes('valija') || lower.includes('maleta')) {
    return 'briefcase-outline';
  }
  return 'sparkles-outline';
};

interface ActiveTripOverlayProps {
  trip: Trip;
  onHeightChange?: (height: number) => void;
}

export const ActiveTripOverlay = ({ trip, onHeightChange }: ActiveTripOverlayProps) => {
  const updateTripStatus = useDriverTripStore(state => state.updateTripStatus);
  const { location } = useDriverLocation(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleMinimize = (minimized?: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsMinimized(prev => (minimized !== undefined ? minimized : !prev));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 15) {
            // Drag down -> minimize
            toggleMinimize(true);
          } else if (gestureState.dy < -15) {
            // Drag up -> expand
            toggleMinimize(false);
          } else if (Math.abs(gestureState.dy) < 8 && Math.abs(gestureState.dx) < 8) {
            // Tap -> toggle
            toggleMinimize();
          }
        },
      }),
    []
  );

  const handleArrive = async () => {
    if (!location) {
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
      return;
    }

    try {
      setIsLoading(true);
      await driverArrived(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
      updateTripStatus('driver_arrived');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo notificar la llegada.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrip = async (pin?: string) => {
    if (!location) {
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
      return;
    }
    try {
      await startTrip(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        ...(pin ? { boarding_pin: pin } : {}),
      });
      updateTripStatus('in_progress');
    } catch (error: any) {
      throw error;
    }
  };

  const handleCancelTrip = async () => {
    if (!location) return;
    try {
      await driverCancelTrip(trip.id, {
        reason_code: 'driver_no_show',
        latitude: location.latitude,
        longitude: location.longitude,
      });
      useDriverTripStore.getState().setActiveTrip(null); // Return to idle
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cancelar el viaje.');
    }
  };

  if (trip.status === 'driver_arrived') {
    return (
      <WaitingBottomSheet
        trip={trip}
        onStartTrip={handleStartTrip}
        onCancel={handleCancelTrip}
        onHeightChange={onHeightChange}
      />
    );
  }

  if (trip.status === 'driver_arriving') {
    const preferences = trip.passenger?.preferences || [];

    return (
      <SafeAreaView
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        className="absolute bottom-0 w-full px-4 pb-5 pt-2 bg-obsidian rounded-t-3xl border-t border-charcoal shadow-2xl shadow-black"
        edges={['bottom']}
      >
        {/* Top Interactive Area (Swipe down to minimize / Swipe up to expand) */}
        <View {...panResponder.panHandlers} className="w-full pt-1 pb-1.5 items-center">
          <View className="w-12 h-1.5 bg-zinc-600 rounded-full mb-1.5" />

          {isMinimized ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => toggleMinimize(false)}
              className="w-full flex-row items-center justify-between px-1 mb-2.5"
              accessibilityRole="button"
              accessibilityLabel="Expandir detalles del viaje"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                <Text className="text-emerald-400 font-montserrat-semibold text-xs uppercase tracking-wider mr-2">
                  A {trip.pickup?.etaMinutes || 2} min
                </Text>
                <Text className="text-zinc-500 mr-2">•</Text>
                <Text className="text-white font-montserrat-bold text-xs flex-1" numberOfLines={1}>
                  {trip.passenger?.fullName || trip.third_party?.name || 'Pasajero'}
                </Text>
              </View>

              <View className="flex-row items-center">
                <Text className="text-white font-montserrat-bold text-sm mr-2">
                  ${Number(trip.estimated_fare || 0).toLocaleString('es-AR')}
                </Text>
                <Ionicons name="chevron-up" size={16} color={THEME_COLORS.gold} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleMinimize(true)}
              className="flex-row items-center py-0.5 mb-1"
              accessibilityRole="button"
              accessibilityLabel="Minimizar tarjeta"
            >
              <Ionicons name="chevron-down" size={14} color={THEME_COLORS.ash} />
              <Text className="text-zinc-500 font-montserrat text-[10px] ml-1">
                Deslizar hacia abajo para minimizar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!isMinimized && (
          <>
            {/* Header: ETA & Net Fare */}
            <View className="flex-row items-center justify-between mb-3 px-0.5">
              <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                <Text className="text-emerald-400 font-montserrat-semibold text-[11px] uppercase tracking-wider">
                  A {trip.pickup?.etaMinutes || 2} min • En camino
                </Text>
              </View>

              <View className="flex-row items-center">
                <Text className="text-white font-montserrat-bold text-lg mr-2">
                  ${Number(trip.estimated_fare || 0).toLocaleString('es-AR')}
                </Text>
                <View className="flex-row items-center bg-white/[0.06] border border-white/10 px-2 py-0.5 rounded-lg">
                  <Ionicons
                    name={trip.payment_method?.toLowerCase() === 'card' ? 'card-outline' : 'cash-outline'}
                    size={12}
                    color={THEME_COLORS.gold}
                  />
                  <Text className="text-zinc-300 font-montserrat text-[10px] ml-1 uppercase">
                    {trip.payment_method?.toLowerCase() === 'card' ? 'Tarjeta' : 'Efectivo'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Passenger Info Glass Card */}
            <View className="flex-row justify-between items-center bg-[#1A1A1C] border border-[#2C2C2E] rounded-2xl p-3 mb-3">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 bg-charcoal rounded-full items-center justify-center mr-3 border border-charcoal">
                  <Ionicons name="person" size={20} color={THEME_COLORS.platinum} />
                  {(trip.chat?.is_third_party_trip || trip.passenger?.category === 'VIP') && (
                    <View className="absolute -bottom-0.5 -right-0.5 bg-gold rounded-full p-0.5">
                      <Ionicons name="star" size={9} color={THEME_COLORS.obsidian} />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-platinum font-montserrat-bold text-base" numberOfLines={1}>
                    {trip.passenger?.fullName || trip.third_party?.name || trip.chat?.third_party?.name || 'Pasajero'}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <View className="flex-row items-center mr-2">
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text className="text-white font-montserrat-semibold text-xs ml-0.5">
                        {trip.passenger?.rating ? Number(trip.passenger.rating).toFixed(2) : '4.95'}
                      </Text>
                      {trip.passenger?.completedTrips !== undefined && (
                        <Text className="text-zinc-400 font-montserrat text-[10px] ml-1">
                          ({trip.passenger.completedTrips})
                        </Text>
                      )}
                    </View>
                    <Text className="text-gold font-montserrat-medium text-[10px] tracking-wider uppercase">
                      {trip.chat?.is_third_party_trip ? 'Invitado VIP' : (trip.passenger?.category || 'VIP')}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  accessibilityLabel="Llamar al pasajero"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="w-9 h-9 rounded-full bg-obsidian border border-charcoal items-center justify-center"
                >
                  <Ionicons name="call" size={16} color={THEME_COLORS.platinum} />
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Chatear con el pasajero"
                  accessibilityRole="button"
                  onPress={() => router.push('/(home)/chat')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="w-9 h-9 rounded-full bg-obsidian border border-charcoal items-center justify-center active:opacity-70"
                >
                  <Ionicons name="chatbubble" size={16} color={THEME_COLORS.platinum} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Passenger VIP Preferences Chips */}
            {preferences.length > 0 && (
              <View className="mb-3">
                <Text className="text-zinc-400 font-montserrat-semibold text-[10px] tracking-widest uppercase mb-1.5">
                  Preferencias del pasajero
                </Text>
                <View className="flex-row flex-wrap">
                  {preferences.map((pref, idx) => (
                    <View
                      key={`${pref}-${idx}`}
                      className="flex-row items-center bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-2.5 py-1 rounded-full mr-1.5 mb-1.5"
                    >
                      <Ionicons name={getPreferenceIcon(pref)} size={11} color={THEME_COLORS.gold} />
                      <Text className="text-[#D4AF37] font-montserrat-medium text-xs ml-1.5">
                        {pref}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Route Details: Pickup & Dropoff */}
            <View className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 mb-4">
              {/* Pickup */}
              <View className="flex-row items-start mb-2.5">
                <View className="items-center mr-2.5 mt-0.5">
                  <View className="w-3 h-3 rounded-full bg-emerald-400/20 border border-emerald-400 items-center justify-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </View>
                  <View className="w-0.5 h-4 border-l border-dashed border-zinc-600 my-0.5" />
                </View>
                <View className="flex-1 -mt-0.5">
                  <Text className="text-emerald-400 font-montserrat-semibold text-[10px] uppercase tracking-wider">
                    Punto de encuentro
                  </Text>
                  <Text className="text-white font-montserrat-medium text-xs leading-4" numberOfLines={1}>
                    {trip.pickup?.address || 'Origen solicitado'}
                  </Text>
                  {trip.pickup?.subtitle && (
                    <Text className="text-zinc-400 font-montserrat text-[10px]" numberOfLines={1}>
                      {trip.pickup.subtitle}
                    </Text>
                  )}
                </View>
              </View>

              {/* Dropoff */}
              <View className="flex-row items-start">
                <View className="items-center mr-2.5 mt-1">
                  <View className="w-2.5 h-2.5 rounded-sm bg-[#D4AF37] rotate-45 shadow-sm shadow-[#D4AF37]" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[#D4AF37] font-montserrat-semibold text-[10px] uppercase tracking-wider">
                      Destino final
                    </Text>
                    {trip.dropoff?.durationMinutes !== undefined && (
                      <Text className="text-zinc-400 font-montserrat text-[10px]">
                        ~{trip.dropoff.durationMinutes} min
                      </Text>
                    )}
                  </View>
                  <Text className="text-zinc-200 font-montserrat-medium text-xs leading-4" numberOfLines={1}>
                    {trip.dropoff?.address || 'Destino no especificado'}
                  </Text>
                  {trip.dropoff?.subtitle && (
                    <Text className="text-zinc-400 font-montserrat text-[10px]" numberOfLines={1}>
                      {trip.dropoff.subtitle}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </>
        )}

        <View className="items-center">
          <SwipeToArriveButton onArrive={handleArrive} isLoading={isLoading} />
        </View>
      </SafeAreaView>
    );
  }

  if (trip.status === 'in_progress') {
    const preferences = trip.passenger?.preferences || [];

    return (
      <SafeAreaView
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        className="absolute bottom-0 w-full px-4 pb-6 pt-2 bg-obsidian rounded-t-3xl border-t border-charcoal shadow-2xl shadow-black"
        edges={['bottom']}
      >
        {/* Top Interactive Area (Swipe down to minimize / Swipe up to expand) */}
        <View {...panResponder.panHandlers} className="w-full pt-1 pb-1.5 items-center">
          <View className="w-12 h-1.5 bg-zinc-600 rounded-full mb-1.5" />

          {isMinimized ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => toggleMinimize(false)}
              className="w-full flex-row items-center justify-between px-1 mb-2.5"
              accessibilityRole="button"
              accessibilityLabel="Expandir destino del viaje"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
                <Text className="text-white font-montserrat-semibold text-xs flex-1" numberOfLines={1}>
                  {trip.dropoff?.address || 'Destino final'}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-white font-montserrat-bold text-sm mr-2">
                  ${Number(trip.estimated_fare || 0).toLocaleString('es-AR')}
                </Text>
                <Ionicons name="chevron-up" size={16} color={THEME_COLORS.gold} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleMinimize(true)}
              className="flex-row items-center py-0.5 mb-1"
              accessibilityRole="button"
              accessibilityLabel="Minimizar tarjeta"
            >
              <Ionicons name="chevron-down" size={14} color={THEME_COLORS.ash} />
              <Text className="text-zinc-500 font-montserrat text-[10px] ml-1">
                Deslizar hacia abajo para minimizar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!isMinimized && (
          <>
            <View className="flex-row items-center justify-between mb-3 px-0.5">
              <View className="flex-row items-center bg-blue-500/10 border border-blue-500/25 px-2.5 py-1 rounded-full">
                <View className="w-2 h-2 rounded-full bg-blue-400 mr-1.5" />
                <Text className="text-blue-400 font-montserrat-semibold text-[11px] uppercase tracking-wider">
                  En viaje al destino
                </Text>
              </View>
              <Text className="text-white font-montserrat-bold text-lg">
                ${Number(trip.estimated_fare || 0).toLocaleString('es-AR')}
              </Text>
            </View>

            {/* Dropoff Destination Card */}
            <View className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[#D4AF37] font-montserrat-semibold text-[10px] uppercase tracking-wider">
                  Destino final
                </Text>
                {trip.dropoff?.durationMinutes !== undefined && (
                  <Text className="text-zinc-400 font-montserrat text-[10px]">
                    ~{trip.dropoff.durationMinutes} min
                  </Text>
                )}
              </View>
              <Text className="text-white font-montserrat-semibold text-sm leading-5" numberOfLines={2}>
                {trip.dropoff?.address || 'Destino no especificado'}
              </Text>
              {trip.dropoff?.subtitle && (
                <Text className="text-zinc-400 font-montserrat text-xs mt-0.5" numberOfLines={1}>
                  {trip.dropoff.subtitle}
                </Text>
              )}
            </View>

            {/* Passenger VIP Preferences Chips in Progress */}
            {preferences.length > 0 && (
              <View className="mb-4">
                <Text className="text-zinc-400 font-montserrat-semibold text-[10px] tracking-widest uppercase mb-1.5">
                  Preferencias del pasajero
                </Text>
                <View className="flex-row flex-wrap">
                  {preferences.map((pref, idx) => (
                    <View
                      key={`${pref}-${idx}`}
                      className="flex-row items-center bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-2.5 py-1 rounded-full mr-1.5 mb-1.5"
                    >
                      <Ionicons name={getPreferenceIcon(pref)} size={11} color={THEME_COLORS.gold} />
                      <Text className="text-[#D4AF37] font-montserrat-medium text-xs ml-1.5">
                        {pref}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View className="items-center">
          <SwipeToFinishButton
            onFinish={async () => {
              if (!location) return;
              try {
                setIsLoading(true);
                const completedTrip = await completeTrip(trip.id, {
                  latitude: location.latitude,
                  longitude: location.longitude,
                });

                // Emulate Haptic success
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                useDriverTripStore.getState().updateTripStatus('completed');
                useDriverTripStore.getState().setActiveTrip(completedTrip?.data || completedTrip);
              } catch (error: any) {
                Alert.alert('Error', error.message || 'No se pudo finalizar el viaje.');
              } finally {
                setIsLoading(false);
              }
            }}
            isLoading={isLoading}
          />
        </View>
      </SafeAreaView>
    );
  }

  // other states can be handled here or inside index
  return null;
};
