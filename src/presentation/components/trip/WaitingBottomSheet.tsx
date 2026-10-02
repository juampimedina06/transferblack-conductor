import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { useCourtesyTimer } from '../../trip/hooks/useCourtesyTimer';
import { THEME_COLORS } from '../../../core/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

interface WaitingBottomSheetProps {
  trip: Trip;
  onStartTrip: (pin?: string) => Promise<void>;
  onCancel: () => Promise<void>;
  onHeightChange?: (height: number) => void;
}

const getPreferenceIcon = (pref: string): keyof typeof Ionicons.glyphMap => {
  const lower = pref.toLowerCase();
  if (lower.includes('aire') || lower.includes('clima') || lower.includes('temp') || lower.includes('frio') || lower.includes('calor') || lower.includes('°c')) {
    return 'snow-outline';
  }
  if (lower.includes('silencio') || lower.includes('mudo') || lower.includes('quiet') || lower.includes('tranquil')) {
    return 'volume-mute-outline';
  }
  if (lower.includes('música') || lower.includes('musica') || lower.includes('radio') || lower.includes('cancion')) {
    return 'musical-notes-outline';
  }
  if (lower.includes('convers') || lower.includes('charla') || lower.includes('hablar')) {
    return 'chatbubbles-outline';
  }
  if (lower.includes('equipaje') || lower.includes('valija') || lower.includes('maleta')) {
    return 'briefcase-outline';
  }
  return 'sparkles-outline';
};

