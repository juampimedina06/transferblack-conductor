import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import {
  calculateTripDistanceKm,
  getPaymentMethodInfo,
  Trip,
} from '../../../core/trip/interface/trip.interface';
import {
  completeTrip,
  driverArrived,
  startTrip,
} from '../../../core/trip/actions/trip.actions';
import { socket } from '../../../core/socket/socket';
import { useDriverLocation } from '../../maps/hooks/useDriverLocation';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { getTripOfferTheme, TripOfferTheme } from './theme/tripOfferTheme';
import { GlassSurface } from './ui/GlassSurface';
import { SlideToComplete } from './ui/SlideToComplete';
import { PassengerRow } from './ui/PassengerRow';
import { RouteTimeline } from './ui/RouteTimeline';
import { PaymentSummary } from './ui/PaymentSummary';
import { CancelTripModal } from './CancelTripModal';
import { AddTripExtraModal } from './AddTripExtraModal';
import {
  TripUiPhase,
  TripStateMachineState,
  TripStateMachineAction,
  tripUiReducer,
} from './state/tripUiState';

export {
  TripUiPhase,
  TripStateMachineState,
  TripStateMachineAction,
  tripUiReducer,
};

export interface TripInProgressSheetProps {
  trip: Trip;
  onHeightChange?: (height: number) => void;
}

/**
 * Cockpit Ejecutivo de Viaje en Curso (Uber Black Driver Level):
 * - Superficie Liquid Glass flotante continua, limpia y sin rebotes.
 * - Sin líneas de tiempo ni ruido visual innecesario: solo información de conducción crítica.
 * - 2 snap points con animación sedosa (cubic-bezier): colapsado (24% altura) y expandido.
 */
