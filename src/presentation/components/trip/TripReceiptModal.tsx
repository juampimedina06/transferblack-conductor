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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, getPaymentMethodInfo } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useWalletStore } from '../../wallet/store/useWalletStore';
import { ratePassenger } from '../../../core/trip/actions/trip.actions';
import { router } from 'expo-router';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';

interface TripReceiptModalProps {
  trip: Trip;
  visible: boolean;
}

export const TripReceiptModal = ({ trip, visible }: TripReceiptModalProps) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const rawThirdPartyName = trip?.thirdPartyName || trip?.third_party?.name || trip?.chat?.third_party?.name;
  const isThirdParty = Boolean(rawThirdPartyName || trip?.chat?.is_third_party_trip);
  const passengerName = isThirdParty && rawThirdPartyName
    ? `Viaja: ${rawThirdPartyName} (Tercero)`
    : (trip?.passenger?.fullName || 'Pasajero');

  // Payment method info & Cash verification
  const paymentInfo = getPaymentMethodInfo(trip?.payment_method);
  const isCash = paymentInfo.isCash;

  // Calculate fees safely
  const finalFare = Number(trip?.final_fare || trip?.estimated_fare || 0);
  const commissionPercent = 0.20; // Default 20% platform fee
  const commission = finalFare * commissionPercent;
  const netEarnings = Math.max(0, finalFare - commission);

  const finishAndClose = () => {
    useWalletStore.getState().fetchSummary().catch(() => {});
    useDriverTripStore.getState().setActiveTrip(null);
    router.replace('/' as any);
  };

  const handleRatingChange = (newRating: number) => {
    Haptics.selectionAsync();
    setRating(newRating);
  };

  const handleConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      finishAndClose();
    } catch (err: any) {
      const msg = err.message || 'Error al calificar al pasajero';
      // Si ya fue calificado o el backend no lo requiere (409), permitimos continuar
      if (msg.includes('ya fue calificado') || msg.includes('NO_PASSENGER') || msg.includes('RATING_ALREADY_EXISTS')) {
        finishAndClose();
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
                Resumen de cobro y calificación
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
                    ${finalFare.toFixed(2)}
                  </Text>
                  <Text className="text-emerald-300/80 font-montserrat text-[11px]">
                    Cobrá el total antes de que el pasajero descienda
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

            {/* Liquid Glass Receipt Card */}
            <LiquidGlassContainer
              variant="gold"
              className="w-full rounded-[24px] p-5 mb-5 shadow-2xl"
            >
              <View className="items-center mb-4">
                <Text className="text-ash font-montserrat-bold text-[10px] tracking-widest uppercase mb-1">
                  GANANCIA NETA ESTIMADA
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

              {/* Line items */}
              <View className="w-full gap-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-ash font-montserrat-medium text-xs">Tarifa del viaje</Text>
                  <Text
                    className="text-white font-montserrat-semibold text-xs"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    ${finalFare.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-ash font-montserrat-medium text-xs">Comisión de plataforma (20%)</Text>
                  <Text
                    className="text-red-400 font-montserrat-semibold text-xs"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    - ${commission.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-ash font-montserrat-medium text-xs">Método de pago</Text>
                  <Text className="text-gold font-montserrat-semibold text-xs capitalize">
                    {paymentInfo.label}
                  </Text>
                </View>
              </View>
            </LiquidGlassContainer>

            {/* Rating Section */}
            <LiquidGlassContainer
              variant="default"
              className="w-full rounded-[24px] p-5 mb-5"
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
              <View className="w-full">
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Comentario sobre el viaje (opcional)..."
                  placeholderTextColor="#71717A"
                  multiline
                  maxLength={500}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-montserrat text-xs min-h-[70px]"
                  textAlignVertical="top"
                />
                <View className="flex-row justify-end mt-1">
                  <Text className="text-zinc-500 font-montserrat text-[10px]">
                    {comment.length}/500
                  </Text>
                </View>
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
      </SafeAreaView>
    </Modal>
  );
};

