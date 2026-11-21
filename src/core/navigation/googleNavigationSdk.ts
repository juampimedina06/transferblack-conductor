import Constants, { AppOwnership, ExecutionEnvironment } from 'expo-constants';
import { Platform, TurboModuleRegistry } from 'react-native';
import type * as GoogleNavigationSdk from '@googlemaps/react-native-navigation-sdk';

export type GoogleNavigationSdkModule = typeof GoogleNavigationSdk;

export const isExpoGoEnvironment =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.appOwnership === AppOwnership.Expo;

let cachedSdk: GoogleNavigationSdkModule | null | undefined;

/**
 * Carga `@googlemaps/react-native-navigation-sdk` de forma segura únicamente cuando
 * la app corre en una Development Build o producción con el módulo nativo linkeado.
 * En Expo Go o Web devuelve `null` para permitir un fallback sin crashear.
 */
export function getGoogleNavigationSdk(): GoogleNavigationSdkModule | null {
  if (cachedSdk !== undefined) {
    return cachedSdk;
  }

  if (Platform.OS === 'web' || isExpoGoEnvironment) {
    cachedSdk = null;
    return null;
  }

  try {
    const hasNativeModule = Boolean(TurboModuleRegistry.get('NavModule'));
    if (!hasNativeModule) {
      cachedSdk = null;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedSdk = require('@googlemaps/react-native-navigation-sdk') as GoogleNavigationSdkModule;
    return cachedSdk;
  } catch (error) {
    console.warn('[GoogleNavigationSDK] Módulo nativo no disponible:', error);
    cachedSdk = null;
    return null;
  }
}

export function isGoogleNavigationSdkAvailable(): boolean {
  return getGoogleNavigationSdk() !== null;
}
