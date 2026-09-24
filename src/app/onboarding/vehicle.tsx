import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { vehicleSchema, VehicleFormData } from '../../presentation/onboarding/schemas/onboarding.schema';
import { z } from 'zod';
import { useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';
import { Input } from '../../presentation/components/ui/Input';
import { Button } from '../../presentation/components/ui/Button';
import { Select, SelectOption } from '../../presentation/components/ui/Select';

const YEAR_OPTIONS: SelectOption[] = Array.from(
  { length: new Date().getFullYear() + 1 - 2011 + 1 },
  (_, i) => {
    const yr = new Date().getFullYear() + 1 - i;
    return { label: String(yr), value: yr };
  }
);

const COLOR_OPTIONS: SelectOption[] = [
  { label: 'Negro Obsidian', value: 'Negro' },
  { label: 'Gris Plata', value: 'Gris Plata' },
  { label: 'Gris Oscuro / Plomo', value: 'Gris Oscuro' },
  { label: 'Blanco Perla / Puro', value: 'Blanco' },
  { label: 'Azul Noche / Marino', value: 'Azul Marino' },
  { label: 'Otro Color', value: 'Otro' },
];

const SEAT_OPTIONS: SelectOption[] = [
  { label: '4 Asientos Pasajeros', value: 4 },
  { label: '5 Asientos Pasajeros', value: 5 },
  { label: '6 Asientos (SUV / Van)', value: 6 },
  { label: '7 Asientos (Van)', value: 7 },
  { label: '8 Asientos (Van VIP)', value: 8 },
];

const VEHICLE_TYPE_OPTIONS: SelectOption[] = [
  { label: 'Sedán Ejecutivo', value: 'Sedán' },
  { label: 'SUV Premium', value: 'SUV' },
  { label: 'Van VIP / Ejecutiva', value: 'Van' },
  { label: 'Monovolumen', value: 'Monovolumen' },
  { label: 'Blindado Especial', value: 'Blindado' },
];

export default function VehicleScreen() {
  const { vehicleData, setVehicleData, setCurrentStep } = useOnboardingStore();

  const brandRef = React.useRef<any>(null);
  const modelRef = React.useRef<any>(null);
  const engineRef = React.useRef<any>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<z.input<typeof vehicleSchema>, any, VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    mode: 'onTouched',
    defaultValues: vehicleData || ({
      plate: '',
      brand: '',
      model: '',
      year: undefined,
      color: '',
      seatCount: undefined,
      vehicleType: '',
      chassisNumber: '',
      engineNumber: '',
    } as unknown as z.input<typeof vehicleSchema>),
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding/profile' as any);
    }
  };

  const onSubmit = (data: VehicleFormData) => {
    setVehicleData(data);
    setCurrentStep(3);
    router.push('/onboarding/documents' as any);
  };

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
        {/* Back Button */}
        <TouchableOpacity 
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-charcoal items-center justify-center mb-6"
          activeOpacity={0.7}
          accessibilityLabel="Volver al paso anterior"
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Progress Stepper */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gold font-montserrat-semibold text-xs tracking-wider uppercase">
              Paso 2 de 3
            </Text>
            <Text className="text-ash font-montserrat text-xs">
              Tu Unidad
            </Text>
          </View>
          <View className="flex-row gap-2 h-1.5 w-full">
            <View className="flex-1 bg-gold rounded-full" />
            <View className="flex-1 bg-gold rounded-full" />
            <View className="flex-1 bg-charcoal rounded-full" />
          </View>
        </View>

        {/* Header Title */}
        <View className="mb-6">
          <Text className="text-2xl font-montserrat-bold text-platinum mb-1.5">
            Datos del Vehículo
          </Text>
          <Text className="text-ash font-montserrat text-sm leading-5">
            Registrá la unidad con la que brindarás el servicio de traslado exclusivo TransferBlack.
          </Text>
        </View>

        {/* Seccion: Datos Principales */}
        <View className="mb-2">
          <Text className="text-xs font-montserrat-semibold text-gold uppercase tracking-widest mb-3">
            Identificación Básica
          </Text>
        </View>

        <Controller
          control={control}
          name="plate"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Patente / Dominio"
              placeholder="Ej: AB 123 CD"
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => brandRef.current?.focus()}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.plate?.message}
            />
          )}
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="brand"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={brandRef}
                  label="Marca"
                  placeholder="Ej: Mercedes-Benz"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => modelRef.current?.focus()}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.brand?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="model"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  ref={modelRef}
                  label="Modelo"
                  placeholder="Ej: Clase C"
                  autoCapitalize="words"
                  returnKeyType="done"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.model?.message}
                />
              )}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="year"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Año"
                  placeholder="Año"
                  title="Año de Fabricación"
                  options={YEAR_OPTIONS}
                  value={value as number | undefined}
                  onSelect={onChange}
                  error={errors.year?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="color"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Color"
                  placeholder="Color"
                  title="Color de la Carrocería"
                  options={COLOR_OPTIONS}
                  value={value}
                  onSelect={onChange}
                  error={errors.color?.message}
                />
              )}
            />
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Controller
              control={control}
              name="seatCount"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Asientos"
                  placeholder="Asientos"
                  title="Capacidad de Pasajeros"
                  options={SEAT_OPTIONS}
                  value={value as number | undefined}
                  onSelect={onChange}
                  error={errors.seatCount?.message}
                />
              )}
            />
          </View>
          <View className="flex-1">
            <Controller
              control={control}
              name="vehicleType"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Categoría"
                  placeholder="Tipo"
                  title="Categoría del Vehículo"
                  options={VEHICLE_TYPE_OPTIONS}
                  value={value}
                  onSelect={onChange}
                  error={errors.vehicleType?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Seccion: Datos Técnicos */}
        <View className="mt-2 mb-2">
          <Text className="text-xs font-montserrat-semibold text-gold uppercase tracking-widest mb-3">
            Información Técnica
          </Text>
        </View>

        <Controller
          control={control}
          name="chassisNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Número de Chasis (VIN)"
              placeholder="17 dígitos alfanuméricos"
              autoCapitalize="characters"
              returnKeyType="next"
              onSubmitEditing={() => engineRef.current?.focus()}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.chassisNumber?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="engineNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              ref={engineRef}
              label="Número de Motor"
              placeholder="Número grabado en el motor"
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.engineNumber?.message}
            />
          )}
        />

        {/* Action Button */}
        <View className="mt-4 mb-8">
          <Button
            label="Continuar a Documentación"
            variant="primary"
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


