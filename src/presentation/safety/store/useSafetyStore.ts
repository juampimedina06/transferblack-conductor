import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlockedPassengerRecord } from '../../../core/safety/interface/incident.interface';

interface SafetyState {
  blockedPassengers: BlockedPassengerRecord[];
  blockPassenger: (record: BlockedPassengerRecord) => void;
  unblockPassenger: (passengerId: string) => void;
  isPassengerBlocked: (passengerId?: string | null) => boolean;
  clearBlockedPassengers: () => void;
}

export const useSafetyStore = create<SafetyState>()(
  persist(
    (set, get) => ({
      blockedPassengers: [],

      blockPassenger: (record) => {
        set((state) => {
          const filtered = state.blockedPassengers.filter(
            (p) => p.passengerId !== record.passengerId
          );
          return {
            blockedPassengers: [record, ...filtered],
          };
        });
      },

      unblockPassenger: (passengerId) => {
        set((state) => ({
          blockedPassengers: state.blockedPassengers.filter(
            (p) => p.passengerId !== passengerId
          ),
        }));
      },

      isPassengerBlocked: (passengerId) => {
        if (!passengerId) return false;
        return get().blockedPassengers.some((p) => p.passengerId === passengerId);
      },

      clearBlockedPassengers: () => set({ blockedPassengers: [] }),
    }),
    {
      name: 'driver-safety-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
