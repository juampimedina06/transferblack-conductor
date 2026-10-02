import { isPostTripChatExpired } from '@/core/chat/mapper/chat.mapper';
import type { Trip } from '@/core/trip/interface/trip.interface';

const makeTrip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1',
  public_code: 'TB-101',
  status: 'assigned',
  service_type_id: 'service-1',
  payment_method: 'card',
  driver_id: 'driver-1',
  vehicle_id: 'vehicle-1',
  estimated_fare: '1000',
  final_fare: '1000',
  currency: 'ARS',
  confirmed_at: '2026-10-01T10:00:00Z',
  assigned_at: '2026-10-01T10:05:00Z',
  driver_arrived_at: '2026-10-01T10:15:00Z',
  started_at: '2026-10-01T10:20:00Z',
  finished_at: '',
  cancelled_at: '',
  ...overrides,
});

describe('isPostTripChatExpired (24-hour grace window)', () => {
  it('returns false for non-ended trips (e.g. driver_arriving, in_progress)', () => {
    expect(isPostTripChatExpired(makeTrip({ status: 'assigned' }))).toBe(false);
    expect(isPostTripChatExpired(makeTrip({ status: 'in_progress' }))).toBe(false);
    expect(isPostTripChatExpired(makeTrip({ status: 'driver_arriving' }))).toBe(false);
  });

  it('returns false when trip was finished less than 24 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      status: 'completed',
      finished_at: twoHoursAgo,
    });
    expect(isPostTripChatExpired(trip)).toBe(false);
  });

  it('returns true when trip was finished more than 24 hours ago', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      status: 'completed',
      finished_at: twentyFiveHoursAgo,
    });
    expect(isPostTripChatExpired(trip)).toBe(true);
  });

  it('returns false when trip was cancelled less than 24 hours ago', () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      status: 'cancelled',
      cancelled_at: oneHourAgo,
    });
    expect(isPostTripChatExpired(trip)).toBe(false);
  });

  it('returns true when trip was cancelled more than 24 hours ago', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      status: 'cancelled',
      cancelled_at: twentyFiveHoursAgo,
    });
    expect(isPostTripChatExpired(trip)).toBe(true);
  });

  it('strictly respects finished_at even if other fields were updated later', () => {
    const finishedAt = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString();
    const trip = makeTrip({
      status: 'completed',
      finished_at: finishedAt,
    });
    // Subsequent updates do NOT extend the window
    (trip as any).updated_at = new Date().toISOString();
    expect(isPostTripChatExpired(trip)).toBe(true);
  });
});
