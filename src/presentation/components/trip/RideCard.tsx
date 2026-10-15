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
  fareAmount?: number;
  earningsAmount?: number;
  paymentMethod?: 'cash' | 'transfer' | 'card' | string;
  requirePin?: boolean;
  pinDigits?: string[];
  isPinError?: boolean;
  onPinChange?: (digits: string[]) => void;
  progressPercent?: number; // 0 a 100
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
// SUB-COMPONENTES REUTILIZABLES (NATIVEWIND / TAILWIND)
// ============================================================================

/** Badge de estado sutil con punto pulsante */
interface StatusBadgeProps {
  label: string;
  variant?: 'gold' | 'emerald' | 'rose' | 'white';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'white',
  pulse = true,
}) => {
  const containerClasses = {
    white: 'border-white/25 bg-white/10',
    gold: 'border-white/25 bg-white/10',
    emerald: 'border-emerald-500/40 bg-emerald-500/15',
    rose: 'border-rose-500/40 bg-rose-500/15',
  }[variant];

  const dotClasses = {
    white: 'bg-white',
    gold: 'bg-white',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
  }[variant];

  const textClasses = {
    white: 'text-white',
    gold: 'text-white',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  }[variant];

  return (
    <View
      className={`flex-row items-center px-3 py-1 rounded-full border ${containerClasses}`}
      accessibilityRole="text"
    >
      {pulse && <View className={`w-1.5 h-1.5 rounded-full mr-2 ${dotClasses}`} />}
      <Text className={`font-montserrat-bold text-[10px] tracking-widest uppercase ${textClasses}`}>
        {label}
      </Text>
    </View>
  );
};

