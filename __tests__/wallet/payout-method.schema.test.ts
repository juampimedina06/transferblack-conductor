import { describe, it, expect } from 'vitest';
import { payoutMethodSchema } from '../../src/presentation/wallet/schemas/payout-method.schema';

describe('payoutMethodSchema', () => {
  const validData = {
    account_type: 'CVU' as const,
    cbu_cvu: '0000003100010000000001',
    alias: 'juan.perez.mp',
    account_holder_name: 'Juan Perez',
    account_holder_document: '20-12345678-9',
  };

  it('validates correct payout method data', () => {
    const result = payoutMethodSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects CBU/CVU that is not exactly 22 numeric digits', () => {
    // 21 digits
    const resultTooShort = payoutMethodSchema.safeParse({
      ...validData,
      cbu_cvu: '000000310001000000000',
    });
    expect(resultTooShort.success).toBe(false);

    // 23 digits
    const resultTooLong = payoutMethodSchema.safeParse({
      ...validData,
      cbu_cvu: '00000031000100000000001',
    });
    expect(resultTooLong.success).toBe(false);

    // non-numeric
    const resultNonNumeric = payoutMethodSchema.safeParse({
      ...validData,
      cbu_cvu: '000000310001000000000a',
    });
    expect(resultNonNumeric.success).toBe(false);
  });

  it('rejects alias with fewer than 6 characters', () => {
    const result = payoutMethodSchema.safeParse({
      ...validData,
      alias: 'abc',
    });
    expect(result.success).toBe(false);
  });

  it('rejects account holder name shorter than 2 characters', () => {
    const result = payoutMethodSchema.safeParse({
      ...validData,
      account_holder_name: 'J',
    });
    expect(result.success).toBe(false);
  });

  it('rejects document shorter than 6 characters', () => {
    const result = payoutMethodSchema.safeParse({
      ...validData,
      account_holder_document: '12345',
    });
    expect(result.success).toBe(false);
  });
});
