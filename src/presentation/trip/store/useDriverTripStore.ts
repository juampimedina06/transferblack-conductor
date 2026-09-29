import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripOfferPayload, Trip } from '../../../core/trip/interface/trip.interface';

export type { TripOfferPayload };

interface DriverTripState {
  currentOffer: TripOfferPayload | null;
  setCurrentOffer: (offer: TripOfferPayload | null) => void;
  clearOffer: () => void;
  
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;
  updateTripStatus: (status: Trip['status']) => void;

  arrivedAt: number | null;
  setArrivedAt: (timestamp: number | null) => void;
}

export const useDriverTripStore = create<DriverTripState>()(
  persist(
    (set) => ({
      currentOffer: null,
      setCurrentOffer: (offer) => set({ currentOffer: offer }),
      clearOffer: () => set({ currentOffer: null }),
      
      activeTrip: null,
      setActiveTrip: (trip) => set({ 
        activeTrip: trip, 
        arrivedAt: trip?.status === 'driver_arrived' ? Date.now() : null 
      }),
      updateTripStatus: (status) => set((state) => ({
        activeTrip: state.activeTrip ? { ...state.activeTrip, status } : null,
        arrivedAt: status === 'driver_arrived' ? (state.arrivedAt || Date.now()) : null,
      })),

      arrivedAt: null,
      setArrivedAt: (timestamp) => set({ arrivedAt: timestamp }),
    }),
    {
      name: 'driver-trip-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeTrip: state.activeTrip,
        arrivedAt: state.arrivedAt,
      }),
    }
  )
);
