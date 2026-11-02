import React, { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { THEME_COLORS } from '../../core/constants/theme';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';

export default function OnboardingLayout() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      void useOnboardingStore.getState().initUserSession(user.id);
    }
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated && !user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: THEME_COLORS.obsidian,
        },
        headerTintColor: THEME_COLORS.gold,
        headerTitleStyle: {
          fontFamily: 'Montserrat_600SemiBold',
          color: THEME_COLORS.platinum,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="profile" options={{ title: 'Paso 1: Datos Personales' }} />
      <Stack.Screen name="vehicle" options={{ title: 'Paso 2: Tu Vehículo' }} />
      <Stack.Screen name="documents" options={{ title: 'Paso 3: Documentación' }} />
    </Stack>
  );
}
