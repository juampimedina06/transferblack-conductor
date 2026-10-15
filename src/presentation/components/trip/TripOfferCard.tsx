import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TripOfferPayload,
  calculateTripDistanceKm,
  getPaymentMethodInfo,
} from '../../../core/trip/interface/trip.interface';
import { useOfferTimer } from '../../trip/hooks/useOfferTimer';
import { CountdownRing } from './ui/CountdownRing';
import { getTripOfferTheme } from './theme/tripOfferTheme';

export interface TripOfferCardProps {
  offer: TripOfferPayload;
  queueCount?: number;
  onAccept: () => void;
  onReject: () => void;
  isAccepting?: boolean;
  onHeightChange?: (height: number) => void;
  bottomInset?: number;
  isLoading?: boolean;
}

/**
 * Tarjeta de nuevo viaje entrante:
 * Diseño limpio, minimalista, en blanco de alto contraste sobre Liquid Glass.
 * Sin mini-tarjetas anidadas; información crucial (tarifa, tiempo y direcciones) grande y legible al conducir.
 */
export const TripOfferCard: React.FC<TripOfferCardProps> = ({
  offer,
  queueCount = 0,
  onAccept,
  onReject,
  isAccepting = false,
  onHeightChange,
  bottomInset = 16,
  isLoading = false,
}) => {
  const baseTheme = useMemo(() => getTripOfferTheme(true), []);
  const reduceMotion = useReducedMotion();

  // Tema en blanco puro para el anillo de cuenta regresiva
  const whiteTheme = useMemo(
    () => ({
      ...baseTheme,
      accent: '#FFFFFF',
      urgentAccent: '#FFFFFF',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.6)',
      textSubtle: 'rgba(255, 255, 255, 0.4)',
    }),
    [baseTheme]
  );

  // Cálculo de tiempo restante
  const ttlSeconds = offer?.ttlSeconds || 25;
  const [secondsLeft, setSecondsLeft] = useState(ttlSeconds);

  const { progress } = useOfferTimer(
    ttlSeconds,
    onReject,
    Boolean(offer && !isLoading),
    offer?.offerId,
    offer?.expiresAt
  );

  useEffect(() => {
    if (!offer?.expiresAt) return;

    const updateSeconds = () => {
      const remainingMs = new Date(offer.expiresAt!).getTime() - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(sec);
    };

    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [offer?.expiresAt, ttlSeconds]);

  const remainingSeconds = offer?.expiresAt ? secondsLeft : ttlSeconds;
  const isUrgent = remainingSeconds <= 5;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [offer?.offerId]);

  // Datos del viaje
  const paymentInfo = useMemo(
    () => getPaymentMethodInfo(offer?.fare?.paymentMethod),
    [offer?.fare?.paymentMethod]
  );
  const totalFareAmount = useMemo(
    () => Number(offer?.fare?.totalFare || offer?.fare?.netEarnings || 0),
    [offer?.fare]
  );
  const isCashOffer = paymentInfo.isCash;

  const durationMin = offer?.dropoff?.durationMinutes || 15;
  const tripDistanceKm = useMemo(() => {
    return calculateTripDistanceKm(
      offer?.pickup?.latitude,
      offer?.pickup?.longitude,
      offer?.dropoff?.latitude,
      offer?.dropoff?.longitude,
      durationMin
    );
  }, [offer?.pickup, offer?.dropoff, durationMin]);

  const pickupEta = offer?.pickup?.etaMinutes || 2;
  const pickupDistance = (offer?.pickup as any)?.distanceKm;

  // Pasajero
  const isThirdParty = Boolean(offer?.third_party?.name);
  const passengerName = isThirdParty
    ? `Viaja: ${offer.third_party?.name}`
    : offer?.passenger?.fullName || 'Pasajero VIP';
  const ratingAvg = offer?.passengerRating?.average ?? offer?.passenger?.rating ?? 5.0;

  if (isLoading) {
    return (
      <View
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        className="absolute bottom-0 left-0 right-0 w-full z-50 overflow-hidden rounded-t-[32px] border-t border-white/20 bg-[#0A0A0C]/90 px-6 pt-3"
        style={{ paddingBottom: Math.max(bottomInset, 24) }}
      >
        <View className="w-10 h-1 bg-white/20 rounded-full self-center mb-4" />
        <View className="w-32 h-6 bg-white/10 rounded-lg mb-3" />
        <View className="w-48 h-12 bg-white/10 rounded-lg mb-4" />
        <View className="w-full h-14 bg-white/10 rounded-xl" />
      </View>
    );
  }

  return (
    <Animated.View
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
      entering={reduceMotion ? FadeIn : FadeInDown.springify().damping(16).mass(0.9)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(200)}
      className="absolute bottom-0 left-0 right-0 w-full z-50 overflow-hidden rounded-t-[32px] border-t border-white/20 shadow-2xl px-6 pt-3"
      style={{ paddingBottom: Math.max(bottomInset, 24) }}
    >
      {/* Capa Liquid Glass de desenfoque */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 70 : 85}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className="bg-[#0A0A0C]/90"
      />

      {/* Resplandor especular superior */}
      <View
        pointerEvents="none"
        className="absolute top-0 left-8 right-8 h-[1px] bg-white/35 rounded-full"
      />

      {/* Handle indicador minimalista */}
      <View className="w-10 h-1 rounded-full bg-white/25 self-center mb-3" />

      {/* ====================================================================
          1. HEADER CON CUENTA REGRESIVA Y CATEGORÍA (BLANCO)
          ==================================================================== */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Text className="font-montserrat-bold text-[11px] tracking-widest text-white/70 uppercase">
            NUEVA SOLICITUD · {offer?.passenger?.category || 'TRANSFERBLACK VIP'}
          </Text>
          {queueCount > 0 && (
            <Text className="font-montserrat-semibold text-[10px] text-white/50 ml-2">
              (+{queueCount} en cola)
            </Text>
          )}
        </View>

        <CountdownRing
          theme={whiteTheme}
          progress={progress}
          secondsLeft={remainingSeconds}
          size={38}
          strokeWidth={3}
          isUrgent={isUrgent}
        />
      </View>

      {/* ====================================================================
          2. TARIFA PROTAGONISTA ENORME (BLANCO PURO)
          ==================================================================== */}
      <View className="mb-3">
        <Text
          className="font-montserrat-bold text-5xl text-white tracking-tight"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          ${totalFareAmount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
        </Text>
        <Text className="font-montserrat-semibold text-xs text-white/60 tracking-wider uppercase mt-1">
          {isCashOffer ? 'Cobro en efectivo al pasajero' : 'Pago electrónico acreditado'}
        </Text>
      </View>

      {/* ====================================================================
          3. MÉTRICAS CLAVE GRANDES: TIEMPO Y DISTANCIA (BLANCO)
          ==================================================================== */}
      <View className="flex-row items-center justify-between py-2.5 border-t border-white/10 mb-2">
        <View className="flex-1">
          <Text className="font-montserrat-bold text-[10px] tracking-wider text-white/50 uppercase mb-0.5">
            Punto de retiro
          </Text>
          <Text className="font-montserrat-bold text-xl text-white">
            ~{pickupEta} min
          </Text>
          <Text className="font-montserrat text-xs text-white/60 mt-0.5">
            {pickupDistance ? `A ${pickupDistance} km de vos` : 'Llegada inmediata'}
          </Text>
        </View>

        <View className="w-[1px] h-9 bg-white/15 mx-4" />

        <View className="flex-1">
          <Text className="font-montserrat-bold text-[10px] tracking-wider text-white/50 uppercase mb-0.5">
            Viaje estimado
          </Text>
          <Text className="font-montserrat-bold text-xl text-white">
            ~{durationMin} min
          </Text>
          <Text className="font-montserrat text-xs text-white/60 mt-0.5">
            Recorrido de {tripDistanceKm}
          </Text>
        </View>
      </View>

      {/* ====================================================================
          4. RECORRIDO (ORIGEN Y DESTINO EN TEXTO GRANDE Y LEGIBLE)
          ==================================================================== */}
      <View className="py-2.5 border-t border-white/10 mb-2.5">
        {/* Origen */}
        <View className="flex-row items-center mb-2.5">
          <View className="w-6 h-6 rounded-full bg-white/15 border border-white/40 items-center justify-center mr-3">
            <View className="w-2 h-2 rounded-full bg-white" />
          </View>
          <View className="flex-1">
            <Text className="font-montserrat-bold text-[9px] uppercase tracking-wider text-white/50">
              Retiro
            </Text>
            <Text
              numberOfLines={1}
              className="font-montserrat-semibold text-sm text-white"
            >
              {offer?.pickup?.address || 'Punto de encuentro fijado'}
            </Text>
          </View>
        </View>

        {/* Destino */}
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full bg-white/15 border border-white/40 items-center justify-center mr-3">
            <Ionicons name="location" size={13} color="#FFFFFF" />
          </View>
          <View className="flex-1">
            <Text className="font-montserrat-bold text-[9px] uppercase tracking-wider text-white/50">
              Destino
            </Text>
            <Text
              numberOfLines={1}
              className="font-montserrat-semibold text-sm text-white"
            >
              {offer?.dropoff?.address || 'Destino fijado por el pasajero'}
            </Text>
          </View>
        </View>
      </View>

      {/* ====================================================================
          5. PASAJERO (DATOS COMPACTOS Y LIMPIOS)
          ==================================================================== */}
      <View className="flex-row items-center justify-between py-2 border-t border-white/10 mb-4">
        <View className="flex-row items-center flex-1 mr-2">
          <Text numberOfLines={1} className="font-montserrat-medium text-xs text-white mr-2">
            {passengerName}
          </Text>
          <View className="flex-row items-center bg-white/10 px-2 py-0.5 rounded">
            <Ionicons name="star" size={11} color="#FFFFFF" />
            <Text className="font-montserrat-bold text-[10px] text-white ml-1">
              {Number(ratingAvg).toFixed(1)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
          <Text className="font-montserrat text-[10px] text-white/70 ml-1">Verificado</Text>
        </View>
      </View>

      {/* ====================================================================
          6. ACCIONES: BOTÓN ACEPTAR ENORME Y RECHAZAR ACCESIBLE
          ==================================================================== */}
      <View className="flex-row items-center gap-3">
        {/* Botón Aceptar (Protagonista blanco puro de alto contraste) */}
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept();
          }}
          disabled={isAccepting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Aceptar viaje por $${totalFareAmount.toLocaleString('es-AR')}`}
          className="flex-1 h-14 rounded-2xl bg-white items-center justify-center active:opacity-90 shadow-xl"
        >
          {isAccepting ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#000000"
                style={{ marginRight: 8 }}
              />
              <Text className="font-montserrat-bold text-sm text-black tracking-widest uppercase">
                ACEPTAR VIAJE
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Botón Rechazar */}
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReject();
          }}
          disabled={isAccepting}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Rechazar y descartar oferta"
          className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 items-center justify-center active:bg-white/20"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};
