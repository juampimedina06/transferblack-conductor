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
import { AmbientGlow } from '../ui/AmbientGlow';
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
  const pickupDistance = (offer?.pickup as any)?.distanceKm;

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
        className="absolute bottom-0 left-0 right-0 w-full z-50 overflow-hidden rounded-t-[32px] border-t border-gold/40 bg-[#090A0F]/95 px-6 pt-3"
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
    <>
      {/* Aura perimetral en los bordes de la pantalla estilo Apple Intelligence */}
      <AppleIntelligenceOfferAura isUrgent={isUrgent} />

      <Animated.View
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        entering={reduceMotion ? FadeIn : FadeInDown.springify().damping(16).mass(0.9)}
        exiting={reduceMotion ? undefined : FadeOutDown.duration(200)}
        className="absolute bottom-0 left-0 right-0 w-full z-50 overflow-hidden rounded-t-[34px] border-t border-gold/55 shadow-2xl px-5 pt-3"
        style={{ paddingBottom: Math.max(bottomInset, 22) }}
      >
        {/* Capa Liquid Glass de desenfoque */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 75 : 90}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className="bg-[#090A0F]/92"
        />

        {/* Ambient Champagne Gold Glow */}
        <AmbientGlow
          position="top"
          height={220}
          opacity={isUrgent ? 0.22 : 0.18}
          color={isUrgent ? '#F43F5E' : THEME_COLORS.gold}
        />

        {/* Resplandor especular superior en Oro */}
        <View
          pointerEvents="none"
          className="absolute top-0 left-10 right-10 h-[1.5px] bg-gold/65 rounded-full"
        />

        {/* Handle indicador */}
        <View className="w-11 h-1 rounded-full bg-white/25 self-center mb-3" />

      {/* ====================================================================
          1. HEADER CON BADGE VIP Y ANILLO DE CUENTA REGRESIVA EN ORO
          ==================================================================== */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="flex-row items-center bg-gold/15 border border-gold/45 px-3 py-1 rounded-full">
            <Ionicons name="diamond" size={11} color={THEME_COLORS.gold} />
            <Text className="font-montserrat-bold text-[10px] tracking-widest text-gold uppercase ml-1.5">
              {offer?.passenger?.category || 'TRANSFERBLACK VIP'}
            </Text>
          </View>
          {queueCount > 0 && (
            <View className="bg-white/10 border border-white/15 px-2.5 py-1 rounded-full ml-2">
              <Text className="font-montserrat-bold text-[10px] text-platinum">
                +{queueCount} en espera
              </Text>
            </View>
          )}
        </View>

        <CountdownRing
          theme={vipRingTheme}
          progress={progress}
          secondsLeft={remainingSeconds}
          size={40}
          strokeWidth={3.5}
          isUrgent={isUrgent}
        />
      </View>

      {/* ====================================================================
          2. TARIFA PROTAGONISTA Y MODALIDAD DE COBRO
          ==================================================================== */}
      <View className="flex-row items-end justify-between mb-3.5">
        <View className="flex-1 mr-2">
          <Text className="font-montserrat-bold text-[10px] tracking-widest text-ash uppercase mb-0.5">
            VALOR DEL SERVICIO
          </Text>
          <Text
            className="font-montserrat-bold text-5xl text-white tracking-tight"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            ${totalFareAmount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
        </View>

        <View className="items-end">
          <View
            className={`flex-row items-center px-3 py-1.5 rounded-xl border mb-1 ${
              isCashOffer
                ? 'bg-emerald-500/15 border-emerald-400/40'
                : 'bg-gold/15 border-gold/40'
            }`}
          >
            <Ionicons
              name={paymentInfo.icon}
              size={14}
              color={isCashOffer ? '#34D399' : THEME_COLORS.gold}
            />
            <Text
              className={`font-montserrat-bold text-[11px] uppercase tracking-wider ml-1.5 ${
                isCashOffer ? 'text-emerald-400' : 'text-gold'
              }`}
            >
              {isCashOffer ? 'Efectivo' : 'Pago Digital'}
            </Text>
          </View>
          {netEarningsAmount > 0 && (
            <Text
              className="text-gold/90 font-montserrat-semibold text-[11px]"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              Neto: ${netEarningsAmount.toLocaleString('es-AR')}
            </Text>
          )}
        </View>
      </View>

      {/* ====================================================================
          3. CÁMARAS GEMELAS DE TELEMETRÍA (RETIRO Y RECORRIDO)
          ==================================================================== */}
      <View className="flex-row items-center gap-2.5 mb-3">
        <View className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl p-3">
          <View className="flex-row items-center mb-1">
            <Ionicons name="navigate-circle" size={14} color="#34D399" />
            <Text className="font-montserrat-bold text-[9px] tracking-widest text-emerald-400 uppercase ml-1">
              PUNTO DE RETIRO
            </Text>
          </View>
          <Text className="font-montserrat-bold text-xl text-white">
            ~{pickupEta} min
          </Text>
          <Text className="font-montserrat text-[11px] text-ash mt-0.5" numberOfLines={1}>
            {pickupDistance ? `A ${pickupDistance} km de tu posición` : 'Cercano a tu ubicación'}
          </Text>
        </View>

        <View className="flex-1 bg-white/[0.04] border border-white/10 rounded-2xl p-3">
          <View className="flex-row items-center mb-1">
            <Ionicons name="time" size={14} color={THEME_COLORS.gold} />
            <Text className="font-montserrat-bold text-[9px] tracking-widest text-gold uppercase ml-1">
              VIAJE ESTIMADO
            </Text>
          </View>
          <Text className="font-montserrat-bold text-xl text-white">
            ~{durationMin} min
          </Text>
          <Text className="font-montserrat text-[11px] text-ash mt-0.5" numberOfLines={1}>
            Trayecto de {tripDistanceKm}
          </Text>
        </View>
      </View>

      {/* ====================================================================
          4. ITINERARIO CONECTADO EN CÁMARA GLASS
          ==================================================================== */}
      <View className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 mb-3">
        {/* Origen */}
        <View className="flex-row items-start">
          <View className="items-center mr-3 pt-0.5">
            <View className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-400/50 items-center justify-center">
              <View className="w-2 h-2 rounded-full bg-emerald-400" />
            </View>
            <View className="w-[1.5px] h-5 bg-white/15 my-0.5" />
          </View>
          <View className="flex-1 pb-1.5">
            <Text className="font-montserrat-bold text-[9px] uppercase tracking-widest text-emerald-400/90">
              ORIGEN DE RETIRO
            </Text>
            <Text
              numberOfLines={1}
              className="font-montserrat-semibold text-sm text-white mt-0.5"
            >
              {offer?.pickup?.address || 'Punto de encuentro fijado'}
            </Text>
          </View>
        </View>

        {/* Destino */}
        <View className="flex-row items-start">
          <View className="items-center mr-3 pt-0.5">
            <View className="w-6 h-6 rounded-full bg-gold/15 border border-gold/50 items-center justify-center">
              <Ionicons name="location" size={13} color={THEME_COLORS.gold} />
            </View>
          </View>
          <View className="flex-1">
            <Text className="font-montserrat-bold text-[9px] uppercase tracking-widest text-gold/90">
              DESTINO FINAL
            </Text>
            <Text
              numberOfLines={1}
              className="font-montserrat-semibold text-sm text-white mt-0.5"
            >
              {offer?.dropoff?.address || 'Destino fijado por el pasajero'}
            </Text>
          </View>
        </View>
      </View>

      {/* ====================================================================
          5. PASAJERO EJECUTIVO
          ==================================================================== */}
      <View className="flex-row items-center justify-between px-1 mb-4">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-8 h-8 rounded-full bg-gold/15 border border-gold/45 items-center justify-center mr-2.5">
            <Text className="text-gold font-montserrat-bold text-xs">
              {passengerInitial}
            </Text>
          </View>
          <Text numberOfLines={1} className="font-montserrat-bold text-xs text-white mr-2 flex-shrink">
            {passengerName}
          </Text>
          <View className="flex-row items-center bg-gold/15 border border-gold/35 px-2 py-0.5 rounded-full">
            <Ionicons name="star" size={10} color={THEME_COLORS.gold} />
            <Text className="font-montserrat-bold text-[10px] text-gold ml-1">
              {Number(ratingAvg).toFixed(1)}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center bg-white/[0.05] border border-white/10 px-2.5 py-1 rounded-full">
          <Ionicons name="shield-checkmark" size={11} color={THEME_COLORS.gold} />
          <Text className="font-montserrat-semibold text-[10px] text-platinum ml-1">
            Verificado
          </Text>
        </View>
      </View>

      {/* ====================================================================
          6. ACCIONES: BOTÓN ACEPTAR EN ORO CHAMPÁN + RECHAZAR
          ==================================================================== */}
      <View className="flex-row items-center gap-3">
        {/* Botón Aceptar en Oro Champán */}
        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onAccept();
          }}
          disabled={isAccepting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Aceptar viaje por $${totalFareAmount.toLocaleString('es-AR')}`}
          className="flex-1 h-14 rounded-2xl bg-gold items-center justify-center active:opacity-90 shadow-xl shadow-gold/30 relative overflow-hidden"
        >
          <View className="absolute top-0 left-4 right-4 h-[1px] bg-white/45 pointer-events-none" />
          {isAccepting ? (
            <ActivityIndicator color="#0A0A0C" size="small" />
          ) : (
            <View className="flex-row items-center">
              <Ionicons
                name="checkmark-circle"
                size={21}
                color="#0A0A0C"
                style={{ marginRight: 8 }}
              />
              <Text className="font-montserrat-bold text-sm text-obsidian tracking-widest uppercase">
                ACEPTAR VIAJE VIP
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
          activeOpacity={0.75}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Rechazar y descartar oferta"
          className="w-14 h-14 rounded-2xl bg-white/[0.08] border border-white/20 items-center justify-center active:bg-white/15"
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      </Animated.View>
    </>
  );
};
