import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import {
  TripOfferPayload,
  calculateTripDistanceKm,
  getPaymentMethodInfo,
} from '../../../core/trip/interface/trip.interface';
import { useOfferTimer } from '../../trip/hooks/useOfferTimer';
import { getTripOfferTheme } from './theme/tripOfferTheme';
import { GlassSurface } from './ui/GlassSurface';
import { RouteTimeline } from './ui/RouteTimeline';
import { MetricsRow } from './ui/MetricsRow';
import { CountdownRing } from './ui/CountdownRing';

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
 * Tarjeta de nuevo viaje recibido con estética Liquid Glass unificada (estilo Uber Driver Black).
 * Superficie continua y profesional, sin cajas anidadas ni fragmentación visual.
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
  const colorScheme = useColorScheme();
  const theme = useMemo(() => getTripOfferTheme(colorScheme === 'dark'), [colorScheme]);
  const reduceMotion = useReducedMotion();

  // Cálculo de tiempo restante
  const ttlSeconds = offer?.ttlSeconds || 25;
  const [secondsLeft, setSecondsLeft] = useState(ttlSeconds);

  // Hook existente de temporizador con SharedValue para el anillo SVG
  const { progress } = useOfferTimer(
    ttlSeconds,
    onReject,
    Boolean(offer && !isLoading),
    offer?.offerId,
    offer?.expiresAt
  );

  // Intervalo liviano de 1s para actualizar los números del temporizador
  useEffect(() => {
    if (!offer?.expiresAt) {
      setSecondsLeft(ttlSeconds);
      return;
    }

    const updateSeconds = () => {
      const remainingMs = new Date(offer.expiresAt!).getTime() - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(sec);
    };

    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [offer?.expiresAt, ttlSeconds]);

  // Háptico suave chill al recibir el viaje
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [offer?.offerId]);

  // Animación interactiva en los botones (scale 0.97)
  const acceptScale = useSharedValue(1);
  const rejectScale = useSharedValue(1);

  const acceptAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: acceptScale.value }],
  }));

  const rejectAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rejectScale.value }],
  }));

  // Datos de tarifa
  const paymentInfo = useMemo(
    () => getPaymentMethodInfo(offer?.fare?.paymentMethod),
    [offer?.fare?.paymentMethod]
  );
  const totalFareAmount = useMemo(
    () => Number(offer?.fare?.totalFare || offer?.fare?.netEarnings || 0),
    [offer?.fare]
  );
  const isCashOffer = paymentInfo.isCash;

  // Datos del pasajero
  const isThirdParty = Boolean(offer?.third_party?.name);
  const passengerName = isThirdParty
    ? `Viaja: ${offer.third_party?.name}`
    : offer?.passenger?.fullName || 'Pasajero TransferBlack';
  const avatarLetter = (isThirdParty ? offer.third_party?.name : passengerName)
    ?.charAt(0)
    ?.toUpperCase() || 'P';

  const ratingAvg = offer?.passengerRating?.average ?? offer?.passenger?.rating ?? 5.0;
  const ratingCount =
    offer?.passengerRating?.count ?? offer?.passenger?.completedTrips ?? 0;

  // Recorrido
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

  const isUrgent = secondsLeft <= 5;

  // Estado Skeleton si está cargando
  if (isLoading) {
    return (
      <View
        onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
        style={[styles.floatingWrapper, { paddingBottom: Math.max(bottomInset, 16) }]}
      >
        <GlassSurface theme={theme} borderRadius={theme.radiusCard} style={styles.cardContainer}>
          <View style={styles.handleIndicator} />
          <View style={[styles.skeletonBlock, { width: 140, height: 22, backgroundColor: theme.innerSurfaceBg }]} />
          <View style={[styles.skeletonBlock, { width: 190, height: 42, marginTop: 14, backgroundColor: theme.innerSurfaceBg }]} />
          <View style={[styles.skeletonBlock, { height: 75, marginTop: 16, backgroundColor: theme.innerSurfaceBg }]} />
          <View style={[styles.skeletonBlock, { height: 56, marginTop: 16, backgroundColor: theme.innerSurfaceBg }]} />
        </GlassSurface>
      </View>
    );
  }

  return (
    <Animated.View
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
      entering={reduceMotion ? FadeIn : FadeInDown.springify().damping(16).mass(0.9)}
      exiting={reduceMotion ? undefined : FadeOutDown.duration(200)}
      style={[styles.floatingWrapper, { paddingBottom: Math.max(bottomInset, 16) }]}
    >
      <GlassSurface
        theme={theme}
        borderRadius={theme.radiusCard}
        style={styles.cardContainer}
        contentStyle={styles.cardContent}
      >
        {/* 1. Drag Handle minimalista */}
        <View style={styles.handleIndicator} />

        {/* 2. Encabezado Integrado: Categoría y Anillo de Cuenta Regresiva */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(30)}
          style={styles.headerRow}
        >
          <View style={styles.badgeGroup}>
            <View style={styles.brandRow}>
              <Ionicons name="car-sport" size={13} color={theme.accent} />
              <Text style={[styles.brandText, { color: theme.accent }]}>TRANSFERBLACK</Text>
            </View>
            <Text style={[styles.dotSeparator, { color: theme.textSubtle }]}>•</Text>
            <Text style={[styles.categoryText, { color: theme.textMuted }]}>
              {offer?.passenger?.category || 'VIP BLACK'}
            </Text>
          </View>

          <View style={styles.timerGroup}>
            {queueCount > 0 && (
              <Text style={[styles.queueText, { color: theme.textMuted }]}>
                +{queueCount} en cola
              </Text>
            )}
            <CountdownRing
              theme={theme}
              progress={progress}
              secondsLeft={secondsLeft}
              size={36}
              strokeWidth={3}
              isUrgent={isUrgent}
            />
          </View>
        </Animated.View>

        {/* 3. Ganancia / Precio (PROTAGONISTA CONTINUO) */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(60)}
          style={styles.fareRow}
        >
          <View style={styles.fareMain}>
            <Text style={[styles.fareCaption, { color: theme.textSubtle }]}>
              {isCashOffer ? 'COBRO EN EFECTIVO' : 'TARIFA ESTIMADA'}
            </Text>
            <Text
              style={[
                styles.fareAmount,
                {
                  color: isCashOffer ? theme.cashAccent : theme.textPrimary,
                  fontVariant: ['tabular-nums'],
                },
              ]}
            >
              ${totalFareAmount.toLocaleString('es-AR')}
            </Text>
          </View>

          {/* Badge sutil de método de pago */}
          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor: isCashOffer ? theme.cashSoft : theme.innerSurfaceBg,
                borderColor: isCashOffer ? theme.cashBorder : theme.innerSurfaceBorder,
              },
            ]}
          >
            <Ionicons
              name={paymentInfo.icon as any}
              size={13}
              color={isCashOffer ? theme.cashAccent : theme.accent}
            />
            <Text
              style={[
                styles.paymentText,
                { color: isCashOffer ? theme.cashAccent : theme.textSecondary },
              ]}
            >
              {paymentInfo.label}
            </Text>
          </View>
        </Animated.View>

        {/* Divisor sutil */}
        <View style={[styles.hairline, { backgroundColor: theme.innerSurfaceBorder }]} />

        {/* 4. Métricas unificadas continuas */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(90)}>
          <MetricsRow
            theme={theme}
            etaToPickupMinutes={offer?.pickup?.etaMinutes || 2}
            distanceToPickupKm={(offer?.pickup as any)?.distanceKm}
            tripDistanceKm={tripDistanceKm}
            tripDurationMinutes={durationMin}
          />
        </Animated.View>

        {/* Divisor sutil */}
        <View style={[styles.hairline, { backgroundColor: theme.innerSurfaceBorder }]} />

        {/* 5. Ruta limpia continua */}
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(120)}>
          <RouteTimeline
            theme={theme}
            pickupAddress={offer?.pickup?.address || 'Origen solicitado'}
            dropoffAddress={offer?.dropoff?.address || 'Destino no especificado'}
            pickupEtaMinutes={offer?.pickup?.etaMinutes || 2}
          />
        </Animated.View>

        {/* Divisor sutil */}
        <View style={[styles.hairline, { backgroundColor: theme.innerSurfaceBorder }]} />

        {/* 6. Pasajero fluido integrado (Sin caja contenedora pesada) */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(150)}
          style={styles.passengerRow}
        >
          <View style={styles.passengerLeft}>
            {/* Monograma avatar compacto */}
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: theme.accentSoft,
                  borderColor: theme.accentBorder,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.accent }]}>
                {avatarLetter}
              </Text>
            </View>

            <View style={styles.passengerInfo}>
              <Text
                numberOfLines={1}
                style={[styles.passengerName, { color: theme.textPrimary }]}
              >
                {passengerName}
              </Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text
                  style={[
                    styles.ratingText,
                    { color: theme.textSecondary, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {Number(ratingAvg).toFixed(1)}
                </Text>
                {ratingCount > 0 && (
                  <Text style={[styles.ratingCountText, { color: theme.textSubtle }]}>
                    ({ratingCount} viajes)
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.verifiedTag}>
            <Ionicons name="shield-checkmark" size={12} color={theme.accent} />
            <Text style={[styles.verifiedText, { color: theme.textMuted }]}>Verificado</Text>
          </View>
        </Animated.View>

        {/* 7. Barra de acciones ergonómica */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.delay(180)}
          style={styles.actionsRow}
        >
          {/* Botón Aceptar (ancho, protagonista) */}
          <Animated.View style={[styles.acceptWrapper as ViewStyle, acceptAnimStyle]}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onAccept();
              }}
              onPressIn={() => {
                acceptScale.value = withTiming(0.97, { duration: 100 });
              }}
              onPressOut={() => {
                acceptScale.value = withTiming(1, { duration: 120 });
              }}
              disabled={isAccepting}
              accessibilityRole="button"
              accessibilityLabel={`Aceptar viaje por $${totalFareAmount.toLocaleString('es-AR')}`}
              accessibilityState={{ disabled: isAccepting }}
              style={[
                styles.acceptButton as ViewStyle,
                {
                  backgroundColor: theme.accent,
                  borderRadius: theme.radiusInner,
                },
              ]}
            >
              {isAccepting ? (
                <ActivityIndicator color={theme.accentForeground} size="small" />
              ) : (
                <View style={styles.acceptButtonContent}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.accentForeground}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={[
                      styles.acceptButtonText as TextStyle,
                      { color: theme.accentForeground },
                    ]}
                  >
                    ACEPTAR VIAJE
                  </Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* Botón Rechazar (vidrio sutil con target táctil 56x56) */}
          <Animated.View style={[styles.rejectWrapper as ViewStyle, rejectAnimStyle]}>
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onReject();
              }}
              onPressIn={() => {
                rejectScale.value = withTiming(0.96, { duration: 100 });
              }}
              onPressOut={() => {
                rejectScale.value = withTiming(1, { duration: 120 });
              }}
              disabled={isAccepting}
              accessibilityRole="button"
              accessibilityLabel="Rechazar y descartar oferta de viaje"
              accessibilityState={{ disabled: isAccepting }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.rejectButton as ViewStyle,
                {
                  backgroundColor: theme.innerSurfaceBg,
                  borderColor: theme.innerSurfaceBorder,
                  borderRadius: theme.radiusInner,
                },
              ]}
            >
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </GlassSurface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 50,
    paddingHorizontal: 12,
  },
  cardContainer: {
    width: '100%',
  },
  cardContent: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 16,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
    marginLeft: 5,
  },
  dotSeparator: {
    fontSize: 10,
    marginHorizontal: 6,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueText: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  fareMain: {
    flex: 1,
  },
  fareCaption: {
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fareAmount: {
    fontSize: 36,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentText: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    opacity: 0.6,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  passengerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: 'Montserrat_700Bold',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
  },
  ratingCountText: {
    fontSize: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  acceptWrapper: {
    flex: 1,
  },
  acceptButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  acceptButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
  },
  rejectWrapper: {
    width: 56,
  },
  rejectButton: {
    width: 56,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonBlock: {
    borderRadius: 12,
  },
});
