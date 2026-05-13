/**
 * TR telefon normalize: +905XXXXXXXXX formatına çevirir.
 * Kabul edilen girişler:
 *   - 05XX XXX XX XX
 *   - 5XX XXX XX XX
 *   - +90 5XX XXX XX XX
 *   - 0090 5XX XXX XX XX
 */
export function normalizeTrPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  let n = digits;
  if (n.startsWith('0090')) n = n.slice(4);
  else if (n.startsWith('90') && n.length === 12) n = n.slice(2);
  else if (n.startsWith('0') && n.length === 11) n = n.slice(1);
  if (n.length !== 10 || !n.startsWith('5')) {
    throw new Error('Invalid Turkish phone number');
  }
  return `+90${n}`;
}

export function isTrPhone(input: string): boolean {
  try {
    normalizeTrPhone(input);
    return true;
  } catch {
    return false;
  }
}

export function maskTrPhone(phone: string): string {
  // +90 5XX *** ** XX (TR mobile = 5XX XXX XX XX → 10 hane)
  const m = phone.match(/^\+90(5\d{2})\d{3}\d{2}(\d{2})$/);
  if (!m) return phone;
  return `+90${m[1]} *** ** ${m[2]}`;
}
