import * as Location from 'expo-location';
import { create } from 'zustand';
import { getCurrentReading, watchCurrentPosition } from '../../../core/location/actions/location.actions';
import { LatLng } from '../../../core/location/interface/latLng.interface';
import { LocationReading } from '../../../core/location/interface/telemetry.interface';

const MAX_LOCATION_HISTORY = 100;

interface LocationState {
  lastKnownLocation: LatLng | null;
  lastKnownReading: LocationReading | null;
  userLocationList: LatLng[];
  watchSubscription: Location.LocationSubscription | null;

  getLocation: () => Promise<LatLng | null>;
  watchLocation: (onUpdate?: (coords: LocationReading) => void) => Promise<void>;
  clearWatchLocation: () => void;
  clearLocationHistory: () => void;
}

let pendingWatchPromise: Promise<void> | null = null;
let watchConsumerCount = 0;

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
    watchConsumerCount += 1;

    if (!get().lastKnownReading) {
      void get().getLocation();
    }

    if (get().watchSubscription !== null && !onUpdate) {
      return;
    }

    if (pendingWatchPromise && !onUpdate) {
      await pendingWatchPromise;
      return;
    }

    const activeSub = get().watchSubscription;
    if (activeSub !== null) {
      activeSub.remove();
      set({ watchSubscription: null });
    }

    const startPromise = (async (): Promise<void> => {
      try {
        const subscription = await watchCurrentPosition((reading: LocationReading) => {
          const coords: LatLng = {
            latitude: reading.latitude,
            longitude: reading.longitude,
          };
          set((state) => ({
            lastKnownLocation: coords,
            lastKnownReading: reading,
            userLocationList: [
              ...state.userLocationList.slice(-(MAX_LOCATION_HISTORY - 1)),
              coords,
            ],
          }));
          onUpdate?.(reading);
        });

        if (watchConsumerCount <= 0) {
          subscription.remove();
          return;
        }

        const existing = get().watchSubscription;
        if (existing && existing !== subscription) {
          existing.remove();
        }
        set({ watchSubscription: subscription });
      } catch {
        // Silent failure if location subscription cannot be started
      } finally {
        pendingWatchPromise = null;
      }
    })();

    pendingWatchPromise = startPromise;
    await startPromise;
  },

  clearWatchLocation: (): void => {
    watchConsumerCount = Math.max(0, watchConsumerCount - 1);
    if (watchConsumerCount > 0) {
      return;
    }

    const subscription = get().watchSubscription;
    if (subscription !== null) {
      subscription.remove();
      set({ watchSubscription: null });
    }
  },

  clearLocationHistory: (): void => {
    watchConsumerCount = 0;
    const subscription = get().watchSubscription;
    if (subscription !== null) {
      subscription.remove();
    }
    set({
      lastKnownLocation: null,
      lastKnownReading: null,
      userLocationList: [],
      watchSubscription: null,
    });
  },
}));
