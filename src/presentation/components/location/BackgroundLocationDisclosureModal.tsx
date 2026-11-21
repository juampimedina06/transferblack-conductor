import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { THEME_COLORS } from '@/core/constants/theme';
import { DRIVER_PRIVACY_URL, openLegalUrl } from '@/core/legal/constants/legalUrls.constants';
import { useBackgroundLocationDisclosureStore } from '@/presentation/location/store/useBackgroundLocationDisclosureStore';

/**
 * Modal de Divulgación Destacada (Prominent Disclosure) requerido por Google Play
 * antes de solicitar ACCESS_BACKGROUND_LOCATION ("Permitir todo el tiempo").
 */
export const BackgroundLocationDisclosureModal: React.FC = () => {
  const visible = useBackgroundLocationDisclosureStore((state) => state.visible);
  const resolveDisclosure = useBackgroundLocationDisclosureStore(
    (state) => state.resolveDisclosure
  );
  const insets = useSafeAreaInsets();

  const handleAccept = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resolveDisclosure(true);
  };

  const handleDecline = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resolveDisclosure(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDecline}
    >
      <View
        className="flex-1 bg-black/80 justify-center px-5"
        style={{
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <View className="w-full max-w-[400px] self-center rounded-3xl bg-[#11131A] border border-white/10 p-6">
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-gold/15 items-center justify-center mb-3.5">
                <Ionicons name="navigate-outline" size={26} color={THEME_COLORS.gold} />
              </View>
              <Text className="text-white font-montserrat-bold text-lg text-center">
                Ubicación en segundo plano
              </Text>
              <Text className="text-white/55 font-montserrat text-xs text-center mt-1">
                Necesario para recibir viajes y navegar en servicio
              </Text>
            </View>

            <Text className="text-white/90 font-montserrat-medium text-sm leading-5 mb-4">
              Transfer Black Conductor recopila datos de ubicación para asignarte viajes cercanos,
              calcular tarifas y ofrecer navegación giro a giro y seguridad en ruta{' '}
              <Text className="text-gold font-montserrat-semibold">
                incluso cuando la aplicación está cerrada o no está en uso
              </Text>
              .
            </Text>

            <View className="border-t border-white/[0.08] pt-4 pb-2 gap-3">
              <View className="flex-row items-start">
                <Ionicons
                  name="radio-outline"
                  size={17}
                  color={THEME_COLORS.gold}
                  style={{ marginTop: 1, marginRight: 10 }}
                />
                <Text className="text-white/70 font-montserrat text-xs leading-5 flex-1">
                  Solo se activa mientras estás conectado en línea o con un viaje en curso.
                </Text>
              </View>

              <View className="flex-row items-start">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color={THEME_COLORS.gold}
                  style={{ marginTop: 1, marginRight: 10 }}
                />
                <Text className="text-white/70 font-montserrat text-xs leading-5 flex-1">
                  Al desconectarte de la app, el seguimiento en segundo plano se detiene de
                  inmediato.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                void openLegalUrl(DRIVER_PRIVACY_URL);
              }}
              activeOpacity={0.75}
              accessibilityRole="link"
              accessibilityLabel="Leer Política de Privacidad"
              className="min-h-[44px] justify-center items-center mt-1 mb-3"
            >
              <Text className="text-gold font-montserrat-semibold text-xs underline">
                Ver Política de Privacidad
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAccept}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Continuar y configurar permiso de ubicación"
              className="w-full h-[52px] rounded-2xl bg-gold items-center justify-center active:opacity-90"
            >
              <Text className="text-obsidian font-montserrat-bold text-sm">
                Continuar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDecline}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="No permitir ubicación en segundo plano por ahora"
              className="w-full min-h-[44px] items-center justify-center mt-1.5"
            >
              <Text className="text-white/50 font-montserrat-medium text-xs">
                Ahora no
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
