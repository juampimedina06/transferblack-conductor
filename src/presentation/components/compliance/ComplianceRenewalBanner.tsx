import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDriverStatusStore } from '../../driver/store/useDriverStatusStore';
import { DriverDocumentsModal } from './DriverDocumentsModal';

export const ComplianceRenewalBanner: React.FC = () => {
  const compliance = useDriverStatusStore((state) => state.compliance);
  const [isDocumentsModalVisible, setIsDocumentsModalVisible] = useState(false);

  // Muestra el banner si el status es expiring_soon o faltan 15 días o menos
  const isExpiringSoon =
    compliance.status === 'expiring_soon' ||
    (compliance.daysUntilNextExpiry !== null &&
      compliance.daysUntilNextExpiry !== undefined &&
      compliance.daysUntilNextExpiry <= 15 &&
      compliance.daysUntilNextExpiry >= 0);

  if (!isExpiringSoon) {
    return null;
  }

  const days = compliance.daysUntilNextExpiry ?? 15;

  const handleOpenRenewal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDocumentsModalVisible(true);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleOpenRenewal}
        className="w-full px-4 mb-2 z-40"
      >
        <View className="bg-amber-500/90 rounded-2xl p-3.5 shadow-lg shadow-black/60 flex-row items-center border border-amber-400">
          <View className="w-9 h-9 rounded-xl bg-amber-950/40 items-center justify-center mr-3">
            <Ionicons name="document-text" size={20} color="#FFF" />
          </View>
          <View className="flex-1 mr-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-montserrat-bold text-xs uppercase tracking-wider">
                Renovación Documental
              </Text>
              <View className="bg-black/30 px-2 py-0.5 rounded-full">
                <Text className="text-white font-montserrat-bold text-[10px]">
                  {days === 0 ? 'Vence hoy' : `${days} día${days === 1 ? '' : 's'} restantes`}
                </Text>
              </View>
            </View>
            <Text className="text-white/90 font-montserrat-medium text-[11px] leading-4 mt-0.5">
              Tenés documentación próxima a vencer. Renovala para seguir recibiendo viajes sin pausas.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </View>
      </TouchableOpacity>

      <DriverDocumentsModal
        visible={isDocumentsModalVisible}
        onClose={() => setIsDocumentsModalVisible(false)}
      />
    </>
  );
};
