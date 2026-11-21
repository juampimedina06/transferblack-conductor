import { create } from 'zustand';
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
  updatedAt: string;
}

interface PeerAlertState {
  myActiveAlert: MyActivePeerAlert | null;
  incomingAlert: IncomingPeerAlertPayload | null;
  followingAlert: FollowingPeerAlert | null;

  setMyActiveAlert: (alert: MyActivePeerAlert | null) => void;
  updateMyFollowersCount: (alertId: string, followersCount: number) => void;
  setIncomingAlert: (alert: IncomingPeerAlertPayload | null) => void;
  setFollowingAlert: (alert: FollowingPeerAlert | null) => void;
  updateFollowingLocation: (alertId: string, lat: number, lng: number, updatedAt: string) => void;
  handleAlertResolved: (alertId: string) => void;
  resetPeerAlerts: () => void;
}

export const usePeerAlertStore = create<PeerAlertState>((set) => ({
  myActiveAlert: null,
  incomingAlert: null,
  followingAlert: null,

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

  setFollowingAlert: (alert) => set({ followingAlert: alert }),

  updateFollowingLocation: (alertId, lat, lng, updatedAt) =>
    set((state) => {
      if (!state.followingAlert || state.followingAlert.alertId !== alertId) {
        return state;
      }
      return {
        followingAlert: {
          ...state.followingAlert,
          lat,
          lng,
          updatedAt,
        },
      };
    }),

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
    }),
}));
