import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  CANCELLATION_REASONS,
  CancellationReasonCode,
  CancellationResult,
} from '@/core/driver/interface/driverStatus.interface';
import { driverCancelTrip } from '@/core/trip/actions/trip.actions';
import { useDriverStatusStore } from '@/presentation/driver/store/useDriverStatusStore';
import { useDriverTripStore } from '@/presentation/trip/store/useDriverTripStore';
import { LatLng } from '@/core/location/interface/latLng.interface';

interface CancelTripModalProps {
  visible: boolean;
  tripId: string;
  location?: LatLng | null;
  onClose: () => void;
}

export const CancelTripModal: React.FC<CancelTripModalProps> = ({
  visible,
  tripId,
  location,
  onClose,
}) => {
  const [selectedCode, setSelectedCode] = useState<CancellationReasonCode>('PASSENGER_NO_SHOW');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const consecutiveCancellations = useDriverStatusStore(
    (state) => state.consecutiveCancellations
  );
  const setDispatchSuspendedUntil = useDriverStatusStore(
    (state) => state.setDispatchSuspendedUntil
  );
  const setConsecutiveCancellations = useDriverStatusStore(
    (state) => state.setConsecutiveCancellations
  );
  const fetchStatus = useDriverStatusStore((state) => state.fetchStatus);

  const selectedReason = CANCELLATION_REASONS.find((r) => r.code === selectedCode);
  const isUnjustified = selectedReason ? !selectedReason.isJustified : false;

  const handleConfirmCancel = async () => {
    if (!location) {
      Alert.alert('Ubicación requerida', 'Esperando coordenadas para confirmar la cancelación.');
      return;
    }

    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    try {
      const response = await driverCancelTrip(tripId, {
        reasonCode: selectedCode,
        reason_code: selectedCode,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      const cancellation: CancellationResult | undefined =
        response?.cancellation || response?.data?.cancellation;

      if (cancellation) {
        if (typeof cancellation.consecutiveCancellations === 'number') {
          setConsecutiveCancellations(cancellation.consecutiveCancellations);
        }
        if (cancellation.suspension?.dispatchSuspendedUntil) {
          setDispatchSuspendedUntil(cancellation.suspension.dispatchSuspendedUntil);
        }
      }

      // Cerrar viaje en el store local
      useDriverTripStore.getState().setActiveTrip(null);
      void fetchStatus();

      // Mostrar feedback si hubo advertencia o suspensión informada por el backend
      if (cancellation?.suspension) {
        Alert.alert(
          'Despacho Suspendido Temporalmente',
          cancellation.suspension.code === 'DISPATCH_SUSPENDED'
            ? 'Has alcanzado 3 cancelaciones seguidas sin justificación. No recibirás nuevas ofertas por 15 minutos.'
            : 'Tu recepción de ofertas ha sido suspendida temporalmente.',
          [{ text: 'Entendido', onPress: onClose }]
        );
      } else if (cancellation?.warning?.message) {
        Alert.alert('Aviso de Cancelación', cancellation.warning.message, [
          { text: 'Entendido', onPress: onClose },
        ]);
      } else {
        onClose();
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'No se pudo cancelar el viaje.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/85 justify-center items-center px-5">
        <View className="w-full bg-[#14151B] rounded-3xl p-5 border border-white/10 shadow-2xl max-h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-white/10 mb-3">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 items-center justify-center mr-3">
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </View>
              <Text className="text-white font-montserrat-bold text-base">
                Cancelar servicio
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Ionicons name="close" size={22} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {/* Banner de Política de Transparencia de Cancelaciones */}
          <View className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-2.5 mb-3 flex-row items-center">
            <Ionicons name="information-circle" size={18} color="#60A5FA" style={{ marginRight: 8 }} />
            <Text className="text-blue-200/90 font-montserrat-medium text-[11px] flex-1 leading-4">
              <Text className="font-montserrat-bold text-white">Política Justa TransferBlack:</Text> Espera de +5 min, exceso de pasajeros o motivos de seguridad nunca penalizan tu cuenta.
            </Text>
          </View>

          {/* Reason options */}
          <ScrollView className="max-h-64 mb-3" showsVerticalScrollIndicator={false}>
            {CANCELLATION_REASONS.map((reason) => {
              const isSelected = selectedCode === reason.code;
              return (
                <TouchableOpacity
                  key={reason.code}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCode(reason.code)}
                  className={`p-3 rounded-2xl mb-2 border flex-row items-center justify-between ${
                    isSelected
                      ? 'bg-gold/15 border-gold/45'
                      : 'bg-white/[0.03] border-white/10'
                  }`}
                >
                  <View className="flex-1 mr-2">
                    <Text
                      className={`font-montserrat-semibold text-xs leading-4 ${
                        isSelected ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {reason.label}
                    </Text>
                    <View className="flex-row items-center mt-1">
                      <View
                        className={`px-1.5 py-0.5 rounded border ${
                          reason.isJustified
                            ? 'bg-emerald-500/15 border-emerald-500/30'
                            : 'bg-amber-500/15 border-amber-500/30'
                        }`}
                      >
                        <Text
                          className={`font-montserrat-bold text-[9px] ${
                            reason.isJustified ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {reason.isJustified ? 'JUSTIFICADA • NO PENALIZA' : 'SIN JUSTIFICACIÓN'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? '#D4AF37' : '#71717A'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Pre-advertencia en tiempo real si el motivo no es justificado */}
          {isUnjustified && (
            <View className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3 mb-4 flex-row items-start">
              <Ionicons name="warning" size={18} color="#F59E0B" style={{ marginRight: 8, marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-amber-400 font-montserrat-bold text-xs mb-0.5">
                  Atención con las cancelaciones
                </Text>
                <Text className="text-amber-200/90 font-montserrat-medium text-[11px] leading-4">
                  {consecutiveCancellations > 0
                    ? `Llevás ${consecutiveCancellations} cancelación(es) seguidas. A la 3ª consecutiva se te suspenderá la recepción de ofertas por 15 minutos.`
                    : 'Las cancelaciones reiteradas sin motivo justificado aplican un cooldown de 15 minutos sin despacho.'}
                </Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleConfirmCancel}
            disabled={isSubmitting}
            className="w-full h-12 bg-red-600 rounded-2xl items-center justify-center flex-row shadow-lg shadow-red-600/30 mb-2"
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white font-montserrat-bold text-sm uppercase tracking-wider">
                Confirmar cancelación
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            disabled={isSubmitting}
            className="w-full h-10 rounded-2xl items-center justify-center"
          >
            <Text className="text-zinc-400 font-montserrat-semibold text-xs">
              Volver al viaje
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
