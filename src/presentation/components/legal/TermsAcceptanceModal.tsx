import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const modalMaxHeight = Math.min(height - insets.top - insets.bottom - 40, 680);
  const modalWidth = Math.min(width - 32, 440);

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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel} statusBarTranslucent>
      <View
        className="flex-1 bg-black/80 items-center justify-center px-4"
        style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }}
      >
        <View
          style={{ width: modalWidth, maxHeight: modalMaxHeight }}
          className="bg-[#14151B] rounded-3xl p-5 border border-gold/30 shadow-2xl flex-col"
        >
          {/* Header */}
          <View className="items-center pb-3 border-b border-white/10">
            <View className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center mb-2">
              <Ionicons name="shield-checkmark" size={24} color="#D4AF37" />
            </View>
            <Text className="text-white font-montserrat-bold text-base text-center">
              Términos Legales del Conductor
            </Text>
            <View className="flex-row items-center mt-1 gap-2">
              <Text className="text-gold font-montserrat-bold text-[10px] bg-gold/15 px-2 py-0.5 rounded-full border border-gold/30">
                Versión {DRIVER_LEGAL_CONTRACT.version}
              </Text>
              <Text className="text-zinc-400 font-montserrat-medium text-[10px]">
                Córdoba, Argentina
              </Text>
            </View>
            <Text className="text-zinc-400 font-montserrat-medium text-xs text-center mt-1.5 px-2">
              Contrato de intermediación y condiciones de servicio para operar en la plataforma.
            </Text>
          </View>

          {/* Scrollable Clauses */}
          <ScrollView
            className="flex-1 my-3 bg-white/[0.02] border border-white/5 rounded-2xl p-3"
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {DRIVER_LEGAL_CONTRACT.clauses.map((clause) => (
              <View
                key={clause.id}
                className={`mb-2.5 p-3 rounded-xl border ${
                  clause.important
                    ? 'bg-gold/[0.08] border-gold/30'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-white font-montserrat-bold text-xs flex-1">
                    {clause.title}
                  </Text>
                  {clause.important && (
                    <View className="bg-gold/20 px-1.5 py-0.5 rounded border border-gold/40 ml-2">
                      <Text className="text-gold font-montserrat-bold text-[9px]">
                        IMPORTANTE
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-zinc-300 font-montserrat-medium text-[11px] mb-1 leading-4">
                  {clause.summary}
                </Text>
                <Text className="text-zinc-400 font-montserrat text-[10px] leading-4">
                  {clause.content}
                </Text>
              </View>
            ))}

            <View className="p-2 mb-1 items-center">
              <Text className="text-zinc-500 font-montserrat-medium text-[10px] text-center">
                Vigencia: {DRIVER_LEGAL_CONTRACT.effectiveDate} · {DRIVER_LEGAL_CONTRACT.jurisdiction}
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
            className="flex-row items-center p-3 mb-3 rounded-2xl bg-white/[0.04] border border-white/10 active:opacity-80"
          >
            <View
              className={`w-5 h-5 rounded-md border items-center justify-center mr-3 ${
                hasAgreed
                  ? 'bg-gold border-gold'
                  : 'bg-zinc-800 border-zinc-600'
              }`}
            >
              {hasAgreed && <Ionicons name="checkmark" size={14} color="#0A0A0C" />}
            </View>
            <Text className="text-zinc-200 font-montserrat-medium text-xs flex-1 leading-4">
              He leído y acepto el{' '}
              <Text className="text-gold font-montserrat-bold">
                Contrato de Intermediación
              </Text>{' '}
              y el deslinde de responsabilidad.
            </Text>
          </Pressable>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleCancel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancelar y no conectar"
              className="flex-1 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/60 items-center justify-center"
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
              className={`flex-1 h-12 rounded-xl items-center justify-center border shadow-lg ${
                hasAgreed
                  ? 'bg-gold border-gold'
                  : 'bg-zinc-800/40 border-zinc-700/30 opacity-40'
              }`}
            >
              <Text
                className={`font-montserrat-bold text-xs ${
                  hasAgreed ? 'text-obsidian' : 'text-zinc-500'
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
