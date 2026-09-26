import { create } from 'zustand';
import { checkLocationPermission, requestLocationPermission } from '../../../core/location/actions/permissions.actions';
import { PermissionStatus } from '../../../core/location/interface/permission.interface';

interface PermissionState {
  locationStatus: PermissionStatus;
  requestLocationPermission: () => Promise<PermissionStatus>;
  checkLocationPermission: () => Promise<PermissionStatus>;
}

export const usePermissionsStore = create<PermissionState>((set) => ({
  locationStatus: PermissionStatus.CHECKING,

  requestLocationPermission: async (): Promise<PermissionStatus> => {
    const status = await requestLocationPermission();
    set({ locationStatus: status });
    return status;
  },

  checkLocationPermission: async (): Promise<PermissionStatus> => {
    const status = await checkLocationPermission();
    set({ locationStatus: status });
    return status;
  },
}));
