import { describe, it, expect } from 'vitest';
import { normalizeTrPhone, isTrPhone, maskTrPhone } from '../phone.js';

describe('normalizeTrPhone', () => {
  it('handles multiple formats', () => {
    expect(normalizeTrPhone('05551234567')).toBe('+905551234567');
    expect(normalizeTrPhone('5551234567')).toBe('+905551234567');
    expect(normalizeTrPhone('+90 555 123 45 67')).toBe('+905551234567');
    expect(normalizeTrPhone('0090 555 1234567')).toBe('+905551234567');
  });

  it('rejects invalid', () => {
    expect(() => normalizeTrPhone('1234')).toThrow();
    expect(() => normalizeTrPhone('04441234567')).toThrow();
  });
});

describe('isTrPhone', () => {
  it('boolean wrapper', () => {
    expect(isTrPhone('05551234567')).toBe(true);
    expect(isTrPhone('not a phone')).toBe(false);
  });
});

describe('maskTrPhone', () => {
  it('masks middle', () => {
    expect(maskTrPhone('+905551234567')).toBe('+90555 *** ** 67');
  });
});
