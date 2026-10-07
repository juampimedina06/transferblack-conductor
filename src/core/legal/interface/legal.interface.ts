export interface LegalClause {
  id: string;
  title: string;
  summary: string;
  content: string;
  important?: boolean;
}

export interface LegalContract {
  version: string;
  effectiveDate: string;
  jurisdiction: string;
  title: string;
  subtitle: string;
  clauses: LegalClause[];
}

export interface LegalTermsAcceptanceRecord {
  version: string;
  acceptedAt: string; // ISO date
  userId?: string | null;
  deviceId?: string | null;
}
