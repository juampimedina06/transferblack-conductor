import * as Location from 'expo-location';
import { create } from 'zustand';
import { getCurrentLocation, watchCurrentPosition } from '../../../core/location/actions/location.actions';
import { LatLng } from '../../../core/location/interface/latLng.interface';

interface LocationState {
  lastKnownLocation: LatLng | null;
  userLocationList: LatLng[];
  watchSubscription: Location.LocationSubscription | null;

  getLocation: () => Promise<LatLng | null>;
  watchLocation: (onUpdate?: (coords: LatLng) => void) => Promise<void>;
  clearWatchLocation: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  lastKnownLocation: null,
  userLocationList: [],
  watchSubscription: null,

  getLocation: async (): Promise<LatLng | null> => {
    try {
      const location = await getCurrentLocation();
      set({ lastKnownLocation: location });
      return location;
    } catch {
      return null;
    }
  },

  watchLocation: async (onUpdate?: (coords: LatLng) => void): Promise<void> => {
    const activeSub = get().watchSubscription;
    if (activeSub !== null) {
      get().clearWatchLocation();
    }

    try {
      const subscription = await watchCurrentPosition((coords: LatLng) => {
        set((state) => ({
          lastKnownLocation: coords,
          userLocationList: [...state.userLocationList, coords],
        }));
        onUpdate?.(coords);
      });

      set({ watchSubscription: subscription });
    } catch {
      // Error silencioso al no poder iniciar suscripción de posición
    }
  },

  clearWatchLocation: (): void => {
    const subscription = get().watchSubscription;
    if (subscription !== null) {
      subscription.remove();
      set({ watchSubscription: null });
    }
  },
}));
