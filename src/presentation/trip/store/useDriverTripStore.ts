import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripOfferPayload, Trip } from '../../../core/trip/interface/trip.interface';

export type { TripOfferPayload };

export interface QueuedTripOffer {
  offer: TripOfferPayload;
  receivedAt: number;
}

export const MIN_REMAINING_TTL_SECONDS = 3;

export function popNextValidOffer(
  queue: QueuedTripOffer[]
): { nextOffer: TripOfferPayload | null; remainingQueue: QueuedTripOffer[] } {
  const remaining = [...queue];

  if (remaining.length > 0) {
    const candidate = remaining.shift()!;
    return {
      nextOffer: {
        ...candidate.offer,
        ttlSeconds: candidate.offer.ttlSeconds || 15,
      },
      remainingQueue: remaining,
    };
  }

  return { nextOffer: null, remainingQueue: [] };
}

interface DriverTripState {
  currentOffer: TripOfferPayload | null;
  offerQueue: QueuedTripOffer[];
  enqueueOffer: (offer: TripOfferPayload) => void;
  setCurrentOffer: (offer: TripOfferPayload | null) => void;
  clearOffer: () => void;
  clearAllOffers: () => void;
  
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;
  updateTripStatus: (status: Trip['status']) => void;

  isAvailable: boolean;
  setIsAvailable: (val: boolean) => void;

  arrivedAt: number | null;
  setArrivedAt: (timestamp: number | null) => void;
}

export const useDriverTripStore = create<DriverTripState>()(
  persist(
    (set) => ({
      currentOffer: null,
      offerQueue: [],

      enqueueOffer: (offer) => set((state) => {
        // Si el conductor está en viaje activo, ignorar ofertas nuevas
        if (state.activeTrip && state.activeTrip.status !== 'completed' && state.activeTrip.status !== 'cancelled') {
          return state;
        }

        // Deduplicar: ignorar si ya es la oferta actual o ya está encolada
        if (state.currentOffer?.tripId === offer.tripId) {
          return state;
        }
        if (state.offerQueue.some((item) => item.offer.tripId === offer.tripId)) {
          return state;
        }

        // Si no hay oferta en pantalla, presentarla de inmediato
        if (!state.currentOffer) {
          return {
            ...state,
            currentOffer: offer,
          };
        }

        // Si ya hay una oferta mostrándose, encolar respetando FIFO
        return {
          ...state,
          offerQueue: [
            ...state.offerQueue,
            { offer, receivedAt: Date.now() },
          ],
        };
      }),

      setCurrentOffer: (offer) => {
        if (!offer) {
          const state = useDriverTripStore.getState();
          state.clearOffer();
          return;
        }
        const state = useDriverTripStore.getState();
        state.enqueueOffer(offer);
      },

      clearOffer: () => set((state) => {
        // Si hay viaje activo, limpiar todo
        if (state.activeTrip && state.activeTrip.status !== 'completed' && state.activeTrip.status !== 'cancelled') {
          return {
            ...state,
            currentOffer: null,
            offerQueue: [],
          };
        }

        // Extraer siguiente oferta válida de la cola
        const { nextOffer, remainingQueue } = popNextValidOffer(state.offerQueue);
        return {
          ...state,
          currentOffer: nextOffer,
          offerQueue: remainingQueue,
        };
      }),

      clearAllOffers: () => set({ currentOffer: null, offerQueue: [] }),
      
      activeTrip: null,
      setActiveTrip: (trip) => {
        const isLive = !!trip && trip.status !== 'completed' && trip.status !== 'cancelled';
        set((state) => ({
          ...state,
          activeTrip: trip, 
          arrivedAt: trip?.status === 'driver_arrived' ? Date.now() : null,
          ...(isLive ? { currentOffer: null, offerQueue: [] } : {}),
        }));
      },
      updateTripStatus: (status) => set((state) => ({
        activeTrip: state.activeTrip ? { ...state.activeTrip, status } : null,
        arrivedAt: status === 'driver_arrived' ? (state.arrivedAt || Date.now()) : null,
      })),

      isAvailable: false,
      setIsAvailable: (val) => set((state) => ({
        ...state,
        isAvailable: val,
        ...(!val ? { currentOffer: null, offerQueue: [] } : {}),
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
        isAvailable: state.isAvailable,
      }),
    }
  )
);
