import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALG = 'aes-256-gcm';
const IV_LENGTH = 12;

function deriveKey(rawKey: string): Buffer {
  // ENCRYPTION_KEY base64 ya da raw string olabilir; 32 byte'a normalize et
  if (/^[A-Za-z0-9+/=]+$/.test(rawKey) && Buffer.from(rawKey, 'base64').length >= 32) {
    return Buffer.from(rawKey, 'base64').subarray(0, 32);
  }
  return scryptSync(rawKey, 'yorecebimde-static-salt', 32);
}

export type EncryptedPayload = {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
};

export function encrypt(plaintext: string, key: string): EncryptedPayload {
  const derivedKey = deriveKey(key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALG, derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decrypt(payload: EncryptedPayload, key: string): string {
  const derivedKey = deriveKey(key);
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = createDecipheriv(ALG, derivedKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Encode encrypted payload as a single string for DB column storage.
 * Format: `<iv>:<tag>:<ciphertext>` (all base64)
 */
export function packEncrypted(p: EncryptedPayload): string {
  return `${p.iv}:${p.tag}:${p.ciphertext}`;
}

export function unpackEncrypted(s: string): EncryptedPayload {
  const parts = s.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
  const [iv, tag, ciphertext] = parts;
  if (!iv || !tag || !ciphertext) throw new Error('Invalid encrypted payload format');
  return { iv, tag, ciphertext };
}

export function encryptToString(plaintext: string, key: string): string {
  return packEncrypted(encrypt(plaintext, key));
}

export function decryptFromString(packed: string, key: string): string {
  return decrypt(unpackEncrypted(packed), key);
}

/** Mask IBAN: TR**********1234 (last 4 görünür) */
export function maskIban(iban: string): string {
  const clean = iban.replace(/\s/g, '');
  if (clean.length < 6) return clean;
  const prefix = clean.slice(0, 2);
  const suffix = clean.slice(-4);
  const middle = '*'.repeat(Math.max(0, clean.length - 6));
  return `${prefix}${middle}${suffix}`;
}

/** Mask TC: ***1234567 (son 4) */
export function maskTcKimlik(tc: string): string {
  if (tc.length !== 11) return '***********';
  return `*******${tc.slice(-4)}`;
}
