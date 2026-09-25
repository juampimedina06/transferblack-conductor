import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { transferApi } from '../../core/api/transferApi';
import { THEME_COLORS } from '../../core/constants/theme';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { Button } from '../../presentation/components/ui/Button';
import { Input } from '../../presentation/components/ui/Input';

interface MeetingData {
  id: string;
  driverId: string;
  status: 'proposed' | 'confirmed' | 'reschedule_requested' | 'completed' | 'cancelled';
  scheduledAt: string;
  location: string;
  driverNotes?: string;
  adminNotes?: string;
}

export default function ConfirmedAppointmentScreen() {
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const fetchMeeting = async (silent = false) => {
    try {
      const response = await transferApi.get('/driver/meeting');
      if (response.data) {
        setMeeting(response.data);
      } else {
        router.replace('/pending-approval' as any);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        router.replace('/pending-approval' as any);
      } else if (error.response?.status === 401) {
        await logout();
        router.replace('/auth/login' as any);
      } else if (!silent) {
        Alert.alert('Error', 'No se pudo cargar la información de la convocatoria.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMeeting();

      const interval = setInterval(() => {
        if (AppState.currentState === 'active') {
          fetchMeeting(true);
        }
      }, 5000);

      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeeting();
    setRefreshing(false);
  };

  const handleRespond = async (action: 'confirm' | 'reschedule_request') => {
    if (!meeting) return;
    if (action === 'reschedule_request' && !notes.trim()) {
      Alert.alert(
        'Datos requeridos',
        'Por favor indicá qué fechas u horarios alternativos te resultarían convenientes.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await transferApi.patch(`/driver/meeting/${meeting.id}/respond`, {
        action,
        driverNotes: notes.trim() ? notes : undefined,
      });

      Alert.alert(
        'Solicitud procesada',
        action === 'confirm'
          ? 'Asistencia confirmada. Tu pase VIP ha sido emitido.'
          : 'Solicitud de reprogramación enviada al equipo de selección.'
      );
      setShowReschedule(false);
      setNotes('');
      await fetchMeeting();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Ocurrió un inconveniente al procesar tu solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMaps = () => {
    if (!meeting?.location) return;
    const encoded = encodeURIComponent(meeting.location);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`).catch(() => {
      Alert.alert('Error', 'No se pudo abrir la aplicación de mapas.');
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-obsidian items-center justify-center">
        <ActivityIndicator size="small" color={THEME_COLORS.gold} />
        <Text className="text-ash font-montserrat text-xs mt-3 tracking-wider uppercase">
          Verificando credencial...
        </Text>
      </View>
    );
  }

  if (!meeting) return null;

  const isConfirmed = meeting.status === 'confirmed';
  const isRescheduleRequested = meeting.status === 'reschedule_requested';

  const scheduledDate = new Date(meeting.scheduledAt);
  const dayName = scheduledDate.toLocaleDateString('es-AR', { weekday: 'long' });
  const dayNumber = scheduledDate.getDate();
  const monthName = scheduledDate.toLocaleDateString('es-AR', { month: 'long' });
  const yearNumber = scheduledDate.getFullYear();
  const timeFormatted = scheduledDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const firstName = user?.first_name || 'Conductor';
  const shortId = meeting.id ? meeting.id.slice(-6).toUpperCase() : 'VIP';

  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Top VIP Brand Bar */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
        <View className="flex-row items-center gap-3">
          <View className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/40 items-center justify-center">
            <Text className="text-gold font-montserrat-bold text-xs tracking-wider">TB</Text>
          </View>
          <View>
            <Text className="text-platinum font-montserrat-bold text-[11px] tracking-[2px] uppercase">
              TRANSFERBLACK
            </Text>
            <Text className="text-gold font-montserrat text-[9px] tracking-[1.5px] uppercase">
              Private Chauffeur Club
            </Text>
          </View>
        </View>

        <View className="px-3 py-1 rounded-full bg-white/5 border border-gold/30">
          <Text className="text-gold font-montserrat-semibold text-[10px] tracking-wider uppercase">
            REF #{shortId}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingVertical: 32, paddingBottom: 40 }}
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
        <View className="mb-10 mt-4">
          <Text className="text-[10px] text-gold font-montserrat-semibold tracking-[3px] uppercase mb-3">
            {isConfirmed ? 'Pase de Ingreso' : 'Auditoría Presencial'}
          </Text>
          <Text className="text-3xl font-montserrat-bold text-platinum tracking-tight leading-9">
            {isConfirmed ? 'Acceso Autorizado' : 'Entrevista de Homologación'}
          </Text>
          <Text className="text-ash font-montserrat text-sm leading-6 mt-4">
            {isConfirmed
              ? `Estimado ${firstName}, tu lugar ha sido reservado. Te aguardamos en la sede establecida para la verificación final.`
              : isRescheduleRequested
                ? 'Tu solicitud de reprogramación se encuentra en revisión por la Dirección de Operaciones.'
                : `Estimado ${firstName}, tu perfil superó la auditoría inicial. Requerimos tu presencia para la homologación presencial.`}
          </Text>
        </View>

        <View className="mb-10">
          <Text className="text-[10px] text-ash font-montserrat-semibold tracking-[2px] uppercase mb-4">
            Detalles de Convocatoria
          </Text>
          
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-ash font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Fecha
              </Text>
              <Text className="text-platinum font-montserrat-medium text-base capitalize">
                {dayName}, {dayNumber} {monthName}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-ash font-montserrat text-[11px] uppercase tracking-wider mb-1">
                Hora
              </Text>
              <Text className="text-gold font-montserrat-bold text-base">
                {timeFormatted} HS
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-white/5 mb-6" />

          <View className="mb-6">
            <Text className="text-ash font-montserrat text-[11px] uppercase tracking-wider mb-1">
              Sede Central
            </Text>
            <Text className="text-platinum font-montserrat-medium text-sm leading-5">
              {meeting.location}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleOpenMaps}
            className="flex-row items-center gap-2"
          >
            <Ionicons name="navigate-outline" size={16} color={THEME_COLORS.gold} />
            <Text className="text-gold font-montserrat-medium text-xs tracking-wide uppercase">
              Abrir Navegación GPS
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mb-10">
          <Text className="text-[10px] text-ash font-montserrat-semibold tracking-[2px] uppercase mb-4">
            Protocolo de Ingreso
          </Text>

          <View className="gap-5">
            <View className="flex-row items-start gap-4">
              <View className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5" />
              <View className="flex-1">
                <Text className="text-platinum font-montserrat-medium text-sm mb-1">
                  Documentación Original
                </Text>
                <Text className="text-ash font-montserrat text-xs leading-5">
                  DNI, Licencia Nacional (Clase D1) y Seguro Automotor vigente.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-4">
              <View className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5" />
              <View className="flex-1">
                <Text className="text-platinum font-montserrat-medium text-sm mb-1">
                  Presentación de la Unidad
                </Text>
                <Text className="text-ash font-montserrat text-xs leading-5">
                  Vehículo en óptimas condiciones de higiene exterior e interior.
                </Text>
              </View>
            </View>

            <View className="flex-row items-start gap-4">
              <View className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5" />
              <View className="flex-1">
                <Text className="text-platinum font-montserrat-medium text-sm mb-1">
                  Dress Code
                </Text>
                <Text className="text-ash font-montserrat text-xs leading-5">
                  Atuendo formal oscuro, acorde a estándares VIP.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {meeting.adminNotes && (
          <View className="mb-10 p-5 bg-[#171510] rounded-xl border border-gold/20">
            <Text className="text-gold font-montserrat-medium text-[10px] uppercase tracking-widest mb-2">
              Instrucciones Adicionales
            </Text>
            <Text className="text-platinum font-montserrat text-xs leading-5">
              {meeting.adminNotes}
            </Text>
          </View>
        )}

        {meeting.status === 'proposed' && !showReschedule && (
          <View className="gap-4 mb-6 mt-4">
            <Button
              label="Confirmar Asistencia"
              onPress={() => handleRespond('confirm')}
              isLoading={isSubmitting}
            />
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => setShowReschedule(true)}
              className="py-3 items-center"
            >
              <Text className="text-ash font-montserrat-medium text-xs tracking-wide">
                Solicitar Reprogramación
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showReschedule && (
          <View className="mb-6 mt-2">
            <Text className="text-platinum font-montserrat-medium text-sm mb-2">
              Disponibilidad Alternativa
            </Text>
            <Text className="text-ash font-montserrat text-xs mb-4 leading-5">
              Por favor, indicá tus horarios disponibles para reasignar la cita.
            </Text>

            <Input
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej: Martes por la mañana..."
              placeholderTextColor={THEME_COLORS.ash}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top', color: 'white' }}
            />

            <View className="gap-3 mt-4">
              <Button
                label="Enviar Solicitud"
                onPress={() => handleRespond('reschedule_request')}
                isLoading={isSubmitting}
              />
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => setShowReschedule(false)}
                disabled={isSubmitting}
              />
            </View>
          </View>
        )}

        {isConfirmed && !showReschedule && (
          <View className="mb-6 mt-4 items-center">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowReschedule(true)}
              className="py-3"
            >
              <Text className="text-ash font-montserrat text-xs underline">
                ¿Problemas para asistir? Reprogramar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isRescheduleRequested && (
          <View className="mb-6 mt-2">
            <View className="p-4 rounded-xl border border-gold/20 bg-gold/5 flex-row items-start gap-3">
              <Ionicons name="time-outline" size={20} color={THEME_COLORS.gold} />
              <View className="flex-1">
                <Text className="text-gold font-montserrat-medium text-xs mb-1">
                  Reprogramación Solicitada
                </Text>
                <Text className="text-ash font-montserrat text-[11px] leading-4">
                  En breve nos contactaremos para asignar un nuevo turno.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="mb-8 mt-6">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              logout();
              router.replace('/auth/login' as any);
            }}
            className="py-4 items-center"
          >
            <Text className="text-ash/60 font-montserrat-medium text-[11px] tracking-wider uppercase">
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
