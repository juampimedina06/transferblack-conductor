import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { transferApi } from '../../core/api/transferApi';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';

export default function HomeLayout() {
  const segments = useSegments();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;

      try {
        const response = await transferApi.get('/users/me');
        const profile = response.data.data;
        
        // Actualizamos el store con los últimos datos del backend para mantener la app en sincronía
        useAuthStore.getState().updateUser(response.data);

        const hasDriverRole = profile.roles?.includes('driver');
        let isApproved = profile.approvalStatus === 'approved';

        if (hasDriverRole) {
          try {
            const driverResponse = await transferApi.get('/driver/me');
            if (driverResponse.data?.data?.driverProfile?.approvalStatus === 'approved') {
              isApproved = true;
            }
          } catch (e) {
            // Ignore error, might not have driver profile yet
          }
        }

        if (isApproved) {
          // Si está aprobado, se queda en (home)
        } else if (hasDriverRole) {
          // Tiene el rol pero no está aprobado -> está pending
          // Check if there is a meeting scheduled
          try {
            const meetingResponse = await transferApi.get('/driver/meeting');
            if (meetingResponse.data && meetingResponse.data.id) {
              router.replace('/confirmed-appointment' as any);
              return;
            }
          } catch (e) {
            // No meeting or error
          }
          router.replace('/pending-approval' as any);
        } else {
          // No tiene el rol -> inicializar borrador del usuario e ir al paso correspondiente
          await useOnboardingStore.getState().initUserSession(user.id);
          const onboardingState = useOnboardingStore.getState();

          if (onboardingState.currentStep === 3 || onboardingState.vehicleData !== null) {
            router.replace('/onboarding/documents' as any);
          } else if (onboardingState.currentStep === 2 || onboardingState.profileData !== null) {
            router.replace('/onboarding/vehicle' as any);
          } else {
            router.replace('/onboarding/profile' as any);
          }
        }
      } catch (error) {
        console.error("Error comprobando estado de onboarding", error);
      }
    };

    checkOnboardingStatus();
  }, [user, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

