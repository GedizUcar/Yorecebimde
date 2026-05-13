import { describe, it, expect } from 'vitest';
import { encryptToString, decryptFromString, maskIban, maskTcKimlik } from '../crypto.js';

const KEY = 'aGVsbG8td29ybGQtdGVzdC1rZXktMzItYnl0ZS1leGFtcGxlLWtleQ==';

describe('crypto', () => {
  it('encrypt → decrypt round trip', () => {
    const original = '12345678901';
    const encrypted = encryptToString(original, KEY);
    expect(encrypted).not.toBe(original);
    expect(encrypted.split(':')).toHaveLength(3);
    const decrypted = decryptFromString(encrypted, KEY);
    expect(decrypted).toBe(original);
  });

  it('different IVs each time', () => {
    const a = encryptToString('same', KEY);
    const b = encryptToString('same', KEY);
    expect(a).not.toBe(b);
  });

  it('decryption fails with tampered ciphertext', () => {
    const encrypted = encryptToString('secret', KEY);
    const tampered = encrypted.slice(0, -1) + 'X';
    expect(() => decryptFromString(tampered, KEY)).toThrow();
  });

  it('mask IBAN', () => {
    expect(maskIban('TR330006100519786457841326')).toBe('TR********************1326');
    expect(maskIban('TR12 3456 7890 1234 5678 9012 34')).toBe('TR********************1234');
  });

  it('mask TC', () => {
    expect(maskTcKimlik('12345678901')).toBe('*******8901');
  });
});
