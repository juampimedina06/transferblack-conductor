import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';
import { Button } from './Button';

interface DatePickerInputProps {
  label?: string;
  placeholder?: string;
  value?: string | null;
  onChangeDate: (dateStr: string) => void;
  error?: string;
  title?: string;
  minYear?: number;
  maxYear?: number;
  containerClassName?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  placeholder = 'AAAA-MM-DD',
  value,
  onChangeDate,
  error,
  title,
  minYear = 1950,
  maxYear = new Date().getFullYear(),
  containerClassName = 'mb-5',
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Parse local date safely without timezone offset shift
  const parseDate = (val?: string | null): Date => {
    if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const defaultYear = maxYear ? Math.min(new Date().getFullYear() - 18, maxYear) : 2000;
    return new Date(defaultYear, 0, 1);
  };

  const [tempDate, setTempDate] = useState<Date>(parseDate(value));

  const minDate = minYear ? new Date(minYear, 0, 1) : undefined;
  const maxDate = maxYear ? new Date(maxYear, 11, 31) : undefined;

  const handleOpen = () => {
    setTempDate(parseDate(value));
    setShowPicker(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onChangeDate(`${year}-${month}-${day}`);
    }
  };

  const handleIosConfirm = () => {
    const year = tempDate.getFullYear();
    const month = String(tempDate.getMonth() + 1).padStart(2, '0');
    const day = String(tempDate.getDate()).padStart(2, '0');
    onChangeDate(`${year}-${month}-${day}`);
    setShowPicker(false);
  };

  const formatDisplay = (val: string) => {
    if (!val || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const [y, m, d] = val.split('-');
    const monthName = MONTH_NAMES[parseInt(m, 10) - 1];
    return `${parseInt(d, 10)} de ${monthName} de ${y}`;
  };

  return (
    <View className={containerClassName}>
      {label && <Text className="mb-2 text-sm font-montserrat-medium text-platinum">{label}</Text>}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleOpen}
        className={`h-14 flex-row items-center justify-between rounded-xl border px-4 bg-charcoal ${
          error ? 'border-red-500 bg-red-900/20' : showPicker ? 'border-gold' : 'border-charcoal'
        }`}
      >
        <Text
          numberOfLines={1}
          className={`text-base font-montserrat ${value ? 'text-white' : 'text-ash'}`}
        >
          {value ? formatDisplay(value) : placeholder}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={showPicker ? THEME_COLORS.gold : THEME_COLORS.ash}
        />
      </TouchableOpacity>

      {error && <Text className="mt-1 text-xs text-red-400 font-montserrat">{error}</Text>}

      {/* Android: Native DatePickerDialog dialog */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="default"
          minimumDate={minDate}
          maximumDate={maxDate}
          onValueChange={(event, date) => {
            if (date) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              onChangeDate(`${year}-${month}-${day}`);
            }
            setShowPicker(false);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}

      {/* iOS: Native Wheel Picker in Bottom Sheet */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPicker(false)}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowPicker(false)}
              className="absolute inset-0 bg-black/80"
            />
            <View className="bg-obsidian border-t border-charcoal/90 rounded-t-3xl p-6 pb-10">
              <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-charcoal">
                <Text className="text-lg font-montserrat-bold text-platinum">
                  {title || label || 'Seleccionar Fecha'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPicker(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={22} color={THEME_COLORS.ash} />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                themeVariant="dark"
                minimumDate={minDate}
                maximumDate={maxDate}
                onChange={(_event, date) => date && setTempDate(date)}
              />

              <View className="mt-6">
                <Button
                  label="Confirmar Fecha"
                  variant="primary"
                  onPress={handleIosConfirm}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};
