import type {
  DriverCompliance,
  DriverDocumentItem,
} from '../interface/driverStatus.interface';

const parseDateMs = (isoDate?: string | null): number | null => {
  if (!isoDate) return null;
  const ms = Date.parse(isoDate);
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Returns true if the document is currently covered by an active admin-granted grace period.
 */
export function isGracePeriodActive(
  doc: Pick<DriverDocumentItem, 'status' | 'graceUntil'>,
  now: Date = new Date()
): boolean {
  const graceMs = parseDateMs(doc.graceUntil);
  if (graceMs !== null) {
    return graceMs > now.getTime();
  }
  return doc.status === 'grace_period';
}

/**
 * Returns true if the document is expired without an active grace period
 * (or its grace period has already elapsed).
 */
export function isDocumentExpiredAndBlocking(
  doc: Pick<DriverDocumentItem, 'status' | 'expiresAt' | 'graceUntil'>,
  now: Date = new Date()
): boolean {
  if (isGracePeriodActive(doc, now)) {
    return false;
  }

  if (doc.status === 'expired') {
    return true;
  }

  if (doc.status === 'grace_period') {
    const graceMs = parseDateMs(doc.graceUntil);
    return graceMs !== null && graceMs <= now.getTime();
  }

  return false;
}

/**
 * Returns true when the driver's compliance status should block going online.
 * Documents with an active grace period never block going online.
 */
export function isComplianceBlockingOnline(
  compliance: DriverCompliance,
  documents: DriverDocumentItem[] = [],
  now: Date = new Date()
): boolean {
  if (compliance.status !== 'suspended_documents') {
    return false;
  }

  const blockingTypes = compliance.blockingDocuments ?? [];
  if (blockingTypes.length === 0 || documents.length === 0) {
    return true;
  }

  const hasNonGraceBlockingDoc = blockingTypes.some((docType) => {
    const match = documents.find(
      (doc) => doc.documentType === docType || doc.type === docType
    );
    if (!match) return true;
    return !isGracePeriodActive(match, now);
  });

  return hasNonGraceBlockingDoc;
}

/**
 * Returns documents currently in an active grace period, sorted by soonest deadline first.
 */
export function getActiveGraceDocuments(
  documents: DriverDocumentItem[],
  now: Date = new Date()
): DriverDocumentItem[] {
  return documents
    .filter((doc) => isGracePeriodActive(doc, now))
    .sort((a, b) => {
      const aMs = parseDateMs(a.graceUntil) ?? Number.MAX_SAFE_INTEGER;
      const bMs = parseDateMs(b.graceUntil) ?? Number.MAX_SAFE_INTEGER;
      return aMs - bMs;
    });
}

export function formatShortArDate(isoDate?: string | null): string {
  if (!isoDate) return '';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
