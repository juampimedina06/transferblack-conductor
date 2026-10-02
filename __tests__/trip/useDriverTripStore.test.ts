import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] || null),
      setItem: vi.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn(async (key: string) => {
        delete store[key];
      }),
      clear: vi.fn(async () => {
        store = {};
      }),
    },
  };
});

import {
  useDriverTripStore,
  popNextValidOffer,
  QueuedTripOffer,
} from '../../src/presentation/trip/store/useDriverTripStore';
import { TripOfferPayload } from '../../src/core/trip/interface/trip.interface';

const createMockOffer = (tripId: string, ttlSeconds: number = 15): TripOfferPayload => ({
  tripId,
  offerId: `offer-${tripId}`,
  ttlSeconds,
  fare: {
    netEarnings: 1500,
    totalFare: 1800,
    commission: 300,
    currency: 'ARS',
    paymentMethod: 'cash',
  },
  pickup: {
    address: 'Av. Colón 100',
    etaMinutes: 4,
  },
  dropoff: {
    address: 'San Jerónimo 200',
    durationMinutes: 12,
  },
  passenger: {
    fullName: 'Pasajero Test',
    rating: 4.9,
    category: 'VIP',
    preferences: [],
  },
});

describe('popNextValidOffer helper', () => {
  it('returns null and empty queue when input queue is empty', () => {
    const result = popNextValidOffer([]);
    expect(result.nextOffer).toBeNull();
    expect(result.remainingQueue).toEqual([]);
  });

  it('returns candidate with its full TTL preserved when dequeued', () => {
    const queue: QueuedTripOffer[] = [
      {
        offer: createMockOffer('trip-1', 15),
        receivedAt: Date.now() - 10_000, // Even if it waited 10s
      },
    ];

    const result = popNextValidOffer(queue);
    expect(result.nextOffer).not.toBeNull();
    expect(result.nextOffer?.tripId).toBe('trip-1');
    expect(result.nextOffer?.ttlSeconds).toBe(15); // Full 15s
    expect(result.remainingQueue).toHaveLength(0);
  });

  it('pops offers sequentially adhering to FIFO order with full TTL', () => {
    const queue: QueuedTripOffer[] = [
      {
        offer: createMockOffer('trip-1', 15),
        receivedAt: Date.now(),
      },
      {
        offer: createMockOffer('trip-2', 20),
        receivedAt: Date.now(),
      },
    ];

    const first = popNextValidOffer(queue);
    expect(first.nextOffer?.tripId).toBe('trip-1');
    expect(first.nextOffer?.ttlSeconds).toBe(15);
    expect(first.remainingQueue).toHaveLength(1);

    const second = popNextValidOffer(first.remainingQueue);
    expect(second.nextOffer?.tripId).toBe('trip-2');
    expect(second.nextOffer?.ttlSeconds).toBe(20);
    expect(second.remainingQueue).toHaveLength(0);
  });
});

describe('useDriverTripStore offer queue flow', () => {
  beforeEach(() => {
    useDriverTripStore.setState({
      currentOffer: null,
      offerQueue: [],
      activeTrip: null,
      isAvailable: true,
      arrivedAt: null,
    });
  });

  it('presents offer immediately when no current offer is active', () => {
    const offer1 = createMockOffer('trip-1', 15);
    useDriverTripStore.getState().enqueueOffer(offer1);

    const state = useDriverTripStore.getState();
    expect(state.currentOffer?.tripId).toBe('trip-1');
    expect(state.offerQueue).toHaveLength(0);
  });

  it('queues subsequent offers when an offer is already visible without overwriting it', () => {
    const offer1 = createMockOffer('trip-1', 15);
    const offer2 = createMockOffer('trip-2', 15);
    const offer3 = createMockOffer('trip-3', 15);

    useDriverTripStore.getState().enqueueOffer(offer1);
    useDriverTripStore.getState().enqueueOffer(offer2);
    useDriverTripStore.getState().enqueueOffer(offer3);

    const state = useDriverTripStore.getState();
    // Offer 1 remains on screen!
    expect(state.currentOffer?.tripId).toBe('trip-1');
    // Offer 2 and 3 are in queue
    expect(state.offerQueue).toHaveLength(2);
    expect(state.offerQueue[0].offer.tripId).toBe('trip-2');
    expect(state.offerQueue[1].offer.tripId).toBe('trip-3');
  });

  it('deduplicates identical offers by tripId', () => {
    const offer1 = createMockOffer('trip-1', 15);
    const offer2 = createMockOffer('trip-2', 15);

    useDriverTripStore.getState().enqueueOffer(offer1);
    useDriverTripStore.getState().enqueueOffer(offer1); // duplicate of current
    useDriverTripStore.getState().enqueueOffer(offer2);
    useDriverTripStore.getState().enqueueOffer(offer2); // duplicate in queue

    const state = useDriverTripStore.getState();
    expect(state.currentOffer?.tripId).toBe('trip-1');
    expect(state.offerQueue).toHaveLength(1);
    expect(state.offerQueue[0].offer.tripId).toBe('trip-2');
  });

  it('promotes the next queued offer when clearOffer is called', () => {
    const offer1 = createMockOffer('trip-1', 15);
    const offer2 = createMockOffer('trip-2', 15);

    useDriverTripStore.getState().enqueueOffer(offer1);
    useDriverTripStore.getState().enqueueOffer(offer2);

    expect(useDriverTripStore.getState().currentOffer?.tripId).toBe('trip-1');

    // Simulate rejection or expiry of offer1
    useDriverTripStore.getState().clearOffer();

    const state = useDriverTripStore.getState();
    expect(state.currentOffer?.tripId).toBe('trip-2');
    expect(state.offerQueue).toHaveLength(0);
  });

  it('clears all offers when driver accepts and enters active trip', () => {
    const offer1 = createMockOffer('trip-1', 15);
    const offer2 = createMockOffer('trip-2', 15);

    useDriverTripStore.getState().enqueueOffer(offer1);
    useDriverTripStore.getState().enqueueOffer(offer2);

    useDriverTripStore.getState().setActiveTrip({
      id: 'trip-1',
      public_code: 'TB-100',
      status: 'driver_arriving',
      service_type_id: 'standard',
      payment_method: 'cash',
      driver_id: 'driver-1',
      vehicle_id: 'veh-1',
      estimated_fare: '1500',
      final_fare: '1500',
      currency: 'ARS',
      confirmed_at: '',
      assigned_at: new Date().toISOString(),
      driver_arrived_at: '',
      started_at: '',
      finished_at: '',
      cancelled_at: '',
      require_pin: false,
      boarding_pin: null,
      pickup: offer1.pickup,
      dropoff: offer1.dropoff,
      passenger: offer1.passenger,
      third_party: null,
    });

    const state = useDriverTripStore.getState();
    expect(state.currentOffer).toBeNull();
    expect(state.offerQueue).toHaveLength(0);
  });

  it('clears all offers when driver goes offline', () => {
    const offer1 = createMockOffer('trip-1', 15);
    const offer2 = createMockOffer('trip-2', 15);

    useDriverTripStore.getState().enqueueOffer(offer1);
    useDriverTripStore.getState().enqueueOffer(offer2);

    useDriverTripStore.getState().setIsAvailable(false);

    const state = useDriverTripStore.getState();
    expect(state.isAvailable).toBe(false);
    expect(state.currentOffer).toBeNull();
    expect(state.offerQueue).toHaveLength(0);
  });
});
