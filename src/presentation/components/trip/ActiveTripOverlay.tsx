import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Dimensions,
  Keyboard,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { THEME_COLORS } from '../../../core/constants/theme';
import {
  completeTrip,
  driverArrived,
  driverCancelTrip,
  startTrip,
} from '../../../core/trip/actions/trip.actions';
import { Trip, getPaymentMethodInfo } from '../../../core/trip/interface/trip.interface';
import { useDriverLocation } from '../../maps/hooks/useDriverLocation';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';
import { SwipeToArriveButton } from './SwipeToArriveButton';
import { SwipeToFinishButton } from './SwipeToFinishButton';

const getPreferenceIcon = (pref: string): keyof typeof Ionicons.glyphMap => {
  const lower = pref.toLowerCase();
  if (
    lower.includes('aire') ||
    lower.includes('clima') ||
    lower.includes('temp') ||
    lower.includes('frio') ||
    lower.includes('calor') ||
    lower.includes('°c')
  ) {
    return 'snow-outline';
  }
  if (
    lower.includes('silencio') ||
    lower.includes('mudo') ||
    lower.includes('quiet') ||
    lower.includes('tranquil')
  ) {
    return 'volume-mute-outline';
  }
  if (
    lower.includes('música') ||
    lower.includes('musica') ||
    lower.includes('radio') ||
    lower.includes('cancion')
  ) {
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
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const updateTripStatus = useDriverTripStore((state) => state.updateTripStatus);
  const { location } = useDriverLocation(true);
  const { formattedTime } = useCourtesyTimer(5);

  const [snapIndex, setSnapIndex] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const pinInputRefs = useRef<TextInput[]>([]);
  const [pinError, setPinError] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // Snap points: 0 = Minimized, 1 = Partially open (default), 2 = Fully expanded
  const snapPoints = useMemo(() => ['16%', '48%', '88%'], []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Net earnings vs Total fare calculation
  const totalFare = Number(trip.final_fare || trip.estimated_fare || 0);
  const netEarnings =
    trip.driver_earnings != null
      ? Number(trip.driver_earnings)
      : trip.fare_details?.netEarnings != null
        ? Number(trip.fare_details.netEarnings)
        : Math.round(totalFare * 0.8);

  const paymentInfo = getPaymentMethodInfo(trip.payment_method);
  const isCash = paymentInfo.isCash;
  const rawThirdPartyName = trip.thirdPartyName || trip.third_party?.name || trip.chat?.third_party?.name || null;
  const rawThirdPartyPhone = trip.thirdPartyPhone || trip.third_party?.phone_e164 || trip.chat?.third_party?.phone_e164 || null;
  const isThirdParty = Boolean(
    trip.chat?.is_third_party_trip ||
    rawThirdPartyName
  );

  const rawPassengerName = trip.passenger?.fullName || 'Pasajero';
  const passengerName = isThirdParty && rawThirdPartyName
    ? `Viaja: ${rawThirdPartyName} (Tercero)`
    : rawPassengerName;
  const avatarLetter = (rawThirdPartyName || rawPassengerName || 'P').charAt(0).toUpperCase();

  const passengerPhone = isThirdParty && rawThirdPartyPhone
    ? rawThirdPartyPhone
    : (trip.passenger?.phone || '');
  const coordinatorName = trip.chat?.coordinator_name || '';
  const preferences = trip.passenger?.preferences || [];
  const currentPin = pinDigits.join('');
  const isStartEnabled = !trip.require_pin || currentPin.length === 4;

  const handleSheetChange = useCallback(
    (index: number) => {
      setSnapIndex(index);
      if (onHeightChange) {
        const windowHeight = Dimensions.get('window').height;
        if (index === 0) onHeightChange(windowHeight * 0.16);
        else if (index === 1) onHeightChange(windowHeight * 0.48);
        else onHeightChange(windowHeight * 0.88);
      }
    },
    [onHeightChange]
  );

  const snapTo = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sheetRef.current?.snapToIndex(index);
  };

  // Handlers
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateTripStatus('driver_arrived');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'No se pudo notificar la llegada.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!location) {
      Alert.alert('Error', 'No se pudo obtener la ubicación actual.');
      return;
    }

    if (trip.require_pin && currentPin.length < 4) {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('PIN requerido', 'Ingresá el PIN de 4 dígitos proporcionado por el pasajero.');
      return;
    }

    try {
      setIsLoading(true);
      await startTrip(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        ...(currentPin ? { boarding_pin: currentPin } : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateTripStatus('in_progress');
    } catch (error: any) {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'PIN incorrecto o error al iniciar viaje.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTrip = () => {
    Alert.alert(
      'Cancelar servicio',
      '¿Estás seguro de cancelar este viaje por no presentación del pasajero?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            if (!location) return;
            try {
              setIsLoading(true);
              await driverCancelTrip(trip.id, {
                reason_code: 'driver_no_show',
                latitude: location.latitude,
                longitude: location.longitude,
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              useDriverTripStore.getState().setActiveTrip(null);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cancelar el viaje.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleFinishTrip = async () => {
    if (!location) return;
    try {
      setIsLoading(true);
      const completedTrip = await completeTrip(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      useDriverTripStore.getState().updateTripStatus('completed');
      useDriverTripStore.getState().setActiveTrip(completedTrip?.data || completedTrip);
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'No se pudo finalizar el viaje.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallPassenger = () => {
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible para este pasajero.');
    }
  };

  const handlePinDigitChange = (text: string, index: number) => {
    setPinError(false);
    const clean = text.replace(/[^0-9]/g, '');
    const newDigits = [...pinDigits];
    newDigits[index] = clean ? clean[clean.length - 1] : '';
    setPinDigits(newDigits);

    if (clean && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (clean && index === 3) {
      Keyboard.dismiss();
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
      const newDigits = [...pinDigits];
      newDigits[index - 1] = '';
      setPinDigits(newDigits);
    }
  };

  // Status configuration - clean, non-repetitive
  const statusInfo = useMemo(() => {
    switch (trip.status) {
      case 'driver_arriving':
        return {
          title: isThirdParty ? 'En camino a recoger al invitado' : 'En camino al pasajero',
          subtitle: `Llegada estimada en ~${trip.pickup?.etaMinutes || 2} min`,
          dotBg: 'bg-amber-400',
          textColor: 'text-amber-400',
          minimizedTag: `A ${trip.pickup?.etaMinutes || 2} min`,
          targetAddress: trip.pickup?.address || 'Punto de encuentro',
        };
      case 'driver_arrived':
        return {
          title: 'En punto de encuentro',
          subtitle: isThirdParty ? 'Esperando al invitado' : 'Esperando abordaje del pasajero',
          dotBg: 'bg-emerald-400',
          textColor: 'text-emerald-400',
          minimizedTag: `Espera: ${formattedTime}`,
          targetAddress: trip.pickup?.address || 'Punto de encuentro',
        };
      case 'in_progress':
        return {
          title: 'Viaje en curso al destino',
          subtitle: `Llegada estimada en ~${trip.dropoff?.durationMinutes || 10} min`,
          dotBg: 'bg-sky-400',
          textColor: 'text-sky-400',
          minimizedTag: 'En viaje',
          targetAddress: trip.dropoff?.address || 'Destino final',
        };
      default:
        return {
          title: 'Viaje activo',
          subtitle: isThirdParty ? 'Invitado TransferBlack VIP' : 'TransferBlack VIP',
          dotBg: 'bg-zinc-400',
          textColor: 'text-zinc-300',
          minimizedTag: 'Activo',
          targetAddress: trip.pickup?.address || '',
        };
    }
  }, [trip.status, trip.pickup, trip.dropoff, formattedTime, isThirdParty]);

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={snapPoints}
      index={1}
      onChange={handleSheetChange}
      enablePanDownToClose={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleIndicatorStyle={{
        backgroundColor: THEME_COLORS.gold,
        width: 44,
        height: 4,
        borderRadius: 2,
        opacity: 0.7,
      }}
      backgroundStyle={{
        backgroundColor: '#0A0B10',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.28)',
      }}
      handleStyle={{
        backgroundColor: 'transparent',
        paddingTop: 10,
        paddingBottom: 6,
      }}
    >
      {snapIndex === 0 ? (
        // ================= MINIMIZED STATE =================
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => snapTo(1)}
          className="flex-1 px-5 pt-1 pb-3 flex-row items-center justify-between"
          accessibilityRole="button"
          accessibilityLabel="Expandir detalles del viaje"
        >
          {/* Status & Passenger */}
          <View className="flex-row items-center flex-1 mr-3">
            <View className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotBg} mr-2.5 shadow-sm`} />
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className={`${statusInfo.textColor} font-montserrat-bold text-xs uppercase mr-2`} numberOfLines={1}>
                  {statusInfo.minimizedTag}
                </Text>
                <Text className="text-zinc-500 mr-2">•</Text>
                <Text className="text-white font-montserrat-semibold text-xs flex-1" numberOfLines={1}>
                  {passengerName}
                </Text>
              </View>
              <Text className="text-zinc-400 font-montserrat text-[11px] mt-0.5" numberOfLines={1}>
                {statusInfo.targetAddress}
              </Text>
            </View>
          </View>

          {/* Earnings & Drag Handle Indicator */}
          <View className="items-end">
            <Text className="text-zinc-400 font-montserrat text-[9px] uppercase tracking-wider">
              Tu ganancia
            </Text>
            <View className="flex-row items-center">
              <Text className="text-[#D4AF37] font-montserrat-bold text-base mr-1.5">
                ${netEarnings.toLocaleString('es-AR')}
              </Text>
              <Ionicons name="chevron-up" size={16} color={THEME_COLORS.gold} />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        // ================= EXPANDED / PARTIAL STATE =================
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Row: Stage & Earnings Summary */}
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center mb-1">
                <View className={`w-2 h-2 rounded-full ${statusInfo.dotBg} mr-2`} />
                <Text className={`${statusInfo.textColor} font-montserrat-bold text-xs uppercase tracking-wide`}>
                  {statusInfo.title}
                </Text>
              </View>
              <Text className="text-zinc-400 font-montserrat text-xs">
                {statusInfo.subtitle}
              </Text>
            </View>

            {/* Earnings & Payment Badge */}
            <View className="items-end">
              <Text className="text-zinc-400 font-montserrat text-[9px] uppercase tracking-wider mb-0.5">
                Tu ganancia
              </Text>
              <Text className="text-[#D4AF37] font-montserrat-bold text-2xl tracking-tight">
                ${netEarnings.toLocaleString('es-AR')}
              </Text>
              {isCash ? (
                <View className="flex-row items-center bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full mt-1">
                  <Ionicons name="cash-outline" size={11} color="#34D399" />
                  <Text className="text-emerald-400 font-montserrat-bold text-[10px] ml-1">
                    Cobrar ${totalFare.toLocaleString('es-AR')}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded-full mt-1">
                  <Ionicons name={paymentInfo.icon} size={11} color="#38BDF8" />
                  <Text className="text-zinc-300 font-montserrat text-[10px] ml-1 uppercase">
                    {paymentInfo.label}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Courtesy Timer (Shown exclusively when waiting at pickup) */}
          {trip.status === 'driver_arrived' && (
            <View className="flex-row items-center justify-between bg-amber-400/10 border border-amber-400/25 rounded-2xl px-4 py-3 mb-3.5">
              <View className="flex-row items-center">
                <Ionicons name="time" size={18} color="#EAB308" />
                <View className="ml-2.5">
                  <Text className="text-zinc-200 font-montserrat-semibold text-xs">
                    Tiempo de espera de cortesía
                  </Text>
                  <Text className="text-zinc-400 font-montserrat text-[10px]">
                    El pasajero fue notificado de tu llegada
                  </Text>
                </View>
              </View>
              <Text className="text-[#EAB308] font-montserrat-bold text-base">
                {formattedTime}
              </Text>
            </View>
          )}

          {/* Passenger Profile & Actions Card */}
          <View className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3.5 mb-3.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-11 h-11 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/35 items-center justify-center mr-3">
                  <Text className="text-[#D4AF37] font-montserrat-bold text-base">
                    {avatarLetter}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text className="text-white font-montserrat-bold text-sm" numberOfLines={1}>
                    {passengerName}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text className="text-zinc-200 font-montserrat-semibold text-xs ml-1 mr-2">
                      {trip.passenger?.rating ? Number(trip.passenger.rating).toFixed(1) : '5.0'}
                    </Text>
                    <Text className="text-[#D4AF37] font-montserrat-medium text-[10px] tracking-wider uppercase">
                      {isThirdParty
                        ? coordinatorName
                          ? `Invitado VIP • Por ${coordinatorName}`
                          : 'Invitado VIP'
                        : 'TransferBlack VIP'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Call & Chat Buttons */}
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={handleCallPassenger}
                  accessibilityLabel="Llamar al pasajero"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="w-10 h-10 rounded-full bg-[#18181D] border border-zinc-700/80 items-center justify-center active:opacity-70"
                >
                  <Ionicons name="call" size={17} color={THEME_COLORS.platinum} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(home)/chat')}
                  accessibilityLabel="Chatear con el pasajero"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="w-10 h-10 rounded-full bg-[#18181D] border border-zinc-700/80 items-center justify-center active:opacity-70"
                >
                  <Ionicons name="chatbubble" size={17} color={THEME_COLORS.platinum} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Passenger Preferences (If Available) */}
            {preferences.length > 0 && (
              <View className="mt-3 pt-3 border-t border-white/[0.05] flex-row flex-wrap">
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
            )}
          </View>

          {/* Route Card: Pickup & Dropoff */}
          <View className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 mb-4">
            {/* Pickup */}
            <View className="flex-row items-start mb-3">
              <View className="items-center mr-3 mt-1">
                <View className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                <View className="w-0.5 h-6 bg-zinc-700 my-1" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 font-montserrat-semibold text-[10px] uppercase tracking-wider mb-0.5">
                  Recogida
                </Text>
                <Text className="text-white font-montserrat-medium text-xs leading-4" numberOfLines={2}>
                  {trip.pickup?.address || 'Punto de encuentro'}
                </Text>
                {trip.pickup?.subtitle && (
                  <Text className="text-zinc-400 font-montserrat text-[11px] mt-0.5" numberOfLines={1}>
                    {trip.pickup.subtitle}
                  </Text>
                )}
              </View>
            </View>

            {/* Dropoff */}
            <View className="flex-row items-start">
              <View className="items-center mr-3 mt-1">
                <View className="w-3 h-3 rounded-sm bg-[#D4AF37] rotate-45 shadow-sm shadow-[#D4AF37]" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-400 font-montserrat-semibold text-[10px] uppercase tracking-wider mb-0.5">
                  Destino
                </Text>
                <Text className="text-zinc-200 font-montserrat-medium text-xs leading-4" numberOfLines={2}>
                  {trip.dropoff?.address || 'Destino solicitado'}
                </Text>
                {trip.dropoff?.subtitle && (
                  <Text className="text-zinc-400 font-montserrat text-[11px] mt-0.5" numberOfLines={1}>
                    {trip.dropoff.subtitle}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ============= STAGE SPECIFIC ACTIONS ============= */}

          {/* 1. Driver Arriving Stage */}
          {trip.status === 'driver_arriving' && (
            <View className="items-center mt-1 mb-2">
              <SwipeToArriveButton onArrive={handleArrive} isLoading={isLoading} />
            </View>
          )}

          {/* 2. Driver Arrived (Waiting at Pickup) Stage */}
          {trip.status === 'driver_arrived' && (
            <View className="mb-2">
              {/* Boarding PIN Section (If Required) */}
              {trip.require_pin && (
                <View
                  className={`w-full bg-[#151518] border ${
                    pinError ? 'border-red-500' : 'border-zinc-800'
                  } rounded-2xl px-4 py-3 mb-3.5`}
                >
                  <View className="flex-row justify-between items-center mb-2.5">
                    <Text className="text-zinc-300 font-montserrat-semibold text-xs uppercase tracking-wider">
                      PIN de abordaje (pedir al pasajero)
                    </Text>
                    {isKeyboardVisible && (
                      <TouchableOpacity
                        onPress={Keyboard.dismiss}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="px-2 py-0.5 bg-zinc-800 rounded-md"
                      >
                        <Text className="text-[#EAB308] font-montserrat-semibold text-[11px]">
                          Listo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View className="flex-row items-center justify-center gap-3">
                    {pinDigits.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          if (ref) pinInputRefs.current[index] = ref;
                        }}
                        className={`w-12 h-12 text-center font-montserrat-bold text-lg text-white rounded-xl bg-[#1F1F24] border ${
                          pinError
                            ? 'border-red-500'
                            : digit
                              ? 'border-[#EAB308]'
                              : 'border-zinc-700'
                        }`}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        maxLength={1}
                        value={digit}
                        onChangeText={(text) => handlePinDigitChange(text, index)}
                        onKeyPress={(e) => handlePinKeyPress(e, index)}
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Start Trip Button */}
              <TouchableOpacity
                onPress={handleStartTrip}
                disabled={isLoading || !isStartEnabled}
                className={`w-full py-4 rounded-2xl items-center justify-center mb-2.5 ${
                  isStartEnabled ? 'bg-[#EAB308]' : 'bg-[#EAB308]/40'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Iniciar viaje"
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text className="text-black font-montserrat-bold text-base tracking-wider uppercase">
                    Iniciar viaje
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cancel Service Button */}
              <TouchableOpacity
                onPress={handleCancelTrip}
                disabled={isLoading}
                className="w-full py-2 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Cancelar servicio"
              >
                <Text className="text-zinc-500 font-montserrat-medium text-xs">
                  Pasajero no se presentó • Cancelar servicio
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3. In Progress Stage */}
          {trip.status === 'in_progress' && (
            <View className="items-center mt-1 mb-2">
              <SwipeToFinishButton onFinish={handleFinishTrip} isLoading={isLoading} />
            </View>
          )}
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
};

