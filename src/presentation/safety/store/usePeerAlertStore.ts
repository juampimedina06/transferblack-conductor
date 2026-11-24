import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { IncomingPeerAlertPayload } from '@/core/safety/interface/peerAlert.interface';

export interface MyActivePeerAlert {
  id: string;
  notifiedCount: number;
  followersCount: number;
  createdAt: string;
}

export interface FollowingPeerAlert {
  alertId: string;
  driverId: string;
  driverName: string;
  vehicleLabel: string | null;
  plate: string | null;
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  updatedAt: string;
}

interface PeerAlertState {
  myActiveAlert: MyActivePeerAlert | null;
  incomingAlert: IncomingPeerAlertPayload | null;
  followingAlert: FollowingPeerAlert | null;
  focusRequestNonce: number;

  setMyActiveAlert: (alert: MyActivePeerAlert | null) => void;
  updateMyFollowersCount: (alertId: string, followersCount: number) => void;
  setIncomingAlert: (alert: IncomingPeerAlertPayload | null) => void;
  setFollowingAlert: (alert: FollowingPeerAlert | null) => void;
  updateFollowingLocation: (
    alertId: string,
    lat: number,
    lng: number,
    updatedAt: string,
    heading?: number | null,
    speed?: number | null
  ) => void;
  requestFocusOnPeer: () => void;
  handleAlertResolved: (alertId: string) => void;
  resetPeerAlerts: () => void;
}

export const usePeerAlertStore = create<PeerAlertState>()(
  persist(
    (set) => ({
      myActiveAlert: null,
      incomingAlert: null,
      followingAlert: null,
      focusRequestNonce: 0,

      setMyActiveAlert: (alert) => set({ myActiveAlert: alert }),

      updateMyFollowersCount: (alertId, followersCount) =>
        set((state) => {
          if (!state.myActiveAlert || state.myActiveAlert.id !== alertId) {
            return state;
          }
          return {
            myActiveAlert: {
              ...state.myActiveAlert,
              followersCount,
            },
          };
        }),

      setIncomingAlert: (alert) => set({ incomingAlert: alert }),

      setFollowingAlert: (alert) =>
        set((state) => ({
          followingAlert: alert,
          focusRequestNonce: alert ? state.focusRequestNonce + 1 : state.focusRequestNonce,
        })),

      updateFollowingLocation: (alertId, lat, lng, updatedAt, heading, speed) =>
        set((state) => {
          if (!state.followingAlert || state.followingAlert.alertId !== alertId) {
            return state;
          }
          return {
            followingAlert: {
              ...state.followingAlert,
              lat,
              lng,
              ...(heading !== undefined ? { heading } : {}),
              ...(speed !== undefined ? { speed } : {}),
              updatedAt,
            },
          };
        }),

      requestFocusOnPeer: () =>
        set((state) => ({ focusRequestNonce: state.focusRequestNonce + 1 })),

      handleAlertResolved: (alertId) =>
        set((state) => ({
          myActiveAlert:
            state.myActiveAlert?.id === alertId ? null : state.myActiveAlert,
          incomingAlert:
            state.incomingAlert?.alertId === alertId ? null : state.incomingAlert,
          followingAlert:
            state.followingAlert?.alertId === alertId ? null : state.followingAlert,
        })),

      resetPeerAlerts: () =>
        set({
          myActiveAlert: null,
          incomingAlert: null,
          followingAlert: null,
          focusRequestNonce: 0,
        }),
    }),
    {
      name: '@transferblack/peer-alert-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        myActiveAlert: state.myActiveAlert,
      }),
    }
  )
);
