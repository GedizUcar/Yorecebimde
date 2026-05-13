const TR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

export function toSlug(input: string): string {
  const trans = input
    .split('')
    .map((c) => TR_MAP[c] ?? c)
    .join('');
  return trans
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Slug üretici with collision retry:
 * Caller provides an `isTaken(slug) => Promise<boolean>` checker.
 */
export async function ensureUniqueSlug(
  base: string,
  isTaken: (s: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  let candidate = toSlug(base);
  if (!(await isTaken(candidate))) return candidate;
  for (let i = 2; i <= maxAttempts; i++) {
    candidate = `${toSlug(base)}-${i}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`Could not generate unique slug for "${base}" after ${maxAttempts} attempts`);
}
