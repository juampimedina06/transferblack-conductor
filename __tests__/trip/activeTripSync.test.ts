import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('react-native', () => ({
  Alert: { alert: vi.fn() },
  Platform: { OS: 'ios' },
}));

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

vi.mock('../../src/core/trip/actions/trip.actions', () => ({
  getActiveTrip: vi.fn(),
  getTripById: vi.fn(),
}));

import { syncActiveTripState } from '../../src/presentation/trip/hooks/useActiveTripSync';
import { useDriverTripStore } from '../../src/presentation/trip/store/useDriverTripStore';
import * as tripActions from '../../src/core/trip/actions/trip.actions';
import { ActiveTripSummary, Trip } from '../../src/core/trip/interface/trip.interface';

const mockActiveSummary: ActiveTripSummary = {
  id: 'trip-123',
  code: 'TB-ABC12',
  status: 'in_progress',
  origin: {
    address: 'Av. Colón 123',
    latitude: -31.416,
    longitude: -64.183,
  },
  destination: {
    address: 'Av. Vélez Sársfield 456',
    latitude: -31.425,
    longitude: -64.188,
  },
  passenger: {
    id: 'user-1',
    firstName: 'Juan',
    phone: '+5493511234567',
  },
  fare: 1500.5,
  startedAt: '2026-10-02T10:00:00.000Z',
  paymentMethod: 'cash',
  isVoucher: false,
};

const mockFullTrip: Trip = {
  id: 'trip-123',
  public_code: 'TB-ABC12',
  status: 'in_progress',
  service_type_id: 'standard',
  payment_method: 'cash',
  driver_id: 'driver-1',
  vehicle_id: 'veh-1',
  estimated_fare: '1500.5',
  final_fare: '1500.5',
  currency: 'ARS',
  confirmed_at: '2026-10-02T10:00:00.000Z',
  assigned_at: '2026-10-02T10:00:00.000Z',
  driver_arrived_at: '',
  started_at: '2026-10-02T10:00:00.000Z',
  finished_at: '',
  cancelled_at: '',
  require_pin: false,
  boarding_pin: null,
};

describe('syncActiveTripState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDriverTripStore.setState({
      activeTrip: null,
      currentOffer: null,
      offerQueue: [],
      isAvailable: true,
    });
  });

  it('rehydrates full trip when backend reports active trip and local is empty', async () => {
    vi.mocked(tripActions.getActiveTrip).mockResolvedValue(mockActiveSummary);
    vi.mocked(tripActions.getTripById).mockResolvedValue(mockFullTrip);

    await syncActiveTripState();

    expect(tripActions.getActiveTrip).toHaveBeenCalledTimes(1);
    expect(tripActions.getTripById).toHaveBeenCalledWith('trip-123');
    expect(useDriverTripStore.getState().activeTrip?.id).toBe('trip-123');
    expect(useDriverTripStore.getState().activeTrip?.status).toBe('in_progress');
  });

  it('clears phantom local trip when backend reports trip: null', async () => {
    useDriverTripStore.setState({
      activeTrip: mockFullTrip,
    });

    vi.mocked(tripActions.getActiveTrip).mockResolvedValue(null);

    await syncActiveTripState();

    expect(tripActions.getActiveTrip).toHaveBeenCalledTimes(1);
    expect(tripActions.getTripById).not.toHaveBeenCalled();
    expect(useDriverTripStore.getState().activeTrip).toBeNull();
  });

  it('clears trip if backend getTripById reveals trip was cancelled', async () => {
    vi.mocked(tripActions.getActiveTrip).mockResolvedValue(mockActiveSummary);
    vi.mocked(tripActions.getTripById).mockResolvedValue({
      ...mockFullTrip,
      status: 'cancelled',
    });

    await syncActiveTripState();

    expect(useDriverTripStore.getState().activeTrip).toBeNull();
  });

  it('clears local trip on 404/403 errors', async () => {
    useDriverTripStore.setState({
      activeTrip: mockFullTrip,
    });

    vi.mocked(tripActions.getActiveTrip).mockRejectedValue({
      response: { status: 404 },
    });

    await syncActiveTripState();

    expect(useDriverTripStore.getState().activeTrip).toBeNull();
  });
});
