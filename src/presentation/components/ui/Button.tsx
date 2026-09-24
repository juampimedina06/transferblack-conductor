import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { THEME_COLORS } from '../../../core/constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

export const Button = ({
  label,
  variant = 'primary',
  isLoading,
  disabled,
  ...props
}: ButtonProps): React.JSX.Element => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-charcoal border-transparent';
      case 'outline':
        return 'bg-transparent border-gold border-2';
      case 'primary':
      default:
        return 'bg-gold border-transparent';
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return 'text-platinum';
      case 'outline':
        return 'text-gold';
      case 'primary':
      default:
        return 'text-obsidian';
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? label}
      className={`h-14 w-full flex-row items-center justify-center rounded-xl px-4 shadow-sm ${getContainerStyle()} ${
        disabled || isLoading ? 'opacity-50' : 'opacity-100'
      }`}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? THEME_COLORS.obsidian : THEME_COLORS.gold} />
      ) : (
        <Text className={`text-base font-montserrat-bold ${getTextStyle()}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};
