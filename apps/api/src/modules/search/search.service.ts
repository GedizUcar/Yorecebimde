import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import type { Meilisearch } from 'meilisearch';
import {
  products,
  productImages,
  productCategories,
  categories,
  sellers,
  discounts,
} from '@yorecebimde/db/schema';
import { logger } from '@yorecebimde/shared';
import { DB_TOKEN, type DbToken } from '../../infrastructure/database.module.js';
import {
  MEILI_TOKEN,
  MEILI_INDEXES,
  type MeiliIndexes,
} from '../../infrastructure/meilisearch.module.js';
import type { ProductSearchDoc } from './search.types.js';

const PRODUCTS_RANKING_RULES = [
  'words',
  'typo',
  'proximity',
  'attribute',
  'sort',
  'exactness',
  'salesCount:desc',
  'ratingAvg:desc',
];

const PRODUCTS_SEARCHABLE = [
  'nameTr',
  'shortDescriptionTr',
  'descriptionTrPreview',
  'categoryNames',
  'sellerName',
];

const PRODUCTS_FILTERABLE = [
  'sellerId',
  'sellerSlug',
  'categorySlugs',
  'isActive',
  'isColdChain',
  'hasDiscount',
  'baseUnitPrice',
  'ratingAvg',
];

const PRODUCTS_SORTABLE = [
  'baseUnitPrice',
  'createdAtUnix',
  'salesCount',
  'ratingAvg',
];

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(
    @Inject(DB_TOKEN) private readonly db: DbToken,
    @Inject(MEILI_TOKEN) private readonly meili: Meilisearch,
    @Inject(MEILI_INDEXES) private readonly indexes: MeiliIndexes,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureProductIndex();
    } catch (err) {
      logger.warn({ err }, 'Meilisearch index init skipped (search unavailable?)');
    }
  }

  private async ensureProductIndex(): Promise<void> {
    const indexName = this.indexes.products;
    try {
      await this.meili.getIndex(indexName);
    } catch {
      await this.meili.createIndex(indexName, { primaryKey: 'id' });
    }
    const index = this.meili.index(indexName);
    await index.updateSettings({
      searchableAttributes: PRODUCTS_SEARCHABLE,
      filterableAttributes: PRODUCTS_FILTERABLE,
      sortableAttributes: PRODUCTS_SORTABLE,
      rankingRules: PRODUCTS_RANKING_RULES,
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      },
    });
  }

  /** Tek ürünü Meili'ye yazar (yeni/güncellenmiş üründe). */
  async indexProduct(productId: string): Promise<void> {
    const doc = await this.buildProductDoc(productId);
    if (!doc) {
      await this.removeProduct(productId);
      return;
    }
    await this.meili.index(this.indexes.products).addDocuments([doc]);
  }

  async removeProduct(productId: string): Promise<void> {
    await this.meili.index(this.indexes.products).deleteDocument(productId);
  }

  /** Tüm aktif ürünleri yeniden indexler — admin reindex job. */
  async reindexAll(): Promise<{ indexed: number }> {
    const rows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.isActive, true), isNull(products.deletedAt)));
    const ids = rows.map((r) => r.id);

    const docs: ProductSearchDoc[] = [];
    for (const id of ids) {
      const doc = await this.buildProductDoc(id);
      if (doc) docs.push(doc);
    }
    if (docs.length === 0) return { indexed: 0 };

    await this.meili.index(this.indexes.products).addDocuments(docs);
    logger.info({ count: docs.length }, 'Meilisearch products reindex queued');
    return { indexed: docs.length };
  }

  /** Public search. Filtreler frontend için flat string array. */
  async searchProducts(opts: {
    query: string;
    page?: number;
    limit?: number;
    categorySlug?: string;
    sellerSlug?: string;
    minPrice?: number;
    maxPrice?: number;
    onlyDiscounted?: boolean;
    onlyColdChain?: boolean;
    sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'best_selling' | 'top_rated';
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const filters: string[] = ['isActive = true'];
    if (opts.categorySlug) filters.push(`categorySlugs = "${escape(opts.categorySlug)}"`);
    if (opts.sellerSlug) filters.push(`sellerSlug = "${escape(opts.sellerSlug)}"`);
    if (opts.onlyDiscounted) filters.push('hasDiscount = true');
    if (opts.onlyColdChain) filters.push('isColdChain = true');
    if (opts.minPrice !== undefined) filters.push(`baseUnitPrice >= ${opts.minPrice}`);
    if (opts.maxPrice !== undefined) filters.push(`baseUnitPrice <= ${opts.maxPrice}`);

    const sort: string[] = [];
    switch (opts.sort) {
      case 'price_asc':
        sort.push('baseUnitPrice:asc');
        break;
      case 'price_desc':
        sort.push('baseUnitPrice:desc');
        break;
      case 'newest':
        sort.push('createdAtUnix:desc');
        break;
      case 'best_selling':
        sort.push('salesCount:desc');
        break;
      case 'top_rated':
        sort.push('ratingAvg:desc');
        break;
    }

    const res = await this.meili.index(this.indexes.products).search<ProductSearchDoc>(opts.query, {
      filter: filters.join(' AND '),
      ...(sort.length > 0 ? { sort } : {}),
      limit,
      offset,
      attributesToHighlight: ['nameTr', 'shortDescriptionTr'],
    });

    return {
      items: res.hits,
      total: res.estimatedTotalHits ?? res.hits.length,
      page,
      limit,
      query: opts.query,
    };
  }

  private async buildProductDoc(productId: string): Promise<ProductSearchDoc | null> {
    const rows = await this.db
      .select({ product: products, seller: sellers })
      .from(products)
      .innerJoin(sellers, eq(sellers.id, products.sellerId))
      .where(
        and(
          eq(products.id, productId),
          eq(products.isActive, true),
          isNull(products.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const [catRows, discRows, imgRows] = await Promise.all([
      this.db
        .select({ slug: categories.slug, nameTr: categories.nameTr })
        .from(productCategories)
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(eq(productCategories.productId, productId)),
      this.db
        .select()
        .from(discounts)
        .where(
          and(
            eq(discounts.productId, productId),
            eq(discounts.isActive, true),
            isNull(discounts.deletedAt),
          ),
        ),
      this.db
        .select({ thumbnailUrl: productImages.thumbnailUrl, webpUrl: productImages.webpUrl, url: productImages.url })
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, productId),
            eq(productImages.processingStatus, 'ready'),
          ),
        )
        .limit(1),
    ]);

    let bestPct = 0;
    let hasDiscount = false;
    const now = new Date();
    for (const d of discRows) {
      if (d.type === 'permanent' && d.percentage) {
        const p = Number(d.percentage);
        if (p > bestPct) bestPct = p;
        hasDiscount = true;
      } else if (d.type === 'time_based' && d.percentage && d.startsAt && d.endsAt) {
        if (now >= d.startsAt && now <= d.endsAt) {
          const p = Number(d.percentage);
          if (p > bestPct) bestPct = p;
          hasDiscount = true;
        }
      } else if (d.type === 'quantity_based') {
        hasDiscount = true;
      }
    }

    const img = imgRows[0];

    return {
      id: row.product.id,
      slug: row.product.slug,
      sellerId: row.product.sellerId,
      sellerSlug: row.seller.slug,
      sellerName: row.seller.displayName,
      nameTr: row.product.nameTr,
      shortDescriptionTr: row.product.shortDescriptionTr,
      descriptionTrPreview: row.product.descriptionTr
        ? row.product.descriptionTr.substring(0, 500)
        : null,
      unit: row.product.unit,
      baseUnitPrice: Number(row.product.baseUnitPrice),
      isColdChain: row.product.isColdChain,
      isActive: row.product.isActive,
      hasDiscount,
      bestDiscountPct: bestPct,
      categorySlugs: catRows.map((c) => c.slug),
      categoryNames: catRows.map((c) => c.nameTr),
      ratingAvg: Number(row.product.ratingAvg),
      ratingCount: row.product.ratingCount,
      salesCount: row.product.salesCount,
      createdAtUnix: Math.floor(row.product.createdAt.getTime() / 1000),
      thumbnailUrl: img?.thumbnailUrl ?? img?.webpUrl ?? img?.url ?? null,
    };
  }

  /** Bulk index seçili ID'ler — admin & cron. */
  async indexMany(productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;
    const docs: ProductSearchDoc[] = [];
    for (const id of productIds) {
      const doc = await this.buildProductDoc(id);
      if (doc) docs.push(doc);
    }
    if (docs.length > 0) {
      await this.meili.index(this.indexes.products).addDocuments(docs);
    }
    const docIds = new Set(docs.map((d) => d.id));
    const missing = productIds.filter((id) => !docIds.has(id));
    if (missing.length > 0) {
      await this.meili.index(this.indexes.products).deleteDocuments(missing);
    }
  }

}

function escape(s: string): string {
  return s.replace(/"/g, '\\"');
}
