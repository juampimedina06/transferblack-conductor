import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DRIVER_LEGAL_CONTRACT } from '../../../core/legal/constants/legalTerms.constants';
import { useLegalStore } from '../../legal/store/useLegalStore';

interface TermsAcceptanceModalProps {
  visible: boolean;
  onClose: () => void;
  onAccepted?: () => void;
}

export const TermsAcceptanceModal: React.FC<TermsAcceptanceModalProps> = ({
  visible,
  onClose,
  onAccepted,
}) => {
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
  const acceptTerms = useLegalStore((state) => state.acceptTerms);

  const handleConfirm = () => {
    if (!hasAgreed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptTerms(DRIVER_LEGAL_CONTRACT.version);
    onAccepted?.();
    onClose();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasAgreed(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View className="flex-1 bg-black/85 justify-center items-center px-4 py-8">
        <View className="w-full max-h-[90%] bg-[#14151B] rounded-3xl p-5 border border-amber-500/30 shadow-2xl flex-col">
          {/* Header */}
          <View className="items-center mb-3">
            <View className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 items-center justify-center mb-2">
              <Ionicons name="shield-checkmark" size={28} color="#F59E0B" />
            </View>
            <Text className="text-white font-montserrat-bold text-base text-center">
              Términos Legales del Conductor
            </Text>
            <View className="flex-row items-center mt-1">
              <Text className="text-amber-400 font-montserrat-bold text-[11px] bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                Versión {DRIVER_LEGAL_CONTRACT.version}
              </Text>
              <Text className="text-zinc-400 font-montserrat-medium text-[11px] ml-2">
                Córdoba, Argentina
              </Text>
            </View>
            <Text className="text-zinc-400 font-montserrat-medium text-xs text-center mt-2 px-2">
              Para operar en TransferBlack es obligatorio aceptar el contrato de intermediación y las cláusulas de responsabilidad.
            </Text>
          </View>

          {/* Scrollable Clauses */}
          <ScrollView
            className="flex-1 my-2 bg-white/[0.02] border border-white/5 rounded-2xl p-3"
            showsVerticalScrollIndicator={true}
          >
            {DRIVER_LEGAL_CONTRACT.clauses.map((clause) => (
              <View
                key={clause.id}
                className={`mb-3 p-3 rounded-xl border ${
                  clause.important
                    ? 'bg-amber-500/[0.06] border-amber-500/30'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-white font-montserrat-bold text-xs flex-1">
                    {clause.title}
                  </Text>
                  {clause.important && (
                    <View className="bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 ml-2">
                      <Text className="text-amber-400 font-montserrat-bold text-[9px]">
                        IMPORTANTE
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-zinc-300 font-montserrat-medium text-[11px] mb-1.5 leading-4">
                  {clause.summary}
                </Text>
                <Text className="text-zinc-400 font-montserrat-regular text-[10px] leading-4">
                  {clause.content}
                </Text>
              </View>
            ))}

            <View className="p-2 mb-2 items-center">
              <Text className="text-zinc-500 font-montserrat-medium text-[10px] text-center">
                Fecha de vigencia: {DRIVER_LEGAL_CONTRACT.effectiveDate} · {DRIVER_LEGAL_CONTRACT.jurisdiction}
              </Text>
            </View>
          </ScrollView>

          {/* Explicit Acceptance Checkbox */}
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setHasAgreed(!hasAgreed);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: hasAgreed }}
            accessibilityLabel="Acepto los Términos y Condiciones y Deslinde de Responsabilidad"
            className="flex-row items-start p-3 my-2 rounded-2xl bg-white/[0.04] border border-white/10 active:opacity-80"
          >
            <View
              className={`w-5 h-5 rounded-md border items-center justify-center mr-3 mt-0.5 ${
                hasAgreed
                  ? 'bg-emerald-500 border-emerald-400'
                  : 'bg-zinc-800 border-zinc-600'
              }`}
            >
              {hasAgreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text className="text-zinc-200 font-montserrat-medium text-xs flex-1 leading-4">
              He leído, comprendo y acepto el{' '}
              <Text className="text-amber-400 font-montserrat-bold">
                Contrato de Intermediación Tecnológica
              </Text>
              , el deslinde de responsabilidad y las políticas de cancelación.
            </Text>
          </Pressable>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 mt-1">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancelar y no conectar"
              className="flex-1 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 items-center justify-center"
            >
              <Text className="text-zinc-300 font-montserrat-semibold text-xs">
                Desconectar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!hasAgreed}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Aceptar términos y continuar conexión"
              className={`flex-1 h-12 rounded-2xl items-center justify-center border shadow-lg ${
                hasAgreed
                  ? 'bg-emerald-600 border-emerald-400/50'
                  : 'bg-zinc-800/40 border-zinc-700/30 opacity-40'
              }`}
            >
              <Text
                className={`font-montserrat-bold text-xs ${
                  hasAgreed ? 'text-white' : 'text-zinc-500'
                }`}
              >
                Aceptar y Conectar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
