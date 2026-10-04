export type DevicePlatform = 'android' | 'ios' | 'web';
export type PushProvider = 'expo' | 'fcm';

export interface RegisterDeviceDto {
  push_token: string;
  platform: DevicePlatform;
  provider: PushProvider;
  device_id?: string;
}

export interface DeviceResponse {
  id: string;
  platform: DevicePlatform;
  provider: PushProvider;
  device_id: string | null;
  last_seen_at: string;
  revoked_at: string | null;
  created_at: string;
}

export interface RegisterDeviceResponse {
  data: DeviceResponse;
}
