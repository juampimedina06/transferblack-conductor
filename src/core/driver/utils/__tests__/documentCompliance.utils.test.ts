import { describe, expect, it } from 'vitest';
import type {
  DriverCompliance,
  DriverDocumentItem,
} from '../../interface/driverStatus.interface';
import {
  getActiveGraceDocuments,
  isComplianceBlockingOnline,
  isDocumentExpiredAndBlocking,
  isGracePeriodActive,
} from '../documentCompliance.utils';

const NOW = new Date('2026-11-23T12:00:00.000Z');

const makeDoc = (overrides: Partial<DriverDocumentItem>): DriverDocumentItem => ({
  id: 'doc-1',
  documentType: 'insurance_policy',
  status: 'valid',
  expiresAt: '2027-01-01T00:00:00.000Z',
  graceUntil: null,
  ...overrides,
});

describe('documentCompliance.utils', () => {
  it('treats grace_period with future graceUntil as active and non-blocking', () => {
    const doc = makeDoc({
      status: 'grace_period',
      expiresAt: '2026-11-01T00:00:00.000Z',
      graceUntil: '2026-12-23T00:00:00.000Z',
      daysRemaining: 30,
    });

    expect(isGracePeriodActive(doc, NOW)).toBe(true);
    expect(isDocumentExpiredAndBlocking(doc, NOW)).toBe(false);
  });

  it('treats expired document with past graceUntil as blocking again', () => {
    const expiredGraceDoc = makeDoc({
      status: 'grace_period',
      expiresAt: '2026-10-01T00:00:00.000Z',
      graceUntil: '2026-11-20T00:00:00.000Z',
    });

    expect(isGracePeriodActive(expiredGraceDoc, NOW)).toBe(false);
    expect(isDocumentExpiredAndBlocking(expiredGraceDoc, NOW)).toBe(true);
  });

  it('keeps expired document without grace period blocking', () => {
    const expiredDoc = makeDoc({
      status: 'expired',
      expiresAt: '2026-11-01T00:00:00.000Z',
      graceUntil: null,
    });

    expect(isGracePeriodActive(expiredDoc, NOW)).toBe(false);
    expect(isDocumentExpiredAndBlocking(expiredDoc, NOW)).toBe(true);
  });

  it('does not block going online when compliance is compliant or only grace-covered docs exist', () => {
    const compliant: DriverCompliance = { status: 'compliant', blockingDocuments: [] };
    expect(isComplianceBlockingOnline(compliant, [], NOW)).toBe(false);

    const staleSuspended: DriverCompliance = {
      status: 'suspended_documents',
      blockingDocuments: ['insurance_policy'],
    };
    const graceDoc = makeDoc({
      documentType: 'insurance_policy',
      status: 'grace_period',
      graceUntil: '2026-12-23T00:00:00.000Z',
    });
    expect(isComplianceBlockingOnline(staleSuspended, [graceDoc], NOW)).toBe(false);

    const expiredDoc = makeDoc({
      documentType: 'insurance_policy',
      status: 'expired',
      graceUntil: null,
    });
    expect(isComplianceBlockingOnline(staleSuspended, [expiredDoc], NOW)).toBe(true);
  });

  it('sorts active grace documents by soonest graceUntil first', () => {
    const later = makeDoc({
      id: 'later',
      documentType: 'dni',
      status: 'grace_period',
      graceUntil: '2026-12-30T00:00:00.000Z',
    });
    const sooner = makeDoc({
      id: 'sooner',
      documentType: 'license_d1',
      status: 'grace_period',
      graceUntil: '2026-12-05T00:00:00.000Z',
    });
    const elapsed = makeDoc({
      id: 'elapsed',
      documentType: 'itv',
      status: 'grace_period',
      graceUntil: '2026-11-01T00:00:00.000Z',
    });

    const active = getActiveGraceDocuments([later, elapsed, sooner], NOW);
    expect(active.map((d) => d.id)).toEqual(['sooner', 'later']);
  });
});
