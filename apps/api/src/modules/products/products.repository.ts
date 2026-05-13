import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  products,
  productImages,
  productVariations,
  productCategories,
  discounts,
  categories,
  sellers,
} from '@yorecebimde/db/schema';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';

export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type ProductImageRow = typeof productImages.$inferSelect;
export type ProductVariationRow = typeof productVariations.$inferSelect;
export type DiscountRow = typeof discounts.$inferSelect;

export type ListingItem = ProductRow & {
  seller: { id: string; slug: string; displayName: string };
  // Aktif indirim özeti (kart üstünde göstermek için)
  bestDiscountPct?: number;
  hasQuantityDiscount?: boolean;
  // Birincil görsel (sort_order=0, processing_status='ready')
  primaryImage?: { url: string; webpUrl: string | null; thumbnailUrl: string | null };
};

export type ProductWithRelations = ProductRow & {
  seller: { id: string; slug: string; displayName: string };
  categories: Array<{ id: string; slug: string; nameTr: string; isPrimary: boolean }>;
  images: ProductImageRow[];
  variations: ProductVariationRow[];
  discounts: DiscountRow[];
};

export type PublicListingFilter = {
  categorySlug?: string;
  sellerSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyDiscounted?: boolean;
  onlyColdChain?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'best_selling' | 'top_rated';
  page?: number;
  limit?: number;
};

