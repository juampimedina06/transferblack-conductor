import { describe, it, expect } from 'vitest';
import {
  forgotPasswordEmailSchema,
  verifyPinSchema,
  resetPasswordFormSchema,
} from '../../src/presentation/auth/schemas/forgot-password.schema';

describe('Forgot Password Schemas', () => {
  describe('forgotPasswordEmailSchema', () => {
    it('accepts valid email', () => {
      const result = forgotPasswordEmailSchema.safeParse({ email: 'driver@transferblack.com' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('driver@transferblack.com');
      }
    });

    it('trims and converts email to lowercase', () => {
      const result = forgotPasswordEmailSchema.safeParse({ email: '  Driver@Domain.COM  ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('driver@domain.com');
      }
    });

    it('rejects invalid email formats', () => {
      expect(forgotPasswordEmailSchema.safeParse({ email: '' }).success).toBe(false);
      expect(forgotPasswordEmailSchema.safeParse({ email: 'invalid-email' }).success).toBe(false);
      expect(forgotPasswordEmailSchema.safeParse({ email: 'user@' }).success).toBe(false);
      expect(forgotPasswordEmailSchema.safeParse({ email: '@domain.com' }).success).toBe(false);
    });
  });

  describe('verifyPinSchema', () => {
    it('accepts exact 6 numeric digits', () => {
      expect(verifyPinSchema.safeParse({ code: '123456' }).success).toBe(true);
      expect(verifyPinSchema.safeParse({ code: '000000' }).success).toBe(true);
    });

    it('rejects codes that do not have exactly 6 numeric digits', () => {
      expect(verifyPinSchema.safeParse({ code: '12345' }).success).toBe(false);
      expect(verifyPinSchema.safeParse({ code: '1234567' }).success).toBe(false);
      expect(verifyPinSchema.safeParse({ code: '12345a' }).success).toBe(false);
      expect(verifyPinSchema.safeParse({ code: 'abcdef' }).success).toBe(false);
      expect(verifyPinSchema.safeParse({ code: '' }).success).toBe(false);
    });
  });

  describe('resetPasswordFormSchema', () => {
    const validPassword = 'Password123';

    it('accepts valid password and matching confirmation', () => {
      const result = resetPasswordFormSchema.safeParse({
        password: validPassword,
        confirmPassword: validPassword,
      });
      expect(result.success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = resetPasswordFormSchema.safeParse({
        password: 'Pass1',
        confirmPassword: 'Pass1',
      });
      expect(result.success).toBe(false);
    });

    it('rejects passwords without an uppercase letter', () => {
      const result = resetPasswordFormSchema.safeParse({
        password: 'password123',
        confirmPassword: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects passwords without a lowercase letter', () => {
      const result = resetPasswordFormSchema.safeParse({
        password: 'PASSWORD123',
        confirmPassword: 'PASSWORD123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects passwords without a number', () => {
      const result = resetPasswordFormSchema.safeParse({
        password: 'PasswordTest',
        confirmPassword: 'PasswordTest',
      });
      expect(result.success).toBe(false);
    });

    it('rejects when confirmPassword does not match password', () => {
      const result = resetPasswordFormSchema.safeParse({
        password: 'Password123',
        confirmPassword: 'Password124',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Las contraseñas no coinciden');
      }
    });
  });
});
