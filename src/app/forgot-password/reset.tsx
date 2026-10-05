import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authActions } from '../../core/auth/action/auth.actions';
import { AuthError } from '../../core/auth/interface/auth.interface';
import { THEME_COLORS } from '../../core/constants/theme';
import {
  resetPasswordFormSchema,
  ResetPasswordFormData,
} from '../../presentation/auth/schemas/forgot-password.schema';
import { useForgotPasswordStore } from '../../presentation/auth/store/useForgotPasswordStore';
import { Button } from '../../presentation/components/ui/Button';
import { Input } from '../../presentation/components/ui/Input';
import { AmbientGlow } from '../../presentation/components/ui/AmbientGlow';

interface RequirementItemProps {
  label: string;
  isMet: boolean;
}

const RequirementItem = ({ label, isMet }: RequirementItemProps): React.JSX.Element => (
  <View className="flex-row items-center mb-2">
    <Ionicons
      name={isMet ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={isMet ? '#22C55E' : THEME_COLORS.ash}
      style={{ marginRight: 8 }}
    />
    <Text
      className={`font-montserrat text-xs ${
        isMet ? 'text-white font-montserrat-medium' : 'text-ash'
      }`}
    >
      {label}
    </Text>
  </View>
);

export default function ForgotPasswordResetScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const resetToken = useForgotPasswordStore((state) => state.resetToken);
  const clearStore = useForgotPasswordStore((state) => state.clear);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = useWatch({ control, name: 'password' }) || '';
  const confirmPasswordValue = useWatch({ control, name: 'confirmPassword' }) || '';

  // Real-time requirement calculations
  const hasMinLength = passwordValue.length >= 8;
  const hasUpperCase = /[A-Z]/.test(passwordValue);
  const hasLowerCase = /[a-z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const passwordsMatch =
    confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;

  const isFormValid =
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    passwordsMatch;

  // Guard: si no hay resetToken en memoria, volver al inicio del flujo
  useEffect(() => {
    if (!resetToken) {
      router.replace('/forgot-password' as any);
    }
  }, [resetToken]);

  const handleBack = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/forgot-password' as any);
  };

  const onSubmit = async (data: ResetPasswordFormData): Promise<void> => {
    if (!resetToken) {
      Alert.alert(
        'Sesión inválida',
        'No se encontró una sesión activa de restablecimiento. Por favor, volvé a solicitar el código.',
        [{ text: 'Aceptar', onPress: () => router.replace('/forgot-password' as any) }]
      );
      return;
    }

    try {
      setIsLoading(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await authActions.resetPassword(resetToken, data.password);

      // Limpiar el estado del flujo en memoria
      clearStore();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Contraseña restablecida',
        'Tu contraseña se actualizó correctamente. Ya podés iniciar sesión con tus nuevas credenciales.',
        [
          {
            text: 'Iniciar sesión',
            onPress: () => {
              router.replace('/auth/login' as any);
            },
          },
        ]
      );
    } catch (error: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error instanceof AuthError) {
        if (error.code === 'RESET_TOKEN_INVALID' || error.status === 400) {
          Alert.alert(
            'Sesión expirada',
            'El tiempo para restablecer la contraseña expiró o el enlace es inválido. Por favor, solicitá un nuevo código.',
            [
              {
                text: 'Solicitar nuevo código',
                onPress: () => {
                  clearStore();
                  router.replace('/forgot-password' as any);
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', error.message || 'No se pudo restablecer la contraseña');
        }
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al restablecer la contraseña');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-obsidian">
      {/* Ambient background glow */}
      <AmbientGlow position="top-left" height={360} opacity={0.22} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top navigation */}
          <View className="pt-2 pb-6">
            <TouchableOpacity
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-11 h-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 active:scale-95"
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View className="items-center mt-2 mb-6">
            <View className="w-20 h-20 rounded-3xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 items-center justify-center mb-6 shadow-lg shadow-black/40">
              <Ionicons name="lock-open" size={38} color={THEME_COLORS.gold} />
            </View>
            <Text className="text-3xl font-montserrat-bold text-white text-center mb-3">
              Nueva contraseña
            </Text>
            <Text className="text-ash font-montserrat text-sm text-center px-4 leading-6">
              Ingresá una contraseña segura que cumpla con los requisitos mínimos de seguridad.
            </Text>
          </View>

          {/* Inputs */}
          <View className="mt-2">
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nueva Contraseña"
                  placeholder="••••••••"
                  isPassword
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirmar Nueva Contraseña"
                  placeholder="••••••••"
                  isPassword
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            {/* Real-time requirements checklist */}
            <View className="bg-[#12131A]/90 p-4 rounded-2xl border border-white/10 mb-6">
              <Text className="text-platinum font-montserrat-semibold text-xs mb-3 uppercase tracking-wider">
                Requisitos de la contraseña:
              </Text>
              <RequirementItem label="Mínimo 8 caracteres" isMet={hasMinLength} />
              <RequirementItem label="Al menos una letra mayúscula" isMet={hasUpperCase} />
              <RequirementItem label="Al menos una letra minúscula" isMet={hasLowerCase} />
              <RequirementItem label="Al menos un número" isMet={hasNumber} />
              <RequirementItem label="Las contraseñas coinciden" isMet={passwordsMatch} />
            </View>

            {/* Submit button */}
            <View className="mt-2">
              <Button
                label="Restablecer contraseña"
                onPress={handleSubmit(onSubmit)}
                isLoading={isLoading}
                disabled={!isFormValid || isLoading}
              />
            </View>
          </View>

          {/* Bottom Security Badge */}
          <View className="mt-auto pt-10 pb-4 flex-row items-center justify-center">
            <Ionicons name="shield-checkmark" size={14} color={THEME_COLORS.gold} style={{ marginRight: 6 }} />
            <Text className="text-neutral-500 font-montserrat-medium text-xs tracking-wider">
              PROTECCIÓN AVANZADA DE CUENTA
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
