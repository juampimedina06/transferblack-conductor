import {
  mapApiMessageToDomain,
  mapSocketMessageToDomain,
  getRoleLabel,
  mergeMessages,
  applyReadReceipt,
} from '@/core/chat/mapper/chat.mapper';
import { ApiChatMessage, ChatMessage } from '@/core/chat/interface/chat.interface';

const makeApi = (overrides: Partial<ApiChatMessage> = {}): ApiChatMessage => ({
  id: 'msg-1',
  tripId: 'trip-1',
  senderId: 'user-driver',
  senderRole: 'provider',
  clientMessageId: 'client-1',
  content: 'Hello',
  createdAt: '2024-01-01T10:00:00Z',
  deliveredAt: null,
  readAt: null,
  ...overrides,
});

const makeDomain = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'msg-1',
  tripId: 'trip-1',
  senderId: 'user-driver',
  senderRole: 'provider',
  clientMessageId: 'client-1',
  content: 'Hello',
  createdAt: '2024-01-01T10:00:00Z',
  readAt: null,
  status: 'sent',
  ...overrides,
});

// ── Mapper ────────────────────────────────────────────────────────────────────

describe('mapApiMessageToDomain', () => {
  it('maps all fields and sets status to sent', () => {
    const result = mapApiMessageToDomain(makeApi());
    expect(result.status).toBe('sent');
    expect(result.id).toBe('msg-1');
    expect(result.senderRole).toBe('provider');
    expect((result as any).deliveredAt).toBeUndefined();
  });

  it('normalizes legacy driver senderRole to provider', () => {
    const result = mapApiMessageToDomain(makeApi({ senderRole: 'driver' as any }));
    expect(result.senderRole).toBe('provider');
  });

  it('preserves null readAt', () => {
    const result = mapApiMessageToDomain(makeApi({ readAt: null }));
    expect(result.readAt).toBeNull();
  });

  it('preserves non-null readAt', () => {
    const result = mapApiMessageToDomain(makeApi({ readAt: '2024-01-01T11:00:00Z' }));
    expect(result.readAt).toBe('2024-01-01T11:00:00Z');
  });
});

describe('mapSocketMessageToDomain', () => {
  it('produces the same result as mapApiMessageToDomain', () => {
    const api = makeApi();
    expect(mapSocketMessageToDomain(api)).toEqual(mapApiMessageToDomain(api));
  });
});

// ── Role labels ───────────────────────────────────────────────────────────────

describe('getRoleLabel', () => {
  it.each([
    ['passenger', 'Pasajero'],
    ['provider', 'Conductor'],
    ['requester', 'Coordinación'],
  ] as const)('maps %s → %s', (role, expected) => {
    expect(getRoleLabel(role)).toBe(expected);
  });
});

// ── mergeMessages ─────────────────────────────────────────────────────────────

describe('mergeMessages', () => {
  it('deduplicates by id', () => {
    const a = makeDomain({ id: 'msg-1', content: 'old' });
    const b = makeDomain({ id: 'msg-1', content: 'new', readAt: '2024-01-01T12:00:00Z' });
    const result = mergeMessages([a], [b]);
    expect(result).toHaveLength(1);
    // incoming wins
    expect(result[0].content).toBe('new');
  });

  it('replaces optimistic entry with confirmed message', () => {
    const optimistic = makeDomain({
      id: 'client-1', // temporary id
      clientMessageId: 'client-1',
      status: 'sending',
    });
    const confirmed = makeDomain({
      id: 'server-id-1',
      clientMessageId: 'client-1',
      status: 'sent',
    });
    const result = mergeMessages([optimistic], [confirmed]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('server-id-1');
    expect(result[0].status).toBe('sent');
  });

  it('keeps both messages when they have different ids and clientMessageIds', () => {
    const a = makeDomain({ id: 'msg-1', clientMessageId: 'c-1' });
    const b = makeDomain({ id: 'msg-2', clientMessageId: 'c-2', content: 'Second' });
    const result = mergeMessages([a], [b]);
    expect(result).toHaveLength(2);
  });

  it('does not duplicate on repeated merge of same list', () => {
    const msgs = [
      makeDomain({ id: 'msg-1', clientMessageId: 'c-1' }),
      makeDomain({ id: 'msg-2', clientMessageId: 'c-2' }),
    ];
    const result = mergeMessages(msgs, msgs);
    expect(result).toHaveLength(2);
  });
});

// ── applyReadReceipt ──────────────────────────────────────────────────────────

describe('applyReadReceipt', () => {
  const DRIVER = 'user-driver';
  const PASSENGER = 'user-passenger';
  const READ_AT = '2024-01-01T12:00:00Z';

  const msgs: ChatMessage[] = [
    makeDomain({ id: 'msg-3', clientMessageId: 'c-3', senderId: DRIVER, createdAt: '2024-01-01T10:02:00Z' }),
    makeDomain({ id: 'msg-2', clientMessageId: 'c-2', senderId: PASSENGER, createdAt: '2024-01-01T10:01:00Z' }),
    makeDomain({ id: 'msg-1', clientMessageId: 'c-1', senderId: DRIVER, createdAt: '2024-01-01T10:00:00Z' }),
  ];

  it('marks driver messages as read up to upToMessageId', () => {
    const result = applyReadReceipt(msgs, 'msg-3', READ_AT, DRIVER);
    const driverMsgs = result.filter((m) => m.senderId === DRIVER);
    expect(driverMsgs.every((m) => m.readAt === READ_AT)).toBe(true);
  });

  it('does not modify passenger messages', () => {
    const result = applyReadReceipt(msgs, 'msg-3', READ_AT, DRIVER);
    const passengerMsgs = result.filter((m) => m.senderId === PASSENGER);
    expect(passengerMsgs.every((m) => m.readAt === null)).toBe(true);
  });

  it('returns unchanged list when upToMessageId not found', () => {
    const result = applyReadReceipt(msgs, 'non-existent', READ_AT, DRIVER);
    expect(result).toEqual(msgs);
  });

  it('does not overwrite already-set readAt', () => {
    const withRead = msgs.map((m) =>
      m.senderId === DRIVER ? { ...m, readAt: 'existing-read' } : m,
    );
    // readAt is only set when null — the existing value should be kept
    const result = applyReadReceipt(withRead, 'msg-3', READ_AT, DRIVER);
    const driverMsgs = result.filter((m) => m.senderId === DRIVER);
    expect(driverMsgs.every((m) => m.readAt === 'existing-read')).toBe(true);
  });
});
