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
      Alert.alert(
        'Medio de cobro requerido',
        'Debes configurar un medio de cobro (CBU/CVU/Alias) antes de solicitar un retiro.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Configurar ahora',
            onPress: () => {
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
      Alert.alert('Monto inválido', 'Por favor ingresá un monto mayor a $0.');
      return;
    }

    if (numAmount > availableBalance) {
      Alert.alert(
        'Saldo insuficiente',
        `El saldo disponible para retirar es de $${availableBalance.toFixed(2)}`
      );
      return;
    }

    try {
      await submitPayout(numAmount);
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
      const msg = error instanceof Error ? error.message : 'No se pudo procesar la solicitud.';
      Alert.alert('Error', msg);
    }
  };

  const handleGoToSetupPayoutMethod = () => {
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
        className="flex-1 justify-end bg-black/70"
      >
        <View className="bg-obsidian rounded-t-3xl border-t border-charcoal/60 p-6 shadow-xl shadow-black">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-platinum font-montserrat-bold text-xl">
              Solicitar Retiro
            </Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmittingPayout}
              className="p-2"
              accessibilityRole="button"
              accessibilityLabel="Cerrar modal"
            >
              <Ionicons name="close" size={24} color={THEME_COLORS.ash} />
            </TouchableOpacity>
          </View>

          {/* Si no tiene medio de cobro registrado */}
          {!payoutMethod ? (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-4">
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
                activeOpacity={0.8}
                onPress={handleGoToSetupPayoutMethod}
                className="bg-gold rounded-xl py-3 items-center justify-center"
              >
                <Text className="text-obsidian font-montserrat-bold text-sm">
                  Configurar Cuenta de Cobro
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Resumen Destino */}
              <View className="bg-charcoal/30 border border-charcoal/60 rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-ash font-montserrat-medium text-xs uppercase tracking-wider">
                    Destino del retiro ({payoutMethod.account_type})
                  </Text>
                  <TouchableOpacity
                    onPress={handleGoToSetupPayoutMethod}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-gold text-xs font-montserrat-semibold">Cambiar</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-platinum font-montserrat-bold text-sm">
                  {payoutMethod.account_holder_name}
                </Text>
                <Text className="text-ash font-montserrat text-xs mt-0.5">
                  Alias: <Text className="text-platinum font-montserrat-medium">{payoutMethod.alias}</Text>
                </Text>
                <Text className="text-ash font-montserrat text-xs mt-0.5">
                  {payoutMethod.account_type}: <Text className="text-platinum font-montserrat-medium">{payoutMethod.cbu_cvu}</Text>
                </Text>
              </View>

              {/* Saldo disponible */}
              <Text className="text-ash font-montserrat text-sm mb-2">
                Saldo disponible: <Text className="text-platinum font-montserrat-semibold">${availableBalance.toFixed(2)}</Text>
              </Text>

              {/* Input de Monto */}
              <View className="flex-row items-center border border-charcoal/80 bg-charcoal/20 rounded-2xl px-4 py-3 mb-5 focus:border-gold">
                <Text className="text-platinum font-montserrat-bold text-2xl mr-2">$</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={THEME_COLORS.ash}
                  className="flex-1 text-platinum font-montserrat-bold text-2xl h-12"
                  editable={!isSubmittingPayout}
                  autoFocus
                />
                <TouchableOpacity
                  onPress={() => setAmount(availableBalance.toFixed(2))}
                  className="bg-gold/20 px-3 py-1.5 rounded-lg border border-gold/30"
                  activeOpacity={0.7}
                >
                  <Text className="text-gold font-montserrat-semibold text-xs uppercase">
                    Máximo
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleRequestPayout}
                disabled={isSubmittingPayout || availableBalance <= 0}
                className={`w-full rounded-2xl py-4 flex-row justify-center items-center ${
                  isSubmittingPayout || availableBalance <= 0 ? 'bg-charcoal/80' : 'bg-gold'
                }`}
                activeOpacity={0.8}
              >
                {isSubmittingPayout ? (
                  <ActivityIndicator color={THEME_COLORS.platinum} className="mr-2" />
                ) : null}
                <Text
                  className={`font-montserrat-bold text-base ${
                    isSubmittingPayout || availableBalance <= 0 ? 'text-platinum' : 'text-obsidian'
                  }`}
                >
                  {isSubmittingPayout ? 'Procesando...' : 'Confirmar Retiro'}
                </Text>
              </TouchableOpacity>

              <Text className="text-ash/60 text-xs text-center font-montserrat mt-4 mb-2 leading-tight">
                Los retiros pueden demorar hasta 48hs hábiles en procesarse según tu entidad bancaria.
              </Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
