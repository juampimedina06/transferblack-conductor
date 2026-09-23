import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import * as z from 'zod';
import { authActions } from '../../../core/auth/action/auth.actions';
import { Button } from '../../../presentation/components/ui/Button';
import { Input } from '../../../presentation/components/ui/Input';
import { useAuthStore } from '../../../presentation/auth/store/useAuthStore';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('El email no tiene un formato válido').max(320, 'El email es demasiado largo'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128, 'La contraseña no puede superar los 128 caracteres').regex(/[a-z]/, 'La contraseña debe incluir una minúscula').regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula').regex(/[0-9]/, 'La contraseña debe incluir un número'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData): Promise<void> => {
    try {
      setIsLoading(true);
      const session = await authActions.login(data.email, data.password);
      await setSession(session);

      const profile = session.data.profile;

      if (!profile.email_verified_at) {
        router.replace('/auth/verify-email' as any);
        return;
      }

      const isDriver = profile.roles?.includes('driver');
      if (!isDriver) {
        router.replace('/documentacion' as any);
        return;
      }

      router.replace('/(home)' as any);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error al iniciar sesión';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-obsidian">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 180 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View className="items-center mb-12 mt-10">
          <Image
            source={require('../../../../assets/images/transferblack/logo_transferblack_sinfodo.png')}
            style={{ width: 220, height: 60 }}
            contentFit="contain"
            transition={500}
          />
          <Text className="text-gold font-montserrat-medium mt-4 tracking-widest text-xs uppercase">Conducí con estilo</Text>
        </View>

        <View className="mb-8">
          <Text className="text-3xl font-montserrat-bold text-platinum mb-2">Bienvenido</Text>
          <Text className="text-ash font-montserrat text-base">Iniciá sesión para continuar ganando con la mejor tarifa del mercado.</Text>
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Correo Electrónico"
              placeholder="conductor@transferblack.com"
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Contraseña"
              placeholder="••••••••"
              secureTextEntry
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.password?.message}
            />
          )}
        />

        <View className="mt-8">
          <Button label="Entrar a mi cuenta" onPress={handleSubmit(onSubmit)} isLoading={isLoading} />
        </View>

        <View className="mt-8 flex-row justify-center items-center">
          <Text className="text-ash font-montserrat text-base">¿Todavía no sos conductor? </Text>
          <Link href="/auth/register" asChild>
            <Text className="text-gold font-montserrat-bold text-base ml-1">Sumate acá</Text>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}
