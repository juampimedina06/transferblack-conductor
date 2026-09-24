import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';
import { DocumentType } from '../../onboarding/store/useOnboardingStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const FRAME_HEIGHT = Math.round(FRAME_WIDTH * 0.65); // Proporción de documento / tarjeta (~1.54)

export interface DocumentHelpInfo {
  title: string;
  subtitle: string;
  watermark: string;
  whatIsIt: string;
  whereToGet: string;
  tips: string[];
}

export const DOCUMENT_HELP_DATA: Record<DocumentType, DocumentHelpInfo> = {
  dni: {
    title: 'DNI (Frente y Dorso)',
    subtitle: 'Asegurate de que el documento tenga buena iluminación y los datos sean legibles.',
    watermark: 'FRENTE O DORSO DE DNI',
    whatIsIt: 'Documento Nacional de Identidad argentino vigente que acredita tu identidad ante las autoridades.',
    whereToGet: 'Emitido por el Registro Nacional de las Personas (RENAPER). Podés fotografiar tu tarjeta plástica física o captura oficial.',
    tips: [
      'Ubicá el documento dentro del marco guía',
      'Evitá que la luz genere reflejos sobre la foto o los datos',
      'El número de DNI y fecha de vencimiento deben verse nítidos',
    ],
  },
  license_d1: {
    title: 'Licencia de Conducir (D1)',
    subtitle: 'Asegurate de que la categoría profesional D1 sea claramente visible.',
    watermark: 'FRENTE DE LICENCIA',
    whatIsIt: 'Licencia Nacional de Conducir con habilitación profesional D1, obligatoria para transporte de pasajeros hasta 8 plazas.',
    whereToGet: 'Tramitada en el Centro Emisor de Licencias de tu municipio o visible en la app oficial Mi Argentina.',
    tips: [
      'La categoría D1 debe estar vigente al momento de la postulación',
      'No se aceptan licencias vencidas ni trámites en curso no emitidos',
      'Asegurate de que tu nombre, clase y vigencia se lean con claridad',
    ],
  },
  insurance_policy: {
    title: 'Póliza de Seguro al Día',
    subtitle: 'Comprobante de póliza activa con cobertura comercial o para transporte.',
    watermark: 'PÓLIZA O CERTIFICADO',
    whatIsIt: 'Contrato de seguro automotor al día con cobertura de responsabilidad civil hacia terceros y personas transportadas.',
    whereToGet: 'Proporcionado por tu compañía aseguradora en formato digital o carátula de póliza física.',
    tips: [
      'Debe figurar claramente la vigencia (fecha desde y hasta)',
      'La patente y chasis deben coincidir exactamente con el vehículo',
      'Podés subir la foto de la credencial o el certificado de cobertura',
    ],
  },
  criminal_record_national: {
    title: 'Antecedentes Penales Nacionales',
    subtitle: 'Certificado de antecedentes emitido por el Registro Nacional de Reincidencia.',
    watermark: 'CERTIFICADO RNR',
    whatIsIt: 'Certificado oficial que acredita la carencia de antecedentes penales en el territorio de la República Argentina.',
    whereToGet: 'Se gestiona 100% online en www.dnrec.jus.gob.ar o directamente a través de Mi Argentina con clave fiscal.',
    tips: [
      'El certificado no debe superar los 60 días desde su emisión',
      'El código de validación digital o código QR debe ser legible',
      'Si lo tenés en PDF podés cargarlo desde la opción PDF',
    ],
  },
  criminal_record_provincial: {
    title: 'Antecedentes Provinciales',
    subtitle: 'Certificado expedido por la policía de la provincia correspondiente.',
    watermark: 'CERTIFICADO POLICIAL',
    whatIsIt: 'Constancia de buena conducta y antecedentes expedida por la división policial de tu provincia de residencia.',
    whereToGet: 'Se solicita en la jefatura policial o comisarías habilitadas de tu jurisdicción, o portal web provincial.',
    tips: [
      'Debe contar con firma, sello de la autoridad o firma digital verificable',
      'La fecha de expedición debe ser reciente',
    ],
  },
  sex_offenses_registry: {
    title: 'Registro de Ofensores Sexuales',
    subtitle: 'Constancia de no inscripción en el Registro Provincial de Condenados.',
    watermark: 'CERTIFICADO OFENSORES',
    whatIsIt: 'Certificado legal que certifica que no figurás en el Registro de Delitos contra la Integridad Sexual de la provincia.',
    whereToGet: 'Emitido por el Ministerio de Justicia provincial o Poder Judicial de la jurisdicción.',
    tips: [
      'Requisito fundamental para la seguridad y confianza del servicio VIP',
      'Revisá que figure tu número de documento completo',
    ],
  },
  vehicle_title: {
    title: 'Título de Propiedad Automotor',
    subtitle: 'Título de propiedad del vehículo o constancia del Registro Automotor.',
    watermark: 'TÍTULO DEL VEHÍCULO',
    whatIsIt: 'Título digital de propiedad automotor (CAT) expedido por la Dirección Nacional del Registro de la Propiedad Automotor (DNRPA).',
    whereToGet: 'Descargable desde la web oficial www.dnrpa.gov.ar con los datos de tu registro seccional.',
    tips: [
      'Deben coincidir los números de chasis y motor del auto registrado',
      'Las 4 esquinas de la hoja deben entrar en el visor',
    ],
  },
  itv: {
    title: 'ITV / RTO (Revisión Técnica)',
    subtitle: 'Constancia de inspección técnica vehicular obligatoria al día.',
    watermark: 'INSPECCIÓN TÉCNICA',
    whatIsIt: 'Certificado de Inspección Técnica Vehicular (ITV) o Revisión Técnica Obligatoria (RTO) que garantiza la aptitud mecánica del móvil.',
    whereToGet: 'Emitido por los talleres autorizados de verificación técnica vehicular de tu localidad.',
    tips: [
      'El resultado de la inspección debe figurar como APTO',
      'La fecha de vigencia debe estar al día',
      'La planilla de control o la oblea fotocopiada son válidas',
    ],
  },
};

