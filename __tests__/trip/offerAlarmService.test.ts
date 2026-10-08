import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offerAlarmService } from '../../src/presentation/trip/services/offerAlarmService';
import { Vibration } from 'react-native';

vi.mock('react-native', () => ({
  Vibration: {
    vibrate: vi.fn(),
    cancel: vi.fn(),
  },
}));

describe('Offer Alarm Service (TICKET-01)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await offerAlarmService.stop();
  });

  it('starts without vibration by default', async () => {
    await offerAlarmService.start();

    expect(Vibration.vibrate).not.toHaveBeenCalled();
    expect(offerAlarmService.getStatus().isVibrating).toBe(false);
    expect(offerAlarmService.getStatus().isPlaying).toBe(true);
  });

  it('vibrates when explicitly requested in options', async () => {
    await offerAlarmService.start({ vibrate: true });

    expect(Vibration.vibrate).toHaveBeenCalledWith([0, 500, 500, 500], true);
    expect(offerAlarmService.getStatus().isVibrating).toBe(true);
  });

  it('does not re-trigger start if already playing', async () => {
    await offerAlarmService.start({ vibrate: true });
    await offerAlarmService.start({ vibrate: true });

    expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
  });

  it('stops vibration when stop is called', async () => {
    await offerAlarmService.start({ vibrate: true });
    await offerAlarmService.stop();

    expect(Vibration.cancel).toHaveBeenCalled();
    expect(offerAlarmService.getStatus().isVibrating).toBe(false);
    expect(offerAlarmService.getStatus().isPlaying).toBe(false);
  });
});
