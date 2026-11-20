import React, { useEffect } from 'react';
import { Redirect, router, Stack } from 'expo-router';
import { transferApi } from '../../core/api/transferApi';
import { THEME_COLORS } from '../../core/constants/theme';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';

export default function OnboardingLayout() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let isCancelled = false;
    void useOnboardingStore.getState().initUserSession(user.id);

    // Si el usuario ya tiene una solicitud/perfil de conductor en el backend,
    // sacarlo de onboarding hacia la pantalla de revisión o dashboard.
    const checkExistingDriverProfile = async () => {
      try {
        const res = await transferApi.get('/driver/me');
        if (isCancelled) return;
        const approvalStatus = res.data?.data?.driverProfile?.approvalStatus;
        void useOnboardingStore.getState().resetOnboarding();
        if (approvalStatus === 'approved') {
          router.replace('/(home)' as any);
        } else {
          router.replace('/(home)/pending-approval' as any);
        }
      } catch {
        // 404 DRIVER_NOT_FOUND es el caso esperado durante el onboarding
      }
    };

    void checkExistingDriverProfile();

    return () => {
      isCancelled = true;
    };
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
