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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passengerPhone) {
      Linking.openURL(`tel:${passengerPhone}`);
    } else {
      Alert.alert('Contacto', 'El número de teléfono no está disponible para este pasajero.');
    }
  };

  const handleOpenExternalGps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const target = trip.status === 'in_progress' ? trip.dropoff : trip.pickup;
    if (target?.latitude && target?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Navegación GPS', 'No se pudo abrir la app de mapas externa.');
      });
    } else if (target?.address) {
      const encoded = encodeURIComponent(target.address);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Navegación GPS', 'No se pudo abrir la app de mapas externa.');
      });
    } else {
      Alert.alert('Navegación GPS', 'No hay coordenadas disponibles para el destino.');
    }
  };

  const handleEmergencyCall = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Asistencia y Seguridad en Ruta',
      '¿Con quién deseás comunicarte?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Llamar al 911 (Emergencias)',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:911'),
        },
        {
          text: 'Central de Operaciones TransferBlack',
          onPress: () => {
            Linking.openURL('tel:+543516598216').catch(() => {});
          },
        },
      ]
    );
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
        opacity: 0.8,
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
              <Text className="text-ash font-montserrat text-[11px] mt-0.5" numberOfLines={1}>
                {statusInfo.targetAddress}
              </Text>
            </View>
          </View>

          {/* Earnings & Drag Handle Indicator */}
          <View className="items-end">
            <Text className="text-ash font-montserrat text-[9px] uppercase tracking-wider">
              Tu ganancia
            </Text>
            <View className="flex-row items-center">
              <Text
                className="text-gold font-montserrat-bold text-base mr-1.5"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                ${netEarnings.toLocaleString('es-AR')}
              </Text>
              <Ionicons name="chevron-up" size={16} color={THEME_COLORS.gold} />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        // ================= EXPANDED / PARTIAL STATE (CLEAN UNIFIED SHEET) =================
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECCIÓN 1: CABINA & PASAJERO */}
          <View className="pt-1 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                {/* Avatar */}
                <View className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center mr-3 shadow-md shadow-black">
                  <Text className="text-gold font-montserrat-bold text-lg">
                    {avatarLetter}
                  </Text>
                </View>

                {/* Info Pasajero */}
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-white font-montserrat-bold text-base mr-1.5" numberOfLines={1}>
                      {passengerName}
                    </Text>
                    <Ionicons name="shield-checkmark" size={14} color="#38BDF8" />
                  </View>

                  <View className="flex-row items-center mt-0.5">
                    <Ionicons name="star" size={12} color={THEME_COLORS.gold} />
                    <Text
                      className="text-white font-montserrat-semibold text-xs ml-1 mr-2"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {trip.passenger?.rating ? Number(trip.passenger.rating).toFixed(1) : '5.0'}
                    </Text>
                    <Text className="text-gold/90 font-montserrat-medium text-[10px] tracking-wider uppercase">
                      {isThirdParty
                        ? coordinatorName
                          ? `Invitado • ${coordinatorName}`
                          : 'Invitado VIP'
                        : 'TransferBlack VIP'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Botones de Comunicación (Llamar y Chat) */}
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={handleCallPassenger}
                  accessibilityLabel="Llamar al pasajero"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/15 items-center justify-center active:scale-95"
                >
                  <Ionicons name="call" size={19} color={THEME_COLORS.platinum} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/(home)/chat');
                  }}
                  accessibilityLabel="Chatear con el pasajero"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/35 items-center justify-center active:scale-95"
                >
                  <Ionicons name="chatbubble-ellipses" size={19} color={THEME_COLORS.gold} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Estado del Viaje y Ganancia */}
            <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-white/10">
              <View className="flex-row items-center flex-1 mr-2">
                <View className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotBg} mr-2 shadow-sm`} />
                <View className="flex-1">
                  <Text className={`${statusInfo.textColor} font-montserrat-bold text-xs uppercase tracking-wider`}>
                    {statusInfo.title}
                  </Text>
                  <Text className="text-ash font-montserrat text-xs mt-0.5" numberOfLines={1}>
                    {statusInfo.subtitle}
                  </Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-ash font-montserrat text-[9px] uppercase tracking-wider">
                  Tu ganancia
                </Text>
                <Text
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="text-gold font-montserrat-bold text-lg"
                >
                  ${netEarnings.toLocaleString('es-AR')}
                </Text>
              </View>
            </View>

            {/* Control Primario de Conducción */}
            <View className="mt-3.5">
              {trip.status === 'driver_arriving' && (
                <SwipeToArriveButton onArrive={handleArrive} isLoading={isLoading} />
              )}

              {trip.status === 'driver_arrived' && (
                <View className="w-full">
                  {/* Cronómetro */}
                  <View className="flex-row items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2.5 mb-3">
                    <View className="flex-row items-center">
                      <Ionicons name="time" size={17} color="#F59E0B" />
                      <View className="ml-2.5">
                        <Text className="text-white font-montserrat-semibold text-xs">
                          Tiempo de cortesía
                        </Text>
                        <Text className="text-ash font-montserrat text-[10px]">
                          Pasajero avisado de tu llegada
                        </Text>
                      </View>
                    </View>
                    <Text
                      className="text-amber-400 font-montserrat-bold text-base"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {formattedTime}
                    </Text>
                  </View>

                  {/* PIN */}
                  {trip.require_pin && (
                    <View className="w-full mb-3">
                      <View className="flex-row justify-between items-center mb-2">
                        <Text className="text-white font-montserrat-semibold text-xs uppercase tracking-wider">
                          PIN de abordaje (pedir al pasajero)
                        </Text>
                        {isKeyboardVisible && (
                          <TouchableOpacity
                            onPress={Keyboard.dismiss}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            className="px-2.5 py-1 bg-white/10 rounded-md"
                          >
                            <Text className="text-gold font-montserrat-semibold text-[11px]">
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
                            className={`w-14 h-14 text-center font-montserrat-bold text-2xl text-white rounded-2xl bg-black/60 border ${
                              pinError
                                ? 'border-red-500'
                                : digit
                                  ? 'border-gold shadow-sm shadow-gold/30'
                                  : 'border-white/15'
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

                  {/* Iniciar Viaje */}
                  <TouchableOpacity
                    onPress={handleStartTrip}
                    disabled={isLoading || !isStartEnabled}
                    className={`w-full h-14 rounded-2xl items-center justify-center active:scale-98 ${
                      isStartEnabled
                        ? 'bg-gold shadow-lg shadow-gold/20'
                        : 'bg-charcoal/60 border border-white/5 opacity-50'
                    }`}
                    accessibilityRole="button"
                    accessibilityLabel="Iniciar viaje"
                  >
                    {isLoading ? (
                      <ActivityIndicator color={THEME_COLORS.obsidian} />
                    ) : (
                      <Text className="text-obsidian font-montserrat-bold text-base tracking-wider uppercase">
                        Iniciar Viaje
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {trip.status === 'in_progress' && (
                <SwipeToFinishButton onFinish={handleFinishTrip} isLoading={isLoading} />
              )}
            </View>
          </View>

          {/* DIVIDER SUAVE */}
          <View className="h-[1px] bg-white/10 my-1" />

          {/* SECCIÓN 2: HOJA DE RUTA Y NAVEGACIÓN */}
          <View className="py-4">
            {/* Botón Navegación GPS a 1 Toque */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenExternalGps}
              className="w-full py-3.5 px-4 mb-4 rounded-2xl bg-gold/15 border border-gold/35 flex-row items-center justify-between active:scale-98"
              accessibilityRole="button"
              accessibilityLabel="Iniciar navegación en Google Maps o Waze"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-8 h-8 rounded-xl bg-gold/20 items-center justify-center mr-2.5">
                  <Ionicons name="navigate" size={17} color={THEME_COLORS.gold} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-montserrat-bold text-xs uppercase tracking-wider">
                    Navegar con Google Maps / Waze
                  </Text>
                  <Text className="text-ash font-montserrat text-[10px]">
                    {trip.status === 'in_progress' ? 'Ruta hacia destino' : 'Ruta hacia punto de encuentro'}
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={16} color={THEME_COLORS.gold} />
            </TouchableOpacity>

            {/* Timeline Limpio de Direcciones */}
            <View className="px-1">
              {/* Pickup */}
              <View className="flex-row items-start mb-3">
                <View className="items-center mr-3 mt-1">
                  <View className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <View className="w-0.5 h-7 bg-white/20 my-1" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-emerald-400 font-montserrat-semibold text-[10px] uppercase tracking-wider">
                      Punto de Encuentro
                    </Text>
                    {trip.pickup?.etaMinutes && (
                      <Text className="text-emerald-400 font-montserrat-semibold text-[10px]">
                        ~{trip.pickup.etaMinutes} min
                      </Text>
                    )}
                  </View>
                  <Text className="text-white font-montserrat-medium text-xs leading-4 mt-0.5" numberOfLines={2}>
                    {trip.pickup?.address || 'Punto de recogida'}
                  </Text>
                  {trip.pickup?.subtitle && (
                    <Text className="text-ash font-montserrat text-[10px] mt-0.5" numberOfLines={1}>
                      {trip.pickup.subtitle}
                    </Text>
                  )}
                </View>
              </View>

              {/* Dropoff */}
              <View className="flex-row items-start">
                <View className="items-center mr-3 mt-1">
                  <View className="w-3.5 h-3.5 rounded-sm bg-gold rotate-45 shadow-sm shadow-gold" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gold font-montserrat-semibold text-[10px] uppercase tracking-wider">
                      Destino Solicitado
                    </Text>
                    {trip.dropoff?.durationMinutes && (
                      <Text className="text-gold font-montserrat-semibold text-[10px]">
                        ~{trip.dropoff.durationMinutes} min
                      </Text>
                    )}
                  </View>
                  <Text className="text-white font-montserrat-medium text-xs leading-4 mt-0.5" numberOfLines={2}>
                    {trip.dropoff?.address || 'Destino solicitado'}
                  </Text>
                  {trip.dropoff?.subtitle && (
                    <Text className="text-ash font-montserrat text-[10px] mt-0.5" numberOfLines={1}>
                      {trip.dropoff.subtitle}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Preferencias de Pasajero */}
            {preferences.length > 0 && (
              <View className="mt-3.5 pt-3 border-t border-white/5 flex-row flex-wrap">
                {preferences.map((pref, idx) => (
                  <View
                    key={`${pref}-${idx}`}
                    className="flex-row items-center bg-gold/10 border border-gold/25 px-2.5 py-1 rounded-full mr-1.5 mb-1.5"
                  >
                    <Ionicons name={getPreferenceIcon(pref)} size={12} color={THEME_COLORS.gold} />
                    <Text className="text-gold font-montserrat-medium text-xs ml-1.5">
                      {pref}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* DIVIDER SUAVE */}
          <View className="h-[1px] bg-white/10 my-1" />

          {/* SECCIÓN 3: FINANZAS Y COBRO */}
          <View className="py-4">
            {/* Banner de Cobro */}
            {isCash ? (
              <View className="bg-emerald-500/15 border border-emerald-500/35 rounded-2xl p-3.5 mb-3 flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-emerald-500/20 items-center justify-center mr-3">
                  <Ionicons name="cash" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-400 font-montserrat-bold text-xs uppercase tracking-wider">
                    Cobrar en Efectivo al Pasajero
                  </Text>
                  <Text
                    style={{ fontVariant: ['tabular-nums'] }}
                    className="text-white font-montserrat-bold text-xl leading-tight"
                  >
                    ${totalFare.toLocaleString('es-AR')}
                  </Text>
                  <Text className="text-zinc-300 font-montserrat text-[10px] mt-0.5">
                    Cobrar al finalizar antes de que el pasajero descienda
                  </Text>
                </View>
              </View>
            ) : (
              <View className="bg-white/5 border border-white/15 rounded-2xl p-3.5 mb-3 flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center mr-3">
                  <Ionicons name={paymentInfo.icon} size={20} color={THEME_COLORS.platinum} />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-montserrat-bold text-xs uppercase tracking-wider">
                    Pago Electrónico ({paymentInfo.label})
                  </Text>
                  <Text className="text-zinc-300 font-montserrat text-xs mt-0.5">
                    Acreditado en cuenta • No solicitar dinero en efectivo
                  </Text>
                </View>
              </View>
            )}

            {/* Tabla Limpia de Cuentas */}
            <View className="px-1 py-2">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="text-ash font-montserrat text-xs">Tarifa del viaje</Text>
                <Text
                  className="text-white font-montserrat-semibold text-xs"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ${totalFare.toFixed(2)}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-ash font-montserrat text-xs">Comisión TransferBlack (20%)</Text>
                <Text
                  className="text-red-400 font-montserrat-semibold text-xs"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  -${(totalFare * 0.2).toFixed(2)}
                </Text>
              </View>

              <View className="h-[1px] bg-white/10 w-full my-1.5" />

              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-platinum font-montserrat-bold text-xs uppercase tracking-wider">
                    Tu ganancia neta
                  </Text>
                  <Text className="text-ash/70 font-montserrat text-[10px]">
                    Código: {trip.public_code || trip.id?.slice(0, 8)}
                  </Text>
                </View>
                <Text
                  className="text-gold font-montserrat-bold text-xl"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ${netEarnings.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* DIVIDER SUAVE */}
          <View className="h-[1px] bg-white/10 my-1" />

          {/* SECCIÓN 4: ASISTENCIA S.O.S. Y CANCELACIÓN */}
          <View className="pt-3 pb-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 items-center justify-center mr-3">
                  <Ionicons name="shield-checkmark" size={20} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-montserrat-semibold text-xs">
                    Seguridad en Ruta
                  </Text>
                  <Text className="text-ash font-montserrat text-[10px] mt-0.5">
                    Asistencia 24/7 y monitoreo activo
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleEmergencyCall}
                className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 active:bg-red-500/30"
                accessibilityRole="button"
                accessibilityLabel="Pedir asistencia o emergencia"
              >
                <Text className="text-red-400 font-montserrat-bold text-xs uppercase tracking-wider">
                  S.O.S.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cancelación */}
            {(trip.status === 'driver_arriving' || trip.status === 'driver_arrived') && (
              <TouchableOpacity
                onPress={handleCancelTrip}
                disabled={isLoading}
                className="w-full py-3 mt-3 rounded-xl items-center justify-center bg-white/5 border border-white/10 active:bg-white/10"
                accessibilityRole="button"
                accessibilityLabel="Cancelar servicio"
              >
                <Text className="text-red-400/90 font-montserrat-medium text-xs">
                  Pasajero no se presentó • Cancelar servicio
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BottomSheetScrollView>
      )}
    </BottomSheet>
  );
};


