import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';

import { THEME_COLORS } from '../../../core/constants/theme';
import {
  TripOfferPayload,
  calculateTripDistanceKm,
  getPaymentMethodInfo,
} from '../../../core/trip/interface/trip.interface';
import { useOfferTimer } from '../../trip/hooks/useOfferTimer';
import { AppleIntelligenceOfferAura } from './ui/AppleIntelligenceOfferAura';

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
 * Hoja inferior de solicitud de viaje (TransferBlack VIP):
 * Contenedor único sin efecto caja, foco en ganancia neta, línea de tiempo integrada
 * y botón de aceptación con barra de progreso de cuenta regresiva.
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
  const reduceMotion = useReducedMotion();

  const ttlSeconds = offer?.ttlSeconds || 30;
  const [secondsLeft, setSecondsLeft] = useState(ttlSeconds);

  const { progress } = useOfferTimer(
    ttlSeconds,
    onReject,
    Boolean(offer && !isLoading),
    offer?.offerId,
    offer?.expiresAt
  );

  useEffect(() => {
    const targetExpiresAtMs = offer?.expiresAt
      ? new Date(offer.expiresAt).getTime()
      : Date.now() + ttlSeconds * 1000;

    const updateSeconds = () => {
      const remainingMs = targetExpiresAtMs - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(sec);
    };

    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [offer?.expiresAt, offer?.offerId, ttlSeconds]);

  const remainingSeconds = secondsLeft;
  const isUrgent = remainingSeconds <= 5;

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [offer?.offerId]);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  const paymentInfo = useMemo(
    () => getPaymentMethodInfo(offer?.fare?.paymentMethod),
    [offer?.fare?.paymentMethod]
  );
  const totalFareAmount = useMemo(
    () => Number(offer?.fare?.totalFare || offer?.fare?.netEarnings || 0),
    [offer?.fare]
  );
  const netEarningsAmount = useMemo(
    () => Number(offer?.fare?.netEarnings || Math.round(totalFareAmount * 0.8)),
    [offer?.fare, totalFareAmount]
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
  const pickupDistance = (offer?.pickup as { distanceKm?: number } | undefined)?.distanceKm;

  const isThirdParty = Boolean(offer?.third_party?.name);
  const isScheduledOffer =
    offer?.bookingType === 'scheduled' || Boolean(offer?.scheduledAt);
  const scheduledTimeLabel = (() => {
    if (!offer?.scheduledAt) return null;
    try {
      const d = new Date(offer.scheduledAt);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return null;
    }
  })();

  const passengerName = isThirdParty
    ? `Viaja: ${offer.third_party?.name}`
    : offer?.passenger?.fullName || 'Pasajero Ejecutivo';
  const passengerInitial = (
    offer?.third_party?.name ||
    offer?.passenger?.fullName ||
    'P'
  )
    .charAt(0)
    .toUpperCase();
  const ratingAvg = offer?.passengerRating?.average ?? offer?.passenger?.rating ?? 5.0;
  const categoryLabel = offer?.passenger?.category || 'VIP';

  if (isLoading) {
    return (
      <View
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        className="absolute bottom-0 left-0 right-0 w-full z-50 rounded-t-[28px] border-t border-white/10 bg-[#14161B] px-5 pt-3"
        style={{ paddingBottom: Math.max(bottomInset, 20) }}
      >
        <View className="w-10 h-1 bg-white/20 rounded-full self-center mb-4" />
        <View className="w-32 h-4 bg-white/10 rounded-md mb-2" />
        <View className="w-48 h-11 bg-white/10 rounded-lg mb-4" />
        <View className="w-full h-14 bg-white/10 rounded-2xl" />
      </View>
    );
  }

  return (
    <>
      {/* Aura perimetral sutil en bordes de pantalla */}
      <AppleIntelligenceOfferAura isUrgent={isUrgent} />

      <Animated.View
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        entering={reduceMotion ? FadeIn : FadeInDown.duration(220)}
        exiting={reduceMotion ? undefined : FadeOutDown.duration(180)}
        className="absolute bottom-0 left-0 right-0 w-full z-50 rounded-t-[28px] border-t border-white/10 bg-[#14161B] px-5 pt-3 shadow-2xl"
        style={{ paddingBottom: Math.max(bottomInset, 18) }}
      >
        {/* Handle sutil */}
        <View className="w-10 h-1 rounded-full bg-white/20 self-center mb-3" />

        {/* 1. CABECERA FINANCIERA (GANANCIA NETA) + OMITIR Y PÍLDORAS A LA DERECHA */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center flex-wrap gap-1.5 mb-0.5">
              <Text className="font-montserrat-bold text-xs tracking-wider text-white/90 uppercase">
                Ganancia neta
              </Text>
              {isScheduledOffer && (
                <View className="flex-row items-center bg-white/[0.08] px-2 py-0.5 rounded-full">
                  <Ionicons name="calendar-outline" size={10} color={THEME_COLORS.gold} />
                  <Text className="font-montserrat-semibold text-[10px] text-gold ml-1">
                    {scheduledTimeLabel ? `Reserva ${scheduledTimeLabel}` : 'Reserva'}
                  </Text>
                </View>
              )}
              {queueCount > 0 && (
                <View className="bg-white/[0.08] px-2 py-0.5 rounded-full">
                  <Text className="font-montserrat-semibold text-[10px] text-white/75">
                    +{queueCount}
                  </Text>
                </View>
              )}
            </View>

            <Text
              className="font-montserrat-bold text-[42px] leading-[48px] text-[#34D399] tracking-tight"
              style={{ fontVariant: ['tabular-nums'] }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ${netEarningsAmount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </Text>

            <Text
              className="font-montserrat-medium text-[13px] text-white/55 mt-0.5"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              Valor del servicio: ${totalFareAmount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </Text>
          </View>

          <View className="items-end">
            {/* Botón Omitir separado del CTA principal para evitar toques accidentales */}
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onReject();
              }}
              disabled={isAccepting}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Omitir oferta de viaje"
              className="px-4 py-1.5 rounded-full bg-white/[0.08] border border-white/15 mb-2.5 active:bg-white/15"
            >
              <Text className="font-montserrat-semibold text-xs text-white/90">
                Omitir
              </Text>
            </TouchableOpacity>

            {/* Píldora discreta de método de pago */}
            <View
              className={`px-3 py-1 rounded-full border mb-1.5 ${
                isCashOffer
                  ? 'bg-emerald-500/15 border-emerald-400/35'
                  : 'bg-gold/15 border-gold/35'
              }`}
            >
              <Text
                className={`font-montserrat-bold text-[11px] uppercase tracking-wider ${
                  isCashOffer ? 'text-[#34D399]' : 'text-gold'
                }`}
              >
                {isCashOffer ? 'Efectivo' : 'Pago Digital'}
              </Text>
            </View>

            {/* Píldora de categoría VIP */}
            <View className="flex-row items-center px-2.5 py-1 rounded-full bg-gold/12 border border-gold/35">
              <Ionicons name="diamond" size={11} color={THEME_COLORS.gold} />
              <Text className="font-montserrat-bold text-[10px] tracking-wider text-gold uppercase ml-1">
                {categoryLabel}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-px bg-white/[0.07] my-4" />

        {/* 2. LÍNEA DE TIEMPO VERTICAL UNIFICADA (TIEMPOS, DISTANCIAS Y DIRECCIONES) */}
        <View className="mb-4">
          {/* Punto A: Retiro (Verde) */}
          <View className="flex-row items-stretch">
            <View className="w-7 items-center mr-3">
              <View className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/80 items-center justify-center mt-0.5">
                <View className="w-2.5 h-2.5 rounded-full bg-[#34D399]" />
              </View>
              <View className="w-[1.5px] flex-1 min-h-[24px] bg-white/15 my-1" />
            </View>

            <View className="flex-1 pb-3.5">
              <View className="flex-row items-baseline flex-wrap">
                <Text
                  className="font-montserrat-bold text-lg text-white"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ~{pickupEta} min
                </Text>
                {pickupDistance != null && (
                  <Text
                    className="font-montserrat-medium text-sm text-white/55 ml-1.5"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    ({pickupDistance} km)
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={2}
                className="font-montserrat-medium text-[13px] text-white/75 leading-5 mt-0.5"
              >
                {offer?.pickup?.address || 'Punto de encuentro fijado'}
              </Text>
            </View>
          </View>

          {/* Paradas intermedias (si existen) */}
          {(offer?.stops ?? []).map((stop, idx) => (
            <View
              key={`${stop.latitude}-${stop.longitude}-${idx}`}
              className="flex-row items-stretch"
            >
              <View className="w-7 items-center mr-3">
                <View className="w-6 h-6 rounded-full bg-gold/15 border border-gold/60 items-center justify-center mt-0.5">
                  <Text className="font-montserrat-bold text-[10px] text-gold">
                    {idx + 1}
                  </Text>
                </View>
                <View className="w-[1.5px] flex-1 min-h-[18px] bg-white/15 my-1" />
              </View>

              <View className="flex-1 pb-3">
                <Text className="font-montserrat-semibold text-xs text-white/55">
                  Parada {idx + 1}
                </Text>
                <Text
                  numberOfLines={1}
                  className="font-montserrat-medium text-[13px] text-white/80 mt-0.5"
                >
                  {stop.address || `Parada intermedia ${idx + 1}`}
                </Text>
              </View>
            </View>
          ))}

          {/* Punto B: Destino (Dorado) */}
          <View className="flex-row items-start">
            <View className="w-7 items-center mr-3">
              <View className="w-6 h-6 rounded-full bg-gold/15 border border-gold/80 items-center justify-center mt-0.5">
                <Ionicons name="location" size={13} color={THEME_COLORS.gold} />
              </View>
            </View>

            <View className="flex-1">
              <View className="flex-row items-baseline flex-wrap">
                <Text
                  className="font-montserrat-bold text-lg text-white"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ~{durationMin} min
                </Text>
                <Text
                  className="font-montserrat-medium text-sm text-white/55 ml-1.5"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ({tripDistanceKm})
                </Text>
              </View>
              <Text
                numberOfLines={2}
                className="font-montserrat-medium text-[13px] text-white/75 leading-5 mt-0.5"
              >
                {offer?.dropoff?.address || 'Destino fijado por el pasajero'}
              </Text>
            </View>
          </View>
        </View>

        <View className="h-px bg-white/[0.07] mb-3.5" />

        {/* 3. PASAJERO */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-8 h-8 rounded-full bg-white/[0.09] border border-white/15 items-center justify-center mr-2.5">
              <Text className="text-white font-montserrat-bold text-xs">
                {passengerInitial}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              className="font-montserrat-semibold text-sm text-white flex-shrink mr-2"
            >
              {passengerName}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={12} color="#9CA3AF" />
              <Text
                className="font-montserrat-medium text-xs text-white/65 ml-1"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {Number(ratingAvg).toFixed(1)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-gold/10 border border-gold/30 px-2.5 py-1 rounded-full">
            <Ionicons name="shield-checkmark" size={12} color={THEME_COLORS.gold} />
            <Text className="font-montserrat-semibold text-[11px] text-white/85 ml-1">
              Verificado
            </Text>
          </View>
        </View>

        {/* 4. BOTÓN PRINCIPAL CON BARRA DE PROGRESO Y CONTADOR INTEGRADO */}
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept();
          }}
          disabled={isAccepting}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={`Aceptar viaje VIP por $${netEarningsAmount.toLocaleString('es-AR')} netos, quedan ${remainingSeconds} segundos`}
          accessibilityState={{ disabled: isAccepting }}
          className="w-full h-14 rounded-2xl bg-[#8F741D] items-center justify-center overflow-hidden relative"
        >
          {/* Barra de progreso principal que se vacía con el tiempo */}
          <Animated.View
            pointerEvents="none"
            style={[
              progressFillStyle,
              {
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                backgroundColor: isUrgent ? '#EAB308' : THEME_COLORS.gold,
              },
            ]}
          />

          {/* Filete inferior luminoso de lectura rápida */}
          <Animated.View
            pointerEvents="none"
            style={[
              progressFillStyle,
              {
                position: 'absolute',
                left: 0,
                bottom: 0,
                height: 3,
                backgroundColor: '#FEF3C7',
              },
            ]}
          />

          {isAccepting ? (
            <ActivityIndicator color="#0E1015" size="small" />
          ) : (
            <View className="w-full flex-row items-center justify-center px-4">
              <Text className="font-montserrat-bold text-[15px] text-[#0E1015] tracking-wider uppercase">
                ACEPTAR VIAJE VIP
              </Text>
              <View className="absolute right-3 min-w-[34px] h-8 px-2 rounded-lg bg-black/20 items-center justify-center">
                <Text
                  className="font-montserrat-bold text-sm text-[#0E1015]"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {remainingSeconds}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};
