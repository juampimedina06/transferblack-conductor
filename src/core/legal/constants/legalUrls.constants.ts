import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const DEFAULT_WEB_BASE_URL = 'https://transferblack-admin.vercel.app';

export const DRIVER_TERMS_URL =
  process.env.EXPO_PUBLIC_DRIVER_TERMS_URL ??
  `${DEFAULT_WEB_BASE_URL}/terminos-conductores`;

export const DRIVER_PRIVACY_URL =
  process.env.EXPO_PUBLIC_DRIVER_PRIVACY_URL ??
  `${DEFAULT_WEB_BASE_URL}/privacidad-conductores`;

export const DELETE_ACCOUNT_INFO_URL =
  process.env.EXPO_PUBLIC_DELETE_ACCOUNT_URL ??
  `${DEFAULT_WEB_BASE_URL}/eliminar-cuenta`;

export const openLegalUrl = async (url: string): Promise<void> => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      toolbarColor: '#0A0A0C',
      controlsColor: '#D4AF37',
    });
  } catch {
    await Linking.openURL(url);
  }
};
