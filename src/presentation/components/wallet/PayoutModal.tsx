import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useWalletStore } from '../../wallet/store/useWalletStore';

interface PayoutModalProps {
  visible: boolean;
  onClose: () => void;
  maxAmount: number;
}

export const PayoutModal = ({ visible, onClose, maxAmount }: PayoutModalProps) => {
  const [amount, setAmount] = useState('');
  const { submitPayout, isLoading } = useWalletStore();

  const handleRequestPayout = async () => {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresá un monto mayor a $0.');
      return;
    }

    if (numAmount > maxAmount) {
      Alert.alert('Saldo insuficiente', `El monto máximo que podés retirar es $${maxAmount.toFixed(2)}`);
      return;
    }

    try {
      await submitPayout(numAmount);
      Alert.alert(
        'Retiro solicitado',
        'Tu solicitud de retiro fue enviada con éxito y está pendiente de aprobación.',
        [{ text: 'Entendido', onPress: () => {
          setAmount('');
          onClose();
        }}]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo procesar la solicitud.');
    }
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
        className="flex-1 justify-end bg-black/60"
      >
        <View className="bg-obsidian rounded-t-3xl border-t border-charcoal/50 p-6 shadow-xl shadow-black">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-platinum font-montserrat-bold text-xl">Solicitar Retiro</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading} className="p-2">
              <Ionicons name="close" size={24} color={THEME_COLORS.ash} />
            </TouchableOpacity>
          </View>

          <Text className="text-ash font-montserrat text-sm mb-2">
            Saldo disponible: <Text className="text-platinum font-montserrat-semibold">${maxAmount.toFixed(2)}</Text>
          </Text>

          {/* Input */}
          <View className="flex-row items-center border border-charcoal/80 bg-charcoal/20 rounded-2xl px-4 py-3 mb-6 focus:border-gold">
            <Text className="text-platinum font-montserrat-bold text-2xl mr-2">$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={THEME_COLORS.ash}
              className="flex-1 text-platinum font-montserrat-bold text-2xl h-12"
              editable={!isLoading}
              autoFocus
            />
            <TouchableOpacity 
              onPress={() => setAmount(maxAmount.toString())}
              className="bg-gold/20 px-3 py-1.5 rounded-lg border border-gold/30"
            >
              <Text className="text-gold font-montserrat-semibold text-xs uppercase">Máximo</Text>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleRequestPayout}
            disabled={isLoading}
            className={`w-full rounded-2xl py-4 flex-row justify-center items-center ${
              isLoading ? 'bg-charcoal/80' : 'bg-gold'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color={THEME_COLORS.platinum} className="mr-2" />
            ) : null}
            <Text 
              className={`font-montserrat-bold text-base ${
                isLoading ? 'text-platinum' : 'text-obsidian'
              }`}
            >
              {isLoading ? 'Procesando...' : 'Confirmar Retiro'}
            </Text>
          </TouchableOpacity>

          <Text className="text-ash/60 text-xs text-center font-montserrat mt-4 mb-2 leading-tight">
            Los retiros pueden demorar hasta 48hs hábiles en procesarse según tu método de cobro asociado.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
