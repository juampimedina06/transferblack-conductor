import { Stack } from 'expo-router';
import { THEME_COLORS } from '../../core/constants/theme';

export default function OnboardingLayout() {
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