/** Fila con datos del pasajero, calificación y accesos de contacto estilo TripOfferCard */
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
    <View className="flex-row items-center justify-between py-2 mb-3 border-b border-white/10 pb-3">
      <View className="flex-row items-center flex-1 mr-2.5">
        <View className="w-11 h-11 rounded-full bg-white/15 border border-white/30 items-center justify-center mr-3">
          <Text className="font-montserrat-bold text-base text-white">{avatarLetter}</Text>
        </View>

        <View className="flex-1">
          <Text numberOfLines={1} className="font-montserrat-bold text-base text-white mb-0.5">
            {name}
          </Text>
          <View className="flex-row items-center">
            <View className="flex-row items-center bg-white/10 px-2 py-0.5 rounded mr-2 border border-white/10">
              <Ionicons name="star" size={11} color="#FFFFFF" />
              <Text className="font-montserrat-bold text-[10px] text-white ml-1">{rating}</Text>
            </View>
            {preferences.length > 0 ? (
              <Text numberOfLines={1} className="font-montserrat text-xs text-white/60 flex-1">
                · {preferences.slice(0, 2).join(', ')}
              </Text>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
                <Text className="font-montserrat text-[10px] text-white/70 ml-1">Verificado</Text>
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
            className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 items-center justify-center active:bg-white/20"
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
          className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 items-center justify-center active:bg-white/20"
        >
          <Ionicons name="call" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** Fila de Dirección origen o destino con diseño limpio idéntico a TripOfferCard */
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
    <View className="flex-row items-center py-2 mb-2">
      <View className="w-6 h-6 rounded-full bg-white/15 border border-white/40 items-center justify-center mr-3">
        {isPickup ? (
          <View className="w-2 h-2 rounded-full bg-white" />
        ) : (
          <Ionicons name="location" size={13} color="#FFFFFF" />
        )}
      </View>

      <View className="flex-1">
        <Text className="font-montserrat-bold text-[9px] tracking-wider text-white/50 mb-0.5 uppercase">
          {isPickup ? 'Punto de retiro' : 'Destino final'}
        </Text>
        <Text
          numberOfLines={isSingleLine ? 1 : 2}
          className="font-montserrat-semibold text-sm text-white leading-5"
        >
          {address || (isPickup ? 'Punto de encuentro' : 'Destino fijado')}
        </Text>
        {subtitle && (
          <Text numberOfLines={1} className="font-montserrat text-xs text-white/60 mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

/** Resumen de cobro final con monto destacado en grande y ganancia más chica */
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
  const methodColor = methodInfo.isCash ? '#10B981' : '#FFFFFF';
  const netEarnings = earningsAmount ?? Math.round(amount * 0.8);

  return (
    <View className="py-2 mb-3 border-b border-white/10 pb-3.5">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3">
          <Text className="font-montserrat-bold text-[10px] tracking-wider text-white/50 uppercase mb-0.5">
            {methodInfo.isCash ? 'Total a cobrar al pasajero' : 'Total del viaje'}
          </Text>
          <Text
            className="font-montserrat-bold text-5xl text-white tracking-tight"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
          <Text className="font-montserrat-semibold text-xs text-white/70 mt-1">
            Tu ganancia neta: ${netEarnings.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
        </View>

        <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 gap-1.5 mt-1">
          <Ionicons name={methodInfo.icon} size={15} color={methodColor} />
          <Text
            className="font-montserrat-semibold text-xs text-white"
          >
            {methodInfo.label}
          </Text>
        </View>
      </View>

      {/* Calificación al pasajero */}
      <View className="pt-1">
        <Text className="font-montserrat-medium text-xs text-white/70 mb-2">
          Calificá la experiencia del pasajero:
        </Text>
        <View className="flex-row gap-2.5">
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
                size={26}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL UNIFICADO: RideCard (CardContainer)
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

  // Derivación de datos combinando props directas o del objeto trip
  const displayName = passengerName || trip?.passenger?.fullName || 'Pasajero';
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

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(120)}
      className="w-full overflow-hidden rounded-t-[32px] rounded-b-none px-5 pt-3.5 border-t border-white/20 shadow-2xl"
      style={{ paddingBottom: Math.max(effectiveBottomInset, 24) }}
      accessible={true}
      accessibilityRole="summary"
    >
      {/* Capa de desenfoque Liquid Glass (frosted glass sobre el mapa) */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 65 : 80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      {/* Tinte translúcido Liquid Glass para contraste y legibilidad óptima */}
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        className="bg-[#0A0A0C]/85"
      />

      {/* Resplandor especular superior característico de Liquid Glass */}
      <View
        pointerEvents="none"
        className="absolute top-0 left-8 right-8 h-[1px] bg-white/35 rounded-full"
      />

      {/* Handle indicador de Bottom Sheet */}
      <View className="items-center pb-2.5">
        <View className="w-10 h-1 rounded-full bg-white/25" />
      </View>
      {/* ====================================================================
          1. HEADER UNIFICADO (Badge de Estado + ETA / Distancia destacada)
          ==================================================================== */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-1 items-start">
          {status === 'SEARCHING' && (
            <StatusBadge label="BUSCANDO VIAJE" variant="white" />
          )}
          {status === 'DRIVER_ASSIGNED' && (
            <StatusBadge label="EN CAMINO AL RETIRO" variant="white" />
          )}
          {status === 'ARRIVING' && (
            <StatusBadge
              label={isCourtesyExpired ? 'TIEMPO TARIFADO' : 'EN PUNTO DE RETIRO'}
              variant={isCourtesyExpired ? 'rose' : 'emerald'}
            />
          )}
          {status === 'IN_PROGRESS' && (
            <StatusBadge label="VIAJE EN CURSO" variant="emerald" />
          )}
          {status === 'COMPLETED' && (
            <StatusBadge label="VIAJE FINALIZADO" variant="white" pulse={false} />
          )}
        </View>

        {(displayEta || displayDistance) &&
          status !== 'COMPLETED' &&
          status !== 'IN_PROGRESS' && (
          <View className="flex-row items-center bg-white/10 px-3 py-1 rounded-full border border-white/15">
            {displayEta && (
              <Text className="font-montserrat-bold text-xs text-white">{displayEta}</Text>
            )}
            {displayDistance && (
              <Text className="font-montserrat-medium text-[11px] text-white/60">
                {' '}· {displayDistance}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ====================================================================
          2. CUERPO DINÁMICO SEGÚN ESTADO (Con transiciones Fade)
          ==================================================================== */}

      {/* ESTADO 1: SEARCHING (Buscando viaje / esperando confirmación) */}
      {status === 'SEARCHING' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          <View className="flex-row items-center py-2 mb-3 border-b border-white/10 pb-3">
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text className="font-montserrat-medium text-xs text-white/80 ml-3 flex-1">
              Buscando mejores solicitudes en tu zona...
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

          <View className="w-full mt-2 gap-2">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onArrived?.();
              }}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Notificar llegada al punto de encuentro"
              className="w-full h-14 rounded-2xl bg-white items-center justify-center active:opacity-90 shadow-xl"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <View className="flex-row items-center">
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color="#000000"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="font-montserrat-bold text-sm text-black tracking-widest uppercase">
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
                <Text className="font-montserrat-medium text-xs text-white/50">
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

          {/* Cronómetro de Cortesía integrado limpiamente en dark glass */}
          <View className="flex-row items-center justify-between py-2.5 px-3.5 rounded-2xl bg-white/10 border border-white/15 mb-3">
            <View className="flex-row items-center">
              <Ionicons
                name="timer-outline"
                size={16}
                color={isCourtesyExpired ? '#F43F5E' : '#FFFFFF'}
              />
              <Text
                className={`font-montserrat-semibold text-xs ml-2 ${
                  isCourtesyExpired ? 'text-rose-400' : 'text-white'
                }`}
              >
                {isCourtesyExpired ? 'Tiempo tarifado por espera' : 'Tiempo de cortesía'}
              </Text>
            </View>
            <Text
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
              className="flex-row items-center justify-between py-3 px-4 rounded-2xl bg-white/10 border border-white/20 mb-3"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <Ionicons
                  name={isPinComplete ? 'shield-checkmark' : 'keypad'}
                  size={18}
                  color={isPinComplete ? '#10B981' : '#FFFFFF'}
                  style={{ marginRight: 10 }}
                />
                <Text className="font-montserrat-medium text-xs text-white">
                  {isPinComplete
                    ? `PIN validado: ${pinDigits.join(' ')}`
                    : 'PIN de abordaje requerido'}
                </Text>
              </View>

              <Text className="font-montserrat-bold text-xs text-white">
                {isPinComplete ? 'Cambiar' : 'Ingresar'}
              </Text>
            </TouchableOpacity>
          )}

          <View className="w-full mt-2 gap-2">
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
              className={`w-full h-14 rounded-2xl items-center justify-center shadow-xl ${
                canStart
                  ? 'bg-white active:opacity-90'
                  : 'bg-white/15 border border-white/30 active:bg-white/25'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <View className="flex-row items-center">
                  {!canStart && (
                    <Ionicons
                      name="keypad"
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text
                    className={`font-montserrat-bold text-sm tracking-widest uppercase ${
                      canStart ? 'text-black' : 'text-white'
                    }`}
                  >
                    {canStart ? 'INICIAR VIAJE' : 'INGRESAR PIN PARA INICIAR'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {isPinRequired && !isPinComplete && (
              <Text className="font-montserrat text-[11px] text-white/50 text-center mt-0.5">
                El destino se revelará una vez validado el PIN a bordo.
              </Text>
            )}

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                className="items-center justify-center py-2"
              >
                <Text className="font-montserrat-medium text-xs text-white/50">
                  Cancelar / Pasajero ausente
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ESTADO 4: IN_PROGRESS (Ultra simple, enfocado en navegación y mapa despejado) */}
      {status === 'IN_PROGRESS' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          {/* Tarjeta interactiva: al tocarla se expande/colapsa el slider para finalizar */}
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
            {/* KM que faltan en el centro bien destacados */}
            <Text className="font-montserrat-bold text-5xl text-white tracking-tight mb-1 text-center">
              {displayDistance || '0.0 km'}
            </Text>

            {/* Dirección de destino y ETA sutil en el centro */}
            <Text
              numberOfLines={1}
              className="font-montserrat-medium text-xs text-white/70 text-center max-w-[90%] mb-3"
            >
              Hacia {displayDropoff} {displayEta ? `· ${displayEta}` : ''}
            </Text>

            {/* Pill indicador para expandir / finalizar */}
            <View className="flex-row items-center px-4 py-2 rounded-full bg-white/10 border border-white/20">
              <Ionicons
                name={isFinishActionExpanded ? 'chevron-down' : 'flag'}
                size={14}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text className="font-montserrat-bold text-[11px] tracking-wider text-white uppercase">
                {isFinishActionExpanded ? 'Ocultar acción' : 'Tocá para finalizar viaje'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Deslizador para finalizar que aparece al apretar la tarjeta */}
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

      {/* ESTADO 5: COMPLETED (Viaje finalizado con cobro al pasajero) */}
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
            subtitle="Viaje finalizado con éxito"
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
              className="w-full h-14 rounded-2xl bg-white items-center justify-center active:opacity-90 shadow-xl"
            >
              <Text className="font-montserrat-bold text-sm text-black tracking-widest uppercase">
                CONFIRMAR Y FINALIZAR
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};
