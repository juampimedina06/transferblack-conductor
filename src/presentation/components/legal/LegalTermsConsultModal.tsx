import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DRIVER_LEGAL_CONTRACT } from '../../../core/legal/constants/legalTerms.constants';
import { useLegalStore } from '../../legal/store/useLegalStore';

interface LegalTermsConsultModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LegalTermsConsultModal: React.FC<LegalTermsConsultModalProps> = ({
  visible,
  onClose,
}) => {
  const acceptedAt = useLegalStore((state) => state.acceptedAt);
  const acceptedVersion = useLegalStore((state) => state.acceptedTermsVersion);

  const formattedAcceptedDate = acceptedAt
    ? new Date(acceptedAt).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/85 justify-end">
        <View className="w-full h-[88%] bg-[#14151B] rounded-t-3xl p-5 border-t border-white/10 flex-col">
          {/* Top handle and close */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 items-center justify-center mr-3">
                <Ionicons name="document-text" size={20} color="#60A5FA" />
              </View>
              <View>
                <Text className="text-white font-montserrat-bold text-sm">
                  Marco Legal y Contrato
                </Text>
                <Text className="text-zinc-400 font-montserrat-medium text-[11px]">
                  Versión {DRIVER_LEGAL_CONTRACT.version} · TransferBlack
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal de legales"
              className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#E4E4E7" />
            </TouchableOpacity>
          </View>

          {/* Acceptance status banner */}
          {acceptedVersion && (
            <View className="flex-row items-center bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 mb-3">
              <Ionicons name="checkmark-circle" size={16} color="#34D399" />
              <Text className="text-emerald-400 font-montserrat-medium text-xs ml-2 flex-1">
                Aceptado por el conductor el {formattedAcceptedDate} (v{acceptedVersion})
              </Text>
            </View>
          )}

          {/* Clauses list */}
          <ScrollView className="flex-1 my-1" showsVerticalScrollIndicator={true}>
            {DRIVER_LEGAL_CONTRACT.clauses.map((clause) => (
              <View
                key={clause.id}
                className="mb-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10"
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-white font-montserrat-bold text-xs flex-1">
                    {clause.title}
                  </Text>
                  {clause.important && (
                    <View className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 ml-2">
                      <Text className="text-amber-400 font-montserrat-bold text-[9px]">
                        CLAVE
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-zinc-300 font-montserrat-medium text-xs mb-2 leading-4">
                  {clause.summary}
                </Text>
                <Text className="text-zinc-400 font-montserrat-regular text-[11px] leading-5">
                  {clause.content}
                </Text>
              </View>
            ))}

            <View className="p-3 mb-6 items-center">
              <Text className="text-zinc-500 font-montserrat-medium text-[11px] text-center">
                Jurisdicción: {DRIVER_LEGAL_CONTRACT.jurisdiction}
              </Text>
            </View>
          </ScrollView>

          {/* Close button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Entendido y cerrar"
            className="w-full h-12 rounded-2xl bg-zinc-800 border border-zinc-700 items-center justify-center mt-2"
          >
            <Text className="text-white font-montserrat-semibold text-xs">
              Cerrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
