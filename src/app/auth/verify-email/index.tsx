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
import * as z from 'zod';
import { authActions } from '../../../core/auth/action/auth.actions';
import { AuthError } from '../../../core/auth/interface/auth.interface';
import { THEME_COLORS } from '../../../core/constants/theme';
import { Button } from '../../../presentation/components/ui/Button';

import { useAuthStore } from '../../../presentation/auth/store/useAuthStore';

const verifySchema = z.object({
  token: z.string().length(6, 'El código debe tener 6 dígitos').regex(/^\d+$/, 'Solo números'),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function VerifyEmailScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(45);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const markEmailAsVerified = useAuthStore((state) => state.markEmailAsVerified);
  const logout = useAuthStore((state) => state.logout);

  const handleBack = async (): Promise<void> => {
    await logout();
    router.replace('/auth/login' as any);
  };

  const { control, handleSubmit, setValue } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      token: '',
    },
  });

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

  const onSubmit = async (data: VerifyFormData): Promise<void> => {
    try {
      setIsLoading(true);
      await authActions.verifyEmail(data.token);
      markEmailAsVerified();
      Alert.alert('Éxito', 'Email verificado correctamente');

      const user = useAuthStore.getState().user;
      const isDriver = user?.roles?.includes('driver');

      if (!isDriver) {
        router.replace('/(home)' as any);
      } else {
        router.replace('/(home)' as any);
      }
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        if (error.status === 400 && error.details?.attempts_remaining !== undefined) {
          Alert.alert('Error', `PIN incorrecto. Intentos restantes: ${error.details.attempts_remaining}`);
        } else if (error.status === 429) {
          Alert.alert('Atención', 'Se han agotado los intentos. Pedí un PIN nuevo.');
        } else if (error.status === 410) {
          Alert.alert('Expirado', 'El PIN ya venció. Pedí uno nuevo.');
        } else {
          Alert.alert('Error', error.message || 'Ocurrió un error al verificar');
        }
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Ocurrió un error inesperado al verificar.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authActions.resendVerification();
      Alert.alert('PIN Enviado', 'Revisá tu casilla de correo');
      setCooldown(60);
      setValue('token', '');
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        const retryInSeconds = typeof error.details?.retry_in_seconds === 'number' ? error.details.retry_in_seconds : undefined;
        if (error.status === 429 && retryInSeconds) {
          setCooldown(retryInSeconds);
          Alert.alert('Esperá', `Tenés que esperar ${retryInSeconds} segundos para pedir otro.`);
        } else {
          Alert.alert('Error', error.message || 'No se pudo reenviar el PIN');
        }
      } else if (error instanceof Error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'No se pudo reenviar el PIN');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-obsidian">
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
              accessibilityLabel="Volver al inicio de sesión"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-10 h-10 items-center justify-center rounded-full"
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Icon and Header */}
          <View className="items-center mt-2 mb-8">
            <Ionicons name="shield-checkmark" size={68} color={THEME_COLORS.gold} />
            <Text className="text-3xl font-montserrat-bold text-white text-center mt-6 mb-3">
              Verifica tu correo
            </Text>
            <Text className="text-ash font-montserrat text-sm text-center px-4 leading-6">
              Ingresa el código de 6 dígitos que enviamos a tu casilla de correo para activar tu cuenta.
            </Text>
          </View>

          {/* OTP Slots with hidden input */}
          <Controller
            control={control}
            name="token"
            render={({ field: { onChange, value } }) => (
              <View className="my-6 relative">
                <View className="flex-row justify-between w-full">
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const digit = value[index] || '';
                    const isCurrent = isInputFocused && (index === value.length || (index === 5 && value.length === 6));

                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={1}
                        onPress={() => inputRef.current?.focus()}
                        className={`w-12 h-16 rounded-2xl items-center justify-center bg-[#151518] border ${isCurrent
                            ? 'border-gold'
                            : digit
                              ? 'border-neutral-600'
                              : 'border-[#262629]'
                          }`}
                      >
                        <Text className="text-2xl font-montserrat-bold text-white">
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
                  accessibilityLabel="Ingresar código de verificación de 6 dígitos"
                />
              </View>
            )}
          />

          {/* Submit Button */}
          <Controller
            control={control}
            name="token"
            render={({ field: { value } }) => (
              <View className="mt-4">
                <Button
                  label="Validar Identidad"
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
              >
                <Text className="text-gold font-montserrat-bold text-sm">
                  Reenviar código
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Security Badge */}
          <View className="mt-auto pt-12 pb-4 flex-row items-center justify-center">
            <Ionicons name="shield-checkmark" size={14} color={THEME_COLORS.gold} style={{ marginRight: 6 }} />
            <Text className="text-neutral-500 font-montserrat-medium text-xs tracking-wider">
              CIFRADO DE EXTREMO A EXTREMO · 256-BIT
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
