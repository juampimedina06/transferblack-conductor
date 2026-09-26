import { create } from 'zustand';
import { TripOfferPayload } from '../../../core/trip/interface/trip.interface';

export type { TripOfferPayload };

interface DriverTripState {
  currentOffer: TripOfferPayload | null;
  setCurrentOffer: (offer: TripOfferPayload | null) => void;
  clearOffer: () => void;
}

export const useDriverTripStore = create<DriverTripState>((set) => ({
  currentOffer: null,
  setCurrentOffer: (offer) => set({ currentOffer: offer }),
  clearOffer: () => set({ currentOffer: null }),
}));
