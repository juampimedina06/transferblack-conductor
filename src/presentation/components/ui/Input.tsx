import React, { useState } from 'react';
import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  isPassword,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}, ref): React.JSX.Element => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  const isPasswordField = isPassword || secureTextEntry;
  const isSecure = isPasswordField ? !isPasswordVisible : false;

  return (
    <View className="mb-5">
      {label && <Text className="mb-2 text-sm font-montserrat-medium text-platinum">{label}</Text>}
      <View
        className={`h-14 flex-row items-center rounded-xl border px-4 bg-charcoal ${
          error ? 'border-red-500 bg-red-900/20' : isFocused ? 'border-gold' : 'border-charcoal'
        }`}
      >
        <TextInput
          ref={ref}
          {...props}
          className="flex-1 h-full text-base text-white font-montserrat pr-2 py-0"
          placeholderTextColor={props.placeholderTextColor ?? THEME_COLORS.ash}
          secureTextEntry={isSecure}
          selection={props.selection ?? selection}
          onSelectionChange={(e) => {
            setSelection(e.nativeEvent.selection);
            props.onSelectionChange?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }, props.style]}
        />
        {isPasswordField && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => {
              if (typeof props.value === 'string') {
                setSelection({ start: props.value.length, end: props.value.length });
              }
              setIsPasswordVisible(!isPasswordVisible);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={THEME_COLORS.ash}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="mt-1 text-xs text-red-400 font-montserrat">{error}</Text>}
    </View>
  );
});

Input.displayName = 'Input';

