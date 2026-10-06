import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendSosAlert } from '../../src/core/safety/actions/sos.actions';
import { sosQueueService } from '../../src/core/safety/services/sosQueueService';
import { transferApi } from '../../src/core/api/transferApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('../../src/core/socket/socket', () => ({
  socket: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    post: vi.fn(),
  },
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

describe('TICKET-04: SOS Emergency Actions & Offline Queue', () => {
  const mockTripId = 'trip-uuid-123';
  const mockPayload = {
    clientEventId: 'client-event-uuid-456',
    lat: -34.6037,
    lng: -58.3816,
    accuracyMeters: 5,
    clientTimestamp: '2026-10-06T12:00:00.000Z',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('sendSosAlert action', () => {
    it('executes POST /trips/:tripId/sos with exact payload and returns response', async () => {
      const mockResponse = { id: 'sos-uuid-789', receivedAt: '2026-10-06T12:00:01.000Z' };
      (transferApi.post as any).mockResolvedValueOnce({ data: mockResponse });

      const result = await sendSosAlert(mockTripId, mockPayload);
      expect(transferApi.post).toHaveBeenCalledWith(`/trips/${mockTripId}/sos`, mockPayload);
      expect(result.id).toBe('sos-uuid-789');
    });
  });

  describe('sosQueueService offline resilience', () => {
    it('enqueues failed alert to storage with the exact clientEventId for idempotency', async () => {
      (transferApi.post as any).mockRejectedValueOnce(new Error('Network disconnected in tunnel'));

      const dispatched = await sosQueueService.dispatchSosAlert(mockTripId, mockPayload);
      expect(dispatched).toBe(false);

      const queue = await sosQueueService.getQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].clientEventId).toBe(mockPayload.clientEventId);
      expect(queue[0].tripId).toBe(mockTripId);
      expect(queue[0].lat).toBe(mockPayload.lat);
    });

    it('flushes queued alert reusing the same clientEventId on network recovery', async () => {
      // First attempt fails
      (transferApi.post as any).mockRejectedValueOnce(new Error('Network error'));
      await sosQueueService.dispatchSosAlert(mockTripId, mockPayload);

      // Subsequent flush succeeds
      (transferApi.post as any).mockResolvedValueOnce({
        data: { id: 'sos-uuid-789', receivedAt: '2026-10-06T12:00:10.000Z' },
      });

      await sosQueueService.flushQueue();

      expect(transferApi.post).toHaveBeenCalledTimes(2);
      expect(transferApi.post).toHaveBeenLastCalledWith(`/trips/${mockTripId}/sos`, {
        clientEventId: mockPayload.clientEventId,
        lat: mockPayload.lat,
        lng: mockPayload.lng,
        accuracyMeters: mockPayload.accuracyMeters,
        clientTimestamp: mockPayload.clientTimestamp,
      });

      const remainingQueue = await sosQueueService.getQueue();
      expect(remainingQueue.length).toBe(0);
    });
  });
});
