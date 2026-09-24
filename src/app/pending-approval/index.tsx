import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { transferApi } from '../../core/api/transferApi';
import { Button } from '../../presentation/components/ui/Button';
import { THEME_COLORS } from '../../core/constants/theme';
import { PendingApprovalSkeleton } from './PendingApprovalSkeleton';

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
}

export default function PendingApprovalScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [driverData, setDriverData] = useState<DriverMeData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const checkStatus = async () => {
    try {
      setIsChecking(true);
      const response = await transferApi.get<{ data: DriverMeData }>('/driver/me');
      const data = response.data.data;
      setDriverData(data);

      const now = new Date();
      setLastUpdated(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );

      if (data.driverProfile.approvalStatus === 'approved') {
        router.replace('/(home)' as any);
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
      setIsChecking(false);
      setIsLoadingInitial(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login' as any);
  };

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [])
  );

  if (isLoadingInitial && !driverData) {
    return <PendingApprovalSkeleton />;
  }

  const isRejected = driverData?.driverProfile?.approvalStatus === 'rejected';
  const vehicle = driverData?.vehicle;
  const firstName = user?.first_name || 'Conductor';

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

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLogout}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-charcoal/60 border border-charcoal"
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={14} color={THEME_COLORS.ash} />
          <Text className="text-ash font-montserrat-medium text-xs">Salir</Text>
        </TouchableOpacity>
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
              {isRejected ? 'Solicitud Observada' : 'En Auditoría de Seguridad'}
            </Text>
          </View>

          {/* Title & Description */}
          <Text className="text-2xl font-montserrat-bold text-platinum text-center mb-2">
            {isRejected ? 'Postulación No Aprobada' : 'Solicitud en Evaluación'}
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

        {/* Vehicle Card (if registered) */}
        {vehicle && (
          <View className="w-full bg-charcoal/40 border border-charcoal rounded-2xl p-4 mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="car-sport" size={16} color={THEME_COLORS.gold} />
                <Text className="text-gold font-montserrat-semibold text-xs tracking-wider uppercase">
                  Unidad Postulada
                </Text>
              </View>
              <View className="bg-obsidian border border-charcoal px-2.5 py-1 rounded-md">
                <Text className="text-platinum font-montserrat-bold text-xs tracking-widest">
                  {vehicle.plate}
                </Text>
              </View>
            </View>
            <Text className="text-platinum font-montserrat-bold text-base mb-1">
              {vehicle.brand} {vehicle.model} ({vehicle.year})
            </Text>
            <Text className="text-ash font-montserrat text-xs">
              Color: {vehicle.color} • Categoría: {vehicle.vehicleType}
            </Text>
          </View>
        )}

        {/* Progress Pipeline Card */}
        <View className="w-full bg-charcoal/50 border border-charcoal rounded-2xl p-5 mb-6">
          <Text className="text-xs font-montserrat-semibold text-gold uppercase tracking-wider mb-5">
            Estado del Proceso de Admisión
          </Text>

          {/* Step 1 */}
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
                  Datos Personales y DNI
                </Text>
                <Text className="text-emerald-400 font-montserrat-medium text-[11px]">Validado</Text>
              </View>
              <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                Identidad y antecedentes iniciales
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5">
              <View className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/40 items-center justify-center">
                <Ionicons name="checkmark" size={14} color="#34D399" />
              </View>
              <View className="w-0.5 h-6 bg-gold/40 my-1" />
            </View>
            <View className="flex-1 pt-0.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-platinum font-montserrat-semibold text-xs">
                  Ficha Técnica de la Unidad
                </Text>
                <Text className="text-emerald-400 font-montserrat-medium text-[11px]">Registrado</Text>
              </View>
              <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                Datos del vehículo y equipamiento
              </Text>
            </View>
          </View>

          {/* Step 3 */}
          <View className="flex-row items-start mb-4">
            <View className="items-center mr-3.5">
              <View
                className="w-7 h-7 rounded-full items-center justify-center border"
                style={{
                  backgroundColor: isRejected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                  borderColor: isRejected ? '#EF4444' : THEME_COLORS.gold,
                }}
              >
                <Ionicons
                  name={isRejected ? 'close' : 'hourglass-outline'}
                  size={13}
                  color={isRejected ? '#EF4444' : THEME_COLORS.gold}
                />
              </View>
              <View className="w-0.5 h-6 bg-charcoal my-1" />
            </View>
            <View className="flex-1 pt-0.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-platinum font-montserrat-semibold text-xs">
                  Auditoría Legal y RTO / ITV
                </Text>
                <Text
                  className="font-montserrat-medium text-[11px]"
                  style={{ color: isRejected ? '#EF4444' : THEME_COLORS.gold }}
                >
                  {isRejected ? 'Observado' : 'En revisión'}
                </Text>
              </View>
              <Text className="text-ash font-montserrat text-[11px] mt-0.5">
                Verificación de antecedentes penales e ITV
              </Text>
            </View>
          </View>

          {/* Step 4 */}
          <View className="flex-row items-start">
            <View className="items-center mr-3.5">
              <View className="w-7 h-7 rounded-full bg-obsidian border border-charcoal items-center justify-center">
                <Ionicons name="radio-button-off" size={12} color={THEME_COLORS.ash} />
              </View>
            </View>
            <View className="flex-1 pt-0.5">
              <View className="flex-row items-center justify-between">
                <Text className="text-ash font-montserrat-semibold text-xs">
                  Habilitación de Cuenta
                </Text>
                <Text className="text-ash/60 font-montserrat text-[11px]">Próximo</Text>
              </View>
              <Text className="text-ash/60 font-montserrat text-[11px] mt-0.5">
                Activación y acceso inmediato al panel
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
              El proceso de auditoría demora habitualmente entre 24 y 48 horas hábiles. Recibirás una notificación y esta pantalla se actualizará automáticamente.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="gap-3">
          <Button
            label="Actualizar Estado"
            variant="outline"
            isLoading={isChecking}
            onPress={checkStatus}
          />
          {lastUpdated ? (
            <Text className="text-ash/60 font-montserrat text-xs text-center">
              Última verificación a las {lastUpdated} hs
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
