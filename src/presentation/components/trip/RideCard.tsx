import React, { useRef } from 'react';
import {
  ActivityIndicator,
  Linking,
  Share,
  StyleSheet,
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
  onShareTrip?: () => void;
  onConfirmCompleted?: () => void;
  ratingScore?: number;
  onRatingScoreChange?: (score: number) => void;
}

// ============================================================================
// SUB-COMPONENTES REUTILIZABLES MEJORADOS
// ============================================================================

/** Badge de estado sutil con punto pulsante */
interface StatusBadgeProps {
  label: string;
  color?: string;
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  color = THEME_COLORS.gold,
  pulse = true,
}) => (
  <View
    style={[styles.statusBadge, { borderColor: `${color}40`, backgroundColor: `${color}15` }]}
    accessibilityRole="text"
  >
    {pulse && <View style={[styles.pulseDot, { backgroundColor: color, shadowColor: color }]} />}
    <Text style={[styles.statusBadgeText, { color }]}>
      {label}
    </Text>
  </View>
);

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
    <View style={styles.passengerRowContainer}>
      <View style={styles.passengerInfoLeft}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        <View style={styles.passengerTextCol}>
          <Text numberOfLines={1} style={styles.passengerNameText}>
            {name}
          </Text>
          <View style={styles.passengerMetaRow}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color={THEME_COLORS.gold} />
              <Text style={styles.ratingText}>{rating}</Text>
            </View>
            {preferences.length > 0 && (
              <Text numberOfLines={1} style={styles.preferenceTag}>
                · {preferences.slice(0, 2).join(', ')}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          onPress={handleChat}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Chatear con el pasajero"
          style={styles.circleActionButton}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={19} color={THEME_COLORS.gold} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCall}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Llamar al pasajero"
          style={styles.circleActionButton}
        >
          <Ionicons name="call-outline" size={18} color="#E4E4E5" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/** Fila de Dirección origen o destino con jerarquía visual de alto impacto */
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
  const iconColor = isPickup ? THEME_COLORS.gold : '#10B981';

  return (
    <View style={styles.addressRowContainer}>
      <View style={[styles.addressIconCircle, { backgroundColor: `${iconColor}18`, borderColor: `${iconColor}40` }]}>
        <Ionicons
          name={isPickup ? 'radio-button-on' : 'location'}
          size={16}
          color={iconColor}
        />
      </View>

      <View style={styles.addressTextCol}>
        <Text style={styles.addressTypeHeader}>
          {isPickup ? 'PUNTO DE RETIRO' : 'DESTINO FINAL'}
        </Text>
        <Text numberOfLines={isSingleLine ? 1 : 2} style={styles.addressMainText}>
          {address || (isPickup ? 'Punto de encuentro' : 'Destino fijado')}
        </Text>
        {subtitle && (
          <Text numberOfLines={1} style={styles.addressSubText}>
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
    <View style={styles.progressContainer}>
      <View style={styles.progressHeaderRow}>
        <Text style={styles.progressLabel}>PROGRESO DEL TRAYECTO</Text>
        <Text style={styles.progressEta}>{etaText || `${Math.round(clamped)}%`}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${clamped}%` }]} />
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
    <View style={[styles.pinWidgetContainer, isError && styles.pinWidgetError]}>
      <Text style={styles.pinWidgetLabel}>
        PIN DE ABORDAJE (SOLICITAR AL PASAJERO)
      </Text>
      <View style={styles.pinBoxesRow}>
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
            style={[
              styles.pinBox,
              digit ? styles.pinBoxFilled : null,
              isError ? styles.pinBoxError : null,
            ]}
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
    <View style={styles.fareReceiptCard}>
      <View style={styles.fareReceiptTop}>
        <View>
          <Text style={styles.fareReceiptLabel}>TOTAL COBRADO / A COBRAR</Text>
          <Text style={styles.fareReceiptAmount}>
            ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </Text>
        </View>

        <View style={styles.paymentMethodPill}>
          <Ionicons
            name={methodInfo.icon}
            size={14}
            color={methodColor}
          />
          <Text style={[styles.paymentMethodText, { color: methodColor }]}>
            {methodInfo.label}
          </Text>
        </View>
      </View>

      {/* Calificación al pasajero */}
      <View style={styles.ratingRowWrapper}>
        <Text style={styles.ratingPromptText}>Calificar experiencia del pasajero:</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRatingScoreChange?.(star);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              style={styles.starTouch}
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
      style={styles.cardContainer}
      accessible={true}
      accessibilityRole="summary"
    >
      {/* ====================================================================
          1. HEADER UNIFICADO (Badge de Estado + ETA / Distancia destacada)
          ==================================================================== */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.headerBadgeCol}>
          {status === 'SEARCHING' && (
            <StatusBadge label="BUSCANDO VIAJE" color={THEME_COLORS.gold} />
          )}
          {status === 'DRIVER_ASSIGNED' && (
            <StatusBadge label="EN CAMINO AL RETIRO" color={THEME_COLORS.gold} />
          )}
          {status === 'ARRIVING' && (
            <StatusBadge
              label={isCourtesyExpired ? 'TIEMPO TARIFADO' : 'EN PUNTO DE RETIRO'}
              color={isCourtesyExpired ? '#EF4444' : '#10B981'}
            />
          )}
          {status === 'IN_PROGRESS' && (
            <StatusBadge label="VIAJE EN CURSO" color="#10B981" />
          )}
          {status === 'COMPLETED' && (
            <StatusBadge label="VIAJE FINALIZADO" color={THEME_COLORS.gold} pulse={false} />
          )}
        </View>

        {(displayEta || displayDistance) && status !== 'COMPLETED' && (
          <View style={styles.etaPillContainer}>
            {displayEta && <Text style={styles.etaPillValue}>{displayEta}</Text>}
            {displayDistance && <Text style={styles.etaPillSub}> · {displayDistance}</Text>}
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
          style={styles.stateBody}
        >
          <View style={styles.searchingPulseContainer}>
            <ActivityIndicator size="small" color={THEME_COLORS.gold} />
            <Text style={styles.searchingText}>Buscando mejores solicitudes en tu zona...</Text>
          </View>

          <RouteAddressRow
            type="pickup"
            address={displayPickup}
            subtitle="Zona de cobertura activa"
            isSingleLine
          />

          <View style={styles.footerActionsContainer}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancelar búsqueda de viaje"
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Pausar Conexión</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ESTADO 2: DRIVER_ASSIGNED (En camino a buscar al pasajero) */}
      {status === 'DRIVER_ASSIGNED' && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.stateBody}
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

          <View style={styles.footerActionsContainer}>
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onArrived?.();
              }}
              disabled={isLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Notificar llegada al punto de encuentro"
              style={styles.primaryButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <Text style={styles.primaryButtonText}>NOTIFICAR LLEGADA AL RETIRO</Text>
              )}
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancelar viaje asignado"
                style={styles.textCancelButton}
              >
                <Text style={styles.textCancelButtonLabel}>Cancelar viaje</Text>
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
          style={styles.stateBody}
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
            style={[
              styles.waitingTimerCard,
              isCourtesyExpired && styles.waitingTimerCardExpired,
            ]}
          >
            <View style={styles.waitingTimerLeft}>
              <Ionicons
                name="timer-outline"
                size={18}
                color={isCourtesyExpired ? '#EF4444' : THEME_COLORS.gold}
              />
              <Text
                style={[
                  styles.waitingTimerTitle,
                  isCourtesyExpired && { color: '#EF4444' },
                ]}
              >
                {isCourtesyExpired ? 'Tiempo tarifado por espera' : 'Tiempo de cortesía'}
              </Text>
            </View>
            <Text
              style={[
                styles.waitingTimerValue,
                isCourtesyExpired && { color: '#EF4444' },
              ]}
            >
              {waitingTimeText}
            </Text>
          </View>

          {/* Validación de PIN */}
          {isPinRequired && onPinChange && (
            <PinInputWidget
              digits={pinDigits}
              onChange={onPinChange}
              isError={isPinError}
            />
          )}

          <View style={styles.footerActionsContainer}>
            <TouchableOpacity
              onPress={() => {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onStartTrip?.();
              }}
              disabled={isLoading || !canStart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Iniciar viaje con pasajero a bordo"
              style={[
                styles.primaryButton,
                !canStart && styles.primaryButtonDisabled,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0A0A0C" />
              ) : (
                <Text
                  style={[
                    styles.primaryButtonText,
                    !canStart && styles.primaryButtonTextDisabled,
                  ]}
                >
                  INICIAR VIAJE
                </Text>
              )}
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity
                onPress={onCancel}
                activeOpacity={0.7}
                style={styles.textCancelButton}
              >
                <Text style={styles.textCancelButtonLabel}>Cancelar / Pasajero ausente</Text>
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
          style={styles.stateBody}
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
          <View style={styles.inTripMetaRow}>
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Compartir viaje"
              style={styles.pillSecondaryAction}
            >
              <Ionicons name="share-social-outline" size={15} color="#E4E4E5" />
              <Text style={styles.pillSecondaryText}>Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onChat}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Chat con pasajero"
              style={styles.pillSecondaryAction}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={THEME_COLORS.gold} />
              <Text style={styles.pillSecondaryText}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Deslizar para finalizar viaje */}
          <View style={styles.sliderContainer}>
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
          style={styles.stateBody}
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

          <View style={styles.footerActionsContainer}>
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onConfirmCompleted?.();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Confirmar y volver al mapa"
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>CONFIRMAR Y FINALIZAR</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// ESTILOS LIMPIOS Y PULIDOS (Dark Mode Obsidian + Acentos Oro / Esmeralda)
// ============================================================================

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#12131A',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerBadgeCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 100,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    marginRight: 6.5,
  },
  statusBadgeText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  etaPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  etaPillValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: THEME_COLORS.gold,
  },
  etaPillSub: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#A1A1AA',
  },
  stateBody: {
    width: '100%',
  },
  searchingPulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  searchingText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#E4E4E5',
    marginLeft: 10,
    flex: 1,
  },
  passengerRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  passengerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 16,
    color: THEME_COLORS.gold,
  },
  passengerTextCol: {
    flex: 1,
  },
  passengerNameText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  passengerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginRight: 6,
  },
  ratingText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    color: THEME_COLORS.gold,
    marginLeft: 3,
  },
  preferenceTag: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#A1A1AA',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  addressIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  addressTextCol: {
    flex: 1,
  },
  addressTypeHeader: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9,
    letterSpacing: 0.6,
    color: '#71717A',
    marginBottom: 2,
  },
  addressMainText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 13,
    color: '#E4E4E5',
    lineHeight: 18,
  },
  addressSubText: {
    fontFamily: 'Montserrat_400Regular',
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
  },
  waitingTimerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  waitingTimerCardExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  waitingTimerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waitingTimerTitle: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: THEME_COLORS.gold,
    marginLeft: 8,
  },
  waitingTimerValue: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 15,
    color: THEME_COLORS.gold,
  },
  pinWidgetContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
  },
  pinWidgetError: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  pinWidgetLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 10,
    letterSpacing: 0.6,
    color: '#A1A1AA',
    marginBottom: 10,
    textAlign: 'center',
  },
  pinBoxesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pinBox: {
    width: 46,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    fontFamily: 'Montserrat_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pinBoxFilled: {
    borderColor: THEME_COLORS.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  pinBoxError: {
    borderColor: '#EF4444',
  },
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: '#71717A',
  },
  progressEta: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 12,
    color: '#10B981',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  inTripMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  pillSecondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    height: 40,
    gap: 6,
  },
  pillSecondaryText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#E4E4E5',
  },
  sliderContainer: {
    width: '100%',
    marginTop: 2,
  },
  fareReceiptCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.06)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  fareReceiptTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fareReceiptLabel: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 9.5,
    letterSpacing: 0.6,
    color: '#A1A1AA',
    marginBottom: 2,
  },
  fareReceiptAmount: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 26,
    color: THEME_COLORS.gold,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  paymentMethodText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 11,
  },
  ratingRowWrapper: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  ratingPromptText: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 11,
    color: '#A1A1AA',
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starTouch: {
    padding: 2,
  },
  footerActionsContainer: {
    width: '100%',
    marginTop: 4,
    gap: 8,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME_COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME_COLORS.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontFamily: 'Montserrat_700Bold',
    fontSize: 13,
    color: '#0A0A0C',
    letterSpacing: 0.6,
  },
  primaryButtonTextDisabled: {
    color: '#71717A',
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 12,
    color: '#E4E4E5',
  },
  textCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  textCancelButtonLabel: {
    fontFamily: 'Montserrat_500Medium',
    fontSize: 12,
    color: '#71717A',
  },
});
