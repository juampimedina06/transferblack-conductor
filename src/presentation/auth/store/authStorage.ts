import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REMEMBERED_EMAIL_KEY = 'remembered_driver_email';
const REMEMBERED_PASSWORD_KEY = 'remembered_driver_password';
const REMEMBER_ENABLED_KEY = 'remember_driver_account_enabled';

export interface RememberedCredentials {
  remember: boolean;
  email: string;
  password: string;
}

export const authStorage = {
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      throw new Error('Error al guardar sesión');
    }
  },

  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async removeTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});
    } catch {
      // Ignorar fallo al borrar tokens de sesión
    }
  },

  async saveRememberedCredentials(email: string, password: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REMEMBER_ENABLED_KEY, 'true');
      await SecureStore.setItemAsync(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
      await SecureStore.setItemAsync(REMEMBERED_PASSWORD_KEY, password);
    } catch {
      // No bloquear el login si el llavero seguro falla
    }
  },

  async clearRememberedCredentials(): Promise<void> {
    try {
      await SecureStore.setItemAsync(REMEMBER_ENABLED_KEY, 'false');
      await SecureStore.deleteItemAsync(REMEMBERED_EMAIL_KEY).catch(() => {});
      await SecureStore.deleteItemAsync(REMEMBERED_PASSWORD_KEY).catch(() => {});
    } catch {
      // No-op
    }
  },

  async getRememberedCredentials(): Promise<RememberedCredentials> {
    try {
      const [enabledRaw, email, password] = await Promise.all([
        SecureStore.getItemAsync(REMEMBER_ENABLED_KEY),
        SecureStore.getItemAsync(REMEMBERED_EMAIL_KEY),
        SecureStore.getItemAsync(REMEMBERED_PASSWORD_KEY),
      ]);

      if (enabledRaw === 'false') {
        return { remember: false, email: '', password: '' };
      }

      return {
        remember: true,
        email: email ?? '',
        password: password ?? '',
      };
    } catch {
      return { remember: true, email: '', password: '' };
    }
  },
};
