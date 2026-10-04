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
import { Trip } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useWalletStore } from '../../wallet/store/useWalletStore';
import { ratePassenger } from '../../../core/trip/actions/trip.actions';
import { router } from 'expo-router';

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

  const handleConfirm = async () => {
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

      finishAndClose();
    } catch (err: any) {
      const msg = err.message || 'Error al calificar al pasajero';
      // Si ya fue calificado o el backend no lo requiere (409), permitimos continuar
      if (msg.includes('ya fue calificado') || msg.includes('NO_PASSENGER') || msg.includes('RATING_ALREADY_EXISTS')) {
        finishAndClose();
        return;
      }

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
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header - Success Icon */}
            <View className="items-center mb-6 mt-4">
              <View className="w-16 h-16 rounded-full border border-gold items-center justify-center mb-3">
                <Ionicons name="checkmark" size={32} color={THEME_COLORS.gold} />
              </View>
              <Text className="text-white font-montserrat-bold text-2xl tracking-wide">
                Viaje Completado
              </Text>
            </View>

            {/* Receipt Card */}
            <View className="w-full flex-col items-center justify-center bg-[#1A1A1C] border border-[#2C2C2E] rounded-[24px] p-6 mb-6 shadow-xl">
              <Text className="text-zinc-400 font-montserrat-bold text-[10px] tracking-widest uppercase mb-1">
                GANANCIA NETA
              </Text>
              <Text className="text-[#D4AF37] font-montserrat-bold text-4xl mb-5">
                ${netEarnings.toFixed(2)}
              </Text>

              {/* Line items */}
              <View className="w-full">
                <View className="flex-row justify-between items-center mb-2.5">
                  <Text className="text-zinc-400 font-montserrat-medium text-xs">Tarifa recalculada</Text>
                  <Text className="text-white font-montserrat-semibold text-xs">
                    ${finalFare.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-2.5">
                  <Text className="text-zinc-400 font-montserrat-medium text-xs">Comisión plataforma</Text>
                  <Text className="text-red-500 font-montserrat-semibold text-xs">
                    - ${commission.toFixed(2)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-zinc-400 font-montserrat-medium text-xs">Tiempo de espera</Text>
                  <Text className="text-white font-montserrat-semibold text-xs">
                    $0.00
                  </Text>
                </View>
              </View>
            </View>

            {/* Rating Section */}
            <View className="items-center mb-6 bg-white/[0.02] border border-white/[0.06] rounded-[24px] p-5">
              <View className="w-11 h-11 rounded-full bg-charcoal items-center justify-center mb-2.5 border border-charcoal">
                <Ionicons name="person" size={22} color={THEME_COLORS.platinum} />
              </View>
              <Text className="text-white font-montserrat-semibold text-sm mb-3 text-center">
                Calificá a {passengerName}
              </Text>

              <View className="flex-row items-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    className="p-1"
                    accessibilityRole="button"
                    accessibilityLabel={`${star} estrellas`}
                  >
                    <Ionicons
                      name={rating >= star ? 'star' : 'star-outline'}
                      size={34}
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
                  placeholder="Comentario sobre el pasajero (opcional)..."
                  placeholderTextColor="#71717A"
                  multiline
                  maxLength={500}
                  className="w-full bg-[#141416] border border-[#2C2C2E] rounded-xl p-3 text-white font-montserrat text-xs min-h-[70px] text-top"
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
            </View>

            {/* Footer Button */}
            <View className="w-full mt-auto pb-6">
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isSubmitting}
                className="w-full py-4 rounded-full items-center justify-center bg-gold active:opacity-90"
              >
                {isSubmitting ? (
                  <ActivityIndicator color={THEME_COLORS.obsidian} />
                ) : (
                  <Text className="font-montserrat-bold text-base text-obsidian tracking-wide">
                    Confirmar y Continuar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};
