import { transferApi } from '@/core/api/transferApi';
import type {
  DrivingTimeApiResponse,
  DrivingTimeStatus,
} from '../interface/drivingTime.interface';

export const getDriverDrivingTime = async (): Promise<DrivingTimeStatus> => {
  const response = await transferApi.get<DrivingTimeApiResponse>(
    '/driver/me/driving-time'
  );
  return response.data.data;
};
