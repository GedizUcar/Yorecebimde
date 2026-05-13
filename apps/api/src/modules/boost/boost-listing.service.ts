import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, lte, gte, sql } from 'drizzle-orm';
import {
  categories,
  productCategories,
  products,
  sellerBoosts,
  sellers,
} from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type BoostedItem = {
  boostId: string;
  productId: string;
  isSponsored: true;
};

/**
 * Boost listing algoritması.
 * - Aktif boost'ları (`now() between starts_at and ends_at`, cancelled_at IS NULL)
 *   getir, kategori filtreliyse o kategoriye ait olanları al.
 * - Impressions'a göre fewest-first sırala (fairness — yeni boost'lar öne çıkar).
 * - Her 5 organik üründen 1'i sponsorlu slot (BOOST_RATIO_PERCENT env override).
 * - Aynı productId organik listede varsa boost slot'unu atla (duplikasyon önleme).
 */
@Injectable()
export class BoostListingService {
  private readonly BOOST_RATIO_PERCENT = Number(process.env.BOOST_RATIO_PERCENT) || 20;

  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  async getCandidates(filter: {
    categorySlug?: string;
    sellerSlug?: string;
    limit?: number;
  }): Promise<BoostedItem[]> {
    const limit = filter.limit ?? 10;
    const now = new Date();

    const where = [
      isNull(sellerBoosts.cancelledAt),
      lte(sellerBoosts.startsAt, now),
      gte(sellerBoosts.endsAt, now),
      eq(products.isActive, true),
      isNull(products.deletedAt),
    ];

    if (filter.sellerSlug) {
      where.push(eq(sellers.slug, filter.sellerSlug));
    }

    if (filter.categorySlug) {
      const [cat] = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, filter.categorySlug))
        .limit(1);
      if (!cat) return [];
      const productIds = await this.db
        .select({ productId: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, cat.id));
      if (productIds.length === 0) return [];
      where.push(inArray(sellerBoosts.productId, productIds.map((p) => p.productId)));
    }

    const rows = await this.db
      .select({
        boostId: sellerBoosts.id,
        productId: sellerBoosts.productId,
        impressions: sellerBoosts.impressions,
      })
      .from(sellerBoosts)
      .innerJoin(products, eq(products.id, sellerBoosts.productId))
      .innerJoin(sellers, eq(sellers.id, sellerBoosts.sellerId))
      .where(and(...where))
      .orderBy(sql`${sellerBoosts.impressions} asc, random()`)
      .limit(limit);

    return rows.map((r) => ({
      boostId: r.boostId,
      productId: r.productId,
      isSponsored: true as const,
    }));
  }

  /**
   * Organik liste + boost slot'ları interleave et.
   * Pattern: her N pozisyondan biri sponsorlu (N = 100 / BOOST_RATIO_PERCENT).
   * Aynı productId organikte varsa o boost atlanır.
   */
  interleave<T extends { id: string }>(
    organic: T[],
    boosts: Array<BoostedItem & { product: T }>,
  ): Array<T & { isSponsored?: boolean; boostId?: string }> {
    if (boosts.length === 0 || organic.length === 0) return organic;
    const skip = Math.max(2, Math.floor(100 / this.BOOST_RATIO_PERCENT));
    const organicIds = new Set(organic.map((o) => o.id));
    const available = boosts.filter((b) => !organicIds.has(b.product.id));
    if (available.length === 0) return organic;

    const result: Array<T & { isSponsored?: boolean; boostId?: string }> = [];
    let bIdx = 0;
    for (let i = 0; i < organic.length; i++) {
      result.push(organic[i]!);
      if ((i + 1) % skip === 0 && bIdx < available.length) {
        const b = available[bIdx++]!;
        result.push({ ...b.product, isSponsored: true, boostId: b.boostId });
      }
    }
    return result;
  }

  /** Boost gösterimini track et (best-effort, hata yutulur). */
  async trackImpression(boostId: string) {
    try {
      await this.db
        .update(sellerBoosts)
        .set({ impressions: sql`${sellerBoosts.impressions} + 1` })
        .where(eq(sellerBoosts.id, boostId));
    } catch {
      // best-effort
    }
  }

  async trackClick(boostId: string) {
    try {
      await this.db
        .update(sellerBoosts)
        .set({ clicks: sql`${sellerBoosts.clicks} + 1` })
        .where(eq(sellerBoosts.id, boostId));
    } catch {
      // best-effort
    }
  }

  /**
   * Cron entry — endsAt geçmiş aktif boost'ları "cancelled" işaretler.
   * Listing'de zaten endsAt filtreli, bu sadece raporlama temizliği.
   * Idempotent — zaten cancelled olanlar etkilenmez.
   */
  async rotateExpired(): Promise<{ expired: number }> {
    const now = new Date();
    const result = await this.db
      .update(sellerBoosts)
      .set({ cancelledAt: now, updatedAt: now })
      .where(
        and(
          isNull(sellerBoosts.cancelledAt),
          sql`${sellerBoosts.endsAt} < ${now}`,
        ),
      )
      .returning({ id: sellerBoosts.id });
    return { expired: result.length };
  }
}
