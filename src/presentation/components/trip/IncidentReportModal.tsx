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
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { LiquidGlassContainer } from '../ui/LiquidGlassContainer';
import {
  INCIDENT_CATEGORIES,
  TripIncidentCategory,
} from '../../../core/safety/interface/incident.interface';
import { reportTripIncident } from '../../../core/safety/actions/incident.actions';

interface IncidentReportModalProps {
  visible: boolean;
  tripId: string;
  passengerId?: string | null;
  passengerName?: string;
  onClose: () => void;
  onReportSuccess?: () => void;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  visible,
  tripId,
  passengerId,
  passengerName = 'Pasajero',
  onClose,
  onReportSuccess,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<TripIncidentCategory>('violent_aggressive');
  const [description, setDescription] = useState<string>('');
  const [damageAmountStr, setDamageAmountStr] = useState<string>('');
  const [blockPassenger, setBlockPassenger] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCategoryConfig =
    INCIDENT_CATEGORIES.find((c) => c.id === selectedCategory) || INCIDENT_CATEGORIES[0];

  const handleSelectCategory = (cat: TripIncidentCategory) => {
    void Haptics.selectionAsync();
    setSelectedCategory(cat);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setErrorMessage('Por favor, describí brevemente lo sucedido.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const damageAmount = damageAmountStr
        ? parseFloat(damageAmountStr.replace(/[^0-9.]/g, ''))
        : undefined;

      await reportTripIncident({
        tripId,
        passengerId,
        passengerName,
        category: selectedCategory,
        description: description.trim(),
        blockPassenger,
        damageEstimatedAmount: damageAmount,
        reportedAt: new Date().toISOString(),
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onReportSuccess?.();
      onClose();
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(err?.message || 'Error al enviar el reporte. Por favor, reintentá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/85 justify-end">
        <SafeAreaView edges={['bottom']} className="w-full">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="bg-obsidian border-t border-red-500/20 rounded-t-[32px] p-5 max-h-[92vh]">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-4 border-b border-white/10">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-10 h-10 rounded-xl bg-red-500/20 items-center justify-center border border-red-500/40">
                    <Ionicons name="shield-outline" size={22} color="#EF4444" />
                  </View>
                  <View>
                    <Text className="text-white font-montserrat-bold text-lg">
                      Reportar Incidente
                    </Text>
                    <Text className="text-ash font-montserrat text-xs">
                      Viaje con {passengerName}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-9 h-9 rounded-full bg-white/5 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar modal de reporte"
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
                {/* Categoría del Incidente */}
                <Text className="text-zinc-400 font-montserrat-semibold text-xs uppercase tracking-wider mb-2">
                  Motivo principal
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {INCIDENT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => handleSelectCategory(cat.id)}
                        className={`flex-row items-center px-3 py-2 rounded-xl border ${
                          isSelected
                            ? 'bg-red-500/20 border-red-500'
                            : 'bg-white/5 border-white/10'
                        }`}
                        accessibilityRole="button"
                        accessibilityLabel={cat.label}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={15}
                          color={isSelected ? '#F87171' : THEME_COLORS.ash}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          className={`font-montserrat-semibold text-xs ${
                            isSelected ? 'text-red-400' : 'text-zinc-300'
                          }`}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Subtítulo explicativo de categoría */}
                <Text className="text-zinc-500 font-montserrat text-[11px] mb-4">
                  {activeCategoryConfig.description}
                </Text>

                {/* Campo de Daño si aplica */}
                {selectedCategory === 'damage_cleanliness' && (
                  <View className="mb-4">
                    <Text className="text-zinc-400 font-montserrat-semibold text-xs uppercase tracking-wider mb-2">
                      Costo estimado de limpieza o arreglo ($ ARS)
                    </Text>
                    <View className="flex-row items-center bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5">
                      <Text className="text-gold font-montserrat-bold text-lg mr-2">$</Text>
                      <TextInput
                        value={damageAmountStr}
                        onChangeText={setDamageAmountStr}
                        placeholder="Ej. 15000"
                        placeholderTextColor="#52525B"
                        keyboardType="numeric"
                        className="flex-1 text-white font-montserrat-bold text-base"
                      />
                    </View>
                  </View>
                )}

                {/* Detalle o descripción */}
                <Text className="text-zinc-400 font-montserrat-semibold text-xs uppercase tracking-wider mb-2">
                  Detalle de lo ocurrido
                </Text>
                <TextInput
                  value={description}
                  onChangeText={(val) => {
                    setDescription(val);
                    setErrorMessage(null);
                  }}
                  placeholder="Explicá brevemente qué pasó para que el equipo de soporte tome medidas..."
                  placeholderTextColor="#52525B"
                  multiline
                  maxLength={500}
                  className="bg-black/50 border border-white/15 rounded-2xl p-3.5 text-white font-montserrat text-xs min-h-[85px] mb-4"
                  textAlignVertical="top"
                />

                {/* Switch de Bloqueo de Pasajero */}
                <LiquidGlassContainer
                  variant="default"
                  className="rounded-2xl p-4 mb-5 border border-red-500/30 flex-row items-center justify-between"
                >
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Ionicons name="person-remove" size={16} color="#EF4444" />
                      <Text className="text-white font-montserrat-bold text-xs">
                        Bloquear emparejamiento futuro
                      </Text>
                    </View>
                    <Text className="text-zinc-400 font-montserrat text-[11px] leading-4">
                      No volverás a recibir viajes ni solicitudes de este pasajero en la plataforma.
                    </Text>
                  </View>
                  <Switch
                    value={blockPassenger}
                    onValueChange={(val) => {
                      void Haptics.selectionAsync();
                      setBlockPassenger(val);
                    }}
                    trackColor={{ false: '#27272A', true: '#EF4444' }}
                    thumbColor={blockPassenger ? '#FFFFFF' : '#A1A1AA'}
                  />
                </LiquidGlassContainer>

                {/* Error Banner */}
                {errorMessage && (
                  <View className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 mb-4 flex-row items-center">
                    <Ionicons name="alert-circle" size={16} color="#F87171" />
                    <Text className="text-red-400 font-montserrat text-xs ml-2 flex-1">
                      {errorMessage}
                    </Text>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl bg-red-600 items-center justify-center mb-2 active:opacity-90 shadow-lg shadow-red-600/30"
                  accessibilityRole="button"
                  accessibilityLabel="Enviar reporte de incidente"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-montserrat-bold text-base tracking-wide">
                      {blockPassenger ? 'Enviar Reporte y Bloquear' : 'Enviar Reporte'}
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