export const WaitingBottomSheet = ({ trip, onStartTrip, onCancel, onHeightChange }: WaitingBottomSheetProps) => {
  const { formattedTime } = useCourtesyTimer(5);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const pinInputRefs = useRef<TextInput[]>([]);
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isLoadingCancel, setIsLoadingCancel] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isThirdParty = trip.chat?.is_third_party_trip;
  const passengerName = trip.passenger?.fullName || trip.third_party?.name || trip.chat?.third_party?.name || 'Pasajero';
  const preferences = trip.passenger?.preferences || [];
  const currentPin = pinDigits.join('');

  const handlePinDigitChange = (text: string, index: number) => {
    setPinError(false);
    const clean = text.replace(/[^0-9]/g, '');
    const newDigits = [...pinDigits];
    newDigits[index] = clean ? clean[clean.length - 1] : '';
    setPinDigits(newDigits);

    if (clean && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    } else if (clean && index === 3) {
      Keyboard.dismiss();
    }
  };

  const handlePinKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
      const newDigits = [...pinDigits];
      newDigits[index - 1] = '';
      setPinDigits(newDigits);
    }
  };

  const handleStart = async () => {
    if (trip.require_pin && currentPin.length !== 4) {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setPinError(false);
    try {
      setIsLoadingStart(true);
      await onStartTrip(trip.require_pin ? currentPin : undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'No se pudo iniciar el viaje');
    } finally {
      setIsLoadingStart(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsLoadingCancel(true);
      await onCancel();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo cancelar el viaje');
    } finally {
      setIsLoadingCancel(false);
    }
  };

  const isStartEnabled = !trip.require_pin || currentPin.length === 4;

  return (
    <>
      {isKeyboardVisible && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View 
            style={{ position: 'absolute', top: -1000, bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' }} 
            pointerEvents="auto"
          />
        </TouchableWithoutFeedback>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="absolute bottom-0 w-full"
        pointerEvents="box-none"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View 
            onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
            className="w-full bg-[#111113] rounded-t-3xl px-5 pt-3 pb-6 border-t border-[#262629] shadow-2xl shadow-black max-h-[85vh]"
          >
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Handle bar */}
              <View className="w-10 h-1 bg-zinc-700 rounded-full self-center mb-4" />

              {/* Top Status Row */}
              <View className="w-full flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 rounded-full bg-[#EAB308] mr-2" />
                  <Text className="text-white font-montserrat-semibold text-sm">
                    Esperando al pasajero
                  </Text>
                </View>
                <Text className="text-zinc-500 font-montserrat text-xs">
                  Notificado {formattedTime ? `• ${formattedTime}` : ''}
                </Text>
              </View>

              {/* Passenger Info Row */}
              <View className="w-full flex-row justify-between items-center mb-4">
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800 items-center justify-center mr-3 border border-zinc-700">
                    <Ionicons name="person" size={22} color={THEME_COLORS.platinum} />
                    {isThirdParty && (
                      <View className="absolute -bottom-0.5 -right-0.5 bg-[#EAB308] rounded-full p-0.5">
                        <Ionicons name="star" size={8} color="#000000" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-montserrat-bold text-base" numberOfLines={1}>
                      {passengerName}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      <Text className="text-white font-montserrat-semibold text-xs">
                        {trip.passenger?.rating ? Number(trip.passenger.rating).toFixed(2) : '4.98'}
                      </Text>
                      <Text className="text-[#EAB308] ml-1 mr-1.5 text-xs">★</Text>
                      <Text className="text-zinc-500 mr-1.5 text-xs">·</Text>
                      <Text className="text-zinc-400 font-montserrat text-xs">
                        {isThirdParty ? 'Invitado VIP' : (trip.passenger?.category || 'Black VIP')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row gap-2.5">
                  <TouchableOpacity 
                    accessibilityLabel="Llamar al pasajero"
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="w-10 h-10 rounded-full bg-[#1F1F23] border border-[#2E2E33] items-center justify-center"
                  >
                    <Ionicons name="call" size={17} color={THEME_COLORS.platinum} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    accessibilityLabel="Chatear con el pasajero"
                    accessibilityRole="button"
                    onPress={() => router.push('/(home)/chat')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    className="w-10 h-10 rounded-full bg-[#1F1F23] border border-[#2E2E33] items-center justify-center active:opacity-70"
                  >
                    <Ionicons name="chatbubble" size={17} color={THEME_COLORS.platinum} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Preferences Chips */}
              {preferences.length > 0 && (
                <View className="flex-row flex-wrap mb-4">
                  {preferences.map((pref, idx) => (
                    <View 
                      key={`${pref}-${idx}`} 
                      className="flex-row items-center bg-[#18181B] border border-[#27272A] px-3 py-1.5 rounded-full mr-2 mb-1.5"
                    >
                      <Ionicons name={getPreferenceIcon(pref)} size={13} color="#D4AF37" />
                      <Text className="text-zinc-300 font-montserrat-medium text-xs ml-1.5">
                        {pref}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Boarding PIN Row (Only shown if require_pin is true) */}
              {trip.require_pin && (
                <View className={`w-full bg-[#151517] border ${
                  pinError ? 'border-red-500' : 'border-[#262629]'
                } rounded-2xl px-4 py-3 mb-4`}>
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-zinc-400 font-montserrat-medium text-sm">
                      PIN de abordaje
                    </Text>
                    {isKeyboardVisible && (
                      <TouchableOpacity
                        onPress={Keyboard.dismiss}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        className="flex-row items-center px-2.5 py-1 bg-[#262629] rounded-full border border-zinc-700"
                        accessibilityRole="button"
                        accessibilityLabel="Ocultar teclado"
                      >
                        <Ionicons name="checkmark-outline" size={13} color="#EAB308" />
                        <Text className="text-[#EAB308] font-montserrat-semibold text-xs ml-1">
                          Listo
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View className="flex-row items-center justify-center gap-3">
                    {pinDigits.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          if (ref) pinInputRefs.current[index] = ref;
                        }}
                        className={`w-12 h-12 text-center font-montserrat-bold text-lg text-white rounded-xl bg-[#1F1F23] border ${
                          pinError ? 'border-red-500' : (digit ? 'border-[#EAB308]' : 'border-zinc-700')
                        }`}
                        keyboardType="number-pad"
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
                        maxLength={1}
                        value={digit}
                        onChangeText={(text) => handlePinDigitChange(text, index)}
                        onKeyPress={(e) => handlePinKeyPress(e, index)}
                        selectTextOnFocus
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Main Action: Iniciar viaje */}
              <TouchableOpacity
                onPress={handleStart}
                disabled={isLoadingStart || !isStartEnabled}
                className={`w-full py-4 rounded-2xl items-center justify-center mb-2.5 ${
                  isStartEnabled ? 'bg-[#EAB308]' : 'bg-[#EAB308]/40'
                }`}
                accessibilityRole="button"
                accessibilityLabel="Iniciar viaje"
              >
                {isLoadingStart ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text className="text-black font-montserrat-bold text-base">
                    Iniciar viaje
                  </Text>
                )}
              </TouchableOpacity>

              {/* Secondary Action: Cancelar servicio */}
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isLoadingCancel}
                className="w-full py-2 items-center justify-center mb-3"
                accessibilityRole="button"
                accessibilityLabel="Cancelar servicio"
              >
                {isLoadingCancel ? (
                  <ActivityIndicator color={THEME_COLORS.ash} />
                ) : (
                  <Text className="text-zinc-400 font-montserrat-medium text-sm">
                    Cancelar servicio
                  </Text>
                )}
              </TouchableOpacity>

              {/* Footer Details */}
              <View className="w-full flex-row justify-between items-center pt-2.5 border-t border-zinc-800/40">
                <Text className="text-zinc-500 font-montserrat text-xs tracking-wider uppercase">
                  {trip.public_code || 'TB-4821'}
                </Text>
                <Text className="text-zinc-500 font-montserrat text-xs">
                  Monitoreo 24/7
                </Text>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
};
