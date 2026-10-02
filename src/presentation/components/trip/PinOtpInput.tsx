import React, { useRef, useState } from 'react';
import { View, TextInput, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';

interface PinOtpInputProps {
  length?: number;
  onPinChange: (pin: string) => void;
  onPinComplete: (pin: string) => void;
  hasError?: boolean;
}

export const PinOtpInput = ({ length = 4, onPinChange, onPinComplete, hasError = false }: PinOtpInputProps) => {
  const [pin, setPin] = useState<string[]>(new Array(length).fill(''));
  const [prevHasError, setPrevHasError] = useState(hasError);
  const inputRefs = useRef<TextInput[]>([]);

  // Clearing the PIN is a reaction to a prop change, so it is adjusted while
  // rendering: React discards this render and re-runs it before painting, which
  // means the stale PIN is never shown and no extra commit is scheduled.
  if (hasError !== prevHasError) {
    setPrevHasError(hasError);
    if (hasError) {
      setPin(new Array(length).fill(''));
    }
  }

  const handleChange = (text: string, index: number) => {
    const newPin = [...pin];
    newPin[index] = text;
    setPin(newPin);
    
    const currentPinStr = newPin.join('');
    onPinChange(currentPinStr);

    if (text.length === 1 && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    
    if (currentPinStr.length === length) {
      Keyboard.dismiss();
      onPinComplete(currentPinStr);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newPin = [...pin];
      newPin[index - 1] = '';
      setPin(newPin);
      onPinChange(newPin.join(''));
    }
  };

  // The error effect must not depend on onPinChange: parents usually pass an
  // inline arrow, and depending on it would re-run the effect on every render.
  // The ref keeps the latest callback without coupling the effect to it.
  const onPinChangeRef = useRef(onPinChange);

  React.useEffect(() => {
    onPinChangeRef.current = onPinChange;
  }, [onPinChange]);

  // Side effects only: the PIN reset itself happens during render, above.
  React.useEffect(() => {
    if (hasError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onPinChangeRef.current('');
      inputRefs.current[0]?.focus();
    }
  }, [hasError]);

  return (
    <View className="flex-row justify-center items-center w-full gap-4 my-6">
      {pin.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            if (ref) inputRefs.current[index] = ref;
          }}
          className={`w-14 h-16 bg-[#1A1A1C] border-2 rounded-xl text-center text-2xl font-montserrat-bold text-platinum ${
            hasError ? 'border-red-500' : (digit ? 'border-gold' : 'border-[#2C2C2E]')
          }`}
          keyboardType="number-pad"
          maxLength={1}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          selectTextOnFocus
        />
      ))}
    </View>
  );
};
