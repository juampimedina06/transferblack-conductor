import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { THEME_COLORS } from '../../core/constants/theme';
import {
  forgotPasswordEmailSchema,
  ForgotPasswordEmailFormData,
} from '../../presentation/auth/schemas/forgot-password.schema';
import { useForgotPasswordStore } from '../../presentation/auth/store/useForgotPasswordStore';
import { Button } from '../../presentation/components/ui/Button';
import { Input } from '../../presentation/components/ui/Input';
import { AmbientGlow } from '../../presentation/components/ui/AmbientGlow';

export default function ForgotPasswordRequestScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const setEmail = useForgotPasswordStore((state) => state.setEmail);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordEmailFormData>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleBack = (): void => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/auth/login' as any);
  };

  const onSubmit = async (data: ForgotPasswordEmailFormData): Promise<void> => {
    try {
      setIsLoading(true);
      setEmail(data.email);
      await authActions.forgotPassword(data.email);
    } catch {
      // Por seguridad y anti-enumeración, siempre avanzamos al paso 2
    } finally {
      setIsLoading(false);
      Alert.alert(
        'Código enviado',
        'Si el correo está registrado en TransferBlack, recibirás un código de 6 dígitos para restablecer tu contraseña.',
        [
          {
            text: 'Continuar',
            onPress: () => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/forgot-password/verify' as any);
            },
          },
        ]
      );
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
              accessibilityLabel="Volver al inicio de sesión"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-11 h-11 items-center justify-center rounded-2xl bg-white/5 border border-white/10 active:scale-95"
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View className="items-center mt-2 mb-8">
            <View className="w-20 h-20 rounded-3xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 items-center justify-center mb-6 shadow-lg shadow-black/40">
              <Ionicons name="lock-closed" size={38} color={THEME_COLORS.gold} />
            </View>
            <Text className="text-3xl font-montserrat-bold text-white text-center mb-3">
              ¿Olvidaste tu contraseña?
            </Text>
            <Text className="text-ash font-montserrat text-sm text-center px-4 leading-6">
              Ingresá el correo asociado a tu cuenta de conductor y te enviaremos un código para restablecerla.
            </Text>
          </View>

          {/* Form */}
          <View className="mt-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Correo Electrónico"
                  placeholder="conductor@transferblack.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <View className="mt-6">
              <Button
                label="Enviar código"
                onPress={handleSubmit(onSubmit)}
                isLoading={isLoading}
              />
            </View>
          </View>

          {/* Footer security info */}
          <View className="mt-auto pt-12 pb-4 flex-row items-center justify-center">
            <Ionicons name="shield-checkmark" size={14} color={THEME_COLORS.gold} style={{ marginRight: 6 }} />
            <Text className="text-neutral-500 font-montserrat-medium text-xs tracking-wider">
              TRANSFERBLACK · SEGURIDAD Y PRIVACIDAD
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
