import * as Location from 'expo-location';
import { create } from 'zustand';
import { getCurrentReading, watchCurrentPosition } from '../../../core/location/actions/location.actions';
import { LatLng } from '../../../core/location/interface/latLng.interface';
import { LocationReading } from '../../../core/location/interface/telemetry.interface';

interface LocationState {
  lastKnownLocation: LatLng | null;
  lastKnownReading: LocationReading | null;
  userLocationList: LatLng[];
  watchSubscription: Location.LocationSubscription | null;

  getLocation: () => Promise<LatLng | null>;
  watchLocation: (onUpdate?: (coords: LocationReading) => void) => Promise<void>;
  clearWatchLocation: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  lastKnownLocation: null,
  lastKnownReading: null,
  userLocationList: [],
  watchSubscription: null,

  getLocation: async (): Promise<LatLng | null> => {
    try {
      const reading = await getCurrentReading();
      const coords: LatLng = {
        latitude: reading.latitude,
        longitude: reading.longitude,
      };
      set({ lastKnownLocation: coords, lastKnownReading: reading });
      return coords;
    } catch {
      return null;
    }
  },

  watchLocation: async (onUpdate?: (coords: LocationReading) => void): Promise<void> => {
    const activeSub = get().watchSubscription;
    if (activeSub !== null) {
      get().clearWatchLocation();
    }

    if (!get().lastKnownReading) {
      void get().getLocation();
    }

    try {
      const subscription = await watchCurrentPosition((reading: LocationReading) => {
        const coords: LatLng = {
          latitude: reading.latitude,
          longitude: reading.longitude,
        };
        set((state) => ({
          lastKnownLocation: coords,
          lastKnownReading: reading,
          userLocationList: [...state.userLocationList, coords],
        }));
        onUpdate?.(reading);
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
