import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDriverStatusStore } from '../../driver/store/useDriverStatusStore';
import {
  formatShortArDate,
  getActiveGraceDocuments,
} from '../../../core/driver/utils/documentCompliance.utils';
import { DriverDocumentsModal } from './DriverDocumentsModal';

export const ComplianceRenewalBanner: React.FC = () => {
  const compliance = useDriverStatusStore((state) => state.compliance);
  const documents = useDriverStatusStore((state) => state.documents);
  const [isDocumentsModalVisible, setIsDocumentsModalVisible] = useState(false);

  if (compliance.status === 'suspended_documents') {
    return null;
  }

  const activeGraceDocs = getActiveGraceDocuments(documents);
  const soonestGraceDoc = activeGraceDocs[0] ?? null;

  const isExpiringSoon =
    compliance.status === 'expiring_soon' ||
    (compliance.daysUntilNextExpiry !== null &&
      compliance.daysUntilNextExpiry !== undefined &&
      compliance.daysUntilNextExpiry <= 15 &&
      compliance.daysUntilNextExpiry >= 0);

  if (!soonestGraceDoc && !isExpiringSoon) {
    return null;
  }

  const handleOpenRenewal = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDocumentsModalVisible(true);
  };

  if (soonestGraceDoc) {
    const formattedDeadline = formatShortArDate(soonestGraceDoc.graceUntil);
    const graceDays = soonestGraceDoc.daysRemaining ?? soonestGraceDoc.daysUntilExpiry;
    const pillText = formattedDeadline
      ? `Prórroga hasta ${formattedDeadline}`
      : graceDays !== null && graceDays !== undefined
        ? `${graceDays} día${graceDays === 1 ? '' : 's'} de prórroga`
        : 'Prórroga activa';

    return (
      <>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleOpenRenewal}
          accessibilityRole="button"
          accessibilityLabel="Ver documentos en plazo de gracia"
          className="w-full px-4 mb-2 z-40"
        >
          <View className="bg-[#182235]/95 rounded-2xl p-3.5 shadow-lg shadow-black/60 flex-row items-center border border-sky-400/50">
            <View className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 items-center justify-center mr-3">
              <Ionicons name="shield-checkmark-outline" size={20} color="#38BDF8" />
            </View>
            <View className="flex-1 mr-2">
              <View className="flex-row items-center justify-between flex-wrap gap-1">
                <Text className="text-sky-300 font-montserrat-bold text-xs uppercase tracking-wider">
                  Plazo de gracia
                </Text>
                <View className="bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 rounded-full">
                  <Text className="text-sky-200 font-montserrat-bold text-[10px]">
                    {pillText}
                  </Text>
                </View>
              </View>
              <Text className="text-zinc-200 font-montserrat-medium text-[11px] leading-4 mt-0.5">
                Podés seguir operando normalmente. Renová tu documentación antes de la fecha límite.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#7DD3FC" />
          </View>
        </TouchableOpacity>

        <DriverDocumentsModal
          visible={isDocumentsModalVisible}
          initialSelectedDocType={soonestGraceDoc.documentType}
          onClose={() => setIsDocumentsModalVisible(false)}
        />
      </>
    );
  }

  const days = compliance.daysUntilNextExpiry ?? 15;

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
