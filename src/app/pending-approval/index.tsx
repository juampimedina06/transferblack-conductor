import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { Alert, AppState, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { transferApi } from '../../core/api/transferApi';
import { THEME_COLORS } from '../../core/constants/theme';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { Button } from '../../presentation/components/ui/Button';
import { DatePickerInput } from '../../presentation/components/ui/DatePickerInput';
import { DocumentScannerModal } from '../../presentation/components/ui/DocumentScannerModal';
import { OnboardingService } from '../../presentation/onboarding/services/onboarding.service';
import { DocumentType } from '../../presentation/onboarding/store/useOnboardingStore';
import { PendingApprovalSkeleton } from './PendingApprovalSkeleton';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  dni: 'DNI (Frente y Dorso)',
  license_d1: 'Licencia Nacional de Conducir (Clase D1)',
  driver_license: 'Licencia Nacional de Conducir (Clase D1)',
  insurance_policy: 'Póliza de Seguro Automotor Vigente',
  criminal_record_national: 'Certificado de Antecedentes Penales (Nacional)',
  criminal_record_provincial: 'Certificado de Antecedentes Penales (Provincial)',
  sex_offenses_registry: 'Registro Provincial de Ofensores Sexuales',
  vehicle_title: 'Título de Propiedad Automotor',
  itv: 'Inspección Técnica Vehicular (ITV / RTO)',
};

const DOCUMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  dni: 'card-outline',
  license_d1: 'id-card-outline',
  driver_license: 'id-card-outline',
  insurance_policy: 'shield-outline',
  criminal_record_national: 'document-text-outline',
  criminal_record_provincial: 'document-text-outline',
  sex_offenses_registry: 'ribbon-outline',
  vehicle_title: 'car-outline',
  itv: 'construct-outline',
};