interface DocumentScannerModalProps {
  visible: boolean;
  docType: DocumentType;
  stepIndex: number;
  totalSteps?: number;
  onClose: () => void;
  onPhotoCaptured: (uri: string, mimeType: string) => void;
  onPickFromGallery?: () => void;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  visible,
  docType,
  stepIndex,
  totalSteps = 8,
  onClose,
  onPhotoCaptured,
  onPickFromGallery,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const docInfo: DocumentHelpInfo = DOCUMENT_HELP_DATA[docType] || {
    title: 'Documento',
    subtitle: 'Asegurate de que tenga buena iluminación y los datos sean legibles.',
    watermark: 'DOCUMENTO',
    whatIsIt: 'Documento requerido para validar tu solicitud como conductor de TransferBlack.',
    whereToGet: 'Consultá con la entidad emisora correspondiente.',
    tips: ['Enfocá el documento dentro del marco', 'Evitá reflejos molestos'],
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        onPhotoCaptured(photo.uri, 'image/jpeg');
        onClose();
      }
    } catch (e) {
      console.error('Error al capturar foto:', e);
      Alert.alert('Error', 'No se pudo capturar la fotografía. Intentá nuevamente.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickFromGallery = async () => {
    if (onPickFromGallery) {
      onPickFromGallery();
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onPhotoCaptured(asset.uri, asset.mimeType || 'image/jpeg');
        onClose();
      }
    } catch (e) {
      console.error('Error al seleccionar de galería:', e);
      Alert.alert('Error', 'No se pudo seleccionar la imagen de la galería.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View className="flex-1 bg-obsidian">
        {/* Camera View */}
        {permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={flashEnabled}
          />
        ) : (
          <View className="flex-1 items-center justify-center p-6 bg-obsidian">
            <Ionicons name="camera-outline" size={64} color={THEME_COLORS.gold} />
            <Text className="text-xl font-montserrat-bold text-platinum text-center mt-4">
              Permiso de Cámara
            </Text>
            <Text className="text-sm font-montserrat text-ash text-center mt-2 mb-6">
              Para fotografiar tu documento con el visor inteligente necesitamos acceso a la cámara.
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              className="bg-gold py-3 px-8 rounded-xl mb-3"
            >
              <Text className="text-obsidian font-montserrat-bold text-sm">Habilitar Cámara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePickFromGallery}
              className="py-3 px-6 rounded-xl border border-charcoal"
            >
              <Text className="text-platinum font-montserrat-medium text-sm">
                Seleccionar de Galería
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dark Vignette Overlay around Viewfinder */}
        <View className="flex-1 justify-between p-6 pt-12 pb-8">
          {/* Top Bar */}
          <View>
            <View className="flex-row items-center justify-between mb-4">
              {/* Back Button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full bg-obsidian/70 border border-charcoal/80 items-center justify-center"
              >
                <Ionicons name="chevron-back" size={20} color={THEME_COLORS.platinum} />
              </TouchableOpacity>

              {/* Step Pill */}
              <View className="bg-obsidian/80 border border-gold/40 px-3.5 py-1.5 rounded-full">
                <Text className="text-gold font-montserrat-bold text-xs tracking-wider uppercase">
                  Paso {stepIndex} de {totalSteps}
                </Text>
              </View>

              {/* Help Button */}
              <TouchableOpacity
                onPress={() => setShowHelpModal(true)}
                activeOpacity={0.7}
                className="px-3 py-1.5 rounded-full bg-obsidian/70 border border-charcoal/80 flex-row items-center gap-1"
              >
                <Ionicons name="help-circle-outline" size={16} color={THEME_COLORS.gold} />
                <Text className="text-platinum font-montserrat-semibold text-xs">Ayuda</Text>
              </TouchableOpacity>
            </View>

            {/* Document Title & Subtitle */}
            <View className="px-1">
              <Text className="text-2xl font-montserrat-bold text-white mb-1.5">
                {docInfo.title}
              </Text>
              <Text className="text-ash font-montserrat text-xs leading-4">
                {docInfo.subtitle}
              </Text>
            </View>
          </View>

          {/* Central Viewfinder Frame */}
          <View className="items-center justify-center my-auto">
            <View
              style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
              className="relative items-center justify-center rounded-2xl bg-black/25 border border-white/20"
            >
              {/* Corner 1: Top-Left */}
              <View className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-xl" />
              {/* Corner 2: Top-Right */}
              <View className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-xl" />
              {/* Corner 3: Bottom-Left */}
              <View className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-xl" />
              {/* Corner 4: Bottom-Right */}
              <View className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-xl" />

              {/* Center Watermark & Guide */}
              <View className="items-center px-4">
                <Ionicons name="id-card-outline" size={54} color="rgba(255,255,255,0.22)" />
                <View className="w-48 h-[1px] bg-white/20 my-2" />
                <Text className="text-white/40 font-montserrat-bold text-[11px] tracking-widest text-center uppercase">
                  {docInfo.watermark}
                </Text>
              </View>
            </View>

            {/* Viewfinder Status & Tips */}
            <View className="items-center mt-4">
              <View className="flex-row items-center bg-obsidian/85 border border-charcoal/90 px-3 py-1 rounded-full mb-1.5">
                <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                <Text className="text-platinum font-montserrat-medium text-xs">
                  Documento requerido
                </Text>
              </View>
              <Text className="text-ash font-montserrat text-xs text-center">
                Evitá reflejos y bordes cortados en la toma
              </Text>
            </View>
          </View>

          {/* Bottom Controls Bar */}
          <View>
            <View className="flex-row items-center justify-around mb-4">
              {/* Galería Button */}
              <TouchableOpacity
                onPress={handlePickFromGallery}
                activeOpacity={0.7}
                className="items-center"
              >
                <View className="w-14 h-14 rounded-full bg-obsidian/85 border border-charcoal/90 items-center justify-center mb-1">
                  <Ionicons name="images-outline" size={22} color={THEME_COLORS.platinum} />
                </View>
                <Text className="text-ash font-montserrat-medium text-xs">Galería</Text>
              </TouchableOpacity>

              {/* Shutter Button (Gold Concentric Ring) */}
              <TouchableOpacity
                onPress={handleCapture}
                disabled={isCapturing}
                activeOpacity={0.8}
                className="items-center justify-center"
              >
                <View
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    borderWidth: 3,
                    borderColor: THEME_COLORS.gold,
                    backgroundColor: 'rgba(197, 160, 89, 0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 31,
                      backgroundColor: THEME_COLORS.gold,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: THEME_COLORS.gold,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 10,
                      elevation: 8,
                    }}
                  >
                    {isCapturing ? (
                      <ActivityIndicator size="small" color="#0A0A0C" />
                    ) : (
                      <View className="w-5 h-5 rounded-full border-2 border-obsidian/40" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Flash / Torch Toggle Button */}
              <TouchableOpacity
                onPress={() => setFlashEnabled((prev) => !prev)}
                activeOpacity={0.7}
                className="items-center"
              >
                <View
                  className={`w-14 h-14 rounded-full items-center justify-center mb-1 border ${
                    flashEnabled
                      ? 'bg-gold/20 border-gold'
                      : 'bg-obsidian/85 border-charcoal/90'
                  }`}
                >
                  <Ionicons
                    name={flashEnabled ? 'flash' : 'flash-off-outline'}
                    size={22}
                    color={flashEnabled ? THEME_COLORS.gold : THEME_COLORS.platinum}
                  />
                </View>
                <Text className="text-ash font-montserrat-medium text-xs">Flash</Text>
              </TouchableOpacity>
            </View>

            {/* Security Footnote */}
            <View className="flex-row items-center justify-center gap-1.5">
              <Ionicons name="shield-checkmark" size={14} color={THEME_COLORS.gold} />
              <Text className="text-ash/90 font-montserrat text-xs">
                Validación segura de documentación vehicular VIP
              </Text>
            </View>
          </View>
        </View>

        {/* Modal Bottom Sheet: AYUDA CONTEXTUAL */}
        <Modal
          visible={showHelpModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowHelpModal(false)}
              className="absolute inset-0 bg-black/80"
            />
            <View className="bg-obsidian border-t border-charcoal/90 rounded-t-3xl max-h-[85%] p-6 pb-10">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3 mb-4 border-b border-charcoal">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-gold/15 items-center justify-center">
                    <Ionicons name="information-circle" size={20} color={THEME_COLORS.gold} />
                  </View>
                  <Text className="text-lg font-montserrat-bold text-platinum">
                    Guía de Documento
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowHelpModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close" size={22} color={THEME_COLORS.ash} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Title & Badge */}
                <View className="mb-4">
                  <Text className="text-xl font-montserrat-bold text-gold mb-1">
                    {docInfo.title}
                  </Text>
                  <Text className="text-ash font-montserrat text-xs leading-4">
                    {docInfo.whatIsIt}
                  </Text>
                </View>

                {/* Dónde tramitarlo */}
                <View className="bg-charcoal/40 p-4 rounded-xl border border-charcoal mb-4">
                  <Text className="text-xs font-montserrat-bold text-platinum uppercase tracking-wider mb-1">
                    ¿Dónde se obtiene o tramita?
                  </Text>
                  <Text className="text-xs text-ash font-montserrat leading-5">
                    {docInfo.whereToGet}
                  </Text>
                </View>

                {/* Consejos para una toma válida */}
                <View className="bg-charcoal/40 p-4 rounded-xl border border-charcoal mb-6">
                  <Text className="text-xs font-montserrat-bold text-platinum uppercase tracking-wider mb-2">
                    Requisitos para la foto
                  </Text>
                  {docInfo.tips.map((tip, idx) => (
                    <View key={idx} className="flex-row items-start gap-2 mb-1.5">
                      <Ionicons
                        name="checkmark-circle"
                        size={15}
                        color={THEME_COLORS.gold}
                        style={{ marginTop: 2 }}
                      />
                      <Text className="text-xs text-platinum font-montserrat flex-1 leading-4">
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Dismiss button */}
                <TouchableOpacity
                  onPress={() => setShowHelpModal(false)}
                  className="bg-gold h-13 py-3.5 rounded-xl items-center justify-center"
                >
                  <Text className="text-obsidian font-montserrat-bold text-sm">
                    Entendido, volver a la cámara
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};
