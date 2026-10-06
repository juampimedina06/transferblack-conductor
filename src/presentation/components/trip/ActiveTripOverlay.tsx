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
  startTrip,
} from '../../../core/trip/actions/trip.actions';
import {
  Trip,
  getPaymentMethodInfo,
  calculateTripDistanceKm,
} from '../../../core/trip/interface/trip.interface';
import { useDriverLocation } from '../../maps/hooks/useDriverLocation';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';
import { SwipeToArriveButton } from './SwipeToArriveButton';
import { SwipeToFinishButton } from './SwipeToFinishButton';
import { AmbientGlow } from '../ui/AmbientGlow';
import { SosConfirmationModal } from '../safety/SosConfirmationModal';
import { CancelTripModal } from './CancelTripModal';
import { sosQueueService } from '../../../core/safety/services/sosQueueService';

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
  const [isSosModalVisible, setIsSosModalVisible] = useState<boolean>(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState<boolean>(false);
  const [sosStatus, setSosStatus] = useState<'idle' | 'sending' | 'success' | 'retrying'>('idle');

  // Snap points: 0 = Minimized, 1 = Partially open (default), 2 = Fully expanded
  const snapPoints = useMemo(() => ['16%', '48%', '88%'], []);

  useEffect(() => {
    return sosQueueService.subscribe(setSosStatus);
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Passenger payment details (net earnings are strictly shown on the rating/receipt modal)
  const totalFare = Number(trip.final_fare || trip.estimated_fare || 0);
  const paymentInfo = getPaymentMethodInfo(trip.payment_method);
  const isCash = paymentInfo.isCash;

  const durationMin = trip.dropoff?.durationMinutes || 12;
  const tripDistanceKm = calculateTripDistanceKm(
    trip.pickup?.latitude,
    trip.pickup?.longitude,
    trip.dropoff?.latitude,
    trip.dropoff?.longitude,
    durationMin
  );

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
    setIsCancelModalVisible(true);
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
    setIsSosModalVisible(true);
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
          title: isThirdParty ? 'En camino por el invitado' : 'En camino al pasajero',
          subtitle: `Llegada estimada en ~${trip.pickup?.etaMinutes || 2} min`,
          dotBg: 'bg-amber-400',
          textColor: 'text-amber-400',
          minimizedTag: `A ~${trip.pickup?.etaMinutes || 2} min`,
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
          subtitle: `${tripDistanceKm} • ~${durationMin} min`,
          dotBg: 'bg-sky-400',
          textColor: 'text-sky-400',
          minimizedTag: `En viaje (${tripDistanceKm})`,
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
  }, [trip.status, trip.pickup, trip.dropoff, formattedTime, isThirdParty, tripDistanceKm, durationMin]);

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
        backgroundColor: 'rgba(255, 255, 255, 0.28)',
        width: 44,
        height: 4,
        borderRadius: 2,
      }}
      backgroundStyle={{
        backgroundColor: 'rgba(10, 11, 16, 0.82)',
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        borderTopWidth: 1.5,
        borderColor: 'rgba(212, 175, 55, 0.4)',
      }}
      handleStyle={{
        backgroundColor: 'transparent',
        paddingTop: 10,
        paddingBottom: 6,
      }}
    >
      {/* Top Specular Edge Glass Highlight */}
      <View className="absolute top-0 left-8 right-8 h-[1px] bg-white/25 pointer-events-none z-50" />

      {/* Subtle Ambient Gold Depth Flare */}
      <View className="absolute -top-12 -right-12 pointer-events-none z-0" style={{ width: 180, height: 180 }}>
        <AmbientGlow position="top-right" height={180} opacity={0.16} color="#D4AF37" />
      </View>

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

          {/* Botón SOS en minimizado (< 2 toques: 1 toque abre modal, 1 toque confirma) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              handleEmergencyCall();
            }}
            accessibilityRole="button"
            accessibilityLabel="Botón de emergencia SOS 911"
            className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/50 items-center justify-center mr-2.5 active:scale-95 shadow-sm shadow-red-500/30"
          >
            <Ionicons name="warning" size={17} color="#EF4444" />
          </TouchableOpacity>

          {/* Passenger Collection Indicator (Efectivo vs Digital) */}
          <View className="items-end">
            <Text
              className={`font-montserrat text-[9px] uppercase tracking-wider ${
                isCash ? 'text-emerald-400 font-montserrat-bold' : 'text-ash'
              }`}
            >
              {isCash ? 'Cobro efectivo' : 'Pago digital'}
            </Text>
            <View className="flex-row items-center">
              <Text
                className={`font-montserrat-bold text-base mr-1.5 ${
                  isCash ? 'text-emerald-400' : 'text-zinc-300'
                }`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {isCash ? `$${totalFare.toLocaleString('es-AR')}` : '$0 (Acreditado)'}
              </Text>
              <Ionicons name="chevron-up" size={16} color={THEME_COLORS.gold} />
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        // ================= EXPANDED COCKPIT (CLEAN SINGLE-SURFACE GLASS UX) =================
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* HEADER: PASAJERO Y ACCESOS RÁPIDOS DIRECTOS (Llamar, Chat, GPS, SOS) */}
          <View className="flex-row items-center justify-between mt-1 mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 items-center justify-center mr-3">
                <Text className="text-gold font-montserrat-bold text-lg">
                  {avatarLetter}
                </Text>
              </View>
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
                    {isThirdParty ? 'Invitado VIP' : 'TransferBlack VIP'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions: Call, Chat, Open GPS & SOS 911 */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={handleEmergencyCall}
                accessibilityLabel="Botón de emergencia SOS 911"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/50 items-center justify-center active:scale-95 shadow-sm shadow-red-500/30"
              >
                <Ionicons name="warning" size={17} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCallPassenger}
                accessibilityLabel="Llamar al pasajero"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 items-center justify-center active:scale-95"
              >
                <Ionicons name="call" size={17} color={THEME_COLORS.platinum} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(home)/chat');
                }}
                accessibilityLabel="Chatear con el pasajero"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 items-center justify-center active:scale-95"
              >
                <Ionicons name="chatbubble-ellipses" size={17} color={THEME_COLORS.gold} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenExternalGps}
                accessibilityLabel="Abrir navegación externa con Google Maps o Waze"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 items-center justify-center active:scale-95"
              >
                <Ionicons name="navigate" size={17} color="#38BDF8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Feedback discreto post-alerta SOS */}
          {sosStatus === 'success' && (
            <View className="flex-row items-center bg-emerald-500/15 border border-emerald-500/35 rounded-xl px-3 py-1.5 mb-2.5 self-start">
              <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 6 }} />
              <Text className="text-emerald-400 font-montserrat-semibold text-[11px]">
                Alerta de emergencia 911 registrada
              </Text>
            </View>
          )}
          {sosStatus === 'retrying' && (
            <View className="flex-row items-center bg-amber-500/15 border border-amber-500/35 rounded-xl px-3 py-1.5 mb-2.5 self-start">
              <ActivityIndicator size="small" color="#F59E0B" style={{ marginRight: 6 }} />
              <Text className="text-amber-400 font-montserrat-semibold text-[11px]">
                Reintentando registrar alerta en central...
              </Text>
            </View>
          )}

          {/* ESTADO DEL VIAJE EN PÍLDORA ELEGANTE */}
          <View className="flex-row items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl px-3.5 py-2.5 mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <View className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotBg} mr-2.5 shadow-sm`} />
              <View className="flex-1">
                <Text className={`${statusInfo.textColor} font-montserrat-bold text-xs uppercase tracking-wider`}>
                  {statusInfo.title}
                </Text>
                <Text className="text-ash font-montserrat text-xs mt-0.5" numberOfLines={1}>
                  {statusInfo.subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleOpenExternalGps}
              className="flex-row items-center bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg"
            >
              <Ionicons name="map-outline" size={13} color={THEME_COLORS.gold} />
              <Text className="text-zinc-200 font-montserrat-medium text-[11px] ml-1.5">
                GPS
              </Text>
            </TouchableOpacity>
          </View>

          {/* BANNER CLARO DE COBRO AL PASAJERO (Solo cobro, sin comisiones ni ganancia neta acá) */}
          {isCash ? (
            <View className="bg-emerald-500/10 border border-emerald-500/35 rounded-2xl p-4 mb-3.5 flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-emerald-500/20 items-center justify-center mr-3.5 border border-emerald-500/30">
                <Ionicons name="cash" size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-emerald-400 font-montserrat-bold text-[11px] uppercase tracking-wider">
                  Cobrar en Efectivo al Pasajero
                </Text>
                <Text
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="text-white font-montserrat-bold text-2xl leading-tight mt-0.5"
                >
                  ${totalFare.toLocaleString('es-AR')}
                </Text>
                <Text className="text-emerald-300/80 font-montserrat text-[11px] mt-0.5">
                  Cobrá este importe exacto al finalizar el viaje.
                </Text>
              </View>
            </View>
          ) : (
            <View className="bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 mb-3.5 flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center mr-3">
                <Ionicons name={paymentInfo.icon} size={20} color={THEME_COLORS.gold} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-montserrat-bold text-[10px] uppercase tracking-wider">
                  Pago Digital ({paymentInfo.label})
                </Text>
                <Text className="text-gold font-montserrat-bold text-sm mt-0.5">
                  Acreditado • No solicitar dinero en efectivo ($0)
                </Text>
                <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                  El viaje se liquida automáticamente en tu Bóveda.
                </Text>
              </View>
            </View>
          )}

          {/* CONTROL PRIMARIO DE CONDUCCIÓN (SwipeToArrive / PIN / SwipeToFinish) */}
          <View className="mb-3.5">
            {trip.status === 'driver_arriving' && (
              <SwipeToArriveButton onArrive={handleArrive} isLoading={isLoading} />
            )}

            {trip.status === 'driver_arrived' && (
              <View className="w-full">
                {/* Cronómetro de Cortesía */}
                <View className="flex-row items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={18} color="#F59E0B" />
                    <View className="ml-2.5">
                      <Text className="text-white font-montserrat-semibold text-xs">
                        Tiempo de cortesía en espera
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

                {/* PIN de Abordaje (si lo requiere el viaje) */}
                {trip.require_pin && (
                  <View className="w-full mb-3 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5">
                    <View className="flex-row justify-between items-center mb-2.5">
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
                          className={`w-14 h-14 text-center font-montserrat-bold text-2xl text-white rounded-2xl bg-white/[0.04] border ${
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

                {/* Botón Iniciar Viaje */}
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

          {/* HOJA DE RUTA UNIFICADA (Limpia, con km y sin duplicar tiempos) */}
          <View className="border-t border-white/10 pt-3 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-ash font-montserrat-bold text-[10px] uppercase tracking-wider">
                Recorrido del Viaje
              </Text>
              <View className="flex-row items-center bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                <Ionicons name="speedometer-outline" size={12} color={THEME_COLORS.gold} />
                <Text className="text-gold font-montserrat-semibold text-[11px] ml-1.5">
                  {tripDistanceKm} • ~{durationMin} min
                </Text>
              </View>
            </View>

            {/* Timeline Integrado */}
            <View className="pl-1">
              {/* Pickup */}
              <View className="flex-row items-start mb-2.5">
                <View className="items-center mr-3 mt-1">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  <View className="w-0.5 h-5 bg-white/15 my-0.5" />
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-400 font-montserrat-semibold text-[10px] uppercase tracking-wider">
                    Punto de Encuentro
                  </Text>
                  <Text className="text-white font-montserrat-medium text-xs leading-4 mt-0.5" numberOfLines={2}>
                    {trip.pickup?.address || 'Punto de recogida'}
                  </Text>
                </View>
              </View>

              {/* Dropoff */}
              <View className="flex-row items-start">
                <View className="items-center mr-3 mt-1">
                  <View className="w-2.5 h-2.5 rounded-sm bg-gold rotate-45 shadow-sm shadow-gold" />
                </View>
                <View className="flex-1">
                  <Text className="text-gold font-montserrat-semibold text-[10px] uppercase tracking-wider">
                    Destino Final
                  </Text>
                  <Text className="text-white font-montserrat-medium text-xs leading-4 mt-0.5" numberOfLines={2}>
                    {trip.dropoff?.address || 'Destino solicitado'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Preferencias de Pasajero */}
            {preferences.length > 0 && (
              <View className="mt-3 flex-row flex-wrap">
                {preferences.map((pref, idx) => (
                  <View
                    key={`${pref}-${idx}`}
                    className="flex-row items-center bg-white/5 border border-white/10 px-2.5 py-1 rounded-full mr-1.5 mb-1"
                  >
                    <Ionicons name={getPreferenceIcon(pref)} size={11} color={THEME_COLORS.gold} />
                    <Text className="text-zinc-300 font-montserrat-medium text-[11px] ml-1.5">
                      {pref}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* PIE: ASISTENCIA S.O.S. Y CANCELACIÓN DISCRETA */}
          <View className="border-t border-white/10 pt-3 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleEmergencyCall}
              className="flex-row items-center bg-red-500/15 border border-red-500/30 px-3.5 py-2 rounded-xl active:bg-red-500/25"
              accessibilityRole="button"
              accessibilityLabel="Pedir asistencia o emergencia"
            >
              <Ionicons name="shield-checkmark" size={15} color="#EF4444" />
              <Text className="text-red-400 font-montserrat-bold text-xs uppercase tracking-wider ml-1.5">
                S.O.S. Seguridad
              </Text>
            </TouchableOpacity>

            {(trip.status === 'driver_arriving' || trip.status === 'driver_arrived') && (
              <TouchableOpacity
                onPress={handleCancelTrip}
                disabled={isLoading}
                className="px-3 py-2 rounded-xl active:bg-white/5"
                accessibilityRole="button"
                accessibilityLabel="Cancelar servicio"
              >
                <Text className="text-zinc-400 font-montserrat-medium text-xs">
                  Cancelar viaje
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BottomSheetScrollView>
      )}

      {/* Modal de confirmación SOS 911 */}
      <SosConfirmationModal
        visible={isSosModalVisible}
        tripId={trip.id}
        fallbackLocation={location}
        onClose={() => setIsSosModalVisible(false)}
      />

      {/* Modal de selección de motivos de cancelación */}
      <CancelTripModal
        visible={isCancelModalVisible}
        tripId={trip.id}
        location={location}
        onClose={() => setIsCancelModalVisible(false)}
      />
    </BottomSheet>
  );
};


