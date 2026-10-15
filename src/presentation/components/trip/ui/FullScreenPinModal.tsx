import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { THEME_COLORS } from '../../../../core/constants/theme';

export interface FullScreenPinModalProps {
  visible: boolean;
  onClose: () => void;
  pinDigits: string[];
  onChangePin: (digits: string[]) => void;
  onConfirmStart: () => void;
  isLoading?: boolean;
  isError?: boolean;
  passengerName?: string;
  passengerPhone?: string;
  onChat?: () => void;
}

export const FullScreenPinModal: React.FC<FullScreenPinModalProps> = ({
  visible,
  onClose,
  pinDigits,
  onChangePin,
  onConfirmStart,
  isLoading = false,
  isError = false,
  passengerName = 'Pasajero',
  passengerPhone,
  onChat,
}) => {
  const insets = useSafeAreaInsets();
  const inputRefs = useRef<TextInput[]>([]);

  const isComplete = pinDigits.every((d) => d.length > 0);

  // Auto-focus en el primer input vacío cuando se abre el modal
  useEffect(() => {
    if (visible) {
      const firstEmptyIndex = pinDigits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : 0;
      const timer = setTimeout(() => {
        inputRefs.current[targetIndex]?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visible, pinDigits]);

  const handleChange = (text: string, index: number) => {
    const val = text.slice(-1);
    const next = [...pinDigits];
    next[index] = val;
    onChangePin(next);

    if (val && index < 3) {
      inputRefs.current[index + 1]?.focus();
    } else if (val && index === 3) {
      // Ocultar teclado automáticamente al ingresar el 4to dígito para liberar pantalla
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...pinDigits];
        next[index - 1] = '';
        onChangePin(next);
      }
    }
  };

  const handleCall = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (passengerPhone) {
      void Linking.openURL(`tel:${passengerPhone}`);
    }
  };

  const handleStart = () => {
    if (!isComplete || isLoading) return;
    Keyboard.dismiss();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirmStart();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 overflow-hidden"
      >
        {/* Fondo Liquid Glass frosted sobre el mapa */}
        <BlurView
          intensity={Platform.OS === 'ios' ? 75 : 88}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          className="bg-obsidian/85"
        />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'space-between',
            paddingTop:
              Platform.OS === 'ios'
                ? Math.max(insets.top, 54) + 8
                : Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Bar con botón para minimizar */}
          <View className="flex-row items-center justify-between">
          <View className="flex-row items-center bg-gold/15 px-3 py-1 rounded-full border border-gold/30">
            <Ionicons name="shield-checkmark" size={14} color={THEME_COLORS.gold} />
            <Text className="font-montserrat-bold text-[10px] tracking-wider text-gold uppercase ml-1.5">
              Validación de Seguridad
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Minimizar pantalla de PIN"
            className="w-11 h-11 rounded-full bg-white/10 border border-white/10 items-center justify-center active:scale-95"
          >
            <Ionicons name="close" size={22} color="#E4E4E5" />
          </TouchableOpacity>
        </View>

        {/* Contenido Central: Títulos + PIN Boxes */}
        <View className="items-center my-auto">
          {/* Ícono de PIN grande */}
          <View className="w-20 h-20 rounded-3xl bg-gold/10 border border-gold/30 items-center justify-center mb-5 shadow-lg">
            <Ionicons name="keypad" size={38} color={THEME_COLORS.gold} />
          </View>

          <Text className="font-montserrat-bold text-2xl text-white text-center tracking-tight mb-2">
            Ingresá el PIN del viaje
          </Text>

          <Text className="font-montserrat text-sm text-ash text-center leading-5 px-4 mb-8">
            Pedile al pasajero{' '}
            <Text className="font-montserrat-bold text-white">{passengerName}</Text> los 4
            dígitos para verificar su identidad y comenzar el viaje.
          </Text>

          {/* 4 Casillas de PIN Gigantes */}
          <View className="flex-row gap-3.5 mb-4">
            {pinDigits.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(ref) => {
                  if (ref) inputRefs.current[idx] = ref;
                }}
                value={digit}
                onChangeText={(val) => handleChange(val, idx)}
                onKeyPress={(e) => handleKeyPress(e, idx)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                className={`w-16 h-20 rounded-2xl border-2 font-montserrat-bold text-3xl text-white text-center ${
                  digit
                    ? 'border-gold bg-gold/15'
                    : isError
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-white/20 bg-white/[0.04]'
                }`}
              />
            ))}
          </View>

          {isError && (
            <Text className="font-montserrat-semibold text-xs text-red-400 mt-1 mb-2">
              PIN incorrecto. Verificalo con el pasajero.
            </Text>
          )}

          {/* Acceso Rápido al Pasajero (Llamar / Chat) grandes y accesibles */}
          <View className="flex-row items-center justify-center gap-3.5 mt-6 w-full px-2">
            <TouchableOpacity
              onPress={handleCall}
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Llamar al pasajero para pedir PIN"
              className="flex-1 flex-row items-center justify-center h-13 py-3.5 rounded-2xl bg-white/[0.08] border border-white/20 active:bg-white/15 shadow-sm"
            >
              <Ionicons name="call" size={19} color="#FFFFFF" />
              <Text className="font-montserrat-bold text-xs text-white ml-2.5">
                Llamar
              </Text>
            </TouchableOpacity>

            {onChat && (
              <TouchableOpacity
                onPress={onChat}
                activeOpacity={0.8}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Enviar mensaje de chat al pasajero"
                className="flex-1 flex-row items-center justify-center h-13 py-3.5 rounded-2xl bg-gold/15 border border-gold/30 active:bg-gold/25 shadow-sm"
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={19}
                  color={THEME_COLORS.gold}
                />
                <Text className="font-montserrat-bold text-xs text-gold ml-2.5">
                  Mensaje
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Footer: Botón de Iniciar Viaje */}
        <View className="w-full gap-3">
          <TouchableOpacity
            onPress={handleStart}
            disabled={!isComplete || isLoading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Confirmar PIN e iniciar viaje"
            className={`w-full h-14 rounded-2xl items-center justify-center shadow-lg ${
              isComplete
                ? 'bg-gold active:opacity-90'
                : 'bg-white/10 opacity-40'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#0A0A0C" />
            ) : (
              <Text
                className={`font-montserrat-bold text-sm tracking-wider ${
                  isComplete ? 'text-obsidian' : 'text-zinc-500'
                }`}
              >
                INICIAR VIAJE
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            className="items-center justify-center py-2.5"
          >
            <Text className="font-montserrat-medium text-xs text-ash">
              Volver al mapa / Esperando al pasajero
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>
);
};
