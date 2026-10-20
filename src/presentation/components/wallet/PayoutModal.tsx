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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { THEME_COLORS } from '../../../core/constants/theme';
import {
  IMMEDIATE_PAYOUT_FEE,
  MIN_IMMEDIATE_PAYOUT_AMOUNT,
  isArgentinaOutsideOperatingHours,
} from '../../../core/wallet/utils/wallet.utils';
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

  const numAmount = parseFloat(amount);
  const isAmountEntered = !isNaN(numAmount) && numAmount > 0;
  const isAboveMinimum = isAmountEntered && numAmount > MIN_IMMEDIATE_PAYOUT_AMOUNT;
  const isWithinAvailable = isAmountEntered && numAmount <= availableBalance;
  const netAmount = isAboveMinimum ? numAmount - IMMEDIATE_PAYOUT_FEE : 0;
  const isOutsideHours = isArgentinaOutsideOperatingHours();

  const canSubmit =
    !isSubmittingPayout &&
    isAboveMinimum &&
    isWithinAvailable &&
    availableBalance > MIN_IMMEDIATE_PAYOUT_AMOUNT &&
    !!payoutMethod;

  const executePayout = async (amountToSubmit: number) => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await submitPayout(amountToSubmit, 'immediate');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Retiro Solicitado con Éxito',
        isOutsideHours
          ? 'Tu solicitud de retiro inmediato fue recibida y quedó agendada para su procesamiento a partir de las 08:00 hs del siguiente día.'
          : 'Tu solicitud de retiro inmediato fue enviada y está en curso de procesamiento.',
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

  const handleRequestPayout = () => {
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

    if (!isAmountEntered || isNaN(numAmount)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Monto requerido', 'Por favor ingresá un monto a retirar.');
      return;
    }

    if (numAmount <= MIN_IMMEDIATE_PAYOUT_AMOUNT) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Monto inferior al mínimo',
        `Para retiro inmediato, el monto solicitado debe ser superior a $${MIN_IMMEDIATE_PAYOUT_AMOUNT}.00 ARS para cubrir la comisión.`
      );
      return;
    }

    if (numAmount > availableBalance) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Saldo insuficiente',
        `El saldo disponible para retirar es de $${availableBalance.toFixed(2)} ARS.`
      );
      return;
    }

    // Modal de confirmación con desglose detallado
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Confirmar Retiro Inmediato',
      `Revisá el desglose de tu operación:\n\n• Monto solicitado: $${numAmount.toFixed(2)} ARS\n• Comisión por retiro inmediato: $${IMMEDIATE_PAYOUT_FEE}.00 ARS\n• Neto que recibirás en tu cuenta: $${netAmount.toFixed(2)} ARS\n\n${
        isOutsideHours
          ? '⚠️ Horario: Fuera de la ventana operativa (08:00 a 20:00 hs ARG). Quedará agendado para su procesamiento a partir de las 08:00 hs del siguiente día.'
          : '⚡ Horario: Operación dentro del horario de procesamiento inmediato (08:00 a 20:00 hs ARG).'
      }`,
      [
        { text: 'Modificar', style: 'cancel' },
        {
          text: 'Confirmar Retiro',
          onPress: () => void executePayout(numAmount),
        },
      ]
    );
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
        <View className="bg-[#0B0B0E]/95 rounded-t-[32px] border-t border-white/10 p-6 shadow-2xl max-h-[90%]">
          {/* Top handle indicator */}
          <View className="w-12 h-1.5 rounded-full bg-white/20 self-center mb-4" />

          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center">
                <Text className="text-white font-montserrat-bold text-xl">
                  Retiro Inmediato
                </Text>
                <View className="bg-gold/20 border border-gold/40 px-2 py-0.5 rounded-full ml-2">
                  <Text className="text-gold font-montserrat-bold text-[10px] uppercase">
                    Directo
                  </Text>
                </View>
              </View>
              <Text className="text-ash font-montserrat text-xs mt-0.5">
                Transferencia inmediata a tu CBU, CVU o Alias
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

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
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
                {/* Banner de Horario Operativo */}
                {isOutsideHours ? (
                  <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-4">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="time-outline" size={17} color="#F59E0B" />
                      <Text className="text-amber-400 font-montserrat-bold text-xs ml-1.5">
                        Fuera de horario operativo (08:00 a 20:00 hs ARG)
                      </Text>
                    </View>
                    <Text className="text-amber-200/90 font-montserrat text-xs leading-relaxed">
                      El procesamiento inmediato opera de 08:00 a 20:00 hs. Tu pedido quedará agendado para su procesamiento a partir de las 08:00 hs del siguiente día.
                    </Text>
                  </View>
                ) : (
                  <View className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-3.5 py-2.5 mb-4 flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-emerald-400 mr-2" />
                    <Text className="text-emerald-300 font-montserrat-medium text-xs flex-1">
                      Horario operativo activo: Procesamiento inmediato de 08:00 a 20:00 hs (hora Argentina).
                    </Text>
                  </View>
                )}

                {/* Resumen Destino */}
                <View className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-4">
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
                  <Text className="text-ash font-montserrat text-xs mt-0.5">
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
                    ${availableBalance.toFixed(2)} ARS
                  </Text>
                </View>

                {/* Input de Monto */}
                <View className="flex-row items-center border border-white/15 bg-[#12131A]/90 rounded-2xl px-4 py-3 mb-2 focus:border-gold">
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

                {/* Mensajes de validación bajo input */}
                {availableBalance <= MIN_IMMEDIATE_PAYOUT_AMOUNT ? (
                  <Text className="text-amber-400 font-montserrat text-[11px] mb-3 px-1">
                    Tu saldo disponible (${availableBalance.toFixed(2)}) no supera el mínimo requerido ($500.00 ARS). Podés esperar al retiro semanal automático gratuito.
                  </Text>
                ) : isAmountEntered && !isAboveMinimum ? (
                  <Text className="text-red-400 font-montserrat text-[11px] mb-3 px-1">
                    El monto solicitado debe ser superior a $500.00 ARS para cubrir la comisión de retiro inmediato.
                  </Text>
                ) : isAmountEntered && !isWithinAvailable ? (
                  <Text className="text-red-400 font-montserrat text-[11px] mb-3 px-1">
                    El monto supera tu saldo disponible (${availableBalance.toFixed(2)} ARS).
                  </Text>
                ) : (
                  <Text className="text-ash/70 font-montserrat text-[11px] mb-3 px-1">
                    Monto mínimo para retiro inmediato: superior a $500.00 ARS.
                  </Text>
                )}

                {/* Desglose Claro de Operación */}
                <View className="bg-black/50 border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="text-white font-montserrat-bold text-xs uppercase tracking-wider mb-3">
                    Desglose de Retiro
                  </Text>

                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-ash text-xs font-montserrat">Monto solicitado a retirar:</Text>
                    <Text
                      className="text-white font-montserrat-semibold text-xs"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      ${isAmountEntered ? numAmount.toFixed(2) : '0.00'} ARS
                    </Text>
                  </View>

                  <View className="flex-row justify-between items-center mb-2.5">
                    <Text className="text-ash text-xs font-montserrat">Comisión por retiro inmediato:</Text>
                    <Text
                      className="text-red-400 font-montserrat-semibold text-xs"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      -${IMMEDIATE_PAYOUT_FEE.toFixed(2)} ARS
                    </Text>
                  </View>

                  <View className="h-[1px] bg-white/10 my-1" />

                  <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-white font-montserrat-bold text-sm">
                      Monto neto que recibirás:
                    </Text>
                    <Text
                      className={`font-montserrat-bold text-base ${
                        isAboveMinimum ? 'text-emerald-400' : 'text-ash'
                      }`}
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      ${netAmount.toFixed(2)} ARS
                    </Text>
                  </View>
                </View>

                {/* Tarjeta Informativa: Retiro Semanal Automático */}
                <View className="bg-white/5 border border-white/10 rounded-2xl p-3.5 mb-5">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="calendar-outline" size={16} color={THEME_COLORS.gold} />
                    <Text className="text-white font-montserrat-semibold text-xs ml-1.5">
                      Retiro semanal automático
                    </Text>
                    <View className="bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-2">
                      <Text className="text-emerald-400 font-montserrat-bold text-[9px] uppercase">
                        Sin costo
                      </Text>
                    </View>
                  </View>
                  <Text className="text-ash font-montserrat text-xs leading-relaxed">
                    Se ejecuta todos los lunes a las 16:00 hs sin costo adicional. Tiempo de acreditación bancaria: 24 a 48 hs hábiles.
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleRequestPayout}
                  disabled={!canSubmit}
                  className={`w-full h-14 rounded-2xl flex-row justify-center items-center shadow-lg shadow-black mb-2 ${
                    canSubmit
                      ? 'bg-gold active:opacity-90 shadow-gold/20'
                      : 'bg-charcoal/60 opacity-50'
                  }`}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar retiro inmediato"
                >
                  {isSubmittingPayout ? (
                    <ActivityIndicator color={THEME_COLORS.obsidian} className="mr-2" />
                  ) : null}
                  <Text
                    className={`font-montserrat-bold text-base ${
                      canSubmit ? 'text-obsidian' : 'text-ash'
                    }`}
                  >
                    {isSubmittingPayout
                      ? 'Procesando retiro...'
                      : !isAboveMinimum && isAmountEntered
                      ? 'Monto debe ser mayor a $500'
                      : availableBalance <= MIN_IMMEDIATE_PAYOUT_AMOUNT
                      ? 'Saldo insuficiente para retiro inmediato'
                      : 'Confirmar Retiro Inmediato'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
