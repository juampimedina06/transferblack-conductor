import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDriverDocuments, getDriverStatus } from '../../src/core/driver/actions/driverStatus.actions';
import { useDriverStatusStore } from '../../src/presentation/driver/store/useDriverStatusStore';
import { isPushDocumentEvent } from '../../src/core/push/utils/pushOfferParser';
import { transferApi } from '../../src/core/api/transferApi';
import { socket } from '../../src/core/socket/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('../../src/core/socket/socket', () => {
  const handlers: Record<string, Function[]> = {};
  return {
    socket: {
      on: vi.fn((event: string, cb: Function) => {
        handlers[event] = handlers[event] || [];
        handlers[event].push(cb);
      }),
      off: vi.fn((event: string, cb: Function) => {
        if (handlers[event]) {
          handlers[event] = handlers[event].filter((fn) => fn !== cb);
        }
      }),
      emit: vi.fn(),
      __trigger: (event: string, payload: any) => {
        if (handlers[event]) {
          handlers[event].forEach((fn) => fn(payload));
        }
      },
    },
  };
});

vi.mock('../../src/core/api/transferApi', () => ({
  transferApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  setOnDocumentExpiryHandler: vi.fn(),
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

describe('TICKET-06: Semiannual Document Compliance & Online Blocking', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await AsyncStorage.clear();
    useDriverStatusStore.setState({
      consecutiveCancellations: 0,
      dispatchSuspendedUntil: null,
      compliance: {
        status: 'compliant',
        nextExpiryAt: null,
        daysUntilNextExpiry: null,
        blockingDocuments: [],
      },
      documents: [],
      isLoading: false,
    });
  });

  describe('getDriverDocuments action', () => {
    it('calls GET /driver/me/documents and returns array of documents', async () => {
      const mockDocs = [
        {
          id: 'doc-1',
          documentType: 'insurance_policy',
          status: 'expiring_soon',
          expiresAt: '2026-10-20T00:00:00.000Z',
          daysUntilExpiry: 14,
        },
        {
          id: 'doc-2',
          documentType: 'license_d1',
          status: 'valid',
          expiresAt: '2027-04-10T00:00:00.000Z',
          daysUntilExpiry: 186,
        },
      ];

      (transferApi.get as any).mockResolvedValueOnce({
        data: { data: mockDocs },
      });

      const docs = await getDriverDocuments();
      expect(transferApi.get).toHaveBeenCalledWith('/driver/me/documents');
      expect(docs).toHaveLength(2);
      expect(docs[0].status).toBe('expiring_soon');
      expect(docs[0].daysUntilExpiry).toBe(14);
    });
  });

  describe('useDriverStatusStore compliance handling', () => {
    it('updates compliance and blockingDocuments via socket driver:compliance:changed', () => {
      const cleanup = useDriverStatusStore.getState().initSocketListeners();

      // Backend emits compliance change
      (socket as any).__trigger('driver:compliance:changed', {
        status: 'suspended_documents',
        blockingDocuments: ['insurance_policy', 'itv'],
      });

      const compliance = useDriverStatusStore.getState().compliance;
      expect(compliance.status).toBe('suspended_documents');
      expect(compliance.blockingDocuments).toEqual(['insurance_policy', 'itv']);

      cleanup();
    });

    it('fetches and stores driver documents in store state', async () => {
      const mockDocs = [
        {
          id: 'doc-expired',
          documentType: 'itv',
          status: 'expired' as const,
          expiresAt: '2026-10-01T00:00:00.000Z',
          daysUntilExpiry: -5,
        },
      ];

      (transferApi.get as any).mockResolvedValueOnce({
        data: { data: mockDocs },
      });

      const docs = await useDriverStatusStore.getState().fetchDocuments();
      expect(docs).toHaveLength(1);
      expect(useDriverStatusStore.getState().documents).toHaveLength(1);
      expect(useDriverStatusStore.getState().documents[0].status).toBe('expired');
    });
  });

  describe('isPushDocumentEvent parser', () => {
    it('correctly classifies document push events', () => {
      expect(isPushDocumentEvent({ type: 'docs:expiring', documentType: 'insurance_policy' })).toBe(true);
      expect(isPushDocumentEvent({ type: 'docs:expired', documentType: 'license_d1' })).toBe(true);
      expect(isPushDocumentEvent({ event: 'document_expiring' })).toBe(true);
      expect(isPushDocumentEvent({ event: 'document_expired' })).toBe(true);
    });

    it('ignores non-document notifications', () => {
      expect(isPushDocumentEvent({ type: 'trip:offer', offerId: '123' })).toBe(false);
      expect(isPushDocumentEvent({ type: 'trip:offer:cancel' })).toBe(false);
      expect(isPushDocumentEvent(null)).toBe(false);
      expect(isPushDocumentEvent(undefined)).toBe(false);
    });
  });
});
