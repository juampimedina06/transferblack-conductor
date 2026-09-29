import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { ratePassenger } from '../../../core/trip/actions/trip.actions';
import { router } from 'expo-router';

interface TripReceiptModalProps {
  trip: Trip;
  visible: boolean;
}

export const TripReceiptModal = ({ trip, visible }: TripReceiptModalProps) => {
  const [rating, setRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passengerName = trip.passenger?.fullName || trip.third_party?.name || trip.chat?.third_party?.name || 'Pasajero';

  // Calculate fees
  const finalFare = Number(trip.final_fare || trip.estimated_fare || 0);
  const commissionPercent = 0.20; // Default 20% platform fee since we don't have it in the Trip interface yet
  const commission = finalFare * commissionPercent;
  const netEarnings = finalFare - commission;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      // Calificar al pasajero
      try {
        await ratePassenger(trip.id, { rating, comment: 'Puntual y respetuoso' });
      } catch (err: any) {
        console.warn('Error calificando al pasajero:', err.message);
        // Si ya fue calificado (409) o falla, permitimos continuar
      }

      useDriverTripStore.getState().setActiveTrip(null);
      router.replace('/(home)' as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo finalizar la calificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <SafeAreaView className="flex-1 bg-obsidian">
        <View className="flex-1 px-6 justify-center">
          
          {/* Header - Success Icon */}
          <View className="items-center mb-6 mt-10">
            <View className="w-16 h-16 rounded-full border border-gold items-center justify-center mb-4">
              <Ionicons name="checkmark" size={32} color={THEME_COLORS.gold} />
            </View>
            <Text className="text-white font-montserrat-bold text-2xl tracking-wide">
              Viaje Completado
            </Text>
          </View>

          {/* Receipt Card */}
          <View className="w-full flex-col items-center justify-center bg-[#1A1A1C] border border-[#2C2C2E] rounded-[24px] p-8 mb-8 shadow-xl">
            <Text className="text-zinc-400 font-montserrat-bold text-[10px] tracking-widest uppercase mb-2">
              GANANCIA NETA
            </Text>
            <Text className="text-[#D4AF37] font-montserrat-bold text-5xl mb-6">
              ${netEarnings.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>

            {/* Line items */}
            <View className="w-full">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-zinc-400 font-montserrat-medium text-sm">Tarifa recalculada</Text>
                <Text className="text-white font-montserrat-semibold text-sm">
                  ${finalFare.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-zinc-400 font-montserrat-medium text-sm">Comisión plataforma</Text>
                <Text className="text-red-500 font-montserrat-semibold text-sm">
                  - ${commission.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-zinc-400 font-montserrat-medium text-sm">Tiempo de espera</Text>
                <Text className="text-white font-montserrat-semibold text-sm">
                  $0,00
                </Text>
              </View>
            </View>
          </View>

          {/* Rating Section */}
          <View className="items-center mb-10">
            <View className="w-12 h-12 rounded-full bg-charcoal items-center justify-center mb-3 border border-charcoal">
              <Ionicons name="person" size={24} color={THEME_COLORS.platinum} />
            </View>
            <Text className="text-white font-montserrat-semibold text-sm mb-4">
              Califica a {passengerName}
            </Text>
            
            <View className="flex-row items-center gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  className="p-1"
                >
                  <Ionicons 
                    name={rating >= star ? 'star' : 'star-outline'} 
                    size={36} 
                    color={THEME_COLORS.gold} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </View>

        {/* Footer Button */}
        <View className="px-6 pb-8">
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={isSubmitting}
            className="w-full py-4 rounded-full items-center justify-center bg-gold"
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
      </SafeAreaView>
    </Modal>
  );
};
