import { describe, it, expect, beforeEach } from 'vitest';
import { BoostListingService } from '../boost-listing.service.js';

/**
 * Pure-logic test — interleave fonksiyonu DB'ye dokunmaz.
 * BoostListingService constructor DB token ister ama interleave bunu kullanmaz,
 * mock geçilebilir.
 */
describe('BoostListingService.interleave', () => {
  let service: BoostListingService;

  beforeEach(() => {
    // DB-token kullanılmıyor interleave için
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new BoostListingService({} as any);
  });

  type FakeProduct = { id: string; name: string };

  it('boş listede organic değişmeden döner', () => {
    const organic: FakeProduct[] = [];
    const result = service.interleave(organic, []);
    expect(result).toEqual([]);
  });

  it('boost olmayınca organic listeyi aynı döner', () => {
    const organic: FakeProduct[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ];
    const result = service.interleave(organic, []);
    expect(result).toEqual(organic);
  });

  it('20% ratio ile her 5. position sonrası sponsorlu slot ekler', () => {
    const organic: FakeProduct[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      name: `Org${i + 1}`,
    }));
    const boosts = [
      { boostId: 'b1', productId: 'sp1', isSponsored: true as const, product: { id: 'sp1', name: 'Sp1' } },
      { boostId: 'b2', productId: 'sp2', isSponsored: true as const, product: { id: 'sp2', name: 'Sp2' } },
    ];
    const result = service.interleave(organic, boosts);
    // 10 organic + her 5'te 1 boost = 5,10 pozisyonlarında insert → 12 toplam
    expect(result.length).toBeGreaterThan(organic.length);
    // İlk 5 organic, sonra 1 sponsorlu, sonra 5 organic, sonra 1 sponsorlu
    expect(result[5]?.id).toBe('sp1');
    expect((result[5] as { isSponsored?: boolean }).isSponsored).toBe(true);
  });

  it('organic listede zaten olan boost ürünü atlanır (dedupe)', () => {
    const organic: FakeProduct[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      name: `Org${i + 1}`,
    }));
    const boosts = [
      // Bu boost ürünü zaten organic'te (id=3)
      { boostId: 'b1', productId: '3', isSponsored: true as const, product: { id: '3', name: 'Org3' } },
      { boostId: 'b2', productId: 'sp1', isSponsored: true as const, product: { id: 'sp1', name: 'Sp1' } },
    ];
    const result = service.interleave(organic, boosts);
    // Dedupe sonrası sadece sp1 interleave edilmeli
    const sponsoredIds = result
      .filter((r) => (r as { isSponsored?: boolean }).isSponsored)
      .map((r) => r.id);
    expect(sponsoredIds).toContain('sp1');
    expect(sponsoredIds).not.toContain('3');
  });

  it('boost listesi organicten fazlaysa sadece slot kadarı eklenir', () => {
    const organic: FakeProduct[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
      { id: '4', name: 'D' },
      { id: '5', name: 'E' },
    ];
    const boosts = Array.from({ length: 10 }, (_, i) => ({
      boostId: `b${i}`,
      productId: `sp${i}`,
      isSponsored: true as const,
      product: { id: `sp${i}`, name: `Sp${i}` },
    }));
    const result = service.interleave(organic, boosts);
    // 5 organic için max 1 sponsored slot (her 5'te 1)
    const sponsoredCount = result.filter((r) => (r as { isSponsored?: boolean }).isSponsored).length;
    expect(sponsoredCount).toBeLessThanOrEqual(1);
  });
});
