import { describe, it, expect, beforeEach } from 'vitest';
import { useForgotPasswordStore } from '../../src/presentation/auth/store/useForgotPasswordStore';

describe('useForgotPasswordStore', () => {
  beforeEach(() => {
    useForgotPasswordStore.getState().clear();
  });

  it('starts with initial empty state', () => {
    const state = useForgotPasswordStore.getState();
    expect(state.email).toBe('');
    expect(state.resetToken).toBeNull();
    expect(state.expiresIn).toBeNull();
  });

  it('updates email normalized to lower case and trimmed', () => {
    useForgotPasswordStore.getState().setEmail('  TEST.DRIVER@Example.com  ');
    expect(useForgotPasswordStore.getState().email).toBe('test.driver@example.com');
  });

  it('sets resetToken and expiresIn in memory', () => {
    useForgotPasswordStore.getState().setResetToken('token-123456', 900);
    const state = useForgotPasswordStore.getState();
    expect(state.resetToken).toBe('token-123456');
    expect(state.expiresIn).toBe(900);
  });

  it('clears all state in memory when clear is invoked', () => {
    useForgotPasswordStore.getState().setEmail('driver@transferblack.com');
    useForgotPasswordStore.getState().setResetToken('secret-token', 600);

    useForgotPasswordStore.getState().clear();

    const state = useForgotPasswordStore.getState();
    expect(state.email).toBe('');
    expect(state.resetToken).toBeNull();
    expect(state.expiresIn).toBeNull();
  });
});
