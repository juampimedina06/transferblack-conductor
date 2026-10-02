import { describe, it, expect } from 'vitest';
import { getCourtesySecondsLeft } from '../../src/presentation/trip/hooks/useCourtesyTimer';

const FIVE_MINUTES = 300;

describe('getCourtesySecondsLeft', () => {
  it('returns the full window when the driver has not arrived yet', () => {
    expect(getCourtesySecondsLeft(null, FIVE_MINUTES, 1_700_000_000_000)).toBe(FIVE_MINUTES);
  });

  it('subtracts the whole seconds elapsed since arrival', () => {
    const arrivedAt = 1_700_000_000_000;
    const now = arrivedAt + 45_000;

    expect(getCourtesySecondsLeft(arrivedAt, FIVE_MINUTES, now)).toBe(255);
  });

  it('floors partial seconds instead of rounding up', () => {
    const arrivedAt = 1_700_000_000_000;
    const now = arrivedAt + 45_999;

    expect(getCourtesySecondsLeft(arrivedAt, FIVE_MINUTES, now)).toBe(255);
  });

  it('never goes below zero once the window has passed', () => {
    const arrivedAt = 1_700_000_000_000;
    const now = arrivedAt + 900_000;

    expect(getCourtesySecondsLeft(arrivedAt, FIVE_MINUTES, now)).toBe(0);
  });

  it('does not count time before the driver arrived', () => {
    const arrivedAt = 1_700_000_000_000;
    const now = arrivedAt - 60_000;

    expect(getCourtesySecondsLeft(arrivedAt, FIVE_MINUTES, now)).toBe(FIVE_MINUTES);
  });
});
