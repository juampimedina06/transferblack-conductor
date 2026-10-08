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

import { useLegalStore } from '../../src/presentation/legal/store/useLegalStore';
import {
  CURRENT_LEGAL_TERMS_VERSION,
  DRIVER_LEGAL_CONTRACT,
} from '../../src/core/legal/constants/legalTerms.constants';

describe('useLegalStore (Legal Terms Acceptance & Persistence)', () => {
  beforeEach(() => {
    useLegalStore.getState().resetTermsAcceptance();
  });

  it('initializes with unaccepted terms', () => {
    const state = useLegalStore.getState();
    expect(state.acceptedTermsVersion).toBeNull();
    expect(state.acceptedAt).toBeNull();
    expect(state.hasAcceptedCurrentTerms()).toBe(false);
  });

  it('marks terms as accepted and updates version and timestamp', () => {
    useLegalStore.getState().acceptTerms(CURRENT_LEGAL_TERMS_VERSION);

    const state = useLegalStore.getState();
    expect(state.acceptedTermsVersion).toBe(CURRENT_LEGAL_TERMS_VERSION);
    expect(state.acceptedAt).toBeDefined();
    expect(state.hasAcceptedCurrentTerms()).toBe(true);
  });

  it('rejects outdated versions when current version changed', () => {
    useLegalStore.getState().acceptTerms('2025.1'); // previous outdated version

    const state = useLegalStore.getState();
    expect(state.acceptedTermsVersion).toBe('2025.1');
    expect(state.hasAcceptedCurrentTerms()).toBe(false); // must require re-acceptance
  });

  it('resets terms acceptance cleanly', () => {
    useLegalStore.getState().acceptTerms();
    expect(useLegalStore.getState().hasAcceptedCurrentTerms()).toBe(true);

    useLegalStore.getState().resetTermsAcceptance();
    expect(useLegalStore.getState().hasAcceptedCurrentTerms()).toBe(false);
    expect(useLegalStore.getState().acceptedTermsVersion).toBeNull();
  });
});

describe('DRIVER_LEGAL_CONTRACT Specification', () => {
  it('contains valid version and clauses', () => {
    expect(DRIVER_LEGAL_CONTRACT.version).toBe(CURRENT_LEGAL_TERMS_VERSION);
    expect(DRIVER_LEGAL_CONTRACT.clauses.length).toBeGreaterThanOrEqual(6);
  });

  it('includes mandatory intermediation technology disclaimer', () => {
    const intermediationClause = DRIVER_LEGAL_CONTRACT.clauses.find(
      (c) => c.id === 'clause-1-intermediation',
    );
    expect(intermediationClause).toBeDefined();
    expect(intermediationClause?.content).toContain('intermediación');
  });

  it('includes liability disclaimer for vehicular accidents and insurance duty', () => {
    const accidentClause = DRIVER_LEGAL_CONTRACT.clauses.find(
      (c) => c.id === 'clause-2-accident-liability',
    );
    expect(accidentClause).toBeDefined();
    expect(accidentClause?.content).toContain('seguro automotor');
  });

  it('includes force majeure and crime liability disclaimer', () => {
    const crimeClause = DRIVER_LEGAL_CONTRACT.clauses.find(
      (c) => c.id === 'clause-3-security-force-majeure',
    );
    expect(crimeClause).toBeDefined();
    expect(crimeClause?.content).toContain('hechos delictivos');
  });

  it('specifies cancellation transparency with 5-minute wait grace period', () => {
    const cancelClause = DRIVER_LEGAL_CONTRACT.clauses.find(
      (c) => c.id === 'clause-6-cancellation-policy',
    );
    expect(cancelClause).toBeDefined();
    expect(cancelClause?.content).toContain('5 minutos');
  });
});
