import { describe, it, expect } from 'vitest';
import { toSlug, ensureUniqueSlug } from '../slug.js';

describe('toSlug', () => {
  it('handles Turkish characters', () => {
    expect(toSlug('Ezine Beyaz Peyniri')).toBe('ezine-beyaz-peyniri');
    expect(toSlug('Çiğ Köfte')).toBe('cig-kofte');
    expect(toSlug('Üzüm Pekmezi')).toBe('uzum-pekmezi');
    expect(toSlug('Şanlıurfa Acı Biber')).toBe('sanliurfa-aci-biber');
    expect(toSlug('İstanbul Lokumu')).toBe('istanbul-lokumu');
  });

  it('strips special chars', () => {
    expect(toSlug('Bal & Reçel!')).toBe('bal-recel');
    expect(toSlug('   spaces   between   ')).toBe('spaces-between');
  });
});

describe('ensureUniqueSlug', () => {
  it('returns base if available', async () => {
    const slug = await ensureUniqueSlug('Domates', async () => false);
    expect(slug).toBe('domates');
  });

  it('appends counter on collision', async () => {
    const taken = new Set(['domates', 'domates-2']);
    const slug = await ensureUniqueSlug('Domates', async (s) => taken.has(s));
    expect(slug).toBe('domates-3');
  });
});
