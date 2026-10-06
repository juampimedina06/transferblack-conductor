import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDriverStatusStore } from '../../driver/store/useDriverStatusStore';
import { DriverDocumentsModal } from './DriverDocumentsModal';

interface DocumentExpirationBlockModalProps {
  visible: boolean;
  onClose: () => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  dni: 'DNI',
  license_d1: 'Licencia Nacional de Conducir (D1)',
  driver_license: 'Licencia Nacional de Conducir',
  insurance_policy: 'Póliza de Seguro Automotor',
  criminal_record_national: 'Antecedentes Penales (Nacionales)',
  criminal_record_provincial: 'Antecedentes Penales (Provinciales)',
  sex_offenses_registry: 'Registro de Ofensores Sexuales',
  vehicle_title: 'Título de Propiedad Automotor',
  itv: 'Inspección Técnica Vehicular (ITV / RTO)',
};

export const DocumentExpirationBlockModal: React.FC<DocumentExpirationBlockModalProps> = ({
  visible,
  onClose,
}) => {
  const compliance = useDriverStatusStore((state) => state.compliance);
  const [isDocumentsModalVisible, setIsDocumentsModalVisible] = useState(false);

  const blockingDocs = compliance.blockingDocuments || [];

  const handleOpenUpdate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDocumentsModalVisible(true);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 bg-black/85 justify-center items-center px-5">
          <View className="w-full bg-[#14151B] rounded-3xl p-6 border border-red-500/30 shadow-2xl">
            {/* Header Icon */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-3xl bg-red-500/20 border border-red-500/40 items-center justify-center mb-3">
                <Ionicons name="lock-closed" size={32} color="#EF4444" />
              </View>
              <Text className="text-white font-montserrat-bold text-lg text-center">
                Documentación Vencida
              </Text>
              <Text className="text-zinc-400 font-montserrat-medium text-xs text-center mt-1">
                No podés conectarte ni recibir viajes hasta actualizar los documentos requeridos.
              </Text>
            </View>

            {/* Blocking Documents List */}
            {blockingDocs.length > 0 && (
              <View className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 mb-4">
                <Text className="text-zinc-300 font-montserrat-bold text-xs mb-2">
                  Documentos pendientes o vencidos:
                </Text>
                <ScrollView className="max-h-36">
                  {blockingDocs.map((docType) => {
                    const label = DOCUMENT_LABELS[docType] || docType;
                    return (
                      <View key={docType} className="flex-row items-center py-1.5 border-b border-white/5">
                        <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text className="text-red-300 font-montserrat-medium text-xs flex-1">
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Actions */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleOpenUpdate}
              className="w-full h-12 bg-red-600 rounded-2xl items-center justify-center flex-row shadow-lg shadow-red-600/30 mb-2.5"
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text className="text-white font-montserrat-bold text-xs uppercase tracking-wider">
                Actualizar documentos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              className="w-full h-10 rounded-2xl items-center justify-center"
            >
              <Text className="text-zinc-400 font-montserrat-semibold text-xs">
                Entendido, cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DriverDocumentsModal
        visible={isDocumentsModalVisible}
        onClose={() => {
          setIsDocumentsModalVisible(false);
          onClose();
        }}
      />
    </>
  );
};
