import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  Share,
  Text,
  TextInput,
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

import { THEME_COLORS } from '../../../core/constants/theme';
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
}

// ============================================================================
// SUB-COMPONENTES REUTILIZABLES (NATIVEWIND / TAILWIND)
// ============================================================================

/** Badge de estado sutil con punto pulsante */
interface StatusBadgeProps {
  label: string;
  variant?: 'gold' | 'emerald' | 'rose';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'gold',
  pulse = true,
}) => {
  const containerClasses = {
    gold: 'border-gold/40 bg-gold/15',
    emerald: 'border-emerald-500/40 bg-emerald-500/15',
    rose: 'border-rose-500/40 bg-rose-500/15',
  }[variant];

  const dotClasses = {
    gold: 'bg-gold',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
  }[variant];

  const textClasses = {
    gold: 'text-gold',
    emerald: 'text-emerald-400',
    rose: 'text-rose-400',
  }[variant];

  return (
    <View
      className={`flex-row items-center px-2.5 py-1 rounded-full border ${containerClasses}`}
      accessibilityRole="text"
    >
      {pulse && <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotClasses}`} />}
      <Text className={`font-montserrat-bold text-[10px] tracking-wider uppercase ${textClasses}`}>
        {label}
      </Text>
    </View>
  );
};

/** Fila con datos del pasajero, calificación y accesos de contacto */
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
    <View className="flex-row items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 mb-3">
      <View className="flex-row items-center flex-1 mr-2.5">
        <View className="w-10 h-10 rounded-full bg-gold/15 border border-gold/35 items-center justify-center mr-3">
          <Text className="font-montserrat-bold text-base text-gold">{avatarLetter}</Text>
        </View>

        <View className="flex-1">
          <Text numberOfLines={1} className="font-montserrat-bold text-sm text-white mb-0.5">
            {name}
          </Text>
          <View className="flex-row items-center">
            <View className="flex-row items-center bg-gold/15 px-1.5 py-0.5 rounded mr-1.5">
              <Ionicons name="star" size={11} color={THEME_COLORS.gold} />
              <Text className="font-montserrat-bold text-[10px] text-gold ml-1">{rating}</Text>
            </View>
            {preferences.length > 0 && (
              <Text numberOfLines={1} className="font-montserrat text-[11px] text-ash flex-1">
                · {preferences.slice(0, 2).join(', ')}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-2.5">
        {onChat && (
          <TouchableOpacity
            onPress={handleChat}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Chatear con el pasajero"
            className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 items-center justify-center active:scale-95 shadow-sm"
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={THEME_COLORS.gold} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleCall}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Llamar al pasajero"
          className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/20 items-center justify-center active:scale-95 shadow-sm"
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** Fila de Dirección origen o destino con jerarquía visual */
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
    <View className="flex-row items-center bg-white/[0.025] border border-white/[0.06] rounded-2xl p-3 mb-3">
      <View
        className={`w-8 h-8 rounded-full border items-center justify-center mr-3 ${
          isPickup
            ? 'bg-gold/15 border-gold/35'
            : 'bg-emerald-500/15 border-emerald-500/35'
        }`}
      >
        <Ionicons
          name={isPickup ? 'radio-button-on' : 'location'}
          size={16}
          color={isPickup ? THEME_COLORS.gold : '#10B981'}
        />
      </View>

      <View className="flex-1">
        <Text className="font-montserrat-bold text-[9px] tracking-wider text-ash-muted mb-0.5">
          {isPickup ? 'PUNTO DE RETIRO' : 'DESTINO FINAL'}
        </Text>
        <Text
          numberOfLines={isSingleLine ? 1 : 2}
          className="font-montserrat-semibold text-xs text-platinum leading-5"
        >
          {address || (isPickup ? 'Punto de encuentro' : 'Destino fijado')}
        </Text>
        {subtitle && (
          <Text numberOfLines={1} className="font-montserrat text-[11px] text-ash mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

/** Indicador dinámico de progreso hacia el destino */
interface TripProgressIndicatorProps {
  percent: number; // 0-100
  etaText?: string;
}

export const TripProgressIndicator: React.FC<TripProgressIndicatorProps> = ({
  percent,
  etaText,
}) => {
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <View className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-3 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-montserrat-bold text-[9.5px] tracking-wider text-ash-muted">
          PROGRESO DEL TRAYECTO
        </Text>
        <Text className="font-montserrat-bold text-xs text-emerald-400">
          {etaText || `${Math.round(clamped)}%`}
        </Text>
      </View>
      <View className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <View
          className="h-full bg-emerald-400 rounded-full"
          style={{ width: `${clamped}%` }}
        />
      </View>
    </View>
  );
};

/** Casillas numéricas estilizadas para ingreso de PIN */
interface PinInputWidgetProps {
  digits: string[];
  onChange: (digits: string[]) => void;
  isError?: boolean;
}

export const PinInputWidget: React.FC<PinInputWidgetProps> = ({
  digits,
  onChange,
  isError = false,
}) => {
  const inputsRef = useRef<TextInput[]>([]);

  const handleChange = (text: string, index: number) => {
    const next = [...digits];
    next[index] = text.slice(-1);
    onChange(next);

    if (text && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View
      className={`border rounded-2xl p-3 mb-3.5 items-center ${
        isError ? 'border-red-500/40 bg-red-500/5' : 'bg-white/[0.03] border-white/10'
      }`}
    >
      <Text className="font-montserrat-bold text-[10px] tracking-wider text-ash mb-2.5 text-center">
        PIN DE ABORDAJE (SOLICITAR AL PASAJERO)
      </Text>
      <View className="flex-row gap-3">
        {digits.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => {
              if (ref) inputsRef.current[i] = ref;
            }}
            value={digit}
            onChangeText={(txt) => handleChange(txt, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            className={`w-11 h-12 rounded-xl border-[1.5px] font-montserrat-bold text-xl text-white text-center ${
              digit
                ? 'border-gold bg-gold/10'
                : isError
                  ? 'border-red-500 bg-white/[0.04]'
                  : 'border-white/15 bg-white/[0.04]'
            }`}
          />
        ))}
      </View>
    </View>
  );
};

/** Resumen de cobro final con monto destacado en dorado */
interface FareReceiptWidgetProps {
  amount: number;
  paymentMethod?: string;
  ratingScore?: number;
  onRatingScoreChange?: (score: number) => void;
}

export const FareReceiptWidget: React.FC<FareReceiptWidgetProps> = ({
  amount,
  paymentMethod = 'cash',
  ratingScore = 5,
  onRatingScoreChange,
}) => {
  const methodInfo = getPaymentMethodInfo(paymentMethod);
  const methodColor = methodInfo.isCash ? '#10B981' : THEME_COLORS.gold;

  return (
    <View className="bg-gold/10 border border-gold/25 rounded-2xl p-3.5 mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="font-montserrat-bold text-[9.5px] tracking-wider text-ash mb-0.5">
            TOTAL COBRADO / A COBRAR
          </Text>
          <Text className="font-montserrat-bold text-2xl text-gold">
            ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
        </View>

        <View className="flex-row items-center bg-white/5 px-2.5 py-1 rounded-lg gap-1.5 border border-white/10">
          <Ionicons name={methodInfo.icon} size={14} color={methodColor} />
          <Text
            className="font-montserrat-semibold text-xs"
            style={{ color: methodColor }}
          >
            {methodInfo.label}
          </Text>
        </View>
      </View>

      {/* Calificación al pasajero */}
      <View className="border-t border-white/10 pt-2.5">
        <Text className="font-montserrat-medium text-[11px] text-ash mb-1.5">
          Calificar experiencia del pasajero:
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
              className="p-0.5"
            >
              <Ionicons
                name={star <= (ratingScore || 5) ? 'star' : 'star-outline'}
                size={22}
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
}) => {
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

  const isPinComplete = pinDigits.every((d) => d.length > 0);
  const canStart = !isPinRequired || isPinComplete;

  const handleShare = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onShareTrip) {
      onShareTrip();
      return;
    }
    try {
      await Share.share({
        message: `Viaje en curso TransferBlack hacia ${displayDropoff}. Estado: ${status}`,
      });
    } catch {
      // Ignorar cancelaciones
    }
  };

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(120)}
      className="w-full bg-obsidian-card rounded-t-[28px] rounded-b-none px-5 pt-3 pb-6 border-t border-white/10 shadow-2xl"
      accessible={true}
      accessibilityRole="summary"
    >
      {/* Handle indicador de Bottom Sheet */}
      <View className="items-center pb-2.5">
        <View className="w-10 h-1 rounded-full bg-white/20" />
      </View>
      {/* ====================================================================
          1. HEADER UNIFICADO (Badge de Estado + ETA / Distancia destacada)
          ==================================================================== */}
      <View className="flex-row items-center justify-between mb-3.5">
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
            <StatusBadge label="VIAJE EN CURSO" variant="emerald" />
          )}
          {status === 'COMPLETED' && (
            <StatusBadge label="VIAJE FINALIZADO" variant="gold" pulse={false} />
          )}
        </View>

        {(displayEta || displayDistance) && status !== 'COMPLETED' && (
          <View className="flex-row items-center bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
            {displayEta && (
              <Text className="font-montserrat-bold text-xs text-gold">{displayEta}</Text>
            )}
            {displayDistance && (
              <Text className="font-montserrat-medium text-[11px] text-ash">
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
          <View className="flex-row items-center bg-gold/10 border border-gold/25 rounded-2xl p-3 mb-3">
            <ActivityIndicator size="small" color={THEME_COLORS.gold} />
            <Text className="font-montserrat-medium text-xs text-platinum ml-2.5 flex-1">
              Buscando mejores solicitudes en tu zona...
            </Text>
          </View>

          <RouteAddressRow
            type="pickup"
            address={displayPickup}
            subtitle="Zona de cobertura activa"
            isSingleLine
          />

          <View className="w-full mt-1 gap-2">
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancelar búsqueda de viaje"
              className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 items-center justify-center active:bg-white/10"
            >
              <Text className="font-montserrat-semibold text-xs text-platinum">
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
              className="w-full h-12 rounded-2xl bg-gold items-center justify-center active:opacity-90 shadow-lg"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <Text className="font-montserrat-bold text-xs text-obsidian tracking-wider">
                  NOTIFICAR LLEGADA AL RETIRO
                </Text>
              )}
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancelar viaje asignado"
                className="items-center justify-center py-1.5"
              >
                <Text className="font-montserrat-medium text-xs text-ash-muted">
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
            className={`flex-row items-center justify-between p-3 rounded-2xl border mb-3 ${
              isCourtesyExpired
                ? 'bg-rose-500/10 border-rose-500/30'
                : 'bg-gold/10 border-gold/25'
            }`}
          >
            <View className="flex-row items-center">
              <Ionicons
                name="timer-outline"
                size={18}
                color={isCourtesyExpired ? '#F43F5E' : THEME_COLORS.gold}
              />
              <Text
                className={`font-montserrat-semibold text-xs ml-2 ${
                  isCourtesyExpired ? 'text-rose-400' : 'text-gold'
                }`}
              >
                {isCourtesyExpired ? 'Tiempo tarifado por espera' : 'Tiempo de cortesía'}
              </Text>
            </View>
            <Text
              className={`font-montserrat-bold text-sm ${
                isCourtesyExpired ? 'text-rose-400' : 'text-gold'
              }`}
            >
              {waitingTimeText}
            </Text>
          </View>

          {/* Validación de PIN: Banner destacado interactivo estilo Uber */}
          {isPinRequired && (
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onOpenPinModal?.();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Abrir pantalla para ingresar PIN del viaje"
              className={`p-3.5 rounded-2xl border mb-3 flex-row items-center justify-between ${
                isPinError
                  ? 'bg-rose-500/10 border-rose-500/35'
                  : isPinComplete
                    ? 'bg-emerald-500/10 border-emerald-500/35'
                    : 'bg-gold/10 border-gold/30'
              }`}
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center mr-3 border ${
                    isPinError
                      ? 'bg-rose-500/15 border-rose-500/30'
                      : isPinComplete
                        ? 'bg-emerald-500/15 border-emerald-500/30'
                        : 'bg-gold/15 border-gold/30'
                  }`}
                >
                  <Ionicons
                    name={isPinComplete ? 'shield-checkmark' : 'keypad'}
                    size={20}
                    color={
                      isPinError
                        ? '#F43F5E'
                        : isPinComplete
                          ? '#10B981'
                          : THEME_COLORS.gold
                    }
                  />
                </View>

                <View className="flex-1">
                  <Text className="font-montserrat-bold text-[10px] tracking-wider uppercase text-ash mb-0.5">
                    {isPinComplete ? 'PIN VALIDADO' : 'PIN DE ABORDAJE REQUERIDO'}
                  </Text>
                  <Text className="font-montserrat-semibold text-xs text-white">
                    {isPinComplete
                      ? `Código: ${pinDigits.join(' ')}`
                      : 'Pedir 4 dígitos al pasajero'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                <Text className="font-montserrat-bold text-xs text-gold mr-1">
                  {isPinComplete ? 'Cambiar' : 'Ingresar'}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={THEME_COLORS.gold} />
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
              className={`w-full h-13 rounded-2xl items-center justify-center shadow-lg ${
                canStart
                  ? 'bg-gold active:opacity-90'
                  : 'bg-gold/20 border border-gold/40 active:bg-gold/30'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <View className="flex-row items-center">
                  {!canStart && (
                    <Ionicons
                      name="keypad"
                      size={17}
                      color={THEME_COLORS.gold}
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text
                    className={`font-montserrat-bold text-xs tracking-wider ${
                      canStart ? 'text-obsidian' : 'text-gold'
                    }`}
                  >
                    {canStart ? 'INICIAR VIAJE' : 'INGRESAR PIN PARA INICIAR'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {isPinRequired && !isPinComplete && (
              <Text className="font-montserrat text-[11px] text-ash text-center mt-0.5">
                El destino se revelará una vez validado el PIN a bordo.
              </Text>
            )}

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                className="items-center justify-center py-1.5"
              >
                <Text className="font-montserrat-medium text-xs text-ash-muted">
                  Cancelar / Pasajero ausente
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ESTADO 4: IN_PROGRESS (En viaje hacia el destino) */}
      {status === 'IN_PROGRESS' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          <RouteAddressRow
            type="dropoff"
            address={displayDropoff}
            subtitle={displayEta ? `Llegada estimada: ${displayEta}` : undefined}
          />

          <TripProgressIndicator
            percent={progressPercent}
            etaText={displayEta ? `ETA: ${displayEta}` : undefined}
          />

          {/* Fila de Seguridad y Contacto */}
          <View className="flex-row gap-2.5 mb-3.5">
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Compartir viaje"
              className="flex-1 flex-row items-center justify-center bg-white/[0.04] border border-white/10 rounded-xl h-10 gap-1.5 active:bg-white/10"
            >
              <Ionicons name="share-social-outline" size={15} color="#E4E4E5" />
              <Text className="font-montserrat-semibold text-xs text-platinum">Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onChat}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Chat con pasajero"
              className="flex-1 flex-row items-center justify-center bg-white/[0.04] border border-white/10 rounded-xl h-10 gap-1.5 active:bg-white/10"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={THEME_COLORS.gold} />
              <Text className="font-montserrat-semibold text-xs text-platinum">Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Deslizar para finalizar viaje */}
          <View className="w-full mt-0.5">
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
          </View>
        </Animated.View>
      )}

      {/* ESTADO 5: COMPLETED (Viaje finalizado con resumen de cobro) */}
      {status === 'COMPLETED' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="w-full"
        >
          <FareReceiptWidget
            amount={displayFare}
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

          <View className="w-full mt-1 gap-2">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onConfirmCompleted?.();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirmar y volver al mapa"
              className="w-full h-12 rounded-2xl bg-gold items-center justify-center active:opacity-90 shadow-lg"
            >
              <Text className="font-montserrat-bold text-xs text-obsidian tracking-wider">
                CONFIRMAR Y FINALIZAR
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};
