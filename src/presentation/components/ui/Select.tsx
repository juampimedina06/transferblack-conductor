import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  placeholder?: string;
  value?: string | number | null;
  options: SelectOption[];
  onSelect: (value: any) => void;
  error?: string;
  title?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  placeholder = 'Seleccionar opción',
  value,
  options,
  onSelect,
  error,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (val: string | number) => {
    onSelect(val);
    setIsOpen(false);
  };

  return (
    <View className="mb-5">
      {label && <Text className="mb-2 text-sm font-montserrat-medium text-platinum">{label}</Text>}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsOpen(true)}
        className={`h-14 flex-row items-center justify-between rounded-xl border px-4 bg-charcoal ${
          error ? 'border-red-500 bg-red-900/20' : isOpen ? 'border-gold' : 'border-charcoal'
        }`}
      >
        <Text
          numberOfLines={1}
          className={`text-base font-montserrat ${selectedOption ? 'text-white' : 'text-ash'}`}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={isOpen ? THEME_COLORS.gold : THEME_COLORS.ash}
        />
      </TouchableOpacity>

      {error && <Text className="mt-1 text-xs text-red-400 font-montserrat">{error}</Text>}

      {/* Luxury Bottom Sheet Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/75"
          />

          {/* Bottom Sheet */}
          <View className="bg-obsidian border-t border-charcoal/90 rounded-t-3xl max-h-[70%] p-6 pb-10">
            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 mb-3 border-b border-charcoal">
              <Text className="text-lg font-montserrat-bold text-platinum">
                {title || label || 'Seleccionar'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={THEME_COLORS.ash} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <TouchableOpacity
                    key={String(option.value)}
                    activeOpacity={0.7}
                    onPress={() => handleSelect(option.value)}
                    className={`py-3.5 px-4 mb-2 rounded-xl flex-row items-center justify-between border ${
                      isSelected
                        ? 'bg-gold/15 border-gold/40'
                        : 'bg-charcoal/40 border-charcoal/60'
                    }`}
                  >
                    <Text
                      className={`text-base font-montserrat ${
                        isSelected ? 'text-gold font-montserrat-semibold' : 'text-platinum'
                      }`}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={THEME_COLORS.gold} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
