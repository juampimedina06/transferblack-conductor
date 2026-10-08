import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, getPaymentMethodInfo } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useWalletStore } from '../../wallet/store/useWalletStore';
import { useSafetyStore } from '../../safety/store/useSafetyStore';
import { ratePassenger } from '../../../core/trip/actions/trip.actions';
import { router } from 'expo-router';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';
import { IncidentReportModal } from './IncidentReportModal';

interface TripReceiptModalProps {
  trip: Trip;
  visible: boolean;
}

export const TripReceiptModal = ({ trip, visible }: TripReceiptModalProps) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [blockPassenger, setBlockPassenger] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isIncidentModalVisible, setIsIncidentModalVisible] = useState(false);

  const rawThirdPartyName =
    trip?.thirdPartyName || trip?.third_party?.name || trip?.chat?.third_party?.name;
  const isThirdParty = Boolean(rawThirdPartyName || trip?.chat?.is_third_party_trip);
  const passengerName =
    isThirdParty && rawThirdPartyName
      ? `Viaja: ${rawThirdPartyName} (Tercero)`
      : trip?.passenger?.fullName || 'Pasajero';

  // Payment method info & Cash verification
  const paymentInfo = getPaymentMethodInfo(trip?.payment_method);
  const isCash = paymentInfo.isCash;

  // Tolls and extras declared by driver
  const tollsAmount = useDriverTripStore((s) => s.getTripExtrasTotal());
  const tripExtras = useDriverTripStore((s) => s.tripExtras);

  // Calculate fees safely & transparently
  const baseFare = Number(trip?.final_fare || trip?.estimated_fare || 0);
  const totalAmountToCollect = baseFare + tollsAmount;
  const commissionPercent = 0.20; // 20% platform fee applies ONLY to baseFare
  const commission = baseFare * commissionPercent;
  const netEarnings = Math.max(0, baseFare - commission) + tollsAmount;

  const finishAndClose = () => {
    useWalletStore.getState().fetchSummary().catch(() => {});
    useDriverTripStore.getState().clearTripExtras();
    useDriverTripStore.getState().setActiveTrip(null);
    router.replace('/' as any);
  };

  const handleRatingChange = (newRating: number) => {
    void Haptics.selectionAsync();
    setRating(newRating);
    if (newRating <= 2) {
      setBlockPassenger(true);
    }
  };

  const handleConfirm = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitError(null);
    if (!trip?.id) {
      finishAndClose();
      return;
    }

    try {
      setIsSubmitting(true);
      await ratePassenger(trip.id, {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        block_matching: blockPassenger,
      });

      // Persist blocked passenger in local store if selected
      const passengerId = trip?.passenger?.phone || trip?.id;
      if (blockPassenger && passengerId) {
        useSafetyStore.getState().blockPassenger({
          passengerId,
          passengerName,
          blockedAt: new Date().toISOString(),
          reason: comment.trim() || 'Calificación baja y bloqueo solicitado por el conductor',
          tripId: trip.id,
        });
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finishAndClose();
    } catch (err: any) {
      const msg = err.message || 'Error al calificar al pasajero';
      if (
        msg.includes('ya fue calificado') ||
        msg.includes('NO_PASSENGER') ||
        msg.includes('RATING_ALREADY_EXISTS')
      ) {
        finishAndClose();
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSubmitError(msg);
      Alert.alert(
        'No se pudo enviar la calificación',
        `${msg}. ¿Deseas reintentar o continuar al inicio?`,
        [
          { text: 'Omitir y continuar', style: 'cancel', onPress: finishAndClose },
          { text: 'Reintentar', onPress: handleConfirm },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView className="flex-1 bg-obsidian">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingVertical: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header - Success Icon with Glow */}
            <View className="items-center mb-5 mt-2">
              <LiquidGlassContainer
                variant="gold"
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
              >
                <Ionicons name="checkmark-circle" size={36} color={THEME_COLORS.gold} />
              </LiquidGlassContainer>
              <Text className="text-white font-montserrat-bold text-2xl tracking-tight">
                Viaje Completado
              </Text>
              <Text className="text-ash font-montserrat text-xs mt-0.5">
                Desglose transparente y cobro verificado
              </Text>
            </View>

            {/* In-Cabin Cash / Payment Instruction Banner */}
            {isCash ? (
              <LiquidGlassContainer
                variant="success"
                className="w-full rounded-2xl p-4 mb-4 flex-row items-center border border-emerald-500/40"
              >
                <View className="w-12 h-12 rounded-xl bg-emerald-500/20 items-center justify-center mr-3 border border-emerald-500/40">
                  <Ionicons name="cash" size={26} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-emerald-400 font-montserrat-bold text-xs uppercase tracking-wider">
                    Cobrar en efectivo al pasajero
                  </Text>
                  <Text
                    className="text-white font-montserrat-bold text-2xl mt-0.5"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    ${totalAmountToCollect.toFixed(2)}
                  </Text>
                  <Text className="text-emerald-300/80 font-montserrat text-[11px]">
                    {tollsAmount > 0
                      ? `Incluye $${tollsAmount.toFixed(2)} en peajes/extras`
                      : 'Cobrá el total antes de que el pasajero descienda'}
                  </Text>
                </View>
              </LiquidGlassContainer>
            ) : (
              <LiquidGlassContainer
                variant="default"
                className="w-full rounded-2xl p-3.5 mb-4 flex-row items-center border border-white/10"
              >
                <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center mr-3">
                  <Ionicons name="card-outline" size={22} color={THEME_COLORS.platinum} />
                </View>
                <View className="flex-1">
                  <Text className="text-platinum font-montserrat-bold text-xs uppercase tracking-wider">
                    Pago Electrónico Acreditado
                  </Text>
                  <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                    No cobrar al pasajero. Acreditado en tu Bóveda.
                  </Text>
                </View>
              </LiquidGlassContainer>
            )}

            {/* Liquid Glass Receipt Card - Transparencia de Ganancias */}
            <LiquidGlassContainer
              variant="gold"
              className="w-full rounded-[24px] p-5 mb-5 shadow-2xl"
            >
              <View className="items-center mb-4">
                <Text className="text-ash font-montserrat-bold text-[10px] tracking-widest uppercase mb-1">
                  GANANCIA NETA FINAL
                </Text>
                <Text
                  className="text-gold font-montserrat-bold text-4xl"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ${netEarnings.toFixed(2)}
                </Text>
              </View>

              {/* Line items divider */}
              <View className="h-[1px] bg-white/10 w-full mb-3" />

              {/* Transparent Line items */}
              <View className="w-full gap-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-ash font-montserrat-medium text-xs">Tarifa del servicio</Text>
                  <Text
                    className="text-white font-montserrat-semibold text-xs"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    ${baseFare.toFixed(2)}
                  </Text>
                </View>

                {tripExtras.length > 0 && (
                  <View className="bg-white/5 px-2.5 py-2 rounded-lg border border-gold/20 gap-1.5">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="car-outline" size={13} color={THEME_COLORS.gold} />
                        <Text className="text-gold font-montserrat-semibold text-xs">
                          Peajes y Extras (100% conductor)
                        </Text>
                      </View>
                      <Text
                        className="text-gold font-montserrat-bold text-xs"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        +${tollsAmount.toFixed(2)}
                      </Text>
                    </View>
                    {tripExtras.map((item) => (
                      <View key={item.id} className="flex-row justify-between items-center pl-4">
                        <Text className="text-zinc-400 font-montserrat text-[11px]">
                          • {item.notes || item.label}
                        </Text>
                        <Text
                          className="text-zinc-300 font-montserrat text-[11px]"
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          +${item.amount.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View className="flex-row justify-between items-center">
                  <Text className="text-ash font-montserrat-medium text-xs">
                    Comisión de plataforma (20% sobre base)
                  </Text>
                  <Text
                    className="text-red-400 font-montserrat-semibold text-xs"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    - ${commission.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center pt-1 border-t border-white/5">
                  <Text className="text-ash font-montserrat-medium text-xs">Método de cobro</Text>
                  <Text className="text-gold font-montserrat-semibold text-xs capitalize">
                    {paymentInfo.label}
                  </Text>
                </View>
              </View>
            </LiquidGlassContainer>

            {/* Rating Section */}
            <LiquidGlassContainer
              variant="default"
              className="w-full rounded-[24px] p-5 mb-4"
            >
              <View className="items-center mb-3">
                <View className="w-12 h-12 rounded-full bg-charcoal items-center justify-center mb-2 border border-white/10">
                  <Ionicons name="person" size={24} color={THEME_COLORS.platinum} />
                </View>
                <Text className="text-white font-montserrat-semibold text-sm text-center">
                  Calificá a {passengerName}
                </Text>
              </View>

              {/* Ergonomic 48x48 Star Rating */}
              <View className="flex-row items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleRatingChange(star)}
                    className="w-12 h-12 items-center justify-center active:scale-110"
                    accessibilityRole="button"
                    accessibilityLabel={`${star} estrellas`}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Ionicons
                      name={rating >= star ? 'star' : 'star-outline'}
                      size={36}
                      color={THEME_COLORS.gold}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Comment Input */}
              <View className="w-full mb-3">
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Comentario sobre el viaje (opcional)..."
                  placeholderTextColor="#71717A"
                  multiline
                  maxLength={500}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-montserrat text-xs min-h-[60px]"
                  textAlignVertical="top"
                />
              </View>

              {/* Bloqueo de pasajero toggle */}
              <View className="flex-row items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <View className="flex-1 mr-3">
                  <Text className="text-white font-montserrat-semibold text-xs">
                    Bloquear emparejamiento futuro
                  </Text>
                  <Text className="text-zinc-400 font-montserrat text-[10px] mt-0.5">
                    No volverás a recibir ofertas de este pasajero
                  </Text>
                </View>
                <Switch
                  value={blockPassenger}
                  onValueChange={(val) => {
                    void Haptics.selectionAsync();
                    setBlockPassenger(val);
                  }}
                  trackColor={{ false: '#27272A', true: '#EF4444' }}
                  thumbColor={blockPassenger ? '#FFFFFF' : '#A1A1AA'}
                />
              </View>

              {/* Error banner if submission failed */}
              {submitError && (
                <View className="w-full bg-red-950/60 border border-red-500/40 rounded-xl p-2.5 mt-3 flex-row items-center">
                  <Ionicons name="alert-circle" size={16} color="#F87171" />
                  <Text className="text-red-400 font-montserrat text-[11px] ml-2 flex-1">
                    {submitError}
                  </Text>
                </View>
              )}
            </LiquidGlassContainer>

            {/* Acceso a Reporte de Incidente / Daños */}
            <TouchableOpacity
              onPress={() => setIsIncidentModalVisible(true)}
              className="w-full py-3 px-4 rounded-xl border border-red-500/30 bg-red-950/20 flex-row items-center justify-between mb-5"
              accessibilityRole="button"
              accessibilityLabel="Reportar incidente o pasajero conflictivo"
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="warning-outline" size={18} color="#F87171" />
                <Text className="text-red-400 font-montserrat-semibold text-xs">
                  ¿Hubo agresión, suciedad o daños?
                </Text>
              </View>
              <Text className="text-zinc-400 font-montserrat-medium text-xs">Reportar →</Text>
            </TouchableOpacity>

            {/* Footer 56px Ergonomic Button */}
            <View className="w-full mt-auto pb-6">
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl items-center justify-center bg-gold active:opacity-90 shadow-lg shadow-gold/20"
                accessibilityRole="button"
                accessibilityLabel="Confirmar y continuar"
              >
                {isSubmitting ? (
                  <ActivityIndicator color={THEME_COLORS.obsidian} />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Text className="font-montserrat-bold text-base text-obsidian tracking-wide">
                      Confirmar y Continuar
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color={THEME_COLORS.obsidian} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Modal dedicado de reporte de incidente y daños */}
        <IncidentReportModal
          visible={isIncidentModalVisible}
          tripId={trip.id}
          passengerId={trip?.passenger?.phone || trip?.id}
          passengerName={passengerName}
          onClose={() => setIsIncidentModalVisible(false)}
          onReportSuccess={() => {
            setBlockPassenger(true);
            Alert.alert(
              'Reporte Recibido',
              'El incidente fue registrado. El pasajero fue bloqueado de tu cuenta.',
              [{ text: 'Entendido' }]
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};
