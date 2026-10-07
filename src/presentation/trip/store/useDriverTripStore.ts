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

export interface TripExtraItem {
  id: string;
  category: 'toll' | 'parking' | 'extra_stop' | 'other';
  label: string;
  amount: number;
  notes?: string;
  createdAt: string;
}

interface DriverTripState {
  currentOffer: TripOfferPayload | null;
  offerQueue: QueuedTripOffer[];
  enqueueOffer: (offer: TripOfferPayload) => void;
  setCurrentOffer: (offer: TripOfferPayload | null) => void;
  clearOffer: () => void;
  clearAllOffers: () => void;
  cancelOffer: (offerIdOrTripId: string) => void;
  
  activeTrip: Trip | null;
  setActiveTrip: (trip: Trip | null) => void;
  updateTripStatus: (status: Trip['status']) => void;

  tripExtras: TripExtraItem[];
  addTripExtra: (extra: Omit<TripExtraItem, 'id' | 'createdAt'>) => void;
  removeTripExtra: (id: string) => void;
  clearTripExtras: () => void;
  getTripExtrasTotal: () => number;

  isAvailable: boolean;
  setIsAvailable: (val: boolean) => void;

  arrivedAt: number | null;
  setArrivedAt: (timestamp: number | null) => void;
}

export const useDriverTripStore = create<DriverTripState>()(
  persist(
    (set, get) => ({
      currentOffer: null,
      offerQueue: [],

      enqueueOffer: (offer) => {
        // Validar expiresAt si está presente
        if (offer.expiresAt) {
          const expMs = new Date(offer.expiresAt).getTime();
          if (!Number.isNaN(expMs) && expMs <= Date.now()) {
            return;
          }
        }

        set((state) => {
          // Si el conductor está en viaje activo, ignorar ofertas nuevas
          if (state.activeTrip && state.activeTrip.status !== 'completed' && state.activeTrip.status !== 'cancelled') {
            return state;
          }

          // Deduplicar por offerId o tripId
          const isCurrentDuplicate =
            (offer.offerId && state.currentOffer?.offerId === offer.offerId) ||
            state.currentOffer?.tripId === offer.tripId;

          if (isCurrentDuplicate) {
            return state;
          }

          const isQueuedDuplicate = state.offerQueue.some(
            (item) =>
              (offer.offerId && item.offer.offerId === offer.offerId) ||
              item.offer.tripId === offer.tripId
          );

          if (isQueuedDuplicate) {
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
        });
      },

      setCurrentOffer: (offer) => {
        if (!offer) {
          get().clearOffer();
          return;
        }
        get().enqueueOffer(offer);
      },

      cancelOffer: (offerIdOrTripId: string) => {
        const state = get();
        const matchesCurrent =
          state.currentOffer?.offerId === offerIdOrTripId ||
          state.currentOffer?.tripId === offerIdOrTripId;

        const filteredQueue = state.offerQueue.filter(
          (item) =>
            item.offer.offerId !== offerIdOrTripId &&
            item.offer.tripId !== offerIdOrTripId
        );

        if (matchesCurrent) {
          const { nextOffer, remainingQueue } = popNextValidOffer(filteredQueue);
          set({
            currentOffer: nextOffer,
            offerQueue: remainingQueue,
          });
        } else {
          set({
            offerQueue: filteredQueue,
          });
        }
      },

      clearOffer: () => {
        set((state) => {
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
        });
      },

      clearAllOffers: () => {
        set({ currentOffer: null, offerQueue: [] });
      },
      
      activeTrip: null,
      tripExtras: [],

      addTripExtra: (extra) => {
        const item: TripExtraItem = {
          ...extra,
          id: `extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          tripExtras: [...state.tripExtras, item],
        }));
      },

      removeTripExtra: (id) => {
        set((state) => ({
          tripExtras: state.tripExtras.filter((item) => item.id !== id),
        }));
      },

      clearTripExtras: () => {
        set({ tripExtras: [] });
      },

      getTripExtrasTotal: () => {
        return get().tripExtras.reduce((sum, item) => sum + (item.amount || 0), 0);
      },

      setActiveTrip: (trip) => {
        const isLive = !!trip && trip.status !== 'completed' && trip.status !== 'cancelled';
        set((state) => {
          const tripChanged = !trip || (state.activeTrip && state.activeTrip.id !== trip.id);
          return {
            ...state,
            activeTrip: trip, 
            arrivedAt: trip?.status === 'driver_arrived' ? Date.now() : null,
            ...(isLive ? { currentOffer: null, offerQueue: [] } : {}),
            ...(tripChanged && !trip ? { tripExtras: [] } : {}),
          };
        });
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
        tripExtras: state.tripExtras,
        arrivedAt: state.arrivedAt,
        isAvailable: state.isAvailable,
      }),
    }
  )
);