@Injectable()
export class ProductsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: DbToken) {}

  // ─── Public marketplace queries ────────────────────────────

  /**
   * Public listeleme — anasayfa, kategori sayfası, search sonuç.
   * Sadece is_active=true && deleted_at IS NULL.
   */
  async publicListing(filter: PublicListingFilter): Promise<{ items: ListingItem[]; total: number }> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(products.isActive, true), isNull(products.deletedAt)];

    if (filter.onlyColdChain) {
      conditions.push(eq(products.isColdChain, true));
    }

    if (filter.minPrice !== undefined) {
      conditions.push(sql`${products.baseUnitPrice} >= ${filter.minPrice}`);
    }
    if (filter.maxPrice !== undefined) {
      conditions.push(sql`${products.baseUnitPrice} <= ${filter.maxPrice}`);
    }

    // Kategori filter — descendant ID'ler dahil
    let categoryProductIds: string[] | null = null;
    if (filter.categorySlug) {
      const catRows = await this.db
        .select({ id: categories.id, path: categories.path })
        .from(categories)
        .where(and(eq(categories.slug, filter.categorySlug), isNull(categories.deletedAt)))
        .limit(1);
      const cat = catRows[0];
      if (!cat) {
        return { items: [], total: 0 };
      }
      // Descendant slug'ları al → product_categories ile match et
      const descIds = (
        await this.db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              sql`${categories.path} LIKE ${cat.path + '%'}`,
              isNull(categories.deletedAt),
            ),
          )
      ).map((r) => r.id);

      const pcRows = await this.db
        .selectDistinct({ productId: productCategories.productId })
        .from(productCategories)
        .where(inArray(productCategories.categoryId, descIds));
      categoryProductIds = pcRows.map((r) => r.productId);

      if (categoryProductIds.length === 0) {
        return { items: [], total: 0 };
      }
      conditions.push(inArray(products.id, categoryProductIds));
    }

    if (filter.sellerSlug) {
      const sellerRows = await this.db
        .select({ id: sellers.id })
        .from(sellers)
        .where(and(eq(sellers.slug, filter.sellerSlug), isNull(sellers.deletedAt)))
        .limit(1);
      const seller = sellerRows[0];
      if (!seller) return { items: [], total: 0 };
      conditions.push(eq(products.sellerId, seller.id));
    }

    if (filter.onlyDiscounted) {
      // Aktif indirimi olan ürünler — subquery
      const discountedIds = await this.db
        .selectDistinct({ productId: discounts.productId })
        .from(discounts)
        .where(and(eq(discounts.isActive, true), isNull(discounts.deletedAt)));
      const ids = discountedIds.map((r) => r.productId);
      if (ids.length === 0) return { items: [], total: 0 };
      conditions.push(inArray(products.id, ids));
    }

    // ORDER BY
    let orderBy;
    switch (filter.sort) {
      case 'price_asc':
        orderBy = asc(products.baseUnitPrice);
        break;
      case 'price_desc':
        orderBy = desc(products.baseUnitPrice);
        break;
      case 'best_selling':
        orderBy = desc(products.salesCount);
        break;
      case 'top_rated':
        orderBy = desc(products.ratingAvg);
        break;
      default:
        orderBy = desc(products.createdAt);
    }

    const rows = await this.db
      .select({
        product: products,
        seller: { id: sellers.id, slug: sellers.slug, displayName: sellers.displayName },
      })
      .from(products)
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Bu ürünler için aktif indirim özeti (tek query)
    const productIds = rows.map((r) => r.product.id);
    const discountSummary = new Map<string, { pct: number; hasQty: boolean }>();
    if (productIds.length > 0) {
      const discRows = await this.db
        .select()
        .from(discounts)
        .where(
          and(
            inArray(discounts.productId, productIds),
            eq(discounts.isActive, true),
            isNull(discounts.deletedAt),
          ),
        );
      const now = new Date();
      for (const d of discRows) {
        const existing = discountSummary.get(d.productId) ?? { pct: 0, hasQty: false };
        if (d.type === 'permanent' && d.percentage) {
          const p = Number(d.percentage);
          if (p > existing.pct) existing.pct = p;
        } else if (d.type === 'time_based' && d.percentage && d.startsAt && d.endsAt) {
          if (now >= d.startsAt && now <= d.endsAt) {
            const p = Number(d.percentage);
            if (p > existing.pct) existing.pct = p;
          }
        } else if (d.type === 'quantity_based') {
          existing.hasQty = true;
        }
        discountSummary.set(d.productId, existing);
      }
    }

    // Birincil görseller (her ürün için sort_order en küçük, status='ready')
    const primaryImages = new Map<string, ListingItem['primaryImage']>();
    if (productIds.length > 0) {
      const imgRows = await this.db
        .select()
        .from(productImages)
        .where(
          and(
            inArray(productImages.productId, productIds),
            eq(productImages.processingStatus, 'ready'),
          ),
        )
        .orderBy(asc(productImages.sortOrder));
      for (const img of imgRows) {
        if (!primaryImages.has(img.productId)) {
          primaryImages.set(img.productId, {
            url: img.url,
            webpUrl: img.webpUrl,
            thumbnailUrl: img.thumbnailUrl,
          });
        }
      }
    }

    const items: ListingItem[] = rows.map((r) => {
      const summary = discountSummary.get(r.product.id);
      const out: ListingItem = { ...r.product, seller: r.seller };
      if (summary?.pct) out.bestDiscountPct = summary.pct;
      if (summary?.hasQty) out.hasQuantityDiscount = true;
      const img = primaryImages.get(r.product.id);
      if (img) out.primaryImage = img;
      return out;
    });

    const countRows = (await this.db.execute<{ count: string }>(
      sql`SELECT count(*)::text AS count FROM products WHERE ${and(...conditions)}`,
    )) as unknown as Array<{ count: string }>;

    return { items, total: Number(countRows[0]?.count ?? 0) };
  }

  /** Listing item shape with seller + primary image, by ids. Boost interleave için kullanılır. */
  async findManyByIdsForListing(ids: string[]): Promise<ListingItem[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({
        product: products,
        seller: { id: sellers.id, slug: sellers.slug, displayName: sellers.displayName },
      })
      .from(products)
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .where(
        and(
          inArray(products.id, ids),
          eq(products.isActive, true),
          isNull(products.deletedAt),
        ),
      );

    const productIds = rows.map((r) => r.product.id);
    const primaryImages = new Map<string, ListingItem['primaryImage']>();
    if (productIds.length > 0) {
      const imgRows = await this.db
        .select()
        .from(productImages)
        .where(
          and(
            inArray(productImages.productId, productIds),
            eq(productImages.processingStatus, 'ready'),
          ),
        )
        .orderBy(asc(productImages.sortOrder));
      for (const img of imgRows) {
        if (!primaryImages.has(img.productId)) {
          primaryImages.set(img.productId, {
            url: img.url,
            webpUrl: img.webpUrl,
            thumbnailUrl: img.thumbnailUrl,
          });
        }
      }
    }

    return rows.map((r) => {
      const out: ListingItem = { ...r.product, seller: r.seller };
      const img = primaryImages.get(r.product.id);
      if (img) out.primaryImage = img;
      return out;
    });
  }

  /** Public detay — slug ile, ilişkilerle. */
  async findPublicBySlug(sellerSlug: string, productSlug: string): Promise<ProductWithRelations | null> {
    const rows = await this.db
      .select({
        product: products,
        seller: { id: sellers.id, slug: sellers.slug, displayName: sellers.displayName },
      })
      .from(products)
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .where(
        and(
          eq(sellers.slug, sellerSlug),
          eq(products.slug, productSlug),
          eq(products.isActive, true),
          isNull(products.deletedAt),
          isNull(sellers.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const [imgs, vars, discRows, cats] = await Promise.all([
      this.db
        .select()
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, row.product.id),
            eq(productImages.processingStatus, 'ready'),
          ),
        )
        .orderBy(asc(productImages.sortOrder)),
      this.db
        .select()
        .from(productVariations)
        .where(and(eq(productVariations.productId, row.product.id), eq(productVariations.isActive, true)))
        .orderBy(asc(productVariations.sortOrder)),
      this.db
        .select()
        .from(discounts)
        .where(
          and(
            eq(discounts.productId, row.product.id),
            eq(discounts.isActive, true),
            isNull(discounts.deletedAt),
          ),
        ),
      this.db
        .select({
          id: categories.id,
          slug: categories.slug,
          nameTr: categories.nameTr,
          isPrimary: productCategories.isPrimary,
        })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(eq(productCategories.productId, row.product.id)),
    ]);

    return {
      ...row.product,
      seller: row.seller,
      images: imgs,
      variations: vars,
      discounts: discRows,
      categories: cats,
    };
  }

  // ─── Seller-scoped queries ─────────────────────────────────

  async listBySeller(sellerId: string, page = 1, limit = 20): Promise<{ items: ProductRow[]; total: number }> {
    const offset = (Math.max(1, page) - 1) * Math.min(100, limit);
    const items = await this.db
      .select()
      .from(products)
      .where(and(eq(products.sellerId, sellerId), isNull(products.deletedAt)))
      .orderBy(desc(products.createdAt))
      .limit(Math.min(100, limit))
      .offset(offset);

    const countRows = (await this.db.execute<{ count: string }>(
      sql`SELECT count(*)::text AS count FROM products WHERE seller_id = ${sellerId} AND deleted_at IS NULL`,
    )) as unknown as Array<{ count: string }>;

    return { items, total: Number(countRows[0]?.count ?? 0) };
  }

  async findBySellerWithRelations(
    sellerId: string,
    productId: string,
  ): Promise<ProductWithRelations | null> {
    const rows = await this.db
      .select({
        product: products,
        seller: { id: sellers.id, slug: sellers.slug, displayName: sellers.displayName },
      })
      .from(products)
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .where(
        and(
          eq(products.id, productId),
          eq(products.sellerId, sellerId),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;

    const [imgs, vars, discRows, cats] = await Promise.all([
      this.db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(asc(productImages.sortOrder)),
      this.db
        .select()
        .from(productVariations)
        .where(eq(productVariations.productId, productId))
        .orderBy(asc(productVariations.sortOrder)),
      this.db
        .select()
        .from(discounts)
        .where(and(eq(discounts.productId, productId), isNull(discounts.deletedAt))),
      this.db
        .select({
          id: categories.id,
          slug: categories.slug,
          nameTr: categories.nameTr,
          isPrimary: productCategories.isPrimary,
        })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(eq(productCategories.productId, productId)),
    ]);

    return {
      ...row.product,
      seller: row.seller,
      images: imgs,
      variations: vars,
      discounts: discRows,
      categories: cats,
    };
  }

  async findBySellerAndId(sellerId: string, productId: string): Promise<ProductRow | null> {
    const rows = await this.db
      .select()
      .from(products)
      .where(
        and(eq(products.sellerId, sellerId), eq(products.id, productId), isNull(products.deletedAt)),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async slugTaken(sellerId: string, slug: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.sellerId, sellerId), eq(products.slug, slug)))
      .limit(1);
    return rows.length > 0;
  }

  async create(data: NewProductRow): Promise<ProductRow> {
    const rows = await this.db.insert(products).values(data).returning();
    if (!rows[0]) throw new Error('Insert failed');
    return rows[0];
  }

  async update(productId: string, data: Partial<NewProductRow>): Promise<ProductRow | null> {
    const rows = await this.db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, productId))
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(productId: string): Promise<void> {
    await this.db
      .update(products)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(eq(products.id, productId));
  }

  /**
   * Ürünün kategori bağlantılarını idempotent olarak yeniden yazar.
   * primaryCategoryId muhakkak categoryIds içinde olmalı (caller doğrular).
   */
  async setCategories(
    productId: string,
    sellerId: string,
    categoryIds: string[],
    primaryCategoryId: string,
  ): Promise<void> {
    await this.db.delete(productCategories).where(eq(productCategories.productId, productId));
    if (categoryIds.length === 0) return;
    await this.db.insert(productCategories).values(
      categoryIds.map((categoryId) => ({
        productId,
        categoryId,
        sellerId,
        isPrimary: categoryId === primaryCategoryId,
      })),
    );
  }
}
