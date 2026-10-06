import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { sosQueueService } from '@/core/safety/services/sosQueueService';
import { LatLng } from '@/core/location/interface/latLng.interface';

interface SosConfirmationModalProps {
  visible: boolean;
  tripId: string;
  fallbackLocation?: LatLng | null;
  onClose: () => void;
}

export const SosConfirmationModal: React.FC<SosConfirmationModalProps> = ({
  visible,
  tripId,
  fallbackLocation,
  onClose,
}) => {
  const [dialFailed, setDialFailed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirmEmergency = async () => {
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // 1. Discado inmediato al 911 (sin bloquear por GPS ni backend)
    try {
      const canOpen = await Linking.canOpenURL('tel:911').catch(() => true);
      if (canOpen) {
        await Linking.openURL('tel:911');
      } else {
        setDialFailed(true);
      }
    } catch {
      setDialFailed(true);
    }

    // Cerrar el modal para que el chofer esté en la app de llamada
    onClose();

    // 2. En segundo plano: obtener coordenadas y registrar alerta
    void (async () => {
      let lat = fallbackLocation?.latitude || 0;
      let lng = fallbackLocation?.longitude || 0;
      let accuracyMeters: number | undefined;

      try {
        // Primero intentamos la posición más reciente en caché
        const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastKnown?.coords) {
          lat = lastKnown.coords.latitude;
          lng = lastKnown.coords.longitude;
          accuracyMeters = lastKnown.coords.accuracy || undefined;
        }

        // Refinamos con lectura fresca con timeout corto (~3s)
        const fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (fresh?.coords) {
          lat = fresh.coords.latitude;
          lng = fresh.coords.longitude;
          accuracyMeters = fresh.coords.accuracy || undefined;
        }
      } catch {
        // Si el permiso o el hardware fallan, usamos la posición de respaldo del tracking
      }

      const clientEventId = Crypto.randomUUID();
      const clientTimestamp = new Date().toISOString();

      await sosQueueService.dispatchSosAlert(tripId, {
        clientEventId,
        lat,
        lng,
        accuracyMeters,
        clientTimestamp,
      });
    })();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/85 justify-center items-center px-6">
        <View className="w-full bg-[#14151B] rounded-3xl p-6 border border-red-500/40 shadow-2xl shadow-red-500/20">
          {/* Header Icon */}
          <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center self-center mb-4 border border-red-500/30">
            <Ionicons name="warning" size={32} color="#EF4444" />
          </View>

          {/* Title and message */}
          <Text className="text-white font-montserrat-bold text-xl text-center mb-2">
            ¿Llamar a Emergencias (911)?
          </Text>
          <Text className="text-zinc-300 font-montserrat-medium text-sm text-center leading-5 mb-6">
            Vas a realizar una llamada directa al 911 y se registrará automáticamente la ubicación de tu vehículo en la central de seguridad.
          </Text>

          {dialFailed && (
            <View className="bg-red-500/15 border border-red-500/40 rounded-xl p-3 mb-4">
              <Text className="text-red-400 font-montserrat-semibold text-center text-xs">
                No se pudo abrir el discador automáticamente. Por favor marcá manualmente al 911 en tu teléfono.
              </Text>
            </View>
          )}

          {/* Buttons: Big Confirmation Button & Cancel */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleConfirmEmergency}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Confirmar llamada al 911"
            className="w-full h-14 bg-red-600 rounded-2xl items-center justify-center flex-row shadow-lg shadow-red-600/40 mb-3"
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="call" size={22} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-montserrat-bold text-base tracking-wider uppercase">
                  Llamar al 911
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            disabled={isProcessing}
            accessibilityRole="button"
            accessibilityLabel="Cancelar alerta de emergencia"
            className="w-full h-12 bg-white/10 rounded-2xl items-center justify-center"
          >
            <Text className="text-zinc-300 font-montserrat-semibold text-sm">
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
