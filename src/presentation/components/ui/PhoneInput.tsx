import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';

export interface CountryDialCode {
  country: string;
  code: string;
  flag: string;
}

export const COUNTRIES_DIAL_CODES: CountryDialCode[] = [
  { country: 'Argentina', code: '+54', flag: '🇦🇷' },
  { country: 'Uruguay', code: '+598', flag: '🇺🇾' },
  { country: 'Chile', code: '+56', flag: '🇨🇱' },
  { country: 'Brasil', code: '+55', flag: '🇧🇷' },
  { country: 'Paraguay', code: '+595', flag: '🇵🇾' },
  { country: 'Bolivia', code: '+591', flag: '🇧🇴' },
  { country: 'Perú', code: '+51', flag: '🇵🇪' },
  { country: 'Colombia', code: '+57', flag: '🇨🇴' },
  { country: 'México', code: '+52', flag: '🇲🇽' },
  { country: 'Estados Unidos / Canadá', code: '+1', flag: '🇺🇸' },
  { country: 'España', code: '+34', flag: '🇪🇸' },
];

interface PhoneInputProps extends Omit<TextInputProps, 'onChange' | 'value'> {
  label?: string;
  value?: string;
  onChangePhone: (fullPhone: string) => void;
  error?: string;
  defaultCountryCode?: string;
}

export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(
  (
    {
      label = 'Número de Teléfono',
      value = '',
      onChangePhone,
      error,
      defaultCountryCode = '+54',
      onBlur,
      onFocus,
      ...textInputProps
    },
    ref
  ) => {
    const inputRef = useRef<TextInput>(null);
    useImperativeHandle(ref, () => inputRef.current as TextInput);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Encontrar código inicial a partir del valor existente o el default (+54)
    const findInitialCountry = (val: string): CountryDialCode => {
      if (val && val.startsWith('+')) {
        // Ordenar por longitud descendente para matchear códigos más específicos primero
        const matched = [...COUNTRIES_DIAL_CODES]
          .sort((a, b) => b.code.length - a.code.length)
          .find((c) => val.startsWith(c.code));
        if (matched) return matched;
      }
      return (
        COUNTRIES_DIAL_CODES.find((c) => c.code === defaultCountryCode) ||
        COUNTRIES_DIAL_CODES[0]
      );
    };

    const initialCountry = findInitialCountry(value);
    const [selectedCountry, setSelectedCountry] = useState<CountryDialCode>(initialCountry);

    // Extraer dígitos nacionales del valor completo
    const getNationalDigits = (fullVal: string, code: string) => {
      if (!fullVal) return '';
      if (fullVal.startsWith(code)) {
        return fullVal.slice(code.length);
      }
      return fullVal.replace(/^\+\d+/, '');
    };

    const [nationalNumber, setNationalNumber] = useState(
      getNationalDigits(value, initialCountry.code)
    );

    // Sincronizar si cambia el value externo
    useEffect(() => {
      if (value) {
        const country = findInitialCountry(value);
        setSelectedCountry(country);
        setNationalNumber(getNationalDigits(value, country.code));
      } else {
        setNationalNumber('');
      }
    }, [value]);

    const handleTextChange = (text: string) => {
      // Limpiar todo lo que no sea dígito
      const digits = text.replace(/\D/g, '');
      setNationalNumber(digits);

      if (digits.length > 0) {
        onChangePhone(`${selectedCountry.code}${digits}`);
      } else {
        onChangePhone('');
      }
    };

    const handleSelectCountry = (country: CountryDialCode) => {
      setSelectedCountry(country);
      setIsModalOpen(false);

      if (nationalNumber.length > 0) {
        onChangePhone(`${country.code}${nationalNumber}`);
      }
      // Re-enfocar el input de texto
      setTimeout(() => inputRef.current?.focus(), 150);
    };

    return (
      <View className="mb-5">
        {label && <Text className="mb-2 text-sm font-montserrat-medium text-platinum">{label}</Text>}

        <View className="flex-row gap-2.5 items-center">
          {/* Country Selector Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsModalOpen(true)}
            className={`h-14 px-3 rounded-xl border flex-row items-center justify-between bg-charcoal ${
              error ? 'border-red-500' : isModalOpen ? 'border-gold' : 'border-charcoal'
            }`}
            style={{ width: 110 }}
          >
            <View className="flex-row items-center gap-1.5">
              <Text className="text-lg">{selectedCountry.flag}</Text>
              <Text className="text-white font-montserrat-semibold text-sm">
                {selectedCountry.code}
              </Text>
            </View>
            <Ionicons
              name="chevron-down"
              size={14}
              color={isModalOpen ? THEME_COLORS.gold : THEME_COLORS.ash}
            />
          </TouchableOpacity>

          {/* National Number Input */}
          <View
            className={`flex-1 h-14 flex-row items-center rounded-xl border px-4 bg-charcoal ${
              error ? 'border-red-500 bg-red-900/20' : isFocused ? 'border-gold' : 'border-charcoal'
            }`}
          >
            <TextInput
              ref={inputRef}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholder="11 1234-5678"
              placeholderTextColor={THEME_COLORS.ash}
              value={nationalNumber}
              onChangeText={handleTextChange}
              onFocus={(e) => {
                setIsFocused(true);
                onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                onBlur?.(e);
              }}
              className="flex-1 h-full text-base text-white font-montserrat py-0"
              style={{ paddingVertical: 0, textAlignVertical: 'center', includeFontPadding: false }}
              {...textInputProps}
            />
          </View>
        </View>

        {error && <Text className="mt-1 text-xs text-red-400 font-montserrat">{error}</Text>}

        {/* Modal Selección de País */}
        <Modal
          visible={isModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View className="flex-1 justify-end">
            {/* Backdrop */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80"
            />

            {/* Bottom Sheet */}
            <View className="bg-obsidian border-t border-charcoal/90 rounded-t-3xl max-h-[70%] p-6 pb-10">
              <View className="flex-row items-center justify-between pb-4 mb-3 border-b border-charcoal">
                <Text className="text-lg font-montserrat-bold text-platinum">
                  Código de País
                </Text>
                <TouchableOpacity
                  onPress={() => setIsModalOpen(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={22} color={THEME_COLORS.ash} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
                {COUNTRIES_DIAL_CODES.map((item) => {
                  const isSelected = item.code === selectedCountry.code;
                  return (
                    <TouchableOpacity
                      key={item.code + item.country}
                      activeOpacity={0.7}
                      onPress={() => handleSelectCountry(item)}
                      className={`py-3.5 px-4 mb-2 rounded-xl flex-row items-center justify-between border ${
                        isSelected
                          ? 'bg-gold/15 border-gold/40'
                          : 'bg-charcoal/40 border-charcoal/60'
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <Text className="text-2xl">{item.flag}</Text>
                        <View>
                          <Text
                            className={`text-base font-montserrat ${
                              isSelected ? 'text-gold font-montserrat-semibold' : 'text-platinum'
                            }`}
                          >
                            {item.country}
                          </Text>
                          <Text className="text-xs text-ash font-montserrat">
                            Prefijo internacional
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Text
                          className={`text-base font-montserrat-bold ${
                            isSelected ? 'text-gold' : 'text-platinum'
                          }`}
                        >
                          {item.code}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color={THEME_COLORS.gold} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';
