import React from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { profileSchema, ProfileFormData } from '../../presentation/onboarding/schemas/onboarding.schema';
import { useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';
import { useOnboardingMutations } from '../../presentation/onboarding/hooks/useOnboardingMutations';
import { Input } from '../../presentation/components/ui/Input';
import { Button } from '../../presentation/components/ui/Button';
import { Select } from '../../presentation/components/ui/Select';
import { DatePickerInput } from '../../presentation/components/ui/DatePickerInput';
import { PhoneInput } from '../../presentation/components/ui/PhoneInput';

import { useAuthStore } from '../../presentation/auth/store/useAuthStore';

const GENDER_OPTIONS = [
  { label: 'Masculino', value: 'MASCULINO' },
  { label: 'Femenino', value: 'FEMENINOO' },
  { label: 'Otro / Prefiero no decir', value: 'OTRO' },
];

const DOCUMENT_TYPE_OPTIONS = [
  { label: 'DNI (Documento Nacional)', value: 'DNI' },
  { label: 'CUIL', value: 'CUIL' },
];

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const { profileData, setProfileData, setCurrentStep } = useOnboardingStore();
  const { updateProfile } = useOnboardingMutations();

  // Chaining input refs
  const lastNameRef = React.useRef<any>(null);
  const phoneRef = React.useRef<any>(null);
  const docNumRef = React.useRef<any>(null);
  const addressRef = React.useRef<any>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: profileData || {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone_number: user?.phone_number || '',
      birth_date: user?.birth_date || '',
      gender: (user?.gender as any) || 'MASCULINO',
      document_type: (user?.document_type as any) || 'DNI',
      document_number: user?.document_number || '',
      address_text: user?.address_text || '',
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    // Sanitizar teléfono y documento para evitar 400 del backend
    const cleanData: ProfileFormData = {
      ...data,
      phone_number: data.phone_number.trim(),
      document_number: data.document_number.replace(/\D/g, ''),
    };

    updateProfile.mutate(cleanData, {
      onSuccess: () => {
        setProfileData(cleanData);
        setCurrentStep(2);
        router.push('/onboarding/vehicle' as any);
      },
      onError: (err: any) => {
        const apiError = err?.response?.data?.error;
        let errorMessage = 'Hubo un error al guardar tus datos. Intentá nuevamente.';
        if (apiError?.details && Array.isArray(apiError.details)) {
          errorMessage = apiError.details.map((d: any) => d.message).join('\n');
        } else if (apiError?.message) {
          errorMessage = apiError.message;
        }
        Alert.alert('Datos no válidos', errorMessage);
        console.error('Error al actualizar perfil:', apiError || err);
      },
    });
  };

  const currentYear = new Date().getFullYear();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-obsidian"
    >
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{
          paddingTop: Platform.OS === 'android' ? 36 : 24,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress Stepper */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gold font-montserrat-semibold text-xs tracking-wider uppercase">
              Paso 1 de 3
            </Text>
            <Text className="text-ash font-montserrat text-xs">
              Datos Personales
            </Text>
          </View>
          <View className="flex-row gap-2 h-1.5 w-full">
            <View className="flex-1 bg-gold rounded-full" />
            <View className="flex-1 bg-charcoal rounded-full" />
            <View className="flex-1 bg-charcoal rounded-full" />
          </View>
        </View>

        {/* Header Title */}
        <View className="mb-6">
          <Text className="text-2xl font-montserrat-bold text-platinum mb-1.5">
            Perfil del Conductor
          </Text>
          <Text className="text-ash font-montserrat text-sm leading-5">
            Completá tus datos personales para avanzar con la certificación exclusiva de TransferBlack.
          </Text>
        </View>

        {/* Form Fields */}
        <Controller
          control={control}
          name="first_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nombre"
              placeholder="Ej: Juan Pablo"
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
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
              ref={lastNameRef}
              label="Apellido"
              placeholder="Ej: Pérez"
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.last_name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="phone_number"
          render={({ field: { onChange, onBlur, value } }) => (
            <PhoneInput
              ref={phoneRef}
              label="Número de Teléfono"
              value={value}
              onChangePhone={onChange}
              onBlur={onBlur}
              returnKeyType="next"
              error={errors.phone_number?.message}
            />
          )}
        />

        {/* Date Picker Input for Birth Date */}
        <Controller
          control={control}
          name="birth_date"
          render={({ field: { onChange, value } }) => (
            <DatePickerInput
              label="Fecha de Nacimiento"
              placeholder="Seleccionar fecha"
              value={value}
              onChangeDate={onChange}
              maxYear={currentYear - 18}
              minYear={1950}
              error={errors.birth_date?.message}
            />
          )}
        />

        {/* Select for Gender */}
        <Controller
          control={control}
          name="gender"
          render={({ field: { onChange, value } }) => (
            <Select
              label="Género"
              placeholder="Seleccionar género"
              options={GENDER_OPTIONS}
              value={value}
              onSelect={onChange}
              error={errors.gender?.message}
            />
          )}
        />

        <View className="flex-row gap-3">
          <View className="w-1/2">
            <Controller
              control={control}
              name="document_type"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Tipo de Doc."
                  placeholder="Tipo"
                  options={DOCUMENT_TYPE_OPTIONS}
                  value={value}
                  onSelect={onChange}
                  error={errors.document_type?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="document_number"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={docNumRef}
                  label="Número"
                  placeholder="Sin puntos"
                  keyboardType="numeric"
                  returnKeyType="next"
                  onSubmitEditing={() => addressRef.current?.focus()}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.document_number?.message}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="address_text"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              ref={addressRef}
              label="Domicilio Actual"
              placeholder="Calle, número, ciudad"
              autoCapitalize="words"
              autoComplete="street-address"
              textContentType="fullStreetAddress"
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.address_text?.message}
            />
          )}
        />

        {/* Action Button */}
        <View className="mt-4 mb-8">
          <Button
            label="Continuar a Vehículo"
            variant="primary"
            isLoading={updateProfile.isPending}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


