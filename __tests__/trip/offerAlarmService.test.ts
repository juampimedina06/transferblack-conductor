import { describe, it, expect, vi, beforeEach } from 'vitest';
import { offerAlarmService } from '../../src/presentation/trip/services/offerAlarmService';
import { Vibration } from 'react-native';
import { Audio } from 'expo-av';

vi.mock('react-native', () => ({
  Vibration: {
    vibrate: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: vi.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: vi.fn().mockResolvedValue({
        sound: {
          stopAsync: vi.fn().mockResolvedValue(undefined),
          unloadAsync: vi.fn().mockResolvedValue(undefined),
        },
      }),
    },
  },
}));

describe('Offer Alarm Service (TICKET-01)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await offerAlarmService.stop();
  });

  it('starts chill audio mode without vibration by default and configures high-priority audio mode', async () => {
    await offerAlarmService.start();

    expect(Vibration.vibrate).not.toHaveBeenCalled();
    expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      })
    );
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

  it('stops vibration and audio when stop is called', async () => {
    await offerAlarmService.start({ vibrate: true });
    await offerAlarmService.stop();

    expect(Vibration.cancel).toHaveBeenCalled();
    expect(offerAlarmService.getStatus().isVibrating).toBe(false);
    expect(offerAlarmService.getStatus().isPlaying).toBe(false);
  });
});
