import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  TouchableWithoutFeedback,
  Share,
  Platform,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { AmbientGlow } from '../ui/AmbientGlow';
import { LegalTermsConsultModal } from '../legal/LegalTermsConsultModal';
import { DriverDocumentsModal } from '../compliance/DriverDocumentsModal';
import { IncidentReportModal } from '../trip/IncidentReportModal';
import { OfficialTripProofModal } from '../safety/OfficialTripProofModal';
import { BlockedPassengersModal } from '../safety/BlockedPassengersModal';
import { useDriverTripStore } from '../../trip/store/useDriverTripStore';
import { useSafetyStore } from '../../safety/store/useSafetyStore';
import { useDriverLocation } from '../../maps/hooks/useDriverLocation';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { Trip } from '../../../core/trip/interface/trip.interface';

interface SecurityModalProps {
  visible: boolean;
  onClose: () => void;
  trip?: Trip | null;
  /**
   * Flujo de emergencia enriquecido (discado 911 + alerta registrada en backend con GPS).
   * Cuando el padre no lo provee, el ítem 911 cae en el discado simple.
   */
  onEmergencySos?: () => void;
}

interface SecurityItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle: string;
  badge?: string;
  onPress: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  visible,
  onClose,
  trip: propTrip,
  onEmergencySos,
}) => {
  const storeTrip = useDriverTripStore((state) => state.activeTrip);
  const activeTrip = propTrip || storeTrip;
  const user = useAuthStore((state) => state.user);
  const blockedPassengers = useSafetyStore((state) => state.blockedPassengers);
  const { location } = useDriverLocation(true);

  // Modales secundarios de funciones reales de seguridad
  const [isLegalModalVisible, setIsLegalModalVisible] = useState(false);
  const [isDocsModalVisible, setIsDocsModalVisible] = useState(false);
  const [isIncidentModalVisible, setIsIncidentModalVisible] = useState(false);
  const [isTripProofModalVisible, setIsTripProofModalVisible] = useState(false);
  const [isBlockedModalVisible, setIsBlockedModalVisible] = useState(false);

  // 1. Manejador de 911 / SOS
  const handleCall911 = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Llamar al 911',
      '¿Estás seguro de que deseás llamar a los servicios policiales y de emergencia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Llamar al 911',
          style: 'destructive',
          onPress: () => {
            void Linking.openURL('tel:911');
          },
        },
      ]
    );
  };

  // 2. Manejador de Compartir Ubicación / Seguir Viaje (Share nativo de React Native)
  const handleShareTrip = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lat = location?.latitude;
    const lng = location?.longitude;
    const mapsUrl = lat && lng ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : '';

    const driverName = user
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Conductor TransferBlack'
      : 'Conductor TransferBlack';

    let message = '';
    if (activeTrip && activeTrip.status !== 'completed') {
      const dropoff = activeTrip.dropoff?.address || 'Destino fijado';
      message = `🛡️ TransferBlack - Seguimiento de Viaje en Vivo\n\nConductor: ${driverName}\nDestino: ${dropoff}\n${
        mapsUrl ? `📍 Seguí mi recorrido en tiempo real: ${mapsUrl}` : ''
      }`;
    } else {
      message = `🛡️ TransferBlack - Ubicación en Tiempo Real\n\nConductor: ${driverName}\n${
        mapsUrl ? `📍 Ubicación actual: ${mapsUrl}` : 'En servicio activo'
      }`;
    }

    try {
      await Share.share({
        title: 'Seguimiento de Seguridad TransferBlack',
        message,
      });
    } catch {
      // Ignorar si el usuario cancela el diálogo nativo de compartir
    }
  };

  // 3. Manejador de Reportar Accidente / Incidente
  const handleReportIncident = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTrip && activeTrip.status !== 'completed') {
      setIsIncidentModalVisible(true);
    } else {
      Alert.alert(
        'Asistencia por Siniestro o Incidente',
        'No tenés un viaje activo en curso. Si tuviste un siniestro reciente o requerís asistencia mecánica/seguridad, contactá a nuestra Central 24/7.',
        [
          { text: 'Cerrar', style: 'cancel' },
          {
            text: 'Llamar a Central 24/7',
            onPress: () => void Linking.openURL('tel:+5491155550199'),
          },
        ]
      );
    }
  };

  // 4. Central de Seguridad Telefónica 24/7
  const handleCallSupport = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Central de Seguridad TransferBlack',
      '¿Deseás comunicarte telefónicamente con nuestro equipo de monitoreo y soporte 24/7?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Llamar a Soporte',
          onPress: () => void Linking.openURL('tel:+5491155550199'),
        },
      ]
    );
  };

  const securityItems: SecurityItem[] = [
    {
      id: '911',
      icon: 'notifications',
      iconColor: '#EF4444',
      title: 'Emergencias: 911',
      subtitle: 'Contacta a los servicios de emergencia y alerta al centro de control',
      badge: 'SOS',
      onPress: () => {
        if (onEmergencySos) {
          onClose();
          onEmergencySos();
        } else {
          handleCall911();
        }
      },
    },
    {
      id: 'report_accident',
      icon: 'car-sport-outline',
      iconColor: '#F59E0B',
      title: 'Reportar Incidente o Siniestro',
      subtitle: activeTrip
        ? 'Reportá colisión, pasajero violento o daños en este viaje'
        : 'Asistencia y reporte operativo por siniestro o colisión',
      badge: activeTrip ? 'Viaje Activo' : undefined,
      onPress: handleReportIncident,
    },
    {
      id: 'follow_trip',
      icon: 'share-social-outline',
      iconColor: '#38BDF8',
      title: 'Compartir Mi Ubicación en Vivo',
      subtitle: 'Envía tu posición GPS y datos del viaje por WhatsApp o mensaje',
      onPress: handleShareTrip,
    },
    {
      id: 'trip_status_proof',
      icon: 'shield-checkmark-outline',
      iconColor: THEME_COLORS.gold,
      title: 'Comprobante de Viaje en Curso',
      subtitle: 'Exhibir ante controles policiales o autoridades de tránsito',
      badge: 'Oficial',
      onPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsTripProofModalVisible(true);
      },
    },
    {
      id: 'blocked_passengers',
      icon: 'person-remove-outline',
      iconColor: '#F43F5E',
      title: 'Pasajeros Bloqueados',
      subtitle: 'Gestioná pasajeros excluidos de futuros emparejamientos',
      badge: blockedPassengers.length > 0 ? `${blockedPassengers.length}` : undefined,
      onPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsBlockedModalVisible(true);
      },
    },
    {
      id: 'driver_documents',
      icon: 'file-tray-full-outline',
      iconColor: '#10B981',
      title: 'Mis Documentos y Habilitaciones',
      subtitle: 'Consultá tu carnet, seguro automotor, ITV y cédula vigente',
      badge: 'Legales',
      onPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsDocsModalVisible(true);
      },
    },
    {
      id: 'support_central',
      icon: 'headset-outline',
      iconColor: '#A78BFA',
      title: 'Central de Monitoreo TransferBlack',
      subtitle: 'Línea directa 24/7 con nuestro equipo de seguridad operativa',
      onPress: handleCallSupport,
    },
    {
      id: 'legal_terms',
      icon: 'document-text-outline',
      iconColor: '#94A3B8',
      title: 'Términos y Marco Legal',
      subtitle: 'Contrato de intermediación tecnológica y deslinde de responsabilidad',
      badge: 'Legal',
      onPress: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsLegalModalVisible(true);
      },
    },
  ];

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="flex-1 bg-black/75 justify-end">
            <TouchableWithoutFeedback>
              <View className="bg-[#0A0B10]/98 rounded-t-[36px] border-t border-red-500/30 max-h-[85%] pb-8 shadow-2xl relative overflow-hidden">
                {/* Blur Glass Layer */}
                <BlurView
                  intensity={Platform.OS === 'ios' ? 65 : 85}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
                <View
                  pointerEvents="none"
                  style={StyleSheet.absoluteFill}
                  className="bg-[#0A0B10]/90"
                />

                {/* Top Specular Edge Glass Highlight */}
                <View
                  pointerEvents="none"
                  className="absolute top-0 left-8 right-8 h-[1px] bg-white/25 rounded-full"
                />

                {/* Ambient Glow */}
                <AmbientGlow position="top-right" height={220} opacity={0.18} color="#EF4444" />

                {/* Drag Handle Indicator */}
                <View className="w-11 h-1 bg-white/25 rounded-full self-center mt-3 mb-1" />

                {/* Header */}
                <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-white/10">
                  <TouchableOpacity
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onClose();
                    }}
                    className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/15"
                    accessibilityLabel="Cerrar funciones de seguridad"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={20} color={THEME_COLORS.platinum} />
                  </TouchableOpacity>

                  <Text className="text-white font-montserrat-bold text-base text-center flex-1 pr-10 uppercase tracking-wide">
                    Funciones de Seguridad
                  </Text>
                </View>

                {/* Items List */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 16 }}
                >
                  {securityItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={item.onPress}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                      className={`flex-row items-center px-4 py-3.5 mb-2.5 rounded-2xl border ${
                        item.id === '911'
                          ? 'bg-red-500/15 border-red-500/40'
                          : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      {/* Left Icon */}
                      <View
                        className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                          item.id === '911'
                            ? 'bg-red-500/20'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <Ionicons
                          name={item.icon}
                          size={21}
                          color={
                            item.iconColor ||
                            (item.id === '911' ? '#EF4444' : THEME_COLORS.platinum)
                          }
                        />
                      </View>

                      {/* Content */}
                      <View className="flex-1 pr-2">
                        <Text
                          className={`font-montserrat-semibold text-sm mb-0.5 ${
                            item.id === '911'
                              ? 'text-red-400 font-montserrat-bold'
                              : 'text-white'
                          }`}
                        >
                          {item.title}
                        </Text>
                        <Text className="text-ash font-montserrat text-xs leading-4">
                          {item.subtitle}
                        </Text>
                      </View>

                      {/* Badge */}
                      {item.badge && (
                        <View
                          className={`px-2.5 py-1 rounded-full mr-2 border ${
                            item.id === '911'
                              ? 'bg-red-500/20 border-red-500/40'
                              : 'bg-white/10 border-white/15'
                          }`}
                        >
                          <Text
                            className={`font-montserrat-bold text-[10px] uppercase ${
                              item.id === '911' ? 'text-red-400' : 'text-ash'
                            }`}
                          >
                            {item.badge}
                          </Text>
                        </View>
                      )}

                      {/* Arrow */}
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={item.id === '911' ? '#F87171' : THEME_COLORS.ash}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de consulta de términos legales y deslinde */}
      <LegalTermsConsultModal
        visible={isLegalModalVisible}
        onClose={() => setIsLegalModalVisible(false)}
      />

      {/* Modal de gestión y renovación de documentos */}
      <DriverDocumentsModal
        visible={isDocsModalVisible}
        onClose={() => setIsDocsModalVisible(false)}
      />

      {/* Modal de reporte de incidentes y accidentes en viaje */}
      {activeTrip && (
        <IncidentReportModal
          visible={isIncidentModalVisible}
          tripId={activeTrip.id}
          passengerId={activeTrip.chat?.passenger_user_id || (activeTrip as any).passenger_id || null}
          passengerName={activeTrip.passenger?.fullName || undefined}
          onClose={() => setIsIncidentModalVisible(false)}
          onReportSuccess={() => {
            Alert.alert(
              'Reporte Registrado',
              'El incidente fue registrado y enviado a la central de seguridad de TransferBlack.'
            );
          }}
        />
      )}

      {/* Modal de comprobante oficial de viaje para control policial/tránsito */}
      <OfficialTripProofModal
        visible={isTripProofModalVisible}
        trip={activeTrip}
        driver={user}
        onClose={() => setIsTripProofModalVisible(false)}
      />

      {/* Modal de pasajeros bloqueados */}
      <BlockedPassengersModal
        visible={isBlockedModalVisible}
        onClose={() => setIsBlockedModalVisible(false)}
      />
    </>
  );
};
