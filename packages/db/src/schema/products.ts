import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { sellers } from './sellers.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

/**
 * Ölçü birimleri (ürünün satıldığı birim).
 * `none` mode'da varyasyon yok → tek fiyat × tek miktar.
 * `discrete` → satıcı sabit seçenekler tanımlar (1kg, 2kg, 5kg).
 * `stepper` → min/max/step, müşteri kendi miktarını seçer.
 */
export const measurementUnitEnum = pgEnum('measurement_unit', [
  'kg',
  'g',
  'lt',
  'ml',
  'adet',
  'paket',
  'kasa',
  'demet',
  'tane',
]);

export const variationModeEnum = pgEnum('variation_mode', ['none', 'discrete', 'stepper']);

export const imageProcessingStatusEnum = pgEnum('image_processing_status', [
  'pending',
  'processing',
  'ready',
  'failed',
]);

export const products = pgTable(
  'products',
  {
    id: idColumn(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    slug: varchar('slug', { length: 200 }).notNull(),
    nameTr: varchar('name_tr', { length: 300 }).notNull(),
    nameEn: varchar('name_en', { length: 300 }),
    descriptionTr: text('description_tr'),
    descriptionEn: text('description_en'),
    shortDescriptionTr: varchar('short_description_tr', { length: 500 }),
    shortDescriptionEn: varchar('short_description_en', { length: 500 }),
    unit: measurementUnitEnum('unit').notNull(),
    variationMode: variationModeEnum('variation_mode').default('none').notNull(),
    // Stepper config (variation_mode='stepper' iken kullanılır)
    stepperMin: numeric('stepper_min', { precision: 15, scale: 3 }),
    stepperMax: numeric('stepper_max', { precision: 15, scale: 3 }),
    stepperStep: numeric('stepper_step', { precision: 15, scale: 3 }),
    // Fiyat — birim başına (örn. 50 ₺/kg)
    baseUnitPrice: numeric('base_unit_price', { precision: 15, scale: 2 }).notNull(),
    kdvRate: numeric('kdv_rate', { precision: 5, scale: 2 }).notNull(),
    kdvIncluded: boolean('kdv_included').default(true).notNull(),
    isColdChain: boolean('is_cold_chain').default(false).notNull(),
    weightGrams: integer('weight_grams'),
    // Stok
    stockQuantity: numeric('stock_quantity', { precision: 15, scale: 3 }).default('0').notNull(),
    lowStockThreshold: numeric('low_stock_threshold', { precision: 15, scale: 3 }),
    lowStockNotify: boolean('low_stock_notify').default(true).notNull(),
    // Yayın
    isActive: boolean('is_active').default(true).notNull(),
    // Agregeler (cached, BullMQ job ile güncellenir)
    ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }).default('0.00').notNull(),
    ratingCount: integer('rating_count').default(0).notNull(),
    viewCount: integer('view_count').default(0).notNull(),
    salesCount: integer('sales_count').default(0).notNull(),
    // SEO
    metaTitle: varchar('meta_title', { length: 200 }),
    metaDescription: varchar('meta_description', { length: 500 }),
    ...timestampColumns(),
  },
  (t) => ({
    sellerSlugUnique: uniqueIndex('products_seller_slug_unique').on(t.sellerId, t.slug),
    sellerIdx: index('products_seller_idx')
      .on(t.sellerId, t.createdAt)
      .where(sql`deleted_at IS NULL`),
    activeIdx: index('products_active_idx')
      .on(t.isActive, t.createdAt)
      .where(sql`deleted_at IS NULL`),
    stockIdx: index('products_stock_idx').on(t.sellerId, t.stockQuantity),
    ratingIdx: index('products_rating_idx').on(t.ratingAvg, t.ratingCount),
  }),
);

/**
 * Discrete varyasyonlar (örn. 500g, 1kg, 2kg seçenekleri).
 * stepper modunda kullanılmaz; o durumda ürünün stepperMin/Max/Step alanları yeterli.
 */
export const productVariations = pgTable(
  'product_variations',
  {
    id: idColumn(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    label: varchar('label', { length: 100 }).notNull(),
    quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
    priceOverride: numeric('price_override', { precision: 15, scale: 2 }),
    sku: varchar('sku', { length: 100 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    productIdx: index('product_variations_product_idx').on(t.productId),
    sellerIdx: index('product_variations_seller_idx').on(t.sellerId),
  }),
);

/**
 * Ürün görselleri. Max 3 (env: MAX_PRODUCT_IMAGES).
 * `url`: orijinal yüklenen dosya (MinIO).
 * `webp_url` + `thumbnail_url`: Sharp BullMQ job sonrası.
 */
export const productImages = pgTable(
  'product_images',
  {
    id: idColumn(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    storageKey: text('storage_key').notNull(),
    url: text('url').notNull(),
    webpUrl: text('webp_url'),
    thumbnailUrl: text('thumbnail_url'),
    altText: varchar('alt_text', { length: 300 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    width: integer('width'),
    height: integer('height'),
    fileSizeBytes: integer('file_size_bytes'),
    processingStatus: imageProcessingStatusEnum('processing_status').default('pending').notNull(),
    processingError: text('processing_error'),
    ...timestampColumns(),
  },
  (t) => ({
    productIdx: index('product_images_product_idx').on(t.productId, t.sortOrder),
    sellerIdx: index('product_images_seller_idx').on(t.sellerId),
    statusIdx: index('product_images_status_idx').on(t.processingStatus, t.createdAt),
  }),
);
