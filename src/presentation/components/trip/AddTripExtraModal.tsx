import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';
import { useDriverTripStore, TripExtraItem } from '../../trip/store/useDriverTripStore';

interface AddTripExtraModalProps {
  visible: boolean;
  onClose: () => void;
}

type ExtraCategory = TripExtraItem['category'];

interface CategoryOption {
  id: ExtraCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: 'toll',
    label: 'Peaje',
    icon: 'car-outline',
    placeholder: 'Ej. Peaje Autopista Carlos Paz / RAC',
  },
  {
    id: 'parking',
    label: 'Estacionamiento',
    icon: 'business-outline',
    placeholder: 'Ej. Estacionamiento Aeropuerto',
  },
  {
    id: 'extra_stop',
    label: 'Parada no planificada',
    icon: 'pin-outline',
    placeholder: 'Ej. Parada adicional solicitada por pasajero',
  },
  {
    id: 'other',
    label: 'Otro gasto',
    icon: 'receipt-outline',
    placeholder: 'Detalle del cargo adicional...',
  },
];

const PRESET_AMOUNTS = [1000, 2000, 3000, 5000];

export const AddTripExtraModal: React.FC<AddTripExtraModalProps> = ({
  visible,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ExtraCategory>('toll');
  const [amountStr, setAmountStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addTripExtra = useDriverTripStore((s) => s.addTripExtra);
  const currentCategory =
    CATEGORY_OPTIONS.find((c) => c.id === selectedCategory) || CATEGORY_OPTIONS[0];

  const handleSelectCategory = (cat: ExtraCategory) => {
    void Haptics.selectionAsync();
    setSelectedCategory(cat);
    setErrorMsg(null);
  };

  const handleSelectPreset = (preset: number) => {
    void Haptics.selectionAsync();
    setAmountStr(String(preset));
    setErrorMsg(null);
  };

  const handleSave = () => {
    const cleanAmount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (!cleanAmount || cleanAmount <= 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorMsg('Ingresá un monto válido mayor a $0.');
      return;
    }

    addTripExtra({
      category: selectedCategory,
      label: currentCategory.label,
      amount: cleanAmount,
      notes: notes.trim() || currentCategory.label,
    });

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Reset and close
    setAmountStr('');
    setNotes('');
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/80 justify-end">
        <SafeAreaView edges={['bottom']} className="w-full">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="bg-obsidian border-t border-white/10 rounded-t-[32px] p-5 max-h-[90vh]">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-4 border-b border-white/10">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-10 h-10 rounded-xl bg-gold/15 items-center justify-center border border-gold/30">
                    <Ionicons name="add-circle" size={22} color={THEME_COLORS.gold} />
                  </View>
                  <View>
                    <Text className="text-white font-montserrat-bold text-lg">
                      Agregar Peaje o Extra
                    </Text>
                    <Text className="text-ash font-montserrat text-xs">
                      100% percibido por el conductor sin comisión
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-white/5 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modal"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={THEME_COLORS.ash} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                className="pt-4"
              >
                {/* Category Pills */}
                <Text className="text-zinc-400 font-montserrat-semibold text-xs uppercase tracking-wider mb-2">
                  Tipo de cargo
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleSelectCategory(cat.id)}
                        className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                          isSelected
                            ? 'bg-gold/20 border-gold'
                            : 'bg-white/5 border-white/10'
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel={`Categoría ${cat.label}`}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={16}
                          color={isSelected ? THEME_COLORS.gold : THEME_COLORS.ash}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          className={`font-montserrat-semibold text-xs ${
                            isSelected ? 'text-gold' : 'text-zinc-300'
                          }`}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Amount Section */}
                <Text className="text-zinc-400 font-montserrat-semibold text-xs uppercase tracking-wider mb-2">
                  Monto a agregar ($ ARS)
                </Text>
                <View className="flex-row items-center bg-black/50 border border-white/15 rounded-2xl px-4 py-3 mb-3">
                  <Text className="text-gold font-montserrat-bold text-2xl mr-2">$</Text>
                  <TextInput
                    value={amountStr}
                    onChangeText={(val) => {
                      setAmountStr(val);
                      setErrorMsg(null);
                    }}
                    placeholder="0.00"
                    placeholderTextColor="#52525B"
                    keyboardType="numeric"
                    inputMode="decimal"
                    className="flex-1 text-white font-montserrat-bold text-2xl"
                    style={{ fontVariant: ['tabular-nums'] }}
                  />
                </View>

                {/* Quick Presets */}
                <View className="flex-row gap-2 mb-4">
                  {PRESET_AMOUNTS.map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => handleSelectPreset(preset)}
                      className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 items-center justify-center active:bg-gold/20"
                      accessibilityRole="button"
                      accessibilityLabel={`Sumar ${preset} pesos`}
                    >
                      <Text className="text-zinc-300 font-montserrat-medium text-xs">
                        +${preset.toLocaleString('es-AR')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes Input */}
                <Text className="text-zinc-400 font-montserrat-semibold text-xs uppercase tracking-wider mb-2">
                  Detalle o comprobante (opcional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={currentCategory.placeholder}
                  placeholderTextColor="#52525B"
                  maxLength={120}
                  className="bg-black/50 border border-white/15 rounded-2xl p-3.5 text-white font-montserrat text-xs mb-3"
                />

                {/* Information Callout */}
                <LiquidGlassContainer
                  variant="gold"
                  className="rounded-2xl p-3.5 mb-5 flex-row items-center border border-gold/20"
                >
                  <Ionicons name="information-circle" size={20} color={THEME_COLORS.gold} />
                  <Text className="text-zinc-300 font-montserrat text-[11px] ml-2 flex-1 leading-4">
                    Este importe se sumará automáticamente al recibo final del viaje y al total a cobrar en efectivo si aplica.
                  </Text>
                </LiquidGlassContainer>

                {/* Error message */}
                {errorMsg && (
                  <View className="bg-red-950/60 border border-red-500/40 rounded-xl p-2.5 mb-4 flex-row items-center">
                    <Ionicons name="alert-circle" size={16} color="#F87171" />
                    <Text className="text-red-400 font-montserrat text-xs ml-2">
                      {errorMsg}
                    </Text>
                  </View>
                )}

                {/* Submit Action */}
                <TouchableOpacity
                  onPress={handleSave}
                  className="w-full h-14 rounded-2xl bg-gold items-center justify-center mb-2 active:opacity-90 shadow-lg shadow-gold/20"
                  accessibilityRole="button"
                  accessibilityLabel="Guardar e imputar cargo adicional"
                >
                  <Text className="text-obsidian font-montserrat-bold text-base tracking-wide">
                    Guardar e Imputar Cargo
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
