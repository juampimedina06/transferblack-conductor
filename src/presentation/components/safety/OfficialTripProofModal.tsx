import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { UserProfile } from '../../../core/auth/interface/auth.interface';

interface OfficialTripProofModalProps {
  visible: boolean;
  trip?: Trip | null;
  driver?: UserProfile | null;
  onClose: () => void;
}

export const OfficialTripProofModal: React.FC<OfficialTripProofModalProps> = ({
  visible,
  trip,
  driver,
  onClose,
}) => {
  const driverFullName = driver
    ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Conductor Registrado'
    : 'Conductor Registrado';
  const driverDni = driver?.document_number || 'En legajo oficial';
  const passengerName = trip?.passenger?.fullName || 'Pasajero TransferBlack';
  const tripCode = trip?.id ? `TB-${trip.id.slice(0, 8).toUpperCase()}` : 'TB-EN-ESPERA';
  const pickupAddress = trip?.pickup?.address || 'Punto de encuentro registrado';
  const dropoffAddress = trip?.dropoff?.address || 'Destino fijado';
  const nowFormatted = new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-[#0B0C10] rounded-t-[32px] border-t border-white/20 max-h-[90%] pb-8 shadow-2xl relative overflow-hidden">
          {/* Blur Glass Layer */}
          <BlurView
            intensity={Platform.OS === 'ios' ? 70 : 90}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            className="bg-[#0A0A0C]/90"
          />

          {/* Top highlight line */}
          <View
            pointerEvents="none"
            className="absolute top-0 left-8 right-8 h-[1px] bg-white/30 rounded-full"
          />

          {/* Handle */}
          <View className="w-10 h-1 bg-white/25 rounded-full self-center mt-3 mb-2" />

          {/* Header */}
          <View className="px-5 pt-2 pb-3.5 flex-row items-center justify-between border-b border-white/10">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              accessibilityLabel="Cerrar comprobante"
              accessibilityRole="button"
              className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/15"
            >
              <Ionicons name="close" size={20} color={THEME_COLORS.platinum} />
            </TouchableOpacity>

            <View className="items-center flex-1 pr-10">
              <Text className="text-white font-montserrat-bold text-sm uppercase tracking-wider text-center">
                Comprobante Oficial de Viaje
              </Text>
              <Text className="text-ash font-montserrat text-[11px] text-center">
                Fuerzas de Seguridad y Control de Tránsito
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
          >
            {trip && trip.status !== 'completed' ? (
              <>
                {/* Status Certificate Banner */}
                <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 mb-4 flex-row items-center">
                  <View className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center mr-3.5">
                    <Ionicons name="shield-checkmark" size={22} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-montserrat-bold text-xs text-emerald-400 uppercase tracking-wide">
                      Servicio Activo Habilitado
                    </Text>
                    <Text className="font-montserrat-medium text-xs text-white mt-0.5">
                      Código de Viaje: {tripCode}
                    </Text>
                    <Text className="font-montserrat text-[10px] text-ash mt-0.5">
                      Emisión: {nowFormatted} hs
                    </Text>
                  </View>
                </View>

                {/* Details Section */}
                <View className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 mb-4">
                  <Text className="font-montserrat-bold text-[10px] uppercase tracking-wider text-gold mb-3">
                    Datos del Conductor y Vehículo
                  </Text>

                  <View className="mb-2.5">
                    <Text className="font-montserrat text-[11px] text-ash">Conductor Titular:</Text>
                    <Text className="font-montserrat-semibold text-sm text-white">
                      {driverFullName}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-2.5">
                    <View className="flex-1 mr-2">
                      <Text className="font-montserrat text-[11px] text-ash">DNI / Documento:</Text>
                      <Text className="font-montserrat-semibold text-xs text-white">
                        {driverDni}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-montserrat text-[11px] text-ash">Plataforma:</Text>
                      <Text className="font-montserrat-semibold text-xs text-gold">
                        TransferBlack Conductor
                      </Text>
                    </View>
                  </View>

                  <View className="h-[1px] bg-white/10 my-2" />

                  <Text className="font-montserrat-bold text-[10px] uppercase tracking-wider text-gold mb-3">
                    Datos del Pasajero y Recorrido
                  </Text>

                  <View className="mb-2.5">
                    <Text className="font-montserrat text-[11px] text-ash">Pasajero Autorizado:</Text>
                    <Text className="font-montserrat-semibold text-sm text-white">
                      {passengerName}
                    </Text>
                  </View>

                  <View className="mb-2.5">
                    <Text className="font-montserrat text-[11px] text-ash">Punto de Retiro:</Text>
                    <Text className="font-montserrat-medium text-xs text-platinum">
                      {pickupAddress}
                    </Text>
                  </View>

                  <View className="mb-1">
                    <Text className="font-montserrat text-[11px] text-ash">Destino de Traslado:</Text>
                    <Text className="font-montserrat-medium text-xs text-platinum">
                      {dropoffAddress}
                    </Text>
                  </View>
                </View>

                {/* Legal Framework Certificate Notice */}
                <View className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-3.5 mb-4">
                  <View className="flex-row items-center mb-1.5">
                    <Ionicons name="information-circle-outline" size={16} color={THEME_COLORS.gold} />
                    <Text className="font-montserrat-bold text-[11px] text-white ml-2">
                      Validez Legal de Transporte Privado
                    </Text>
                  </View>
                  <Text className="font-montserrat text-[11px] text-ash leading-4">
                    Este traslado se realiza bajo modalidad privada entre particulares mediante
                    intermediación de plataforma tecnológica TransferBlack, con seguimiento
                    satelital continuo y seguro de responsabilidad civil vigente.
                  </Text>
                </View>
              </>
            ) : (
              /* Empty state: No active trip */
              <View className="items-center py-8 px-4">
                <View className="w-16 h-16 rounded-full bg-white/5 border border-white/15 items-center justify-center mb-4">
                  <Ionicons name="document-text-outline" size={30} color={THEME_COLORS.gold} />
                </View>
                <Text className="font-montserrat-bold text-base text-white text-center mb-2">
                  Sin Viaje Activo
                </Text>
                <Text className="font-montserrat text-xs text-ash text-center leading-5 max-w-[90%] mb-6">
                  Este comprobante digital se genera y valida automáticamente en tiempo real cuando
                  tenés un viaje en curso para que puedas exhibirlo ante cualquier control policial o de tránsito.
                </Text>
                <View className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                  <Text className="font-montserrat-bold text-[11px] text-gold mb-1 uppercase tracking-wide">
                    Conductor Habilitado
                  </Text>
                  <Text className="font-montserrat-semibold text-sm text-white">
                    {driverFullName}
                  </Text>
                  <Text className="font-montserrat text-xs text-ash mt-0.5">
                    DNI: {driverDni} · Estado: Activo en plataforma
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              activeOpacity={0.85}
              className="w-full h-12 rounded-2xl bg-white/10 border border-white/15 items-center justify-center mt-2"
            >
              <Text className="font-montserrat-semibold text-xs text-white">
                Cerrar Comprobante
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
