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
import { PhoneInput } from '../../../presentation/components/ui/PhoneInput';
import { useAuthStore } from '../../../presentation/auth/store/useAuthStore';

const registerSchema = z.object({
  first_name: z.string().min(2, 'El nombre es muy corto'),
  last_name: z.string().min(2, 'El apellido es muy corto'),
  phone_e164: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Debe ser un formato internacional (ej: +5493511234567)'),
  email: z.string().trim().toLowerCase().email('El email no tiene un formato válido').max(320, 'El email es demasiado largo'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128, 'La contraseña no puede superar los 128 caracteres').regex(/[a-z]/, 'La contraseña debe incluir una minúscula').regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula').regex(/[0-9]/, 'La contraseña debe incluir un número'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone_e164: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData): Promise<void> => {
    try {
      setIsLoading(true);
      
      // 1. Register with email and password
      const session = await authActions.register(data.email, data.password);
      
      // 2. Save session (this will set the token in secure storage, required for the next call)
      await setSession(session);

      // 3. Update profile with the additional data
      await authActions.updateProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_e164,
      });

      router.replace('/auth/verify-email' as any);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error al registrarse';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-obsidian">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 260 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View className="items-center mb-8">
          <Image
            source={require('../../../../assets/images/transferblack/logo_transferblack_sinfodo.png')}
            style={{ width: 180, height: 50 }}
            contentFit="contain"
          />
        </View>

        <View className="mb-8">
          <Text className="text-3xl font-montserrat-bold text-platinum mb-2">Unite a Transfer Black</Text>
          <Text className="text-ash font-montserrat text-base">Completá tus datos para empezar a formar parte de nuestra flota premium.</Text>
        </View>

        <Controller
          control={control}
          name="first_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nombre"
              placeholder="Juan"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.first_name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="last_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Apellido"
              placeholder="Medina"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.last_name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone_e164"
          render={({ field: { onChange, onBlur, value } }) => (
            <PhoneInput
              label="Teléfono"
              value={value}
              onChangePhone={onChange}
              onBlur={onBlur}
              error={errors.phone_e164?.message}
            />
          )}
        />

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
          <Button label="Crear mi cuenta" onPress={handleSubmit(onSubmit)} isLoading={isLoading} />
        </View>

        <View className="mt-8 flex-row justify-center items-center">
          <Text className="text-ash font-montserrat text-base">¿Ya sos parte del equipo? </Text>
          <Link href="/auth/login" asChild>
            <Text className="text-gold font-montserrat-bold text-base ml-1">Iniciá sesión</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}