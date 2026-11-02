import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Trip, getPaymentMethodInfo } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { SlideToComplete } from './ui/SlideToComplete';
import { getTripOfferTheme } from './theme/tripOfferTheme';
import { AmbientGlow } from '../ui/AmbientGlow';

export type RideCardStatus =
  | 'SEARCHING'
  | 'DRIVER_ASSIGNED'
  | 'ARRIVING'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface RideCardProps {
  status: RideCardStatus;
  trip?: Partial<Trip> | null;
  etaText?: string;
  distanceText?: string;
  passengerName?: string;
  passengerRating?: string | number;
  passengerPhone?: string;
  passengerPreferences?: string[];
  pickupAddress?: string;
  dropoffAddress?: string;
  fareAmount?: number;
  earningsAmount?: number;
  paymentMethod?: 'cash' | 'transfer' | 'card' | string;
  requirePin?: boolean;
  pinDigits?: string[];
  isPinError?: boolean;
  onPinChange?: (digits: string[]) => void;
  progressPercent?: number;
  waitingTimeText?: string;
  isCourtesyExpired?: boolean;
  isLoading?: boolean;
  onArrived?: () => void;
  onStartTrip?: () => void;
  onCompleteTrip?: () => void;
  onCancel?: () => void;
  onCall?: () => void;
  onChat?: () => void;
  onOpenPinModal?: () => void;
  onShareTrip?: () => void;
  onConfirmCompleted?: () => void;
  ratingScore?: number;
  onRatingScoreChange?: (score: number) => void;
  bottomInset?: number;
}

// ============================================================================
// SUB-COMPONENTES REUTILIZABLES (TRANSFERBLACK VIP COCKPIT)
// ============================================================================

interface StatusBadgeProps {
  label: string;
  variant?: 'gold' | 'emerald' | 'rose' | 'white';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'gold',
  pulse = true,
}) => {
  const containerClasses = {
    white: 'border-white/25 bg-white/10',
    gold: 'border-gold/45 bg-gold/15',
    emerald: 'border-emerald-500/45 bg-emerald-500/15',
    rose: 'border-rose-500/45 bg-rose-500/15',
  }[variant];

  const dotClasses = {
    white: 'bg-white',
    gold: 'bg-gold',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
  }[variant];

  const textClasses = {
    white: 'text-white',
    gold: 'text-gold',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  }[variant];

  return (
    <View
      className={`flex-row items-center px-3 py-1.5 rounded-full border ${containerClasses}`}
      accessibilityRole="text"
    >
      {pulse && <View className={`w-1.5 h-1.5 rounded-full mr-2 ${dotClasses}`} />}
      <Text className={`font-montserrat-bold text-[10px] tracking-widest uppercase ${textClasses}`}>
        {label}
      </Text>
    </View>
  );
};

interface PassengerProfileRowProps {
  name: string;
  rating?: string | number;
  phone?: string;
  preferences?: string[];
  onCall?: () => void;
  onChat?: () => void;
}