const formatDate = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  try {
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const toYyyyMmDd = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

interface DriverMeData {
  driverProfile: {
    id: string;
    approvalStatus: 'pending' | 'approved' | 'rejected' | string;
    availabilityStatus: string;
    rejectionReason: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  vehicle?: {
    id: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    vehicleType: string;
  } | null;
  driverDocuments?: Array<{
    id: string;
    documentType: string;
    filePath: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    documentNumber?: string | null;
  }>;
  vehicleDocuments?: Array<{
    id: string;
    documentType: string;
    filePath: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason: string | null;
    issuedAt: string | null;
    expiresAt: string | null;
    documentNumber?: string | null;
  }>;
}

export default function PendingApprovalScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [driverData, setDriverData] = useState<DriverMeData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const [fixingDoc, setFixingDoc] = useState<{ id: string, type: DocumentType } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);
  isUploadingRef.current = isUploading;

  const [retryDates, setRetryDates] = useState<Record<string, { issuedAt: string, expiresAt: string }>>({});
  const [retriedDocIds, setRetriedDocIds] = useState<Set<string>>(new Set());

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const checkStatus = async (_silent = false) => {
    try {
      const response = await transferApi.get<{ data: DriverMeData }>('/driver/me');
      const data = response.data.data;
      setDriverData(data);

      const now = new Date();
      setLastUpdated(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );

      if (data.driverProfile.approvalStatus === 'approved') {
        router.replace('/(home)' as any);
      } else {
        try {
          const meetingResponse = await transferApi.get('/driver/meeting');
          if (meetingResponse.data && meetingResponse.data.id) {
            router.replace('/confirmed-appointment' as any);
            return;
          }
        } catch (e) {
          // No meeting scheduled yet
        }
      }
    } catch (error: any) {
      if (error.response) {
        if (error.response.status === 401) {
          await logout();
          router.replace('/auth/login' as any);
        } else if (error.response.status === 404) {
          router.replace('/onboarding/profile' as any);
        } else {
          console.error('Error al verificar estado:', error);
        }
      } else {
        console.error('Error al verificar estado:', error);
      }
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/auth/login' as any);
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Fetch inmediato al ganar foco
      checkStatus();

      // Sondeo reactivo cada 4s para reflejar aprobaciones del admin en tiempo real
      const interval = setInterval(() => {
        if (AppState.currentState === 'active' && !isUploadingRef.current) {
          checkStatus(true);
        }
      }, 4000);

      return () => {
        clearInterval(interval);
      };
    }, [])
  );

  if (isLoadingInitial && !driverData) {
    return <PendingApprovalSkeleton />;
  }

  const isRejected = driverData?.driverProfile?.approvalStatus === 'rejected';
  const vehicle = driverData?.vehicle;
  const firstName = user?.first_name || 'Conductor';

  const allDocuments = [
    ...(driverData?.driverDocuments || []),
    ...(driverData?.vehicleDocuments || [])
  ];

  const totalDocsCount = allDocuments.length;
  const approvedDocsCount = allDocuments.filter((d) => d.status === 'approved').length;
  const rejectedDocsCount = allDocuments.filter((d) => d.status === 'rejected').length;
  const pendingDocsCount = allDocuments.filter((d) => d.status === 'pending').length;
  const relevantDocuments = allDocuments.filter(
    (d) => d.status === 'approved' || d.status === 'rejected' || retriedDocIds.has(d.id)
  );

  const handleFixDocument = (
    docId: string,
    documentType: string,
    currentIssued?: string | null,
    currentExpires?: string | null
  ) => {
    const dates = retryDates[docId] || {
      issuedAt: toYyyyMmDd(currentIssued),
      expiresAt: toYyyyMmDd(currentExpires),
    };

    if (!dates?.issuedAt || !dates?.expiresAt) {
      Alert.alert(
        'Faltan fechas',
        'Por favor ingresá la fecha de emisión y vencimiento del nuevo documento antes de continuar.'
      );
      return;
    }

    setRetryDates(prev => ({ ...prev, [docId]: dates }));
    setFixingDoc({ id: docId, type: documentType as DocumentType });
  };

  const handlePhotoCaptured = async (uri: string, mimeType: string) => {
    if (!fixingDoc) return;
    const docId = fixingDoc.id;
    try {
      setIsUploading(true);
      // 1. Subir el archivo multipart a POST /api/v1/documents/upload
      const uploadRes = await OnboardingService.uploadDocument(uri, mimeType, fixingDoc.type);

      // 2. Invocar endpoint de reintento PATCH /api/v1/driver/documents/:id/retry
      const dates = retryDates[docId];
      const issuedAt = toYyyyMmDd(dates?.issuedAt);
      const expiresAt = toYyyyMmDd(dates?.expiresAt);

      await transferApi.patch(`/driver/documents/${docId}/retry`, {
        filePath: uploadRes.filePath,
        issuedAt,
        expiresAt,
      });

      // 3. Registrar como reintentado para que figure en revisión visualmente
      setRetriedDocIds(prev => new Set(prev).add(docId));

      // 4. Limpiar estado temporal
      setFixingDoc(null);
      setRetryDates(prev => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });

      Alert.alert('Éxito', 'Documento actualizado correctamente y enviado a revisión.');
      await checkStatus();
    } catch (error: any) {
      console.error('Error al corregir documento:', error);
      const code = error?.response?.data?.code || error?.response?.data?.error;
      const backendMsg = error?.response?.data?.message;

      let displayMsg = 'No se pudo actualizar el documento. Intentá nuevamente.';
      if (code === 'DOCUMENT_NOT_REJECTED') {
        displayMsg = 'El documento no se encuentra en estado rechazado.';
      } else if (code === 'FILE_NOT_FOUND' || code === 'FILE_ALREADY_CLAIMED') {
        displayMsg = 'El archivo subido no es válido o ya fue utilizado.';
      } else if (code === 'DOCUMENT_NOT_OWNED') {
        displayMsg = 'No tenés permisos para modificar este documento.';
      } else if (code === 'DOCUMENT_NOT_FOUND') {
        displayMsg = 'No se encontró el documento solicitado.';
      } else if (backendMsg) {
        displayMsg = backendMsg;
      }

      Alert.alert('Error', displayMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Top Navigation Bar */}
      <View className="px-6 py-3 flex-row items-center justify-between border-b border-charcoal/40">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/40 items-center justify-center">
            <Ionicons name="shield-checkmark" size={16} color={THEME_COLORS.gold} />
          </View>
          <View>
            <Text className="text-gold font-montserrat-bold text-xs tracking-widest">
              TRANSFERBLACK
            </Text>
            <Text className="text-ash font-montserrat text-[10px] tracking-wider uppercase">
              Club de Conductores
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingVertical: 28, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME_COLORS.gold}
            colors={[THEME_COLORS.gold]}
          />
        }
      >
        {/* Status Aura Badge */}
        <View className="items-center mb-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-4 border"
            style={{
              backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.08)' : 'rgba(212, 175, 55, 0.08)',
              borderColor: isRejected ? 'rgba(239, 68, 68, 0.25)' : 'rgba(212, 175, 55, 0.25)',
            }}
          >
            <View
              className="w-16 h-16 rounded-full items-center justify-center border"
              style={{
                backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.18)',
                borderColor: isRejected ? 'rgba(239, 68, 68, 0.5)' : 'rgba(212, 175, 55, 0.5)',
              }}
            >
              <Ionicons
                name={isRejected ? 'alert-circle-outline' : 'hourglass-outline'}
                size={32}
                color={isRejected ? '#EF4444' : THEME_COLORS.gold}
              />
            </View>
          </View>

          {/* Pill Badge */}
          <View
            className="px-3.5 py-1 rounded-full border mb-3 flex-row items-center gap-1.5"
            style={{
              backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(44, 44, 46, 0.9)',
              borderColor: isRejected ? 'rgba(239, 68, 68, 0.4)' : 'rgba(212, 175, 55, 0.35)',
            }}
          >
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isRejected ? '#EF4444' : THEME_COLORS.gold }}
            />
            <Text
              className="font-montserrat-semibold text-xs tracking-wider uppercase"
              style={{ color: isRejected ? '#EF4444' : THEME_COLORS.gold }}
            >
              {isRejected ? 'Solicitud Observada' : 'Solicitud en Revisión'}
            </Text>
          </View>

          {/* Title & Description */}
          <Text className="text-2xl font-montserrat-bold text-platinum text-center mb-2">
            {isRejected ? 'Postulación No Aprobada' : 'Solicitud en Revisión'}
          </Text>
          <Text className="text-ash font-montserrat text-sm text-center leading-6 max-w-sm">
            {isRejected
              ? `Hola ${firstName}, la auditoría de compliance encontró observaciones en tu legajo.`
              : `Hola ${firstName}, recibimos tu documentación. Nuestro equipo de compliance está verificando tu legajo para asegurar los estándares de TransferBlack.`}
          </Text>
        </View>

        {/* Rejection Alert Box if applicable */}
        {isRejected && (
          <View
            className="w-full rounded-2xl p-4 mb-6 border"
            style={{ backgroundColor: 'rgba(69, 10, 10, 0.35)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            <View className="flex-row items-center mb-2">
              <Ionicons name="warning-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text className="text-red-400 font-montserrat-bold text-xs uppercase tracking-wider">
                Motivo Informado por Auditoría
              </Text>
            </View>
            <Text className="text-platinum font-montserrat text-xs leading-5 mb-4">
              {driverData?.driverProfile?.rejectionReason ||
                'Los documentos presentados o el vehículo no cumplen los requerimientos de la ordenanza vigente.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/onboarding/documents' as any)}
              className="bg-red-500/20 border border-red-500/50 py-2.5 rounded-xl items-center"
            >
              <Text className="text-red-300 font-montserrat-semibold text-xs">
                Modificar Documentos Cargados
              </Text>
            </TouchableOpacity>
          </View>
        )}


        {/* Estado del Proceso de Admisión (Timeline Dinámico Real) */}
        <View className="w-full bg-charcoal/50 border border-charcoal rounded-2xl p-5 mb-6">
          <Text className="text-xs font-montserrat-semibold text-gold uppercase tracking-wider mb-5">
            Estado del Proceso de Admisión
          </Text>

          {/* Step 1: Datos Personales */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5">
              <View className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 items-center justify-center">
                <Ionicons name="checkmark" size={14} color="#34D399" />
              </View>
              <View className="w-0.5 h-6 bg-emerald-500/30 my-1" />
            </View>
            <View className="flex-1 pt-0.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-platinum font-montserrat-semibold text-xs">
                  Datos Personales y Perfil
                </Text>
                <Text className="text-emerald-400 font-montserrat-medium text-[11px]">Validado</Text>
              </View>
              <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''} • Registrado` : 'Identidad y cuenta registradas'}
              </Text>
            </View>
          </View>

          {/* Step 2: Ficha Técnica de la Unidad */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5">
              <View
                className={`w-7 h-7 rounded-full items-center justify-center border ${vehicle
                    ? 'bg-emerald-500/15 border-emerald-500/40'
                    : 'bg-gold/15 border-gold/40'
                  }`}
              >
                <Ionicons
                  name={vehicle ? 'checkmark' : 'car-outline'}
                  size={14}
                  color={vehicle ? '#34D399' : THEME_COLORS.gold}
                />
              </View>
              <View
                className={`w-0.5 h-6 my-1 ${vehicle ? 'bg-emerald-500/30' : 'bg-charcoal'
                  }`}
              />
            </View>
            <View className="flex-1 pt-0.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-platinum font-montserrat-semibold text-xs">
                  Ficha Técnica de la Unidad
                </Text>
                <Text
                  className={`font-montserrat-medium text-[11px] ${vehicle ? 'text-emerald-400' : 'text-gold'
                    }`}
                >
                  {vehicle ? 'Registrado' : 'Pendiente'}
                </Text>
              </View>
              <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                {vehicle ? `${vehicle.brand} ${vehicle.model} • Patente ${vehicle.plate}` : 'Vehículo postulado'}
              </Text>
            </View>
          </View>

          {/* Step 3: Auditoría Legal y Documental */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5 self-stretch">
              <View
                className="w-7 h-7 rounded-full items-center justify-center border"
                style={{
                  backgroundColor:
                    rejectedDocsCount > 0 || isRejected
                      ? 'rgba(239, 68, 68, 0.2)'
                      : approvedDocsCount === totalDocsCount && totalDocsCount > 0
                        ? 'rgba(16, 185, 129, 0.2)'
                        : 'rgba(212, 175, 55, 0.2)',
                  borderColor:
                    rejectedDocsCount > 0 || isRejected
                      ? '#EF4444'
                      : approvedDocsCount === totalDocsCount && totalDocsCount > 0
                        ? '#34D399'
                        : THEME_COLORS.gold,
                }}
              >
                <Ionicons
                  name={
                    rejectedDocsCount > 0 || isRejected
                      ? 'close'
                      : approvedDocsCount === totalDocsCount && totalDocsCount > 0
                        ? 'checkmark'
                        : 'hourglass-outline'
                  }
                  size={13}
                  color={
                    rejectedDocsCount > 0 || isRejected
                      ? '#EF4444'
                      : approvedDocsCount === totalDocsCount && totalDocsCount > 0
                        ? '#34D399'
                        : THEME_COLORS.gold
                  }
                />
              </View>
              <View className="w-0.5 flex-1 bg-charcoal my-1 min-h-[24px]" />
            </View>
            <View className="flex-1 pt-0.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-platinum font-montserrat-semibold text-xs">
                  Auditoría Documental
                </Text>
                <Text
                  className="font-montserrat-medium text-[11px]"
                  style={{
                    color:
                      rejectedDocsCount > 0 || isRejected
                        ? '#EF4444'
                        : approvedDocsCount === totalDocsCount && totalDocsCount > 0
                          ? '#34D399'
                          : THEME_COLORS.gold,
                  }}
                >
                  {rejectedDocsCount > 0
                    ? `${rejectedDocsCount} Observado${rejectedDocsCount > 1 ? 's' : ''}`
                    : approvedDocsCount === totalDocsCount && totalDocsCount > 0
                      ? 'Aprobada'
                      : `En revisión (${approvedDocsCount}/${totalDocsCount})`}
                </Text>
              </View>
              <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                {rejectedDocsCount > 0
                  ? 'Hay documentos que requieren corrección'
                  : approvedDocsCount === totalDocsCount && totalDocsCount > 0
                    ? `Todos los documentos (${totalDocsCount}) fueron verificados`
                    : `Verificación en curso (${pendingDocsCount} pendientes)`}
              </Text>

              {/* Lista dinámica de documentos evaluados o reintentados */}
              {relevantDocuments.length > 0 && (
                <View className="mt-3 gap-2.5">
                  {relevantDocuments.map((doc, index) => {
                    const isDocRejected = doc.status === 'rejected';
                    const isDocApproved = doc.status === 'approved';
                    const isDocPending = doc.status === 'pending';

                    return (
                      <View
                        key={doc.id || index}
                        className={`p-3 rounded-xl border ${
                          isDocRejected
                            ? 'bg-red-500/10 border-red-500/30'
                            : isDocApproved
                              ? 'bg-emerald-500/5 border-emerald-500/20'
                              : 'bg-obsidian/70 border-charcoal/80'
                        }`}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-2 flex-1 pr-2">
                            <View className="w-7 h-7 rounded-lg bg-charcoal/80 border border-charcoal items-center justify-center">
                              <Ionicons
                                name={DOCUMENT_ICONS[doc.documentType] || 'document-text-outline'}
                                size={14}
                                color={
                                  isDocApproved
                                    ? '#34D399'
                                    : isDocRejected
                                      ? '#EF4444'
                                      : THEME_COLORS.gold
                                }
                              />
                            </View>
                            <Text className="text-platinum font-montserrat-semibold text-xs flex-1" numberOfLines={2}>
                              {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                            </Text>
                          </View>
                          <View
                            className={`px-2 py-0.5 rounded-md flex-row items-center gap-1 ${
                              isDocRejected
                                ? 'bg-red-500/20 border border-red-500/30'
                                : isDocApproved
                                  ? 'bg-emerald-500/20 border border-emerald-500/30'
                                  : 'bg-gold/20 border border-gold/30'
                            }`}
                          >
                            <Ionicons
                              name={
                                isDocApproved
                                  ? 'checkmark-circle'
                                  : isDocRejected
                                    ? 'alert-circle'
                                    : 'time'
                              }
                              size={10}
                              color={
                                isDocApproved
                                  ? '#34D399'
                                  : isDocRejected
                                    ? '#EF4444'
                                    : THEME_COLORS.gold
                              }
                            />
                            <Text
                              className={`font-montserrat-bold text-[9px] uppercase ${
                                isDocRejected
                                  ? 'text-red-400'
                                  : isDocApproved
                                    ? 'text-emerald-400'
                                    : 'text-gold'
                              }`}
                            >
                              {isDocRejected ? 'Rechazado' : isDocApproved ? 'Aprobado' : 'En Revisión'}
                            </Text>
                          </View>
                        </View>

                        {(doc.issuedAt || doc.expiresAt) && (
                          <View className="mb-1.5 px-0.5">
                            <Text className="text-ash font-montserrat text-[11px]">
                              {doc.issuedAt ? (
                                <>
                                  Emisión: <Text className="text-platinum">{formatDate(doc.issuedAt)}</Text>
                                </>
                              ) : null}
                              {doc.issuedAt && doc.expiresAt ? ' • ' : ''}
                              {doc.expiresAt ? (
                                <>
                                  Vencimiento: <Text className="text-platinum">{formatDate(doc.expiresAt)}</Text>
                                </>
                              ) : null}
                            </Text>
                          </View>
                        )}

                        {isDocPending && retriedDocIds.has(doc.id) && (
                          <View className="mt-0.5 mb-1 px-0.5">
                            <Text className="text-gold font-montserrat text-[11px]">
                              Reintento enviado • Pendiente de revisión
                            </Text>
                          </View>
                        )}

                        {isDocRejected && doc.rejectionReason && (
                          <View className="mt-1 mb-2 px-0.5">
                            <Text className="text-red-300 font-montserrat text-xs leading-5">
                              <Text className="font-montserrat-bold">Motivo: </Text>
                              {doc.rejectionReason}
                            </Text>
                          </View>
                        )}

                        {isDocRejected && (
                          <View className="mt-2 mb-2 p-2.5 rounded-lg border border-charcoal bg-charcoal/50">
                            <Text className="text-ash font-montserrat text-[11px] mb-2 text-center">
                              Ingresá las fechas del nuevo documento:
                            </Text>
                            <View className="flex-row gap-2">
                              <View className="flex-1">
                                <DatePickerInput
                                  value={retryDates[doc.id]?.issuedAt ?? toYyyyMmDd(doc.issuedAt)}
                                  onChangeDate={(d) =>
                                    setRetryDates((prev) => ({
                                      ...prev,
                                      [doc.id]: { ...prev[doc.id], issuedAt: d },
                                    }))
                                  }
                                  placeholder="Emisión"
                                  title="Fecha de Emisión"
                                  minYear={2015}
                                  maxYear={new Date().getFullYear()}
                                  containerClassName="mb-0"
                                />
                              </View>
                              <View className="flex-1">
                                <DatePickerInput
                                  value={retryDates[doc.id]?.expiresAt ?? toYyyyMmDd(doc.expiresAt)}
                                  onChangeDate={(d) =>
                                    setRetryDates((prev) => ({
                                      ...prev,
                                      [doc.id]: { ...prev[doc.id], expiresAt: d },
                                    }))
                                  }
                                  placeholder="Vencimiento"
                                  title="Fecha de Vencimiento"
                                  minYear={new Date().getFullYear()}
                                  maxYear={new Date().getFullYear() + 15}
                                  containerClassName="mb-0"
                                />
                              </View>
                            </View>
                          </View>
                        )}

                        {isDocRejected && (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleFixDocument(doc.id, doc.documentType, doc.issuedAt, doc.expiresAt)}
                            disabled={isUploading}
                            className={`py-2.5 mt-1 rounded-lg items-center ${
                              isUploading ? 'bg-charcoal/50' : 'bg-gold/20 border border-gold/40'
                            }`}
                          >
                            <Text className={`font-montserrat-semibold text-xs ${isUploading ? 'text-ash' : 'text-gold'}`}>
                              {isUploading && fixingDoc?.id === doc.id ? 'Subiendo...' : 'Corregir / Reintentar'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          {/* Step 4: Habilitación de Cuenta */}
          <View className="flex-row items-start">
            <View className="items-center mr-3.5">
              <View
                className={`w-7 h-7 rounded-full items-center justify-center border ${driverData?.driverProfile?.approvalStatus === 'approved'
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-obsidian border-charcoal'
                  }`}
              >
                <Ionicons
                  name={
                    driverData?.driverProfile?.approvalStatus === 'approved'
                      ? 'checkmark'
                      : 'radio-button-off'
                  }
                  size={12}
                  color={
                    driverData?.driverProfile?.approvalStatus === 'approved'
                      ? '#34D399'
                      : THEME_COLORS.ash
                  }
                />
              </View>
            </View>
            <View className="flex-1 pt-0.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-platinum font-montserrat-semibold text-xs">
                  Habilitación de Cuenta
                </Text>
                <Text
                  className={`font-montserrat text-[11px] ${driverData?.driverProfile?.approvalStatus === 'approved'
                      ? 'text-emerald-400 font-montserrat-medium'
                      : 'text-ash/60'
                    }`}
                >
                  {driverData?.driverProfile?.approvalStatus === 'approved' ? 'Habilitado' : 'Próximo'}
                </Text>
              </View>
              <Text className="text-ash/60 font-montserrat text-[11px] mt-0.5">
                {driverData?.driverProfile?.approvalStatus === 'approved'
                  ? 'Cuenta habilitada para aceptar viajes'
                  : 'En caso de ser seleccionado, se agendará una reunión para la activación final'}
              </Text>
            </View>
          </View>
        </View>

        {/* SLA Callout Banner */}
        <View
          className="rounded-2xl p-4 mb-8 border flex-row items-start"
          style={{ backgroundColor: 'rgba(212, 175, 55, 0.06)', borderColor: 'rgba(212, 175, 55, 0.25)' }}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={THEME_COLORS.gold}
            style={{ marginRight: 10, marginTop: 1 }}
          />
          <View className="flex-1">
            <Text className="text-gold font-montserrat-semibold text-xs mb-1">
              Tiempo estimado de revisión
            </Text>
            <Text className="text-ash font-montserrat text-xs leading-5">
              El proceso de auditoría demora habitualmente entre 24 y 48 horas hábiles. En caso de ser seleccionado, se te agendará una reunión para coordinar la habilitación de tu cuenta. Recibirás una notificación y esta pantalla se actualizará automáticamente.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="gap-3">
          <Button
            label="Cerrar Sesión"
            variant="outline"
            isLoading={isLoggingOut}
            onPress={handleLogout}
          />
          {lastUpdated ? (
            <Text className="text-ash/60 font-montserrat text-xs text-center">
              Última verificación a las {lastUpdated} hs
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {fixingDoc && (
        <DocumentScannerModal
          visible={true}
          docType={fixingDoc.type}
          stepIndex={1}
          totalSteps={1}
          onClose={() => setFixingDoc(null)}
          onPhotoCaptured={handlePhotoCaptured}
        />
      )}
    </SafeAreaView>
  );
}
