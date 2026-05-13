/**
 * Money utilities. Tüm para kuruş (integer) olarak DB'de tutulur (NUMERIC kullansak da uygulama içinde decimal hesap).
 * Bu modül `string` veya `number` olarak gelen TL değerlerini güvenli hesapla yardımcıları sağlar.
 *
 * Asla JavaScript `number` ile direkt para hesabı yapma. Bunun yerine kuruş (integer) bazlı:
 *   - 50.25 TL → 5025 kuruş
 *
 * Hesap sonunda 2 ondalık `string`'e dönüştür.
 */

export type Money = bigint; // kuruş cinsinden integer

export function fromMajor(major: string | number): Money {
  const s = typeof major === 'number' ? major.toFixed(2) : major;
  const [intPart, decPart = ''] = s.split('.');
  const padded = (decPart + '00').slice(0, 2);
  return BigInt(intPart!) * 100n + BigInt(padded);
}

export function fromKurus(kurus: bigint | number | string): Money {
  return typeof kurus === 'bigint' ? kurus : BigInt(kurus);
}

export function toMajor(m: Money): string {
  const negative = m < 0n;
  const abs = negative ? -m : m;
  const intPart = abs / 100n;
  const decPart = abs % 100n;
  const decStr = decPart.toString().padStart(2, '0');
  return `${negative ? '-' : ''}${intPart}.${decStr}`;
}

export function toMajorNumber(m: Money): number {
  return Number(m) / 100;
}

export function format(m: Money, locale: 'tr' | 'en' = 'tr'): string {
  const major = toMajorNumber(m);
  return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency: 'TRY',
  }).format(major);
}

export function add(a: Money, b: Money): Money {
  return a + b;
}

export function sub(a: Money, b: Money): Money {
  return a - b;
}

/** percentage: 0-100 (örn. 10 → %10) */
export function applyPercentage(m: Money, percentage: number): Money {
  if (percentage < 0 || percentage > 100) throw new Error('Percentage must be 0-100');
  // (m * percentage * 100) / 10000 — bigint integer math
  const scaled = (m * BigInt(Math.round(percentage * 100))) / 10000n;
  return scaled;
}

export function multiplyByQuantity(unitPrice: Money, quantity: string | number): Money {
  // quantity ondalıklı olabilir (kg cinsinden). Önce kuruş × quantity → integer.
  const q = typeof quantity === 'number' ? quantity : Number(quantity);
  if (!Number.isFinite(q) || q < 0) throw new Error('Invalid quantity');
  // 3 ondalık basamağa kadar quantity desteği: çarp 1000 → integer
  const scaledQty = BigInt(Math.round(q * 1000));
  return (unitPrice * scaledQty) / 1000n;
}

export const ZERO: Money = 0n;