export const PassengerProfileRow: React.FC<PassengerProfileRowProps> = ({
  name,
  rating = '5.0',
  phone,
  preferences = [],
  onCall,
  onChat,
}) => {
  const avatarLetter = (name || 'P').charAt(0).toUpperCase();

  const handleCall = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onCall) {
      onCall();
    } else if (phone) {
      void Linking.openURL(`tel:${phone}`);
    }
  };

  const handleChat = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChat?.();
  };

  return (
    <View className="flex-row items-center justify-between bg-white/[0.04] border border-white/10 rounded-2xl p-3 mb-3">
      <View className="flex-row items-center flex-1 mr-2.5">
        <View className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/45 items-center justify-center mr-3">
          <Text className="font-montserrat-bold text-base text-gold">{avatarLetter}</Text>
        </View>

        <View className="flex-1">
          <Text numberOfLines={1} className="font-montserrat-bold text-base text-white mb-1">
            {name}
          </Text>
          <View className="flex-row items-center">
            <View className="flex-row items-center bg-gold/15 border border-gold/35 px-2 py-0.5 rounded-md mr-2">
              <Ionicons name="star" size={10} color={THEME_COLORS.gold} />
              <Text className="font-montserrat-bold text-[10px] text-gold ml-1">{rating}</Text>
            </View>
            {preferences.length > 0 ? (
              <Text numberOfLines={1} className="font-montserrat text-xs text-ash flex-1">
                · {preferences.slice(0, 2).join(', ')}
              </Text>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={11} color={THEME_COLORS.gold} />
                <Text className="font-montserrat-semibold text-[10px] text-platinum ml-1">
                  Pasajero VIP
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        {onChat && (
          <TouchableOpacity
            onPress={handleChat}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Chatear con el pasajero"
            className="w-11 h-11 rounded-2xl bg-white/[0.08] border border-white/20 items-center justify-center active:bg-white/15"
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleCall}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Llamar al pasajero"
          className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/45 items-center justify-center active:opacity-80"
        >
          <Ionicons name="call" size={18} color={THEME_COLORS.gold} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface RouteAddressRowProps {
  type: 'pickup' | 'dropoff';
  address: string;
  subtitle?: string;
  isSingleLine?: boolean;
}

export const RouteAddressRow: React.FC<RouteAddressRowProps> = ({
  type,
  address,
  subtitle,
  isSingleLine = false,
}) => {
  const isPickup = type === 'pickup';

  return (
    <View className="flex-row items-center bg-white/[0.03] border border-white/10 rounded-2xl px-3.5 py-3 mb-3">
      <View
        className={`w-8 h-8 rounded-xl items-center justify-center mr-3 border ${
          isPickup
            ? 'bg-emerald-500/15 border-emerald-400/50'
            : 'bg-gold/15 border-gold/50'
        }`}
      >
        {isPickup ? (
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        ) : (
          <Ionicons name="location" size={15} color={THEME_COLORS.gold} />
        )}
      </View>

      <View className="flex-1">
        <Text
          className={`font-montserrat-bold text-[9px] tracking-widest mb-0.5 uppercase ${
            isPickup ? 'text-emerald-400' : 'text-gold'
          }`}
        >
          {isPickup ? 'PUNTO DE RETIRO' : 'DESTINO EJECUTIVO'}
        </Text>
        <Text
          numberOfLines={isSingleLine ? 1 : 2}
          className="font-montserrat-semibold text-sm text-white leading-5"
        >
          {address || (isPickup ? 'Punto de encuentro' : 'Destino fijado')}
        </Text>
        {subtitle && (
          <Text numberOfLines={1} className="font-montserrat text-xs text-ash mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

interface FareReceiptWidgetProps {
  amount: number;
  earningsAmount?: number;
  paymentMethod?: string;
  ratingScore?: number;
  onRatingScoreChange?: (score: number) => void;
}

export const FareReceiptWidget: React.FC<FareReceiptWidgetProps> = ({
  amount,
  earningsAmount,
  paymentMethod = 'cash',
  ratingScore = 5,
  onRatingScoreChange,
}) => {
  const methodInfo = getPaymentMethodInfo(paymentMethod);
  const netEarnings = earningsAmount ?? Math.round(amount * 0.8);

  return (
    <View className="bg-white/[0.04] border border-gold/30 rounded-3xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-3 pb-3 border-b border-white/10">
        <View className="flex-1 mr-3">
          <Text className="font-montserrat-bold text-[10px] tracking-widest text-gold uppercase mb-1">
            {methodInfo.isCash ? 'TOTAL A COBRAR AL PASAJERO' : 'VALOR TOTAL DEL SERVICIO'}
          </Text>
          <Text
            className="font-montserrat-bold text-5xl text-white tracking-tight"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
          <View className="flex-row items-center mt-2">
            <View className="bg-gold/15 border border-gold/35 px-2.5 py-1 rounded-lg">
              <Text className="font-montserrat-bold text-xs text-gold">
                Tu ganancia neta: ${netEarnings.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        <View
          className={`flex-row items-center px-3 py-1.5 rounded-xl border gap-1.5 mt-1 ${
            methodInfo.isCash
              ? 'bg-emerald-500/15 border-emerald-400/40'
              : 'bg-gold/15 border-gold/40'
          }`}
        >
          <Ionicons
            name={methodInfo.icon}
            size={15}
            color={methodInfo.isCash ? '#34D399' : THEME_COLORS.gold}
          />
          <Text
            className={`font-montserrat-bold text-xs ${
              methodInfo.isCash ? 'text-emerald-400' : 'text-gold'
            }`}
          >
            {methodInfo.label}
          </Text>
        </View>
      </View>

      {/* Calificación al pasajero en Oro Champán */}
      <View className="items-center pt-1">
        <Text className="font-montserrat-semibold text-xs text-platinum mb-2">
          Calificá la experiencia con el pasajero:
        </Text>
        <View className="flex-row gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRatingScoreChange?.(star);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              className="p-1"
            >
              <Ionicons
                name={star <= (ratingScore || 5) ? 'star' : 'star-outline'}
                size={28}
                color={THEME_COLORS.gold}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL UNIFICADO: RideCard (Cockpit Inferior VIP)
// ============================================================================

export const RideCard: React.FC<RideCardProps> = ({
  status,
  trip,
  etaText,
  distanceText,
  passengerName,
  passengerRating = '5.0',
  passengerPhone,
  passengerPreferences = [],
  pickupAddress,
  dropoffAddress,
  fareAmount = 0,
  earningsAmount,
  paymentMethod = 'cash',
  requirePin = false,
  pinDigits = ['', '', '', ''],
  isPinError = false,
  onPinChange,
  progressPercent = 40,
  waitingTimeText = '00:00',
  isCourtesyExpired = false,
  isLoading = false,
  onArrived,
  onStartTrip,
  onCompleteTrip,
  onCancel,
  onCall,
  onChat,
  onOpenPinModal,
  onShareTrip,
  onConfirmCompleted,
  ratingScore = 5,
  onRatingScoreChange,
  bottomInset,
}) => {
  const insets = useSafeAreaInsets();
  const effectiveBottomInset = bottomInset ?? insets.bottom;
  const screenHeight = Dimensions.get('window').height;
  const theme = getTripOfferTheme(true);

  const displayName = passengerName || trip?.passenger?.fullName || 'Pasajero Ejecutivo';
  const displayRating = passengerRating || trip?.passenger?.rating || '5.0';
  const displayPhone = passengerPhone || trip?.passenger?.phone || '';
  const displayPickup = pickupAddress || trip?.pickup?.address || 'Punto de encuentro';
  const displayDropoff = dropoffAddress || trip?.dropoff?.address || 'Destino fijado';
  const displayEta = etaText || (trip?.pickup?.etaMinutes ? `~${trip.pickup.etaMinutes} min` : null);
  const displayDistance = distanceText || null;
  const displayFare = fareAmount || Number(trip?.final_fare || trip?.estimated_fare || 0);
  const isPinRequired = requirePin ?? trip?.require_pin ?? false;

  const [isFinishActionExpanded, setIsFinishActionExpanded] = useState(false);

  const isPinComplete = pinDigits.every((d) => d.length > 0);
  const canStart = !isPinRequired || isPinComplete;

  const glowColor =
    status === 'ARRIVING' && isCourtesyExpired
      ? '#F43F5E'
      : status === 'IN_PROGRESS'
      ? '#10B981'
      : THEME_COLORS.gold;

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(120)}
      className="w-full overflow-hidden rounded-t-[34px] rounded-b-none px-5 pt-3 border-t border-gold/45 shadow-2xl"
      style={{ paddingBottom: Math.max(effectiveBottomInset, 22) }}
      accessible={true}
      accessibilityRole="summary"
    >
      {/* Capa de desenfoque Liquid Glass */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 75 : 90}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* Tinte Obsidiana profundo */}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className="bg-[#090A0F]/92"
      />

      {/* Ambient Glow Superior */}
      <AmbientGlow
        position="top"
        height={200}
        opacity={0.17}
        color={glowColor}
      />

      {/* Resplandor especular superior en Oro */}
      <View
        pointerEvents="none"
        className="absolute top-0 left-10 right-10 h-[1.5px] bg-gold/60 rounded-full"
      />

      {/* Handle indicador de Bottom Sheet */}
      <View className="items-center pb-2.5">
        <View className="w-11 h-1 rounded-full bg-white/25" />
      </View>

      {/* ====================================================================
          1. HEADER UNIFICADO (Badge de Estado + Telemetría ETA / Distancia)
          ==================================================================== */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 items-start">
          {status === 'SEARCHING' && (
            <StatusBadge label="BUSCANDO VIAJE" variant="gold" />
          )}
          {status === 'DRIVER_ASSIGNED' && (
            <StatusBadge label="EN CAMINO AL RETIRO" variant="gold" />
          )}
          {status === 'ARRIVING' && (
            <StatusBadge
              label={isCourtesyExpired ? 'TIEMPO TARIFADO' : 'EN PUNTO DE RETIRO'}
              variant={isCourtesyExpired ? 'rose' : 'emerald'}
            />
          )}
          {status === 'IN_PROGRESS' && (
            <StatusBadge label="TRASLADO VIP EN CURSO" variant="emerald" />
          )}
          {status === 'COMPLETED' && (
            <StatusBadge label="SERVICIO FINALIZADO" variant="gold" pulse={false} />
          )}
        </View>

        {(displayEta || displayDistance) &&
          status !== 'COMPLETED' &&
          status !== 'IN_PROGRESS' && (
          <View className="flex-row items-center bg-gold/15 px-3 py-1.5 rounded-full border border-gold/40">
            <Ionicons name="time-outline" size={13} color={THEME_COLORS.gold} style={{ marginRight: 4 }} />
            {displayEta && (
              <Text className="font-montserrat-bold text-xs text-gold">{displayEta}</Text>
            )}
            {displayDistance && (
              <Text className="font-montserrat-semibold text-[11px] text-platinum">
                {' '}· {displayDistance}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ====================================================================
          2. CUERPO DINÁMICO SEGÚN ESTADO
          ==================================================================== */}

      {/* ESTADO 1: SEARCHING */}
      {status === 'SEARCHING' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          <View className="flex-row items-center py-2 mb-3 border-b border-white/10 pb-3">
            <ActivityIndicator size="small" color={THEME_COLORS.gold} />
            <Text className="font-montserrat-medium text-xs text-platinum ml-3 flex-1">
              Buscando solicitudes prioritarias en tu zona...
            </Text>
          </View>

          <RouteAddressRow
            type="pickup"
            address={displayPickup}
            subtitle="Zona de cobertura activa"
            isSingleLine
          />

          <View className="w-full mt-2">
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancelar búsqueda de viaje"
              className="w-full h-14 rounded-2xl bg-white/10 border border-white/20 items-center justify-center active:bg-white/20"
            >
              <Text className="font-montserrat-bold text-xs text-white uppercase tracking-wider">
                Pausar Conexión
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ESTADO 2: DRIVER_ASSIGNED (En camino a buscar al pasajero) */}
      {status === 'DRIVER_ASSIGNED' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          <PassengerProfileRow
            name={displayName}
            rating={displayRating}
            phone={displayPhone}
            preferences={passengerPreferences}
            onCall={onCall}
            onChat={onChat}
          />

          <RouteAddressRow
            type="pickup"
            address={displayPickup}
            subtitle={displayEta ? `Tiempo estimado de llegada: ${displayEta}` : undefined}
          />

          <View className="w-full mt-1 gap-2">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onArrived?.();
              }}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Notificar llegada al punto de encuentro"
              className="w-full h-14 rounded-2xl bg-gold items-center justify-center active:opacity-90 shadow-xl shadow-gold/30 relative overflow-hidden"
            >
              <View className="absolute top-0 left-6 right-6 h-[1px] bg-white/40 pointer-events-none" />
              {isLoading ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#0A0A0C"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-montserrat-bold text-sm text-obsidian tracking-widest uppercase">
                    NOTIFICAR LLEGADA AL RETIRO
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancelar viaje asignado"
                className="items-center justify-center py-2"
              >
                <Text className="font-montserrat-medium text-xs text-ash">
                  Cancelar viaje
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ESTADO 3: ARRIVING (Llegada y espera en el punto de encuentro) */}
      {status === 'ARRIVING' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          <PassengerProfileRow
            name={displayName}
            rating={displayRating}
            phone={displayPhone}
            preferences={passengerPreferences}
            onCall={onCall}
            onChat={onChat}
          />

          {/* Cronómetro de Cortesía */}
          <View
            className={`flex-row items-center justify-between py-3 px-4 rounded-2xl border mb-3 ${
              isCourtesyExpired
                ? 'bg-rose-500/15 border-rose-500/40'
                : 'bg-gold/10 border-gold/35'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="timer-outline"
                size={17}
                color={isCourtesyExpired ? '#F43F5E' : THEME_COLORS.gold}
              />
              <Text
                className={`font-montserrat-bold text-xs ml-2 ${
                  isCourtesyExpired ? 'text-rose-400' : 'text-gold'
                }`}
              >
                {isCourtesyExpired ? 'Tiempo tarifado por espera' : 'Tiempo de cortesía VIP'}
              </Text>
            </View>
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className={`font-montserrat-bold text-sm ${
                isCourtesyExpired ? 'text-rose-400' : 'text-white'
              }`}
            >
              {waitingTimeText}
            </Text>
          </View>

          {/* Validación de PIN */}
          {isPinRequired && (
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenPinModal?.();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Abrir pantalla para ingresar PIN del viaje"
              className={`flex-row items-center justify-between py-3.5 px-4 rounded-2xl border mb-3 ${
                isPinComplete
                  ? 'bg-emerald-500/15 border-emerald-400/45'
                  : 'bg-white/[0.06] border-gold/45'
              }`}
            >
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons
                  name={isPinComplete ? 'shield-checkmark' : 'keypad'}
                  size={18}
                  color={isPinComplete ? '#10B981' : THEME_COLORS.gold}
                  style={{ marginRight: 10 }}
                />
                <Text className="font-montserrat-semibold text-xs text-white">
                  {isPinComplete
                    ? `PIN verificado: ${pinDigits.join(' ')}`
                    : 'Código PIN de seguridad requerido'}
                </Text>
              </View>

              <View className="bg-gold/20 border border-gold/40 px-2.5 py-1 rounded-lg">
                <Text className="font-montserrat-bold text-[11px] text-gold uppercase">
                  {isPinComplete ? 'Cambiar' : 'Ingresar'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View className="w-full mt-1 gap-2">
            <TouchableOpacity
              onPress={() => {
                if (!canStart) {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onOpenPinModal?.();
                  return;
                }
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onStartTrip?.();
              }}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                canStart
                  ? 'Iniciar viaje con pasajero a bordo'
                  : 'Ingresar PIN para iniciar viaje'
              }
              className={`w-full h-14 rounded-2xl items-center justify-center shadow-xl relative overflow-hidden ${
                canStart
                  ? 'bg-gold shadow-gold/30 active:opacity-90'
                  : 'bg-gold/20 border border-gold/50 active:bg-gold/30'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons
                    name={canStart ? 'play-circle' : 'keypad'}
                    size={20}
                    color={canStart ? '#0A0A0C' : THEME_COLORS.gold}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    className={`font-montserrat-bold text-sm tracking-widest uppercase ${
                      canStart ? 'text-obsidian' : 'text-gold'
                    }`}
                  >
                    {canStart ? 'INICIAR VIAJE EJECUTIVO' : 'INGRESAR PIN PARA INICIAR'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {isPinRequired && !isPinComplete && (
              <Text className="font-montserrat text-[11px] text-ash text-center mt-0.5">
                El destino final se habilitará al validar el PIN del pasajero.
              </Text>
            )}

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                className="items-center justify-center py-2"
              >
                <Text className="font-montserrat-medium text-xs text-ash">
                  Cancelar / Pasajero ausente
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ESTADO 4: IN_PROGRESS (Telemetría de Cabina VIP despejada para conducción) */}
      {status === 'IN_PROGRESS' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsFinishActionExpanded((prev) => !prev);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isFinishActionExpanded
                ? 'Ocultar acción para finalizar viaje'
                : 'Mostrar deslizador para finalizar viaje'
            }
            className="w-full items-center py-1"
          >
            {/* Distancia restante en tipografía de velocímetro digital */}
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className="font-montserrat-bold text-5xl text-white tracking-tight mb-1.5 text-center"
            >
              {displayDistance || '0.0 km'}
            </Text>

            {/* Destino y ETA con ícono en Oro Champán */}
            <View className="flex-row items-center justify-center max-w-[92%] mb-3.5">
              <Ionicons name="location" size={14} color={THEME_COLORS.gold} />
              <Text
                numberOfLines={1}
                className="font-montserrat-semibold text-xs text-platinum text-center ml-1.5"
              >
                Hacia {displayDropoff} {displayEta ? `· ${displayEta}` : ''}
              </Text>
            </View>

            {/* Pill ejecutivo para desplegar el deslizador de cierre */}
            <View className="flex-row items-center px-4 py-2 rounded-full bg-gold/15 border border-gold/45">
              <Ionicons
                name={isFinishActionExpanded ? 'chevron-down' : 'flag'}
                size={14}
                color={THEME_COLORS.gold}
                style={{ marginRight: 6 }}
              />
              <Text className="font-montserrat-bold text-[11px] tracking-widest text-gold uppercase">
                {isFinishActionExpanded ? 'Ocultar control' : 'Tocá para finalizar viaje'}
              </Text>
            </View>
          </TouchableOpacity>

          {isFinishActionExpanded && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="w-full mt-3 pt-3 border-t border-white/10"
            >
              <SlideToComplete
                theme={theme}
                onComplete={() => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onCompleteTrip?.();
                }}
                isLoading={isLoading}
                label="DESLIZAR AL FINALIZAR"
                loadingLabel="FINALIZANDO VIAJE..."
              />
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* ESTADO 5: COMPLETED (Liquidación ejecutiva del servicio) */}
      {status === 'COMPLETED' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full justify-between"
          style={{ minHeight: Math.round(screenHeight * 0.48) }}
        >
          <FareReceiptWidget
            amount={displayFare}
            earningsAmount={earningsAmount ?? trip?.driver_earnings}
            paymentMethod={paymentMethod}
            ratingScore={ratingScore}
            onRatingScoreChange={onRatingScoreChange}
          />

          <RouteAddressRow
            type="dropoff"
            address={displayDropoff}
            subtitle="Servicio ejecutivo completado con éxito"
            isSingleLine
          />

          <View className="w-full mt-2">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onConfirmCompleted?.();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirmar y volver al mapa"
              className="w-full h-14 rounded-2xl bg-gold items-center justify-center active:opacity-90 shadow-xl shadow-gold/30"
            >
              <Text className="font-montserrat-bold text-sm text-obsidian tracking-widest uppercase">
                CONFIRMAR Y FINALIZAR
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};
