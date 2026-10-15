import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useSafetyStore } from '../../safety/store/useSafetyStore';
import { BlockedPassengerRecord } from '../../../core/safety/interface/incident.interface';

interface BlockedPassengersModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BlockedPassengersModal: React.FC<BlockedPassengersModalProps> = ({
  visible,
  onClose,
}) => {
  const blockedPassengers = useSafetyStore((state) => state.blockedPassengers);
  const unblockPassenger = useSafetyStore((state) => state.unblockPassenger);

  const handleUnblock = (record: BlockedPassengerRecord) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Desbloquear Pasajero',
      `¿Deseás remover el bloqueo a ${record.passengerName || 'este pasajero'}? Podrá volver a ser emparejado en tus viajes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desbloquear',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            unblockPassenger(record.passengerId);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-[#0B0C10] rounded-t-[32px] border-t border-white/20 max-h-[85%] pb-8 shadow-2xl relative overflow-hidden">
          {/* Blur Glass Layer */}
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 90}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            className="bg-[#0A0A0C]/90"
          />

          {/* Top Specular Line */}
          <View
            pointerEvents="none"
            className="absolute top-0 left-8 right-8 h-[1px] bg-white/30 rounded-full"
          />

          {/* Handle */}
          <View className="w-10 h-1 bg-white/25 rounded-full self-center mt-3 mb-2" />

          {/* Header */}
          <View className="px-5 pt-2 pb-3.5 flex-row items-center justify-between border-b border-white/10">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              accessibilityLabel="Cerrar lista de bloqueados"
              accessibilityRole="button"
              className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/15"
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.platinum} />
            </TouchableOpacity>

            <View className="items-center flex-1 pr-10">
              <Text className="text-white font-montserrat-bold text-sm uppercase tracking-wider text-center">
                Pasajeros Bloqueados
              </Text>
              <Text className="text-ash font-montserrat text-[11px] text-center">
                Exclusión de emparejamiento por seguridad
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
          >
            {blockedPassengers.length > 0 ? (
              blockedPassengers.map((record) => (
                <View
                  key={record.passengerId}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 items-center justify-center mr-3">
                      <Ionicons name="person-remove" size={18} color="#F43F5E" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-montserrat-bold text-sm text-white mb-0.5">
                        {record.passengerName || 'Pasajero no identificado'}
                      </Text>
                      <Text className="font-montserrat text-xs text-ash leading-4 mb-1">
                        Motivo: {record.reason || 'Reporte de seguridad o mal comportamiento'}
                      </Text>
                      <Text className="font-montserrat text-[10px] text-ash-muted">
                        Bloqueado el {new Date(record.blockedAt).toLocaleDateString('es-AR')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleUnblock(record)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 items-center justify-center"
                  >
                    <Text className="font-montserrat-semibold text-[11px] text-gold">
                      Desbloquear
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View className="items-center py-10 px-4">
                <View className="w-16 h-16 rounded-full bg-white/5 border border-white/15 items-center justify-center mb-4">
                  <Ionicons name="shield-checkmark-outline" size={30} color={THEME_COLORS.gold} />
                </View>
                <Text className="font-montserrat-bold text-base text-white text-center mb-2">
                  No tenés pasajeros bloqueados
                </Text>
                <Text className="font-montserrat text-xs text-ash text-center leading-5 max-w-[85%]">
                  Cuando reportás un incidente con un pasajero o calificás con 1 estrella, podés
                  bloquearlo para que el sistema nunca vuelva a asignarte sus viajes.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              activeOpacity={0.85}
              className="w-full h-12 rounded-2xl bg-white/10 border border-white/15 items-center justify-center mt-3"
            >
              <Text className="font-montserrat-semibold text-xs text-white">
                Volver
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
