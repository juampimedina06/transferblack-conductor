import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { deleteDriverAccount } from '@/core/driver/actions/driver.actions';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onClose,
}) => {
  const logout = useAuthStore((state) => state.logout);

  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    if (isDeleting) return;
    setPassword('');
    setReason('');
    setShowPassword(false);
    setErrorMessage(null);
    onClose();
  };

  const handleDelete = async () => {
    if (!password.trim()) {
      setErrorMessage('Debés ingresar tu contraseña para confirmar la eliminación.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await deleteDriverAccount({
        password: password.trim(),
        reason: reason.trim() ? reason.trim() : undefined,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Cierre de sesión atómico y purga de estado local tras la eliminación en el backend
      await logout();
      handleClose();
      router.replace('/auth/login' as any);
    } catch (err: any) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const serverMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'No se pudo procesar la eliminación de la cuenta. Verificá tu contraseña o comunicate con soporte.';
      setErrorMessage(serverMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center items-center bg-black/80 px-4"
      >
        <View className="w-full max-w-sm bg-[#12131A] border border-white/10 rounded-3xl p-6 shadow-2xl">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header con icono de advertencia */}
            <View className="items-center mb-5">
              <View className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 items-center justify-center mb-3">
                <Ionicons name="warning-outline" size={28} color="#EF4444" />
              </View>
              <Text className="text-white font-montserrat-bold text-xl text-center">
                Eliminar Cuenta
              </Text>
              <Text className="text-zinc-400 font-montserrat-regular text-xs text-center mt-1">
                Esta acción es permanente e irreversible
              </Text>
            </View>

            {/* Condiciones y detalles */}
            <View className="bg-red-950/20 border border-red-900/30 rounded-xl p-3 mb-4 space-y-1.5">
              <Text className="text-red-200 font-montserrat-semibold text-xs">
                Tené en cuenta:
              </Text>
              <Text className="text-zinc-300 font-montserrat-regular text-xs leading-4">
                • Tus datos personales serán completamente anonimizados.
              </Text>
              <Text className="text-zinc-300 font-montserrat-regular text-xs leading-4">
                • Tu perfil de chofer será dado de baja de inmediato.
              </Text>
              <Text className="text-zinc-300 font-montserrat-regular text-xs leading-4">
                • No podés tener viajes activos, viajes programados, deudas ni retiros pendientes.
              </Text>
            </View>

            {/* Error banner si hubo fallo */}
            {errorMessage && (
              <View className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 mb-4 flex-row items-center space-x-2">
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text className="text-red-400 font-montserrat-medium text-xs flex-1 ml-2">
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Input Contraseña */}
            <View className="mb-4">
              <Text className="text-zinc-400 font-montserrat-medium text-xs mb-1.5">
                Ingresá tu contraseña para confirmar
              </Text>
              <View className="flex-row items-center bg-[#1A1A22] border border-white/10 rounded-xl px-3.5 py-3">
                <Ionicons name="lock-closed-outline" size={18} color="#71717A" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Tu contraseña actual"
                  placeholderTextColor="#71717A"
                  autoCapitalize="none"
                  className="flex-1 text-white font-montserrat-regular text-sm ml-2.5"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#71717A"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Input Motivo (opcional) */}
            <View className="mb-6">
              <Text className="text-zinc-400 font-montserrat-medium text-xs mb-1.5">
                Motivo de la baja (opcional)
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                maxLength={500}
                multiline
                numberOfLines={3}
                placeholder="¿Por qué decidiste irte?"
                placeholderTextColor="#71717A"
                className="bg-[#1A1A22] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-montserrat-regular text-sm min-h-[70px] text-top"
              />
            </View>

            {/* Acciones */}
            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting || !password.trim()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Eliminar mi cuenta definitivamente"
                className={`w-full py-3.5 rounded-xl flex-row items-center justify-center space-x-2 ${
                  isDeleting || !password.trim()
                    ? 'bg-red-900/40 border border-red-900/30'
                    : 'bg-red-600 border border-red-500'
                }`}
              >
                {isDeleting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="text-white font-montserrat-semibold text-sm ml-2">
                      Eliminando cuenta...
                    </Text>
                  </>
                ) : (
                  <Text className="text-white font-montserrat-semibold text-sm">
                    Eliminar mi cuenta definitivamente
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleClose}
                disabled={isDeleting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                className="w-full py-3 items-center justify-center"
              >
                <Text className="text-zinc-400 font-montserrat-medium text-sm">
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

