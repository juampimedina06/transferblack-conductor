import React from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME_COLORS } from '../../../core/constants/theme';

interface SecurityModalProps {
  visible: boolean;
  onClose: () => void;
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

export const SecurityModal = ({ visible, onClose }: SecurityModalProps) => {
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
      onPress: handleCall911,
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
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableWithoutFeedback>
            <View className="bg-[#1C1C1E] rounded-t-3xl border-t border-[#2C2C2E] max-h-[85%] pb-8 shadow-2xl">
              {/* Header */}
              <View className="px-5 pt-5 pb-3 flex-row items-center justify-between border-b border-[#2C2C2E]">
                <TouchableOpacity
                  onPress={onClose}
                  className="w-10 h-10 items-center justify-center rounded-full bg-[#2C2C2E]/60"
                  accessibilityLabel="Cerrar funciones de seguridad"
                >
                  <Ionicons name="close" size={24} color={THEME_COLORS.platinum} />
                </TouchableOpacity>

                <Text className="text-platinum font-montserrat-bold text-lg text-center flex-1 pr-10">
                  Funciones de seguridad
                </Text>
              </View>

              {/* Items List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 8 }}
              >
                {securityItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                    className="flex-row items-center px-5 py-4 border-b border-[#2C2C2E]/40"
                  >
                    {/* Left Icon */}
                    <View className="w-10 items-center justify-center mr-3">
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={item.iconColor || THEME_COLORS.platinum}
                      />
                    </View>

                    {/* Content */}
                    <View className="flex-1 pr-2">
                      <Text
                        className={`font-montserrat-semibold text-base mb-0.5 ${
                          item.id === '911' ? 'text-red-500 font-montserrat-bold' : 'text-platinum'
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
                      <View className="bg-[#2C2C2E] px-2.5 py-1 rounded-full mr-2">
                        <Text className="text-ash font-montserrat-semibold text-[11px]">
                          {item.badge}
                        </Text>
                      </View>
                    )}

                    {/* Arrow */}
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={THEME_COLORS.ash}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
