import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useWalletStore } from '../../../presentation/wallet/store/useWalletStore';
import {
  PayoutMethodFormData,
  payoutMethodSchema,
} from '../../../presentation/wallet/schemas/payout-method.schema';
import { Input } from '../../../presentation/components/ui/Input';
import { Button } from '../../../presentation/components/ui/Button';

export default function PayoutMethodScreen() {
  const {
    payoutMethod,
    isLoadingPayoutMethod,
    isSavingPayoutMethod,
    fetchPayoutMethod,
    savePayoutMethod,
  } = useWalletStore();

  const cbuRef = useRef<TextInput>(null);
  const aliasRef = useRef<TextInput>(null);
  const holderNameRef = useRef<TextInput>(null);
  const holderDocRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PayoutMethodFormData>({
    resolver: zodResolver(payoutMethodSchema),
    mode: 'onTouched',
    defaultValues: {
      account_type: 'CVU',
      cbu_cvu: '',
      alias: '',
      account_holder_name: '',
      account_holder_document: '',
    },
  });

  useEffect(() => {
    const loadMethod = async () => {
      const data = await fetchPayoutMethod();
      if (data) {
        reset({
          account_type: data.account_type,
          cbu_cvu: data.cbu_cvu,
          alias: data.alias,
          account_holder_name: data.account_holder_name,
          account_holder_document: data.account_holder_document,
        });
      }
    };
    loadMethod();
  }, [fetchPayoutMethod, reset]);

  const onSubmit = async (formData: PayoutMethodFormData) => {
    try {
      await savePayoutMethod({
        account_type: formData.account_type,
        cbu_cvu: formData.cbu_cvu.trim(),
        alias: formData.alias.trim(),
        account_holder_name: formData.account_holder_name.trim(),
        account_holder_document: formData.account_holder_document.trim(),
      });

      Alert.alert(
        'Cuenta guardada',
        'Tu medio de cobro se ha registrado correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar el medio de cobro';
      Alert.alert('Error', msg);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-charcoal/50">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver a la billetera"
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-charcoal/30 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color={THEME_COLORS.platinum} />
        </TouchableOpacity>
        <Text className="text-platinum font-montserrat-bold text-lg ml-4">
          Configurar Cuenta de Cobro
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-4 pt-6"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoadingPayoutMethod && !payoutMethod ? (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="large" color={THEME_COLORS.gold} />
              <Text className="text-ash font-montserrat text-sm mt-4">
                Cargando cuenta de cobro...
              </Text>
            </View>
          ) : (
            <>
              {/* Info Banner */}
              <View className="bg-charcoal/30 border border-charcoal/60 rounded-2xl p-4 mb-6 flex-row items-start">
                <Ionicons name="shield-checkmark-outline" size={24} color={THEME_COLORS.gold} className="mt-0.5" />
                <View className="ml-3 flex-1">
                  <Text className="text-platinum font-montserrat-semibold text-sm mb-1">
                    Cuenta para recibir transferencias
                  </Text>
                  <Text className="text-ash font-montserrat text-xs leading-relaxed">
                    Asegurate de que los datos correspondan a una cuenta bancaria o virtual activa a tu nombre.
                  </Text>
                </View>
              </View>

              {/* Selector CBU / CVU */}
              <View className="mb-5">
                <Text className="mb-2 text-sm font-montserrat-medium text-platinum">
                  Tipo de Cuenta
                </Text>
                <Controller
                  control={control}
                  name="account_type"
                  render={({ field: { value, onChange } }) => (
                    <View className="flex-row space-x-3">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onChange('CVU')}
                        className={`flex-1 py-3.5 rounded-xl border items-center justify-center ${
                          value === 'CVU'
                            ? 'bg-gold/15 border-gold'
                            : 'bg-charcoal/40 border-charcoal'
                        }`}
                      >
                        <Text
                          className={`font-montserrat-bold text-sm ${
                            value === 'CVU' ? 'text-gold' : 'text-ash'
                          }`}
                        >
                          CVU (Billetera Virtual)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onChange('CBU')}
                        className={`flex-1 py-3.5 rounded-xl border items-center justify-center ${
                          value === 'CBU'
                            ? 'bg-gold/15 border-gold'
                            : 'bg-charcoal/40 border-charcoal'
                        }`}
                      >
                        <Text
                          className={`font-montserrat-bold text-sm ${
                            value === 'CBU' ? 'text-gold' : 'text-ash'
                          }`}
                        >
                          CBU (Cuenta Bancaria)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
                {errors.account_type && (
                  <Text className="mt-1 text-xs text-red-400 font-montserrat">
                    {errors.account_type.message}
                  </Text>
                )}
              </View>

              {/* CBU / CVU Input */}
              <Controller
                control={control}
                name="cbu_cvu"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    ref={cbuRef}
                    label="CBU o CVU (22 dígitos)"
                    placeholder="0000003100010000000001"
                    keyboardType="numeric"
                    maxLength={22}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.cbu_cvu?.message}
                    returnKeyType="next"
                    onSubmitEditing={() => aliasRef.current?.focus()}
                  />
                )}
              />

              {/* Alias Input */}
              <Controller
                control={control}
                name="alias"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    ref={aliasRef}
                    label="Alias de la Cuenta"
                    placeholder="ej. juan.perez.mp"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={50}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.alias?.message}
                    returnKeyType="next"
                    onSubmitEditing={() => holderNameRef.current?.focus()}
                  />
                )}
              />

              {/* Titular Input */}
              <Controller
                control={control}
                name="account_holder_name"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    ref={holderNameRef}
                    label="Nombre y Apellido del Titular"
                    placeholder="ej. Juan Pérez"
                    autoCapitalize="words"
                    maxLength={150}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.account_holder_name?.message}
                    returnKeyType="next"
                    onSubmitEditing={() => holderDocRef.current?.focus()}
                  />
                )}
              />

              {/* CUIT / DNI Input */}
              <Controller
                control={control}
                name="account_holder_document"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    ref={holderDocRef}
                    label="CUIT o DNI del Titular"
                    placeholder="ej. 20-12345678-9 o 38123456"
                    keyboardType="default"
                    maxLength={30}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.account_holder_document?.message}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />

              {/* Botón de Guardar */}
              <View className="mt-4">
                <Button
                  label={payoutMethod ? 'Actualizar Cuenta' : 'Guardar Cuenta'}
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isSavingPayoutMethod}
                  disabled={isSavingPayoutMethod}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
