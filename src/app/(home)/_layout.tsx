import React, { useEffect, useRef } from 'react';
import { Stack, router, usePathname, Redirect } from 'expo-router';
import { transferApi } from '@/core/api/transferApi';
import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { useOnboardingStore } from '@/presentation/onboarding/store/useOnboardingStore';

interface CachedDriverRoutingState {
  userId: string;
  hasDriverRole: boolean;
  isApproved: boolean;
  hasScheduledMeeting: boolean;
  checkedAt: number;
}

const CACHE_TTL_MS = 30_000;

export default function HomeLayout() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const pathname = usePathname();
  const cachedStateRef = useRef<CachedDriverRoutingState | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      cachedStateRef.current = null;
      return;
    }

    let isCancelled = false;

    const applyRoutingDecision = async (state: CachedDriverRoutingState) => {
      if (isCancelled) return;

      if (state.isApproved) {
        if (pathname.includes('confirmed-appointment') || pathname.includes('pending-approval')) {
          router.replace('/(home)' as any);
        }
        return;
      }

      if (state.hasDriverRole) {
        if (state.hasScheduledMeeting) {
          if (!pathname.includes('confirmed-appointment')) {
            router.replace('/confirmed-appointment' as any);
          }
          return;
        }

        if (!pathname.includes('pending-approval')) {
          router.replace('/pending-approval' as any);
        }
        return;
      }

      await useOnboardingStore.getState().initUserSession(state.userId);
      if (isCancelled) return;
      const onboardingState = useOnboardingStore.getState();

      if (onboardingState.currentStep === 3 || onboardingState.vehicleData !== null) {
        router.replace('/onboarding/documents' as any);
      } else if (onboardingState.currentStep === 2 || onboardingState.profileData !== null) {
        router.replace('/onboarding/vehicle' as any);
      } else {
        router.replace('/onboarding/profile' as any);
      }
    };

    const checkOnboardingStatus = async () => {
      const now = Date.now();
      const cached = cachedStateRef.current;
      const isWaitingScreen =
        pathname.includes('confirmed-appointment') || pathname.includes('pending-approval');

      if (
        cached &&
        cached.userId === user.id &&
        cached.isApproved &&
        !isWaitingScreen &&
        now - cached.checkedAt < CACHE_TTL_MS
      ) {
        await applyRoutingDecision(cached);
        return;
      }

      try {
        const response = await transferApi.get('/users/me');
        if (isCancelled || !useAuthStore.getState().isAuthenticated) return;
        const profile = response.data.data;

        useAuthStore.getState().updateUser(response.data);

        const hasDriverRole = Boolean(profile.roles?.includes('driver'));
        let isApproved = profile.approvalStatus === 'approved';
        let hasScheduledMeeting = false;

        if (hasDriverRole) {
          try {
            const driverResponse = await transferApi.get('/driver/me');
            const driverProfile = driverResponse.data?.data?.driverProfile;
            if (driverProfile?.approvalStatus === 'approved') {
              isApproved = true;
            } else if (
              driverProfile?.approvalStatus === 'pending' ||
              driverProfile?.approvalStatus === 'rejected'
            ) {
              isApproved = false;
            }
          } catch {
            // Ignore driver profile query error
          }
        }

        if (hasDriverRole && !isApproved) {
          try {
            const meetingResponse = await transferApi.get('/driver/meeting');
            const meetingData = meetingResponse.data?.data || meetingResponse.data;
            if (meetingData && (meetingData.id || meetingData._id)) {
              hasScheduledMeeting = true;
            }
          } catch {
            // No meeting scheduled
          }
        }

        const nextState: CachedDriverRoutingState = {
          userId: user.id,
          hasDriverRole,
          isApproved,
          hasScheduledMeeting,
          checkedAt: Date.now(),
        };
        cachedStateRef.current = nextState;

        await applyRoutingDecision(nextState);
      } catch (error) {
        console.error('Error comprobando estado de onboarding en HomeLayout', error);
      }
    };

    void checkOnboardingStatus();

    return () => {
      isCancelled = true;
    };
  }, [user?.id, isAuthenticated, pathname]);

  // Guard de seguridad: si no hay usuario ni sesión autenticada, redirigir al login
  if (!isAuthenticated || !user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="confirmed-appointment/index" />
      <Stack.Screen name="pending-approval/index" />
      <Stack.Screen name="wallet/index" />
      <Stack.Screen name="wallet/payout-method" />
      <Stack.Screen name="wallet/payout-history" />
      <Stack.Screen name="scheduled-trips/index" />
      <Stack.Screen name="chat/index" options={{ headerShown: false }} />
      <Stack.Screen name="profile/index" />
    </Stack>
  );
}
