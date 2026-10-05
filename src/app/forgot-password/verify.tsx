import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authActions } from '../../core/auth/action/auth.actions';
import { AuthError } from '../../core/auth/interface/auth.interface';
import { THEME_COLORS } from '../../core/constants/theme';
import {
  verifyPinSchema,
  VerifyPinFormData,
} from '../../presentation/auth/schemas/forgot-password.schema';
import { useForgotPasswordStore } from '../../presentation/auth/store/useForgotPasswordStore';
import { Button } from '../../presentation/components/ui/Button';
import { AmbientGlow } from '../../presentation/components/ui/AmbientGlow';

export default function ForgotPasswordVerifyScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const email = useForgotPasswordStore((state) => state.email);
  const setResetToken = useForgotPasswordStore((state) => state.setResetToken);

  const { control, handleSubmit, setValue } = useForm<VerifyPinFormData>({
    resolver: zodResolver(verifyPinSchema),
    defaultValues: {
      code: '',
    },
  });

  // Guard: si no hay email configurado, volver al paso 1
  useEffect(() => {
    if (!email) {
      router.replace('/forgot-password' as any);
    }
  }, [email]);

  // Countdown timer for resend
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const formatCooldown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleBack = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/forgot-password' as any);
  };

  const onSubmit = async (data: VerifyPinFormData): Promise<void> => {
    try {
      setIsLoading(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const response = await authActions.verifyResetPasswordCode(email, data.code);
      setResetToken(response.data.reset_token, response.data.expires_in);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/forgot-password/reset' as any);
    } catch (error: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error instanceof AuthError) {
        if (error.code === 'VERIFICATION_CODE_LOCKED' || error.status === 429) {
          Alert.alert(
            'Límite de intentos',
            'Superaste los intentos permitidos. Por favor, solicitá un nuevo código.',
            [{ text: 'Aceptar', onPress: () => setValue('code', '') }]
          );
        } else if (error.code === 'VERIFICATION_CODE_EXPIRED') {
          Alert.alert(
            'Código vencido',
            'El código expiró. Por favor, solicitá uno nuevo.',
            [{ text: 'Aceptar', onPress: () => setValue('code', '') }]
          );
        } else if (
          error.code === 'VERIFICATION_CODE_INVALID' ||
          error.status === 400
        ) {
          const attemptsRemaining = error.details?.attempts_remaining;
          const message =
            typeof attemptsRemaining === 'number'
              ? `Código incorrecto. Te quedan ${attemptsRemaining} ${
                  attemptsRemaining === 1 ? 'intento' : 'intentos'
                }.`
              : error.message || 'Código incorrecto. Verificá los 6 dígitos.';
          Alert.alert('Código incorrecto', message);
        } else {
          Alert.alert('Error', error.message || 'Ocurrió un error al verificar el código');
        }
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al verificar');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (cooldown > 0 || isLoading) return;
    try {
      setIsLoading(true);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await authActions.forgotPassword(email);
      setCooldown(60);
      setValue('code', '');
      Alert.alert('Código reenviado', 'Revisá tu casilla de correo para ver el nuevo código.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo reenviar el código';
      Alert.alert('Error', message);
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
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top navigation */}
          <View className="pt-2 pb-6">
            <TouchableOpacity
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Volver al paso anterior"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-11 h-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 active:scale-95"
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View className="items-center mt-2 mb-8">
            <View className="w-20 h-20 rounded-3xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 items-center justify-center mb-6 shadow-lg shadow-black/40">
              <Ionicons name="shield-checkmark" size={38} color={THEME_COLORS.gold} />
            </View>
            <Text className="text-3xl font-montserrat-bold text-white text-center mb-3">
              Ingresá el código
            </Text>
            <Text className="text-ash font-montserrat text-sm text-center px-4 leading-6">
              Enviamos un PIN de 6 dígitos a{' '}
              <Text className="text-white font-montserrat-semibold">{email}</Text>.
            </Text>
          </View>

          {/* OTP Slots with hidden input */}
          <Controller
            control={control}
            name="code"
            render={({ field: { onChange, value } }) => (
              <View className="my-6 relative">
                <View className="flex-row justify-between w-full">
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = value[index] || '';
                    const isCurrent =
                      isInputFocused &&
                      (index === value.length || (index === 5 && value.length === 6));

                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={1}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          inputRef.current?.focus();
                        }}
                        className={`w-12 h-16 rounded-2xl items-center justify-center bg-[#12131A]/90 border ${
                          isCurrent
                            ? 'border-gold bg-gold/5 shadow-sm shadow-gold/20'
                            : digit
                            ? 'border-white/30 bg-white/5'
                            : 'border-white/10'
                        }`}
                      >
                        <Text
                          className="text-2xl font-montserrat-bold text-white"
                          style={{ fontVariant: ['tabular-nums'] }}
                        >
                          {digit}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Transparent input catching taps and keyboard input */}
                <TextInput
                  ref={inputRef}
                  value={value}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                    onChange(cleaned);
                  }}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  caretHidden
                  style={StyleSheet.absoluteFill}
                  className="opacity-0"
                  accessibilityLabel="Ingresar código numérico de 6 dígitos"
                />
              </View>
            )}
          />

          {/* Submit Button */}
          <Controller
            control={control}
            name="code"
            render={({ field: { value } }) => (
              <View className="mt-4">
                <Button
                  label="Verificar"
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isLoading}
                  disabled={value.length < 6 || isLoading}
                />
              </View>
            )}
          />

          {/* Resend Cooldown Section */}
          <View className="mt-8 flex-row justify-center items-center">
            <Text className="text-ash font-montserrat text-sm">¿No recibiste el código? </Text>
            {cooldown > 0 ? (
              <Text className="text-white font-montserrat-bold text-sm">
                Reenviar en {formatCooldown(cooldown)}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Reenviar código de verificación"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-gold font-montserrat-bold text-sm">
                  Reenviar código
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Security Badge */}
          <View className="mt-auto pt-12 pb-4 flex-row items-center justify-center">
            <Ionicons name="lock-closed" size={14} color={THEME_COLORS.gold} style={{ marginRight: 6 }} />
            <Text className="text-neutral-500 font-montserrat-medium text-xs tracking-wider">
              VALIDACIÓN SEGURA DE IDENTIDAD
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
