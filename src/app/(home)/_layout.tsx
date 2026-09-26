import React, { useEffect, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { transferApi } from '../../core/api/transferApi';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { useOnboardingStore } from '../../presentation/onboarding/store/useOnboardingStore';

export default function HomeLayout() {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!userId || hasCheckedRef.current) return;

    const checkOnboardingStatus = async () => {
      hasCheckedRef.current = true;

      try {
        const response = await transferApi.get('/users/me');
        const profile = response.data.data;
        
        // Actualizamos el store con los últimos datos del backend
        useAuthStore.getState().updateUser(response.data);

        const hasDriverRole = profile.roles?.includes('driver');
        let isApproved = profile.approvalStatus === 'approved';

        if (hasDriverRole) {
          try {
            const driverResponse = await transferApi.get('/driver/me');
            const driverProfile = driverResponse.data?.data?.driverProfile;
            if (driverProfile?.approvalStatus === 'approved') {
              isApproved = true;
            } else if (driverProfile?.approvalStatus === 'pending' || driverProfile?.approvalStatus === 'rejected') {
              isApproved = false;
            }
          } catch (e) {
            // Ignorar error de consulta de perfil de conductor
          }
        }

        if (isApproved) {
          // Si está aprobado, se queda en (home)
          return;
        }

        if (hasDriverRole) {
          // Tiene el rol pero no está aprobado -> verificar si tiene reunión agendada
          try {
            const meetingResponse = await transferApi.get('/driver/meeting');
            const meetingData = meetingResponse.data?.data || meetingResponse.data;
            if (meetingData && (meetingData.id || meetingData._id)) {
              router.replace('/confirmed-appointment' as any);
              return;
            }
          } catch (e) {
            // Sin reunión agendada
          }
          router.replace('/pending-approval' as any);
          return;
        }

        // No tiene el rol -> inicializar borrador del usuario e ir al paso correspondiente
        await useOnboardingStore.getState().initUserSession(userId);
        const onboardingState = useOnboardingStore.getState();

        if (onboardingState.currentStep === 3 || onboardingState.vehicleData !== null) {
          router.replace('/onboarding/documents' as any);
        } else if (onboardingState.currentStep === 2 || onboardingState.profileData !== null) {
          router.replace('/onboarding/vehicle' as any);
        } else {
          router.replace('/onboarding/profile' as any);
        }
      } catch (error) {
        console.error("Error comprobando estado de onboarding", error);
      }
    };

    checkOnboardingStatus();
  }, [userId]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

