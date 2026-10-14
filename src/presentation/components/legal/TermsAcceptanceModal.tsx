import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
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
  const insets = useSafeAreaInsets();
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View
        className="flex-1 bg-obsidian"
        style={{
          paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 54) + 8 : Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 8),
        }}
      >
        <View className="flex-1 flex-col">
          {/* Header */}
          <View className="px-5 pt-1 pb-4 border-b border-white/10">
            <View className="flex-row items-center justify-between mb-2.5">
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center mr-3">
                  <Ionicons name="shield-checkmark" size={24} color="#D4AF37" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-montserrat-bold text-base leading-5">
                    Términos Legales del Conductor
                  </Text>
                  <Text className="text-zinc-400 font-montserrat-medium text-xs mt-0.5">
                    TransferBlack · Córdoba, Argentina
                  </Text>
                </View>
              </View>

              <View className="bg-gold/15 border border-gold/30 px-2.5 py-1 rounded-full">
                <Text className="text-gold font-montserrat-bold text-[10px]">
                  v{DRIVER_LEGAL_CONTRACT.version}
                </Text>
              </View>
            </View>

            <Text className="text-zinc-400 font-montserrat-medium text-xs leading-4">
              Contrato de intermediación y condiciones de servicio para operar en la plataforma.
            </Text>
          </View>

          {/* Scrollable Clauses */}
          <ScrollView
            className="flex-1 px-5"
            contentContainerStyle={{ paddingVertical: 14 }}
            showsVerticalScrollIndicator={true}
          >
            {DRIVER_LEGAL_CONTRACT.clauses.map((clause) => (
              <View
                key={clause.id}
                className={`mb-3 p-4 rounded-2xl border ${
                  clause.important
                    ? 'bg-gold/[0.08] border-gold/30'
                    : 'bg-white/[0.03] border-white/10'
                }`}
              >
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-white font-montserrat-bold text-xs flex-1">
                    {clause.title}
                  </Text>
                  {clause.important && (
                    <View className="bg-gold/20 px-2 py-0.5 rounded border border-gold/40 ml-2">
                      <Text className="text-gold font-montserrat-bold text-[9px]">
                        IMPORTANTE
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-zinc-300 font-montserrat-medium text-xs mb-1.5 leading-4">
                  {clause.summary}
                </Text>
                <Text className="text-zinc-400 font-montserrat text-[11px] leading-5">
                  {clause.content}
                </Text>
              </View>
            ))}

            <View className="p-3 items-center">
              <Text className="text-zinc-500 font-montserrat-medium text-[11px] text-center">
                Vigencia: {DRIVER_LEGAL_CONTRACT.effectiveDate} · {DRIVER_LEGAL_CONTRACT.jurisdiction}
              </Text>
            </View>
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View className="px-5 pt-3 pb-2 border-t border-white/10 bg-obsidian">
            {/* Explicit Acceptance Checkbox */}
            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHasAgreed(!hasAgreed);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: hasAgreed }}
              accessibilityLabel="Acepto los Términos y Condiciones y Deslinde de Responsabilidad"
              className="flex-row items-center p-3.5 mb-3 rounded-2xl bg-white/[0.04] border border-white/10 active:opacity-80"
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
      </View>
    </Modal>
  );
};
