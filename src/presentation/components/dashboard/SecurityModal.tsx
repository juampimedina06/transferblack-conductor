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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '../../../core/constants/theme';
import { AmbientGlow } from '../ui/AmbientGlow';
import { LegalTermsConsultModal } from '../legal/LegalTermsConsultModal';
import { DriverDocumentsModal } from '../compliance/DriverDocumentsModal';

interface SecurityModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Flujo de emergencia enriquecido (discado 911 + alerta registrada en backend).
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

export const SecurityModal = ({ visible, onClose, onEmergencySos }: SecurityModalProps) => {
  const [isLegalModalVisible, setIsLegalModalVisible] = useState(false);
  const [isDocsModalVisible, setIsDocsModalVisible] = useState(false);

  const handleCall911 = () => {
    Alert.alert(
      'Llamar al 911',
      '¿Estás seguro de que deseás llamar a los servicios de emergencia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Llamar',
          style: 'destructive',
          onPress: () => Linking.openURL('tel:911'),
        },
      ]
    );
  };

  const handleGenericItem = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: 'Entendido' }]);
  };

  const securityItems: SecurityItem[] = [
    {
      id: '911',
      icon: 'notifications',
      iconColor: '#EF4444',
      title: 'Emergencias: 911',
      subtitle: 'Contacta a los servicios de emergencia',
      onPress: onEmergencySos ?? handleCall911,
    },
    {
      id: 'record_trip',
      icon: 'videocam-outline',
      title: 'Grabar mi viaje',
      subtitle: 'La grabación comenzará cuando estés cerca del inicio del viaje.',
      badge: 'Vista previa',
      onPress: () =>
        handleGenericItem(
          'Grabar mi viaje',
          'Esta función te permite registrar audio/video de seguridad durante tus trayectos.'
        ),
    },
    {
      id: 'follow_trip',
      icon: 'share-social-outline',
      title: 'Seguir mi viaje',
      subtitle: 'Comparte tu ubicación y el estado del viaje.',
      onPress: () =>
        handleGenericItem(
          'Seguir mi viaje',
          'Compartí tu ubicación en tiempo real con contactos de confianza.'
        ),
    },
    {
      id: 'pin_verification',
      icon: 'keypad-outline',
      title: 'Verificación con código PIN',
      subtitle: 'Usa un código de usuario para asegurarte de recoger al correcto.',
      onPress: () =>
        handleGenericItem(
          'Código PIN',
          'Solicitá el PIN al pasajero antes de iniciar el viaje para validar su identidad.'
        ),
    },
    {
      id: 'trip_status_proof',
      icon: 'shield-outline',
      title: 'Comprobante del estado del viaje',
      subtitle: 'Muestra el estado actual a las fuerzas del orden público',
      onPress: () =>
        handleGenericItem(
          'Comprobante oficial',
          'Mostrá esta pantalla con los datos activos del viaje en caso de control policial o de tránsito.'
        ),
    },
    {
      id: 'report_accident',
      icon: 'car-sport-outline',
      title: 'Informa un accidente',
      subtitle: 'Envíanos los detalles si tienes un accidente',
      onPress: () =>
        handleGenericItem(
          'Reporte de siniestro',
          'Comunicate de inmediato con nuestro soporte 24/7 y la aseguradora asociada.'
        ),
    },
    {
      id: 'security_center',
      icon: 'shield-checkmark-outline',
      title: 'Centro de seguridad',
      subtitle: 'Consulta tu configuración y recursos de seguridad.',
      onPress: () =>
        handleGenericItem(
          'Centro de seguridad',
          'Accedé a guías de prevención, protocolos de viaje y contactos clave de TransferBlack.'
        ),
    },
    {
      id: 'driver_documents',
      icon: 'file-tray-full-outline',
      title: 'Mis Documentos y Habilitaciones',
      subtitle: 'Gestioná y renová tu carnet, seguro automotor, ITV y cédula.',
      badge: 'Legales',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsDocsModalVisible(true);
      },
    },
    {
      id: 'legal_terms',
      icon: 'document-text-outline',
      title: 'Términos y Marco Legal',
      subtitle: 'Contrato de intermediación tecnológica y deslinde de responsabilidad.',
      badge: 'Legal',
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              {/* Top Specular Edge Glass Highlight */}
              <View className="absolute top-0 left-8 right-8 h-[1px] bg-white/25 pointer-events-none" />

              {/* Ambient Glow */}
              <AmbientGlow position="top-right" height={220} opacity={0.18} color="#EF4444" />

              {/* Drag Handle Indicator */}
              <View className="w-11 h-1 bg-white/25 rounded-full self-center mt-3 mb-1" />

              {/* Header */}
              <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-white/10">
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                  className="w-10 h-10 items-center justify-center rounded-2xl bg-white/5 border border-white/15"
                  accessibilityLabel="Cerrar funciones de seguridad"
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
                    className={`flex-row items-center px-4 py-3.5 mb-2.5 rounded-2xl border ${
                      item.id === '911'
                        ? 'bg-red-500/15 border-red-500/40'
                        : 'bg-white/[0.03] border-white/10'
                    }`}
                  >
                    {/* Left Icon */}
                    <View className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                      item.id === '911' ? 'bg-red-500/20' : 'bg-white/5 border border-white/10'
                    }`}>
                      <Ionicons
                        name={item.icon}
                        size={21}
                        color={item.iconColor || (item.id === '911' ? '#EF4444' : THEME_COLORS.platinum)}
                      />
                    </View>

                    {/* Content */}
                    <View className="flex-1 pr-2">
                      <Text
                        className={`font-montserrat-semibold text-sm mb-0.5 ${
                          item.id === '911' ? 'text-red-400 font-montserrat-bold' : 'text-white'
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
                      <View className="bg-white/10 border border-white/15 px-2.5 py-1 rounded-full mr-2">
                        <Text className="text-ash font-montserrat-semibold text-[10px] uppercase">
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
  </>
  );
};
