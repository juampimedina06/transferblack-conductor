import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_PUSH_TOKEN_KEY = 'tb_last_registered_push_token';
const DEVICE_ID_KEY = 'tb_registered_device_id';

export const pushDeviceStorage = {
  async getLastToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LAST_PUSH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async saveToken(token: string, deviceId?: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_PUSH_TOKEN_KEY, token);
      if (deviceId) {
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
    } catch (error) {
      console.warn('Error guardando push token en storage:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([LAST_PUSH_TOKEN_KEY, DEVICE_ID_KEY]);
    } catch (error) {
      console.warn('Error limpiando push token storage:', error);
    }
  }
};
