import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { sellers } from './sellers.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

/**
 * Kategoriler — hiyerarşik (generic derinlik), TR+EN i18n, default KDV oranı.
 *
 * Bir ürün birden fazla kategoride olabilir (M2M, products.ts'te tanımlı).
 * `path` her seviyenin birleşimi: "/gida/sut-urunleri/peynir" → trgm index ile prefix search.
 */
export const categories = pgTable(
  'categories',
  {
    id: idColumn(),
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'restrict' }),
    slug: varchar('slug', { length: 150 }).notNull().unique(),
    nameTr: varchar('name_tr', { length: 200 }).notNull(),
    nameEn: varchar('name_en', { length: 200 }),
    descriptionTr: text('description_tr'),
    descriptionEn: text('description_en'),
    iconUrl: text('icon_url'),
    coverUrl: text('cover_url'),
    defaultKdvRate: numeric('default_kdv_rate', { precision: 5, scale: 2 }).default('8.00').notNull(),
    defaultCommissionRate: numeric('default_commission_rate', { precision: 5, scale: 2 })
      .default('10.00')
      .notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    depth: integer('depth').default(0).notNull(),
    path: text('path').notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    parentIdx: index('categories_parent_idx').on(t.parentId),
    activeIdx: index('categories_active_idx')
      .on(t.isActive)
      .where(sql`deleted_at IS NULL`),
    pathIdx: index('categories_path_idx').on(t.path),
  }),
);

/**
 * Satıcının "bu kategori yok, ekleyin" talebi. Super admin (Faz 5) onaylar / birleştirir / reddeder.
 */
export const categoryRequests = pgTable(
  'category_requests',
  {
    id: idColumn(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    proposedNameTr: varchar('proposed_name_tr', { length: 200 }).notNull(),
    proposedNameEn: varchar('proposed_name_en', { length: 200 }),
    proposedParentId: uuid('proposed_parent_id').references(() => categories.id),
    reason: text('reason'),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    resultingCategoryId: uuid('resulting_category_id').references(() => categories.id),
    notes: text('notes'),
    ...timestampColumns(),
  },
  (t) => ({
    statusIdx: index('category_requests_status_idx').on(t.status),
    sellerIdx: index('category_requests_seller_idx').on(t.sellerId, t.createdAt),
  }),
);

/**
 * Ürün ↔ kategori M2M.
 * seller_id de var çünkü RLS bu tabloya da uygulanır.
 */
export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    isPrimary: boolean('is_primary').default(false).notNull(),
  },
  (t) => ({
    pk: uniqueIndex('product_categories_pk').on(t.productId, t.categoryId),
    categoryIdx: index('product_categories_category_idx').on(t.categoryId),
    sellerIdx: index('product_categories_seller_idx').on(t.sellerId),
  }),
);
