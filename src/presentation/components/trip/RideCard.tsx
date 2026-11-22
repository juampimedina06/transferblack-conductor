import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Trip,
  TripStopPoint,
  getPaymentMethodInfo,
} from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { SlideToComplete } from './ui/SlideToComplete';
import { getTripOfferTheme } from './theme/tripOfferTheme';

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
  stops?: TripStopPoint[];
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
// SUB-COMPONENTES MINIMALISTAS (SIN TARJETAS ANIDADAS)
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
  const dotClasses = {
    white: 'bg-white',
    gold: 'bg-gold',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
  }[variant];

  const textClasses = {
    white: 'text-white/90',
    gold: 'text-gold',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  }[variant];

  return (
    <View className="flex-row items-center" accessibilityRole="text">
      {pulse && <View className={`w-2 h-2 rounded-full mr-2 ${dotClasses}`} />}
      <Text className={`font-montserrat-semibold text-[11px] tracking-widest uppercase ${textClasses}`}>
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
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1 mr-3">
        <View className="w-10 h-10 rounded-full bg-white/[0.08] items-center justify-center mr-3">
          <Text className="font-montserrat-semibold text-sm text-white">{avatarLetter}</Text>
        </View>

        <View className="flex-1">
          <Text numberOfLines={1} className="font-montserrat-semibold text-[15px] text-white">
            {name}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Ionicons name="star" size={11} color={THEME_COLORS.gold} />
            <Text className="font-montserrat-medium text-xs text-white/60 ml-1">
              {rating}
            </Text>
            <Text numberOfLines={1} className="font-montserrat text-xs text-white/45 ml-1.5 flex-1">
              · {preferences.length > 0 ? preferences.slice(0, 2).join(', ') : 'Pasajero VIP'}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-2">
        {onChat && (
          <TouchableOpacity
            onPress={handleChat}
            activeOpacity={0.75}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Chatear con el pasajero"
            className="w-11 h-11 rounded-full bg-white/[0.08] items-center justify-center active:bg-white/15"
          >
            <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleCall}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Llamar al pasajero"
          className="w-11 h-11 rounded-full bg-gold/15 items-center justify-center active:bg-gold/25"
        >
          <Ionicons name="call-outline" size={18} color={THEME_COLORS.gold} />
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
    <View className="flex-row items-start">
      <View className="w-5 items-center pt-1.5 mr-2.5">
        {isPickup ? (
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        ) : (
          <Ionicons name="location" size={16} color={THEME_COLORS.gold} />
        )}
      </View>

      <View className="flex-1">
        <Text className="font-montserrat-medium text-[11px] text-white/45 mb-0.5">
          {isPickup ? 'Punto de retiro' : 'Destino'}
        </Text>
        <Text
          numberOfLines={isSingleLine ? 1 : 2}
          className="font-montserrat-medium text-sm text-white leading-5"
        >
          {address || (isPickup ? 'Punto de encuentro' : 'Destino fijado')}
        </Text>
        {subtitle && (
          <Text numberOfLines={1} className="font-montserrat text-xs text-white/45 mt-0.5">
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
    <View className="w-full">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="font-montserrat-medium text-xs text-white/50 mb-1">
            {methodInfo.isCash ? 'Total a cobrar' : 'Valor del servicio'}
          </Text>
          <Text
            className="font-montserrat-bold text-4xl text-white tracking-tight"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
          <Text
            className="font-montserrat-medium text-xs text-gold mt-1"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            Ganancia neta: ${netEarnings.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
        </View>

        <View className="flex-row items-center gap-1.5 pt-1">
          <Ionicons
            name={methodInfo.icon}
            size={15}
            color={methodInfo.isCash ? '#34D399' : THEME_COLORS.gold}
          />
          <Text
            className={`font-montserrat-semibold text-xs ${
              methodInfo.isCash ? 'text-emerald-400' : 'text-gold'
            }`}
          >
            {methodInfo.label}
          </Text>
        </View>
      </View>

      <View className="h-px bg-white/[0.07] my-4" />

      <View className="items-center">
        <Text className="font-montserrat-medium text-xs text-white/60 mb-2">
          Calificá al pasajero
        </Text>
        <View className="flex-row gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRatingScoreChange?.(star);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`Calificar con ${star} estrellas`}
              className="w-11 h-11 items-center justify-center"
            >
              <Ionicons
                name={star <= (ratingScore || 5) ? 'star' : 'star-outline'}
                size={26}
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
// COMPONENTE PRINCIPAL: RideCard
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
  stops,
  fareAmount = 0,
  earningsAmount,
  paymentMethod = 'cash',
  requirePin = false,
  pinDigits = ['', '', '', ''],
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
  onConfirmCompleted,
  ratingScore = 5,
  onRatingScoreChange,
  bottomInset,
}) => {
  const insets = useSafeAreaInsets();
  const effectiveBottomInset = bottomInset ?? insets.bottom;
  const theme = getTripOfferTheme(true);

  const displayName = passengerName || trip?.passenger?.fullName || 'Pasajero Ejecutivo';
  const displayRating = passengerRating || trip?.passenger?.rating || '5.0';
  const displayPhone = passengerPhone || trip?.passenger?.phone || '';
  const displayPickup = pickupAddress || trip?.pickup?.address || 'Punto de encuentro';
  const displayDropoff = dropoffAddress || trip?.dropoff?.address || 'Destino fijado';
  const displayStops = stops ?? trip?.stops ?? [];
  const displayEta = etaText || (trip?.pickup?.etaMinutes ? `~${trip.pickup.etaMinutes} min` : null);
  const displayDistance = distanceText || null;
  const displayFare = fareAmount || Number(trip?.final_fare || trip?.estimated_fare || 0);
  const isPinRequired = requirePin ?? trip?.require_pin ?? false;

  const [isFinishActionExpanded, setIsFinishActionExpanded] = useState(false);

  const isPinComplete = pinDigits.every((d) => d.length > 0);
  const canStart = !isPinRequired || isPinComplete;

  const telemetryText = [displayEta, displayDistance].filter(Boolean).join(' · ');

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20).stiffness(140)}
      className="w-full rounded-t-3xl bg-[#0E1015] border-t border-white/10 px-5 pt-2.5"
      style={{ paddingBottom: Math.max(effectiveBottomInset, 16) }}
      accessible={true}
      accessibilityRole="summary"
    >
      {/* Handle sutil */}
      <View className="items-center pb-3">
        <View className="w-9 h-1 rounded-full bg-white/20" />
      </View>

      {/* Header compacto: estado + telemetría inline */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 items-start mr-2">
          {status === 'SEARCHING' && (
            <StatusBadge label="Buscando viaje" variant="gold" />
          )}
          {status === 'DRIVER_ASSIGNED' && (
            <StatusBadge label="En camino al retiro" variant="gold" />
          )}
          {status === 'ARRIVING' && (
            <StatusBadge
              label={isCourtesyExpired ? 'Tiempo tarifado' : 'En punto de retiro'}
              variant={isCourtesyExpired ? 'rose' : 'emerald'}
            />
          )}
          {status === 'IN_PROGRESS' && (
            <StatusBadge label="Viaje en curso" variant="emerald" />
          )}
          {status === 'COMPLETED' && (
            <StatusBadge label="Servicio finalizado" variant="gold" pulse={false} />
          )}
        </View>

        {telemetryText.length > 0 &&
          status !== 'COMPLETED' &&
          status !== 'IN_PROGRESS' && (
            <Text
              className="font-montserrat-semibold text-xs text-white/75"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {telemetryText}
            </Text>
          )}
      </View>

      <View className="h-px bg-white/[0.07] my-3.5" />

      {/* ESTADO 1: SEARCHING */}
      {status === 'SEARCHING' && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          className="w-full"
        >
          <View className="flex-row items-center mb-3.5">
            <ActivityIndicator size="small" color={THEME_COLORS.gold} />
            <Text className="font-montserrat-medium text-xs text-white/70 ml-3 flex-1">
              Buscando solicitudes en tu zona...
            </Text>
          </View>

          <RouteAddressRow
            type="pickup"
            address={displayPickup}
            subtitle="Zona de cobertura activa"
            isSingleLine
          />

          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Pausar conexión"
            className="w-full h-[52px] rounded-2xl bg-white/[0.08] items-center justify-center mt-4 active:bg-white/15"
          >
            <Text className="font-montserrat-semibold text-sm text-white">
              Pausar conexión
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ESTADO 2: DRIVER_ASSIGNED (En camino al retiro) */}
      {status === 'DRIVER_ASSIGNED' && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
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

          <View className="h-px bg-white/[0.07] my-3.5" />

          <RouteAddressRow type="pickup" address={displayPickup} />

          {displayStops.length > 0 && (
            <View className="mt-2.5 pl-7 gap-1.5">
              {displayStops.map((stop, idx) => (
                <View key={`${stop.latitude}-${stop.longitude}-${idx}`} className="flex-row items-center">
                  <View className="w-4 h-4 rounded-full bg-amber-500/20 items-center justify-center mr-2">
                    <Text className="font-montserrat-bold text-[9px] text-amber-300">
                      {idx + 1}
                    </Text>
                  </View>
                  <Text numberOfLines={1} className="font-montserrat text-xs text-white/65 flex-1">
                    {stop.address || `Parada ${idx + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View className="w-full mt-4">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onArrived?.();
              }}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Notificar llegada al punto de retiro"
              accessibilityState={{ disabled: isLoading }}
              className="w-full h-[52px] rounded-2xl bg-gold items-center justify-center active:opacity-90"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <Text className="font-montserrat-bold text-sm text-obsidian">
                  Llegué al punto de retiro
                </Text>
              )}
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancelar viaje asignado"
                className="min-h-[44px] items-center justify-center mt-1"
              >
                <Text className="font-montserrat-medium text-xs text-white/45">
                  Cancelar viaje
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ESTADO 3: ARRIVING (En punto de retiro) */}
      {status === 'ARRIVING' && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
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

          <View className="h-px bg-white/[0.07] my-3.5" />

          {/* Cronómetro de cortesía inline */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons
                name="time-outline"
                size={16}
                color={isCourtesyExpired ? '#F43F5E' : THEME_COLORS.gold}
              />
              <Text
                className={`font-montserrat-medium text-xs ml-2 ${
                  isCourtesyExpired ? 'text-rose-400' : 'text-white/70'
                }`}
              >
                {isCourtesyExpired ? 'Tiempo tarifado por espera' : 'Espera de cortesía'}
              </Text>
            </View>
            <Text
              style={{ fontVariant: ['tabular-nums'] }}
              className={`font-montserrat-semibold text-sm ${
                isCourtesyExpired ? 'text-rose-400' : 'text-white'
              }`}
            >
              {waitingTimeText}
            </Text>
          </View>

          {/* PIN de seguridad */}
          {isPinRequired && (
            <>
              <View className="h-px bg-white/[0.07] my-3.5" />
              <TouchableOpacity
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onOpenPinModal?.();
                }}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Ingresar PIN de seguridad del viaje"
                className="flex-row items-center justify-between min-h-[44px]"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Ionicons
                    name={isPinComplete ? 'shield-checkmark-outline' : 'keypad-outline'}
                    size={17}
                    color={isPinComplete ? '#34D399' : THEME_COLORS.gold}
                    style={{ marginRight: 10 }}
                  />
                  <Text className="font-montserrat-medium text-sm text-white">
                    {isPinComplete
                      ? `PIN verificado (${pinDigits.join(' ')})`
                      : 'PIN de seguridad requerido'}
                  </Text>
                </View>

                <Text className="font-montserrat-semibold text-xs text-gold">
                  {isPinComplete ? 'Cambiar' : 'Ingresar'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <View className="w-full mt-4">
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
              accessibilityState={{ disabled: isLoading }}
              className={`w-full h-[52px] rounded-2xl items-center justify-center ${
                canStart
                  ? 'bg-gold active:opacity-90'
                  : 'bg-gold/15 border border-gold/40 active:bg-gold/25'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={canStart ? '#0A0A0C' : THEME_COLORS.gold} />
              ) : (
                <Text
                  className={`font-montserrat-bold text-sm ${
                    canStart ? 'text-obsidian' : 'text-gold'
                  }`}
                >
                  {canStart ? 'Iniciar viaje' : 'Ingresar PIN para iniciar'}
                </Text>
              )}
            </TouchableOpacity>

            {isPinRequired && !isPinComplete && (
              <Text className="font-montserrat text-[11px] text-white/45 text-center mt-2">
                El destino se habilitará al validar el PIN del pasajero.
              </Text>
            )}

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancelar viaje o reportar pasajero ausente"
                className="min-h-[44px] items-center justify-center mt-1"
              >
                <Text className="font-montserrat-medium text-xs text-white/45">
                  Cancelar / Pasajero ausente
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ESTADO 4: IN_PROGRESS */}
      {status === 'IN_PROGRESS' && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          className="w-full"
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsFinishActionExpanded((prev) => !prev);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isFinishActionExpanded
                ? 'Ocultar control para finalizar viaje'
                : 'Mostrar control para finalizar viaje'
            }
            className="w-full"
          >
            <View className="flex-row items-baseline justify-between mb-1">
              <Text
                style={{ fontVariant: ['tabular-nums'] }}
                className="font-montserrat-bold text-3xl text-white tracking-tight"
              >
                {displayDistance || '0.0 km'}
              </Text>
              {displayEta && (
                <Text
                  style={{ fontVariant: ['tabular-nums'] }}
                  className="font-montserrat-semibold text-sm text-gold"
                >
                  {displayEta}
                </Text>
              )}
            </View>

            <View className="flex-row items-center justify-between">
              <Text
                numberOfLines={1}
                className="font-montserrat-medium text-xs text-white/60 flex-1 mr-3"
              >
                {displayStops.length > 0
                  ? `${displayStops.length} ${displayStops.length === 1 ? 'parada' : 'paradas'} · ${displayDropoff}`
                  : displayDropoff}
              </Text>
              <View className="flex-row items-center">
                <Text className="font-montserrat-semibold text-xs text-gold mr-1">
                  {isFinishActionExpanded ? 'Ocultar' : 'Finalizar'}
                </Text>
                <Ionicons
                  name={isFinishActionExpanded ? 'chevron-down' : 'chevron-up'}
                  size={14}
                  color={THEME_COLORS.gold}
                />
              </View>
            </View>

            {displayStops.length > 0 && (
              <View className="mt-3 pt-3 border-t border-white/[0.07] gap-1.5">
                {displayStops.map((stop, idx) => (
                  <View
                    key={`${stop.latitude}-${stop.longitude}-${idx}`}
                    className="flex-row items-center"
                  >
                    <View className="w-4 h-4 rounded-full bg-amber-500/20 items-center justify-center mr-2">
                      <Text className="font-montserrat-bold text-[9px] text-amber-300">
                        {idx + 1}
                      </Text>
                    </View>
                    <Text numberOfLines={1} className="font-montserrat text-xs text-white/75 flex-1">
                      {stop.address || `Parada ${idx + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>

          {isFinishActionExpanded && (
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(140)}
              className="w-full mt-3.5 pt-3.5 border-t border-white/[0.07]"
            >
              <SlideToComplete
                theme={theme}
                onComplete={() => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onCompleteTrip?.();
                }}
                isLoading={isLoading}
                label="DESLIZAR PARA FINALIZAR"
                loadingLabel="FINALIZANDO VIAJE..."
              />
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* ESTADO 5: COMPLETED */}
      {status === 'COMPLETED' && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          className="w-full"
        >
          <FareReceiptWidget
            amount={displayFare}
            earningsAmount={earningsAmount ?? trip?.driver_earnings}
            paymentMethod={paymentMethod}
            ratingScore={ratingScore}
            onRatingScoreChange={onRatingScoreChange}
          />

          <View className="h-px bg-white/[0.07] my-4" />

          <RouteAddressRow
            type="dropoff"
            address={displayDropoff}
            subtitle="Viaje completado"
            isSingleLine
          />

          <TouchableOpacity
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onConfirmCompleted?.();
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Confirmar y volver al mapa"
            className="w-full h-[52px] rounded-2xl bg-gold items-center justify-center mt-5 active:opacity-90"
          >
            <Text className="font-montserrat-bold text-sm text-obsidian">
              Confirmar y finalizar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
};
