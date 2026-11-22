import { create } from 'zustand';
import { getDriverDrivingTime } from '@/core/driver/actions/drivingTime.actions';
import type {
  DrivingTimeStatus,
  DrivingTimeWarningPayload,
  FatigueLockPayload,
} from '@/core/driver/interface/drivingTime.interface';

interface DrivingTimeState {
  status: DrivingTimeStatus | null;
  isLoading: boolean;
  fetchDrivingTime: () => Promise<DrivingTimeStatus | null>;
  applyWarning: (payload: DrivingTimeWarningPayload) => void;
  applyFatigueLock: (payload: FatigueLockPayload) => void;
  resetDrivingTime: () => void;
}

export const useDrivingTimeStore = create<DrivingTimeState>((set, get) => ({
  status: null,
  isLoading: false,

  fetchDrivingTime: async () => {
    try {
      set({ isLoading: true });
      const data = await getDriverDrivingTime();
      set({ status: data, isLoading: false });
      return data;
    } catch {
      set({ isLoading: false });
      return get().status;
    }
  },

  applyWarning: (payload) =>
    set((state) => {
      const prev = state.status;
      const maxSeconds = payload.maxSeconds || prev?.maxSeconds || 43200;
      const accumulatedSeconds = payload.accumulatedSeconds;
      const remainingSeconds = Math.max(0, maxSeconds - accumulatedSeconds);

      return {
        status: {
          accumulatedSeconds,
          maxSeconds,
          remainingSeconds,
          isLockedForRest: prev?.isLockedForRest ?? false,
          restUntil: prev?.restUntil ?? null,
          mandatoryRestSeconds: prev?.mandatoryRestSeconds ?? 21600,
          sessionStartedAt: prev?.sessionStartedAt ?? null,
        },
      };
    }),

  applyFatigueLock: (payload) =>
    set((state) => {
      const prev = state.status;
      const maxSeconds = payload.maxSeconds || prev?.maxSeconds || 43200;
      return {
        status: {
          accumulatedSeconds: payload.accumulatedSeconds || maxSeconds,
          maxSeconds,
          remainingSeconds: 0,
          isLockedForRest: true,
          restUntil: payload.restUntil,
          mandatoryRestSeconds: prev?.mandatoryRestSeconds ?? 21600,
          sessionStartedAt: null,
        },
      };
    }),

  resetDrivingTime: () => set({ status: null, isLoading: false }),
}));
