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
import { THEME_COLORS } from '../../../core/constants/theme';
import { useOfferTimer } from '../../trip/hooks/useOfferTimer';
import { CountdownRing } from './ui/CountdownRing';
import { getTripOfferTheme } from './theme/tripOfferTheme';
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
 * Tarjeta Ejecutiva de Solicitud de Viaje (TransferBlack VIP):
 * Estética Liquid Glass en Obsidiana y Oro Champán con jerarquía de alto contraste para conducción.
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

  // Tema en Oro Champán para el anillo de cuenta regresiva
  const vipRingTheme = useMemo(
    () => ({
      ...baseTheme,
      accent: THEME_COLORS.gold,
      urgentAccent: '#F43F5E',
      textPrimary: '#FFFFFF',
      textSecondary: 'rgba(255, 255, 255, 0.8)',
      textMuted: 'rgba(255, 255, 255, 0.6)',
      textSubtle: 'rgba(255, 255, 255, 0.4)',
    }),
    [baseTheme]
  );

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

  const isThirdParty = Boolean(offer?.third_party?.name);
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

  if (isLoading) {
    return (
      <View
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        className="absolute bottom-0 left-0 right-0 w-full z-50 px-4"
        style={{ paddingBottom: Math.max(bottomInset, 16) }}
        pointerEvents="box-none"
      >
        <View className="bg-[#090A0F]/85 border border-white/15 rounded-3xl p-4 shadow-2xl">
          <View className="w-28 h-5 bg-white/10 rounded-lg mb-2" />
          <View className="w-40 h-8 bg-white/10 rounded-lg mb-3" />
          <View className="w-full h-8 bg-white/10 rounded-xl mb-2" />
          <View className="w-full h-10 bg-white/10 rounded-xl" />
        </View>
        <View className="flex-row items-center gap-3 mt-2.5">
          <View className="flex-1 h-13 rounded-2xl bg-white/10" />
          <View className="w-13 h-13 rounded-2xl bg-white/10" />
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Aura perimetral en los bordes de la pantalla estilo Apple Intelligence */}
      <AppleIntelligenceOfferAura isUrgent={isUrgent} />

      <Animated.View
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        entering={reduceMotion ? FadeIn : FadeInDown.springify().damping(16).mass(0.9)}
        exiting={reduceMotion ? undefined : FadeOutDown.duration(200)}
        className="absolute bottom-0 left-0 right-0 w-full z-50 px-4"
        style={{ paddingBottom: Math.max(bottomInset, 16) }}
        pointerEvents="box-none"
      >
        {/* Isla Flotante de Cristal Líquido (Ultra-compacta: ocupa menos de la mitad de pantalla) */}
        <View className="bg-[#090A0F]/85 border border-white/15 rounded-3xl p-3.5 shadow-2xl relative overflow-hidden">
          {/* Capa de desenfoque Liquid Glass sobre el mapa */}
          <BlurView
            intensity={Platform.OS === 'ios' ? 60 : 80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            className="bg-[#090A0F]/65"
          />

          {/* Resplandor especular superior sutil */}
          <View
            pointerEvents="none"
            className="absolute top-0 left-8 right-8 h-[1px] bg-white/20"
          />

          {/* ====================================================================
              1. TARIFA, MODALIDAD, CATEGORÍA Y CUENTA REGRESIVA
              ==================================================================== */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <View className="flex-row items-center mb-1">
                <View className="flex-row items-center bg-gold/15 border border-gold/40 px-2 py-0.5 rounded-full mr-2">
                  <Ionicons name="diamond" size={10} color={THEME_COLORS.gold} />
                  <Text className="font-montserrat-bold text-[9px] tracking-wider text-gold uppercase ml-1">
                    {offer?.passenger?.category || 'TRANSFERBLACK VIP'}
                  </Text>
                </View>
                {queueCount > 0 && (
                  <View className="bg-white/10 px-2 py-0.5 rounded-full">
                    <Text className="font-montserrat-bold text-[9px] text-platinum">
                      +{queueCount} en espera
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-baseline gap-2">
                <Text
                  className="font-montserrat-bold text-3xl text-white tracking-tight"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ${totalFareAmount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </Text>
                <View
                  className={`flex-row items-center px-2 py-0.5 rounded-lg border ${
                    isCashOffer
                      ? 'bg-emerald-500/15 border-emerald-400/30'
                      : 'bg-gold/15 border-gold/30'
                  }`}
                >
                  <Ionicons
                    name={paymentInfo.icon}
                    size={11}
                    color={isCashOffer ? '#34D399' : THEME_COLORS.gold}
                  />
                  <Text
                    className={`font-montserrat-bold text-[10px] uppercase ml-1 ${
                      isCashOffer ? 'text-emerald-400' : 'text-gold'
                    }`}
                  >
                    {isCashOffer ? 'Efectivo' : 'Digital'}
                  </Text>
                </View>
              </View>

              {netEarningsAmount > 0 && (
                <Text
                  className="text-gold/80 font-montserrat-medium text-[10px] mt-0.5"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  Neto: ${netEarningsAmount.toLocaleString('es-AR')}
                </Text>
              )}
            </View>

            <CountdownRing
              theme={vipRingTheme}
              progress={progress}
              secondsLeft={remainingSeconds}
              size={42}
              strokeWidth={3.5}
              isUrgent={isUrgent}
            />
          </View>

          {/* ====================================================================
              2. TELEMETRÍA UNIFICADA (Llegada a retiro y trayecto de viaje en 1 solo pill)
              ==================================================================== */}
          <View className="flex-row items-center bg-white/[0.05] border border-white/10 rounded-xl px-3 py-1.5 mt-2">
            <Ionicons name="navigate-circle" size={14} color="#34D399" />
            <Text className="font-montserrat-bold text-xs text-emerald-400 ml-1.5">
              ~{pickupEta} min al retiro
            </Text>
            <Text className="text-white/30 mx-2">•</Text>
            <Ionicons name="time-outline" size={13} color={THEME_COLORS.gold} />
            <Text className="font-montserrat-semibold text-xs text-gold ml-1">
              ~{durationMin} min ({tripDistanceKm})
            </Text>
          </View>

          {/* ====================================================================
              3. ITINERARIO COMPACTO (ORIGEN Y DESTINO)
              ==================================================================== */}
          <View className="mt-2 space-y-1">
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
              <Text
                numberOfLines={1}
                className="font-montserrat-medium text-xs text-white/90 flex-1"
              >
                {offer?.pickup?.address || 'Punto de encuentro fijado'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="location"
                size={11}
                color={THEME_COLORS.gold}
                style={{ marginRight: 6 }}
              />
              <Text
                numberOfLines={1}
                className="font-montserrat-semibold text-xs text-white flex-1"
              >
                {offer?.dropoff?.address || 'Destino fijado por pasajero'}
              </Text>
            </View>
          </View>

          {/* ====================================================================
              4. PASAJERO EJECUTIVO
              ==================================================================== */}
          <View className="flex-row items-center justify-between mt-2 pt-1.5 border-t border-white/10">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-5 h-5 rounded-full bg-gold/15 items-center justify-center mr-1.5">
                <Text className="text-gold font-montserrat-bold text-[9px]">
                  {passengerInitial}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                className="font-montserrat-semibold text-xs text-white/90 mr-1.5"
              >
                {passengerName}
              </Text>
              <View className="flex-row items-center bg-gold/10 px-1.5 py-0.5 rounded-full">
                <Ionicons name="star" size={9} color={THEME_COLORS.gold} />
                <Text className="font-montserrat-bold text-[9px] text-gold ml-0.5">
                  {Number(ratingAvg).toFixed(1)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={11} color={THEME_COLORS.gold} />
              <Text className="font-montserrat-medium text-[9px] text-platinum ml-1">
                Verificado
              </Text>
            </View>
          </View>
        </View>

        {/* ====================================================================
            5. BOTONES DE ACCIÓN FLOTANTES
            ==================================================================== */}
        <View className="flex-row items-center gap-3 mt-2">
          {/* Botón Aceptar VIP en Oro */}
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAccept();
            }}
            disabled={isAccepting}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Aceptar viaje por $${totalFareAmount.toLocaleString('es-AR')}`}
            className="flex-1 h-13 rounded-2xl bg-gold items-center justify-center active:scale-98 shadow-xl shadow-gold/25 relative overflow-hidden"
          >
            <View className="absolute top-0 left-4 right-4 h-[1px] bg-white/45 pointer-events-none" />
            {isAccepting ? (
              <ActivityIndicator color="#0A0A0C" size="small" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color="#0A0A0C"
                  style={{ marginRight: 6 }}
                />
                <Text className="font-montserrat-bold text-xs text-obsidian tracking-widest uppercase">
                  ACEPTAR VIAJE VIP
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Botón Rechazar Glass */}
          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReject();
            }}
            disabled={isAccepting}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Rechazar y descartar oferta"
            className="w-13 h-13 rounded-2xl bg-[#090A0F]/85 border border-white/20 items-center justify-center active:bg-white/15 active:scale-95 shadow-lg"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </>
  );
};