export const TripInProgressSheet: React.FC<TripInProgressSheetProps> = ({
  trip,
  onHeightChange,
}) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light';
  const theme: TripOfferTheme = useMemo(() => getTripOfferTheme(isDark), [isDark]);
  const reducedMotion = useReducedMotion();

  const windowHeight = Dimensions.get('window').height;
  const COLLAPSED_HEIGHT = Math.min(235, Math.round(windowHeight * 0.26));
  const EXPANDED_HEIGHT = Math.min(Math.round(windowHeight * 0.85), 720);

  const sheetHeight = useSharedValue(COLLAPSED_HEIGHT);
  const startDragHeight = useSharedValue(COLLAPSED_HEIGHT);
  const [snapIndex, setSnapIndex] = useState<0 | 1>(0);

  const pinInputRefs = useRef<TextInput[]>([]);
  const { location } = useDriverLocation(true);
  const updateTripStatus = useDriverTripStore((state) => state.updateTripStatus);
  const setActiveTrip = useDriverTripStore((state) => state.setActiveTrip);

  // Cortesía de espera (5 min)
  const { formattedTime, isFinished: isCourtesyExpired } = useCourtesyTimer(5);

  // Derivación inicial de fase
  const initialPhase: TripUiPhase = useMemo(() => {
    if (trip.status === 'driver_arrived') return 'waiting_passenger';
    if (trip.status === 'in_progress') {
      const remainingMin = trip.dropoff?.durationMinutes || 0;
      return remainingMin > 0 && remainingMin <= 2 ? 'approaching_dropoff' : 'in_trip';
    }
    if (trip.status === 'completed') return 'completed';
    if (trip.status === 'cancelled') return 'cancelled';
    return 'navigating_to_pickup';
  }, [trip.status, trip.dropoff?.durationMinutes]);

  const [state, dispatch] = useReducer(tripUiReducer, {
    phase: initialPhase,
    isActionLoading: false,
    actionType: 'none',
    inlineError: null,
    pinDigits: ['', '', '', ''],
    isPinError: false,
    isOffline: !socket.connected,
  });

  // Notificar altura inicial al mapa
  useEffect(() => {
    onHeightChange?.(COLLAPSED_HEIGHT);
  }, [COLLAPSED_HEIGHT, onHeightChange]);

  // Sincronizar cambios externos de trip.status
  useEffect(() => {
    let nextPhase: TripUiPhase = 'navigating_to_pickup';
    if (trip.status === 'driver_arrived') {
      nextPhase = 'waiting_passenger';
    } else if (trip.status === 'in_progress') {
      const remainingMin = trip.dropoff?.durationMinutes || 0;
      nextPhase = remainingMin > 0 && remainingMin <= 2 ? 'approaching_dropoff' : 'in_trip';
    } else if (trip.status === 'completed') {
      nextPhase = 'completed';
    } else if (trip.status === 'cancelled') {
      nextPhase = 'cancelled';
    }
    dispatch({ type: 'SET_PHASE', phase: nextPhase });
  }, [trip.status, trip.dropoff?.durationMinutes]);

  // Modales
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const [isAddExtraModalVisible, setIsAddExtraModalVisible] = useState(false);

  // Extras y peajes
  const tollsAmount = useDriverTripStore((s) => s.getTripExtrasTotal());

  // Socket listener
  useEffect(() => {
    const onConnect = () => dispatch({ type: 'SET_OFFLINE', isOffline: false });
    const onDisconnect = () => dispatch({ type: 'SET_OFFLINE', isOffline: true });
    const onConnectError = () => dispatch({ type: 'SET_OFFLINE', isOffline: true });

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  // Datos de viaje
  const baseFare = Number(trip.final_fare || trip.estimated_fare || 0);
  const totalFare = baseFare + tollsAmount;
  const paymentInfo = getPaymentMethodInfo(trip.payment_method);
  const durationMin = trip.dropoff?.durationMinutes || 12;

  const tripDistanceKm = calculateTripDistanceKm(
    trip.pickup?.latitude,
    trip.pickup?.longitude,
    trip.dropoff?.latitude,
    trip.dropoff?.longitude,
    durationMin
  );

  const rawThirdPartyName =
    trip.thirdPartyName || trip.third_party?.name || trip.chat?.third_party?.name || null;
  const rawThirdPartyPhone =
    trip.thirdPartyPhone || trip.third_party?.phone_e164 || trip.chat?.third_party?.phone_e164 || null;
  const isThirdParty = Boolean(trip.chat?.is_third_party_trip || rawThirdPartyName);

  const rawPassengerName = trip.passenger?.fullName || 'Pasajero';
  const passengerDisplayName = isThirdParty && rawThirdPartyName
    ? `${rawThirdPartyName} (Invitado)`
    : rawPassengerName;
  const avatarLetter = (rawThirdPartyName || rawPassengerName || 'P').charAt(0).toUpperCase();
  const passengerPhone = isThirdParty && rawThirdPartyPhone
    ? rawThirdPartyPhone
    : trip.passenger?.phone || '';
  const preferences = trip.passenger?.preferences || [];

  const currentPin = state.pinDigits.join('');
  const isPinComplete = currentPin.length === 4;
  const canStartTrip = !trip.require_pin || isPinComplete;

  // Encabezado sobrio según fase
  const statusMeta = useMemo(() => {
    switch (state.phase) {
      case 'navigating_to_pickup':
        return {
          badge: 'EN CAMINO AL RETIRO',
          dotColor: theme.accent,
          address: trip.pickup?.address || 'Punto de encuentro',
          etaText: `~${trip.pickup?.etaMinutes || 2} min · ${tripDistanceKm}`,
        };
      case 'waiting_passenger':
        return {
          badge: isCourtesyExpired ? 'TIEMPO TARIFADO' : 'EN PUNTO DE RETIRO',
          dotColor: isCourtesyExpired ? theme.urgentAccent : theme.cashAccent,
          address: trip.pickup?.address || 'Punto de encuentro',
          etaText: `Espera: ${formattedTime}`,
        };
      case 'approaching_dropoff':
        return {
          badge: 'LLEGANDO AL DESTINO',
          dotColor: theme.accent,
          address: trip.dropoff?.address || 'Destino final',
          etaText: `~1 min · ${tripDistanceKm}`,
        };
      case 'in_trip':
        return {
          badge: 'VIAJE EN CURSO',
          dotColor: theme.cashAccent,
          address: trip.dropoff?.address || 'Destino final',
          etaText: `~${durationMin} min · ${tripDistanceKm}`,
        };
      case 'completed':
        return {
          badge: 'VIAJE FINALIZADO',
          dotColor: theme.cashAccent,
          address: 'Destino alcanzado',
          etaText: 'Completado',
        };
      case 'cancelled':
        return {
          badge: 'SERVICIO CANCELADO',
          dotColor: theme.urgentAccent,
          address: 'Viaje cancelado',
          etaText: 'Cancelado',
        };
    }
  }, [
    state.phase,
    trip.pickup?.address,
    trip.pickup?.etaMinutes,
    trip.dropoff?.address,
    durationMin,
    tripDistanceKm,
    formattedTime,
    isCourtesyExpired,
    theme,
  ]);

  // ==========================================
  // ANIMACIÓN SEDOSA SIN REBOTES
  // ==========================================
  const applySnap = useCallback(
    (index: 0 | 1) => {
      setSnapIndex(index);
      const targetHeight = index === 0 ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT;
      if (reducedMotion) {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated SharedValue; mutar .value es su API intencional (facebook/react#29640)
        sheetHeight.value = targetHeight;
      } else {
        sheetHeight.value = withTiming(targetHeight, {
          duration: 250,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
      onHeightChange?.(targetHeight);
    },
    [COLLAPSED_HEIGHT, EXPANDED_HEIGHT, onHeightChange, reducedMotion, sheetHeight]
  );

  const toggleExpand = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    applySnap(snapIndex === 0 ? 1 : 0);
  }, [applySnap, snapIndex]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startDragHeight.value = sheetHeight.value;
    })
    .onUpdate((event) => {
      const nextH = startDragHeight.value - event.translationY;
      if (nextH < COLLAPSED_HEIGHT * 0.9) {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated SharedValue; mutar .value es su API intencional (facebook/react#29640)
        sheetHeight.value = COLLAPSED_HEIGHT * 0.9;
      } else if (nextH > EXPANDED_HEIGHT + 10) {
        sheetHeight.value = EXPANDED_HEIGHT + 10;
      } else {
        sheetHeight.value = nextH;
      }
    })
    .onEnd((event) => {
      if (event.velocityY < -350 || sheetHeight.value > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2) {
        runOnJS(applySnap)(1);
      } else {
        runOnJS(applySnap)(0);
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  // ==========================================
  // HANDLERS DE ACCIONES DEL VIAJE
  // ==========================================
  const handleArrive = async () => {
    if (!location) {
      dispatch({
        type: 'ACTION_FAILURE',
        error: 'No se pudo obtener la ubicación GPS actual. Reintentá.',
      });
      return;
    }

    try {
      dispatch({ type: 'START_ACTION', actionType: 'arriving' });
      await driverArrived(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dispatch({ type: 'ACTION_SUCCESS' });
      updateTripStatus('driver_arrived');
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      dispatch({
        type: 'ACTION_FAILURE',
        error: err.message || 'No se pudo notificar la llegada al punto de encuentro.',
      });
    }
  };

  const handleStartTrip = async () => {
    if (!location) {
      dispatch({
        type: 'ACTION_FAILURE',
        error: 'No se pudo obtener la ubicación GPS actual. Reintentá.',
      });
      return;
    }

    if (trip.require_pin && !isPinComplete) {
      dispatch({ type: 'SET_PIN_ERROR', isError: true });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      dispatch({
        type: 'ACTION_FAILURE',
        error: 'Ingresá el PIN de 4 dígitos proporcionado por el pasajero.',
      });
      return;
    }

    try {
      dispatch({ type: 'START_ACTION', actionType: 'starting' });
      await startTrip(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        ...(currentPin ? { boarding_pin: currentPin } : {}),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dispatch({ type: 'ACTION_SUCCESS' });
      updateTripStatus('in_progress');
    } catch (err: any) {
      dispatch({ type: 'SET_PIN_ERROR', isError: true });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      dispatch({
        type: 'ACTION_FAILURE',
        error: err.message || 'PIN inválido o error al iniciar el viaje.',
      });
    }
  };

  const handleFinishTrip = async () => {
    if (!location) return;

    try {
      dispatch({ type: 'START_ACTION', actionType: 'finishing' });
      const currentTollsAmount = useDriverTripStore.getState().getTripExtrasTotal();
      const currentExtras = useDriverTripStore.getState().tripExtras;
      const extraNotes = currentExtras
        .map((e) => `${e.label}: $${e.amount}`)
        .join('; ');

      const completedTrip = await completeTrip(trip.id, {
        latitude: location.latitude,
        longitude: location.longitude,
        ...(currentTollsAmount > 0
          ? {
              tolls_amount: currentTollsAmount,
              extra_charges: currentTollsAmount,
              extra_notes: extraNotes || undefined,
            }
          : {}),
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dispatch({ type: 'ACTION_SUCCESS' });
      updateTripStatus('completed');
      setActiveTrip(completedTrip?.data || completedTrip);
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      dispatch({
        type: 'ACTION_FAILURE',
        error: err.message || 'Error al procesar la finalización del viaje.',
      });
    }
  };

  const handleCallPassenger = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passengerPhone) {
      void Linking.openURL(`tel:${passengerPhone}`);
    } else {
      dispatch({
        type: 'ACTION_FAILURE',
        error: 'El teléfono no está disponible para este pasajero.',
      });
    }
  };

  const handleOpenChat = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(home)/chat');
  };

  const handleOpenExternalGps = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const target =
      state.phase === 'in_trip' || state.phase === 'approaching_dropoff'
        ? trip.dropoff
        : trip.pickup;

    if (target?.latitude && target?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
      void Linking.openURL(url);
    } else if (target?.address) {
      const encoded = encodeURIComponent(target.address);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
      void Linking.openURL(url);
    }
  };

  const handleShareTrip = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const shareUrl = `https://transferblack.com/tracking/${trip.public_code || trip.id}`;
      await Share.share({
        message: `Seguí mi viaje en TransferBlack en tiempo real: ${shareUrl}`,
      });
    } catch {
      // Ignorar cancelación del diálogo
    }
  };

  const handlePinDigitChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, '');
    const char = clean ? clean[clean.length - 1] : '';
    dispatch({ type: 'SET_PIN_DIGIT', index, value: char });

    if (char && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (char && index === 3) {
      Keyboard.dismiss();
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !state.pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
      dispatch({ type: 'SET_PIN_DIGIT', index: index - 1, value: '' });
    }
  };

  return (
    <>
      <Animated.View
        style={[
          styles.sheetContainer,
          animatedSheetStyle,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <GlassSurface
          theme={theme}
          borderRadius={28}
          borderWidth={1}
          hasSpecularHighlight={true}
          style={styles.glassContainer}
          contentStyle={styles.glassContent}
        >
          {/* Manija táctil superior */}
          <GestureDetector gesture={panGesture}>
            <Pressable onPress={toggleExpand} style={styles.handleArea}>
              <View
                style={[
                  styles.handleIndicator,
                  {
                    backgroundColor: theme.isDark
                      ? 'rgba(255, 255, 255, 0.28)'
                      : 'rgba(0, 0, 0, 0.25)',
                  },
                ]}
              />
            </Pressable>
          </GestureDetector>

          {/* Banner de Reconexión / Sin Conexión */}
          {state.isOffline && (
            <Animated.View
              entering={FadeInDown.duration(180)}
              exiting={FadeOut.duration(120)}
              style={[
                styles.offlineBanner,
                { backgroundColor: theme.urgentSoft, borderColor: theme.urgentAccent },
              ]}
            >
              <Ionicons name="cloud-offline-outline" size={13} color={theme.urgentAccent} />
              <Text style={[styles.offlineText, { color: theme.urgentAccent }]}>
                Sin conexión · Reconectando en segundo plano...
              </Text>
            </Animated.View>
          )}

          {/* Banner de Error Accionable */}
          {state.inlineError && (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={[
                styles.errorBanner,
                { backgroundColor: theme.urgentSoft, borderColor: 'rgba(239, 68, 68, 0.4)' },
              ]}
            >
              <View style={styles.errorTextCol}>
                <Ionicons name="alert-circle" size={14} color={theme.urgentAccent} />
                <Text style={[styles.errorText, { color: theme.textPrimary }]}>
                  {state.inlineError}
                </Text>
              </View>
              <Pressable
                onPress={() => dispatch({ type: 'CLEAR_ERROR' })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.errorDismissBtn}
              >
                <Text style={[styles.errorDismissText, { color: theme.accent }]}>
                  OK
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* ========================================================
              VISTA COLAPSADA (LIMPIA, MODERNA, SIN RUIDO VISUAL)
              ======================================================== */}
          {snapIndex === 0 ? (
            <View style={styles.collapsedCard}>
              {/* Fila 1: Micro-Header (Estado sobrio + ETA nítido) */}
              <View style={styles.topStatusRow}>
                <View style={styles.badgeWrapper}>
                  <View style={[styles.dotPill, { backgroundColor: statusMeta.dotColor }]} />
                  <Text
                    style={[
                      styles.badgeText,
                      { color: theme.isDark ? '#F1F5F9' : '#0F172A' },
                    ]}
                  >
                    {statusMeta.badge}
                  </Text>
                </View>

                <View
                  style={[
                    styles.etaPill,
                    {
                      backgroundColor: theme.innerSurfaceBg,
                      borderColor: theme.innerSurfaceBorder,
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={12} color={theme.accent} style={{ marginRight: 4 }} />
                  <Text
                    style={[
                      styles.etaPillText,
                      { color: theme.accent },
                    ]}
                  >
                    {statusMeta.etaText}
                  </Text>
                </View>
              </View>

              {/* Fila 2: Dirección y Datos del Pasajero */}
              <View style={styles.centerInfoBlock}>
                <Text
                  numberOfLines={1}
                  style={[styles.mainAddressText, { color: theme.textPrimary }]}
                >
                  {statusMeta.address}
                </Text>
                <View style={styles.subInfoRow}>
                  <Text
                    numberOfLines={1}
                    style={[styles.passengerMetaText, { color: theme.textMuted }]}
                  >
                    {passengerDisplayName} · ★ {trip.passenger?.rating || '5.0'}
                  </Text>
                  <View
                    style={[
                      styles.paymentPill,
                      {
                        backgroundColor: paymentInfo.isCash ? theme.cashSoft : theme.accentSoft,
                        borderColor: paymentInfo.isCash ? theme.cashBorder : theme.accentBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentPillText,
                        { color: paymentInfo.isCash ? theme.cashAccent : theme.accent },
                      ]}
                    >
                      {paymentInfo.isCash ? `EFECTIVO $${totalFare.toLocaleString('es-AR')}` : 'DIGITAL'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Fila 3: Acciones Primarias */}
              <View style={styles.actionRow}>
                {/* Botón Navegar Waze/Maps */}
                <Pressable
                  onPress={handleOpenExternalGps}
                  accessibilityRole="button"
                  accessibilityLabel="Abrir navegación externa con Google Maps o Waze"
                  style={({ pressed }) => [
                    styles.squareActionBtn,
                    {
                      backgroundColor: theme.innerSurfaceBg,
                      borderColor: theme.innerSurfaceBorder,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Ionicons name="navigate" size={19} color={theme.accent} />
                </Pressable>

                {/* Botón Principal */}
                {state.phase === 'navigating_to_pickup' && (
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      void handleArrive();
                    }}
                    disabled={state.isActionLoading}
                    style={({ pressed }) => [
                      styles.heroBtn,
                      {
                        backgroundColor: theme.accent,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {state.isActionLoading ? (
                      <ActivityIndicator size="small" color="#0A0A0C" />
                    ) : (
                      <Text style={styles.heroBtnText}>
                        YA LLEGUÉ AL RETIRO
                      </Text>
                    )}
                  </Pressable>
                )}

                {state.phase === 'waiting_passenger' && (
                  <Pressable
                    onPress={() => {
                      if (!canStartTrip) {
                        toggleExpand();
                        return;
                      }
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      void handleStartTrip();
                    }}
                    disabled={state.isActionLoading}
                    style={({ pressed }) => [
                      styles.heroBtn,
                      {
                        backgroundColor: canStartTrip ? theme.accent : theme.innerSurfaceBg,
                        borderColor: canStartTrip ? theme.accent : theme.innerSurfaceBorder,
                        borderWidth: canStartTrip ? 0 : 1,
                        opacity: pressed ? 0.88 : 1,
                      },
                    ]}
                  >
                    {state.isActionLoading ? (
                      <ActivityIndicator size="small" color={theme.accentForeground} />
                    ) : (
                      <Text
                        style={[
                          styles.heroBtnText,
                          {
                            color: canStartTrip ? '#0A0A0C' : theme.textMuted,
                          },
                        ]}
                      >
                        {trip.require_pin && !isPinComplete
                          ? 'INGRESAR PIN PARA INICIAR'
                          : 'INICIAR VIAJE'}
                      </Text>
                    )}
                  </Pressable>
                )}

                {(state.phase === 'in_trip' || state.phase === 'approaching_dropoff') && (
                  <View style={styles.sliderWrapper}>
                    <SlideToComplete
                      theme={theme}
                      onComplete={handleFinishTrip}
                      isLoading={state.isActionLoading}
                      label={state.phase === 'approaching_dropoff' ? 'FINALIZAR (EN DESTINO)' : 'DESLIZAR AL FINALIZAR'}
                      loadingLabel="FINALIZANDO VIAJE..."
                    />
                  </View>
                )}

                {state.phase === 'completed' && (
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTrip(null);
                    }}
                    style={styles.heroSuccessBtn}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#0A0A0C" style={{ marginRight: 6 }} />
                    <Text style={styles.heroSuccessBtnText}>
                      LISTO · VIAJE COMPLETADO
                    </Text>
                  </Pressable>
                )}

                {state.phase === 'cancelled' && (
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTrip(null);
                    }}
                    style={[
                      styles.heroBtn,
                      {
                        backgroundColor: theme.innerSurfaceBg,
                        borderColor: theme.innerSurfaceBorder,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text style={[styles.heroBtnText, { color: theme.textPrimary }]}>
                      VOLVER AL RADAR
                    </Text>
                  </Pressable>
                )}

                {/* Botón Detalle */}
                <Pressable
                  onPress={toggleExpand}
                  accessibilityRole="button"
                  accessibilityLabel="Expandir detalles del viaje"
                  style={({ pressed }) => [
                    styles.squareActionBtn,
                    {
                      backgroundColor: theme.innerSurfaceBg,
                      borderColor: theme.innerSurfaceBorder,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Ionicons name="chevron-up" size={19} color={theme.textPrimary} />
                </Pressable>
              </View>
            </View>
          ) : (
            /* ========================================================
               VISTA EXPANDIDA (COCKPIT COMPLETO Y ACCIONES)
               ======================================================== */
            <ScrollView
              contentContainerStyle={styles.expandedScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Encabezado Expandido */}
              <View style={styles.expandedHeaderRow}>
                <View>
                  <Text style={[styles.expandedBadgeText, { color: theme.accent }]}>
                    {statusMeta.badge}
                  </Text>
                  <Text style={[styles.expandedAddressText, { color: theme.textPrimary }]}>
                    {statusMeta.address}
                  </Text>
                </View>
                <View
                  style={[
                    styles.etaPill,
                    {
                      backgroundColor: theme.innerSurfaceBg,
                      borderColor: theme.innerSurfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.etaPillText, { color: theme.accent }]}>
                    {statusMeta.etaText}
                  </Text>
                </View>
              </View>

              {/* 1. Pasajero */}
              <PassengerRow
                theme={theme}
                name={passengerDisplayName}
                avatarLetter={avatarLetter}
                rating={trip.passenger?.rating || '5.0'}
                isVip={true}
                isThirdParty={isThirdParty}
                preferences={preferences}
                onCall={handleCallPassenger}
                onChat={handleOpenChat}
              />

              {/* Cronómetro de Cortesía en Espera */}
              {state.phase === 'waiting_passenger' && (
                <View
                  style={[
                    styles.waitingCard,
                    {
                      backgroundColor: isCourtesyExpired ? theme.urgentSoft : theme.accentSoft,
                      borderColor: isCourtesyExpired ? theme.urgentAccent : theme.accentBorder,
                    },
                  ]}
                >
                  <View style={styles.waitingCardLeft}>
                    <Ionicons
                      name="timer-outline"
                      size={20}
                      color={isCourtesyExpired ? theme.urgentAccent : theme.accent}
                    />
                    <View style={{ marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.waitingCardTitle,
                          { color: isCourtesyExpired ? theme.urgentAccent : theme.textPrimary },
                        ]}
                      >
                        {isCourtesyExpired ? 'Tiempo de cortesía superado' : 'Tiempo de espera en punto de retiro'}
                      </Text>
                      <Text style={[styles.waitingCardSub, { color: theme.textMuted }]}>
                        {isCourtesyExpired
                          ? 'Se aplica tarifa por minuto de espera adicional.'
                          : '5 minutos de cortesía incluidos para el pasajero.'}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.waitingTimerText,
                      { color: isCourtesyExpired ? theme.urgentAccent : theme.accent },
                    ]}
                  >
                    {formattedTime}
                  </Text>
                </View>
              )}

              {/* Entrada de PIN de Abordaje */}
              {state.phase === 'waiting_passenger' && trip.require_pin && (
                <View
                  style={[
                    styles.pinContainer,
                    {
                      backgroundColor: theme.innerSurfaceBg,
                      borderColor: state.isPinError ? theme.urgentAccent : theme.innerSurfaceBorder,
                    },
                  ]}
                >
                  <Text style={[styles.pinLabel, { color: theme.textSecondary }]}>
                    PIN DE ABORDAJE (PEDIR AL PASAJERO)
                  </Text>
                  <View style={styles.pinInputsRow}>
                    {state.pinDigits.map((digit, idx) => (
                      <TextInput
                        key={idx}
                        ref={(ref) => {
                          if (ref) pinInputRefs.current[idx] = ref;
                        }}
                        value={digit}
                        onChangeText={(val) => handlePinDigitChange(val, idx)}
                        onKeyPress={(e) => handlePinKeyPress(e, idx)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        style={[
                          styles.pinInput,
                          {
                            backgroundColor: theme.innerSurfaceBg,
                            borderColor: digit
                              ? theme.accent
                              : state.isPinError
                                ? theme.urgentAccent
                                : theme.innerSurfaceBorder,
                            color: theme.textPrimary,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Botón Principal en Expandido */}
              <View style={styles.expandedCtaWrapper}>
                {state.phase === 'navigating_to_pickup' && (
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      void handleArrive();
                    }}
                    disabled={state.isActionLoading}
                    style={[styles.heroBtn, { backgroundColor: theme.accent }]}
                  >
                    {state.isActionLoading ? (
                      <ActivityIndicator size="small" color="#0A0A0C" />
                    ) : (
                      <Text style={styles.heroBtnText}>
                        NOTIFICAR LLEGADA AL RETIRO
                      </Text>
                    )}
                  </Pressable>
                )}

                {state.phase === 'waiting_passenger' && (
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      void handleStartTrip();
                    }}
                    disabled={state.isActionLoading || !canStartTrip}
                    style={[
                      styles.heroBtn,
                      {
                        backgroundColor: canStartTrip ? theme.accent : theme.innerSurfaceBg,
                        borderColor: canStartTrip ? theme.accent : theme.innerSurfaceBorder,
                        borderWidth: canStartTrip ? 0 : 1,
                      },
                    ]}
                  >
                    {state.isActionLoading ? (
                      <ActivityIndicator size="small" color={theme.accentForeground} />
                    ) : (
                      <Text
                        style={[
                          styles.heroBtnText,
                          { color: canStartTrip ? '#0A0A0C' : theme.textMuted },
                        ]}
                      >
                        INICIAR VIAJE CON PASAJERO
                      </Text>
                    )}
                  </Pressable>
                )}

                {(state.phase === 'in_trip' || state.phase === 'approaching_dropoff') && (
                  <SlideToComplete
                    theme={theme}
                    onComplete={handleFinishTrip}
                    isLoading={state.isActionLoading}
                    label={state.phase === 'approaching_dropoff' ? 'FINALIZAR (EN DESTINO)' : 'DESLIZAR AL FINALIZAR'}
                    loadingLabel="FINALIZANDO VIAJE..."
                  />
                )}

                {state.phase === 'completed' && (
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setActiveTrip(null);
                    }}
                    style={styles.heroSuccessBtn}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#0A0A0C" style={{ marginRight: 6 }} />
                    <Text style={styles.heroSuccessBtnText}>
                      LISTO · CERRAR RESUMEN
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* 2. Hoja de Ruta */}
              <RouteTimeline
                theme={theme}
                pickupAddress={trip.pickup?.address || 'Punto de recogida'}
                dropoffAddress={trip.dropoff?.address || 'Destino final'}
                pickupEtaMinutes={trip.pickup?.etaMinutes}
                dropoffEtaMinutes={trip.dropoff?.durationMinutes}
              />

              {/* 3. Resumen de Pago */}
              <PaymentSummary
                theme={theme}
                totalFare={totalFare}
                tollsAmount={tollsAmount}
                isCash={paymentInfo.isCash}
                paymentLabel={paymentInfo.label}
                paymentIcon={paymentInfo.icon}
                currency={trip.currency || 'ARS'}
              />

              {/* 4. Acciones Secundarias */}
              <View style={styles.secondaryActionsRow}>
                <Pressable
                  onPress={handleShareTrip}
                  accessibilityRole="button"
                  accessibilityLabel="Compartir viaje en tiempo real"
                  style={[
                    styles.secondaryBtn,
                    {
                      backgroundColor: theme.innerSurfaceBg,
                      borderColor: theme.innerSurfaceBorder,
                    },
                  ]}
                >
                  <Ionicons name="share-social-outline" size={15} color={theme.textPrimary} />
                  <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>
                    Compartir
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleOpenExternalGps}
                  accessibilityRole="button"
                  accessibilityLabel="Navegar con app de mapas externa"
                  style={[
                    styles.secondaryBtn,
                    {
                      backgroundColor: theme.innerSurfaceBg,
                      borderColor: theme.innerSurfaceBorder,
                    },
                  ]}
                >
                  <Ionicons name="navigate-outline" size={15} color={theme.accent} />
                  <Text style={[styles.secondaryBtnText, { color: theme.accent }]}>
                    GPS Externo
                  </Text>
                </Pressable>

                {(state.phase === 'in_trip' || state.phase === 'approaching_dropoff') && (
                  <Pressable
                    onPress={() => setIsAddExtraModalVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Agregar peaje o gasto adicional"
                    style={[
                      styles.secondaryBtn,
                      {
                        backgroundColor: theme.innerSurfaceBg,
                        borderColor: tollsAmount > 0 ? theme.accent : theme.innerSurfaceBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={15}
                      color={tollsAmount > 0 ? theme.accent : theme.textPrimary}
                    />
                    <Text
                      style={[
                        styles.secondaryBtnText,
                        { color: tollsAmount > 0 ? theme.accent : theme.textPrimary },
                      ]}
                    >
                      {tollsAmount > 0
                        ? `Extras ($${tollsAmount.toLocaleString('es-AR')})`
                        : '+ Peaje'}
                    </Text>
                  </Pressable>
                )}

                {(state.phase === 'navigating_to_pickup' || state.phase === 'waiting_passenger') && (
                  <Pressable
                    onPress={() => setIsCancelModalVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar servicio"
                    style={[
                      styles.secondaryBtn,
                      {
                        backgroundColor: theme.urgentSoft,
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                      },
                    ]}
                  >
                    <Ionicons name="close-circle-outline" size={15} color={theme.urgentAccent} />
                    <Text style={[styles.secondaryBtnText, { color: theme.urgentAccent }]}>
                      Cancelar
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          )}
        </GlassSurface>
      </Animated.View>

      {/* Modal de Cancelación */}
      <CancelTripModal
        visible={isCancelModalVisible}
        tripId={trip.id}
        location={location}
        onClose={() => setIsCancelModalVisible(false)}
      />

      {/* Modal de Peajes y Gastos Extras */}
      <AddTripExtraModal
        visible={isAddExtraModalVisible}
        onClose={() => setIsAddExtraModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 99,
    paddingHorizontal: 12,
  },
  glassContainer: {
    flex: 1,
    width: '100%',
  },
  glassContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  handleArea: {
    width: '100%',
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleIndicator: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  offlineText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorTextCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  errorText: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    marginLeft: 6,
    flexShrink: 1,
  },
  errorDismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  errorDismissText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
  },
  collapsedCard: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotPill: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  etaPillText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    fontVariant: ['tabular-nums'],
  },
  centerInfoBlock: {
    marginVertical: 4,
  },
  mainAddressText: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  passengerMetaText: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    flex: 1,
    marginRight: 8,
  },
  paymentPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentPillText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  squareActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  heroBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: '#0A0A0C',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroSuccessBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  heroSuccessBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
    color: '#0A0A0C',
    letterSpacing: 0.8,
  },
  sliderWrapper: {
    flex: 1,
  },
  expandedScrollContent: {
    paddingBottom: 24,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 6,
  },
  expandedBadgeText: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  expandedAddressText: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    maxWidth: 240,
  },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 8,
  },
  waitingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  waitingCardTitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  waitingCardSub: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 1,
  },
  waitingTimerText: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    fontVariant: ['tabular-nums'],
  },
  pinContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
  },
  pinLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  pinInputsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  pinInput: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
  },
  expandedCtaWrapper: {
    marginVertical: 8,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
  },
  secondaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
