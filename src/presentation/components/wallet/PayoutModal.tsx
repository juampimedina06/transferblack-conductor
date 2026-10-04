import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useWalletStore } from '../../wallet/store/useWalletStore';

interface PayoutModalProps {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
}

export const PayoutModal = ({
  visible,
  onClose,
  availableBalance,
}: PayoutModalProps) => {
  const [amount, setAmount] = useState('');
  const { payoutMethod, submitPayout, isSubmittingPayout } = useWalletStore();

  const handleRequestPayout = async () => {
    if (!payoutMethod) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Medio de cobro requerido',
        'Debes configurar un medio de cobro (CBU/CVU/Alias) antes de solicitar un retiro.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Configurar ahora',
            onPress: () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
              router.push('/(home)/wallet/payout-method' as any);
            },
          },
        ]
      );
      return;
    }

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Monto inválido', 'Por favor ingresá un monto mayor a $0.');
      return;
    }

    if (numAmount > availableBalance) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Saldo insuficiente',
        `El saldo disponible para retirar es de $${availableBalance.toFixed(2)}`
      );
      return;
    }

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await submitPayout(numAmount);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Retiro solicitado',
        'Tu solicitud de retiro fue enviada con éxito y está pendiente de aprobación.',
        [
          {
            text: 'Entendido',
            onPress: () => {
              setAmount('');
              onClose();
            },
          },
        ]
      );
    } catch (error: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = error instanceof Error ? error.message : 'No se pudo procesar la solicitud.';
      Alert.alert('Error', msg);
    }
  };

  const handleGoToSetupPayoutMethod = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push('/(home)/wallet/payout-method' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/75"
      >
        <View className="bg-[#0B0B0E]/95 rounded-t-[32px] border-t border-white/10 p-6 shadow-2xl">
          {/* Top handle indicator */}
          <View className="w-12 h-1.5 rounded-full bg-white/20 self-center mb-4" />

          {/* Header */}
          <View className="flex-row justify-between items-center mb-5">
            <View>
              <Text className="text-white font-montserrat-bold text-xl">
                Solicitar Retiro
              </Text>
              <Text className="text-ash font-montserrat text-xs mt-0.5">
                Transferencia bancaria o billetera virtual
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              disabled={isSubmittingPayout}
              className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 items-center justify-center active:scale-95"
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal"
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.platinum} />
            </TouchableOpacity>
          </View>

          {/* Si no tiene medio de cobro registrado */}
          {!payoutMethod ? (
            <View className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 mb-4">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={22} color="#F59E0B" />
                <Text className="text-amber-400 font-montserrat-bold text-base ml-2">
                  Cuenta no configurada
                </Text>
              </View>
              <Text className="text-ash font-montserrat text-sm leading-relaxed mb-4">
                Para solicitar un retiro es necesario que vincules tu CBU, CVU o Alias donde transferir tus ganancias.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleGoToSetupPayoutMethod}
                className="bg-gold rounded-2xl h-12 items-center justify-center active:opacity-90"
              >
                <Text className="text-obsidian font-montserrat-bold text-sm">
                  Configurar Cuenta de Cobro
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Resumen Destino */}
              <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider">
                    Destino ({payoutMethod.account_type})
                  </Text>
                  <TouchableOpacity
                    onPress={handleGoToSetupPayoutMethod}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-gold text-xs font-montserrat-semibold">Cambiar</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-white font-montserrat-bold text-sm mt-0.5">
                  {payoutMethod.account_holder_name}
                </Text>
                <Text className="text-ash font-montserrat text-xs mt-1">
                  Alias: <Text className="text-white font-montserrat-medium">{payoutMethod.alias}</Text>
                </Text>
                <Text className="text-ash/70 font-montserrat text-[11px] mt-0.5">
                  {payoutMethod.account_type}: <Text className="text-platinum font-montserrat-medium">{payoutMethod.cbu_cvu}</Text>
                </Text>
              </View>

              {/* Saldo disponible */}
              <View className="flex-row justify-between items-center mb-2 px-1">
                <Text className="text-ash font-montserrat text-xs">Saldo disponible:</Text>
                <Text
                  className="text-gold font-montserrat-bold text-sm"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  ${availableBalance.toFixed(2)}
                </Text>
              </View>

              {/* Input de Monto */}
              <View className="flex-row items-center border border-white/15 bg-[#12131A]/90 rounded-2xl px-4 py-3 mb-5 focus:border-gold">
                <Text className="text-gold font-montserrat-bold text-2xl mr-2">$</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={THEME_COLORS.ash}
                  className="flex-1 text-white font-montserrat-bold text-2xl h-12"
                  style={{ fontVariant: ['tabular-nums'] }}
                  editable={!isSubmittingPayout}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAmount(availableBalance.toFixed(2));
                  }}
                  className="bg-gold/15 px-3 py-1.5 rounded-xl border border-gold/40 active:bg-gold/25"
                  activeOpacity={0.7}
                >
                  <Text className="text-gold font-montserrat-bold text-xs uppercase tracking-wider">
                    Máximo
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleRequestPayout}
                disabled={isSubmittingPayout || availableBalance <= 0}
                className={`w-full h-14 rounded-2xl flex-row justify-center items-center shadow-lg shadow-black ${
                  isSubmittingPayout || availableBalance <= 0
                    ? 'bg-charcoal/60 opacity-50'
                    : 'bg-gold active:opacity-90 shadow-gold/20'
                }`}
                activeOpacity={0.85}
              >
                {isSubmittingPayout ? (
                  <ActivityIndicator color={THEME_COLORS.obsidian} className="mr-2" />
                ) : null}
                <Text
                  className={`font-montserrat-bold text-base ${
                    isSubmittingPayout || availableBalance <= 0 ? 'text-ash' : 'text-obsidian'
                  }`}
                >
                  {isSubmittingPayout ? 'Procesando...' : 'Confirmar Retiro'}
                </Text>
              </TouchableOpacity>

              <Text className="text-ash/60 text-[11px] text-center font-montserrat mt-4 mb-2 leading-tight">
                Los retiros pueden demorar hasta 48hs hábiles en procesarse según tu entidad bancaria.
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
