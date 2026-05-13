import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { products } from './products.js';
import { sellers } from './sellers.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

/**
 * İndirim türleri — bir üründe üçü de aynı anda olabilir.
 * Pricing engine en yüksek indirimi seçer (kullanıcı lehine).
 *
 *   permanent       → percentage her zaman aktif
 *   time_based      → starts_at - ends_at arasında aktif
 *   quantity_based  → tiers JSONB: [{ minQuantity, percentage }]
 */
export const discountTypeEnum = pgEnum('discount_type', ['permanent', 'time_based', 'quantity_based']);

export const discounts = pgTable(
  'discounts',
  {
    id: idColumn(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    type: discountTypeEnum('type').notNull(),
    percentage: numeric('percentage', { precision: 5, scale: 2 }),
    // Time-based
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    // Quantity-based: [{ minQuantity: 3, percentage: 10 }, { minQuantity: 10, percentage: 20 }]
    tiers: jsonb('tiers'),
    isActive: boolean('is_active').default(true).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    productActiveIdx: index('discounts_product_active_idx')
      .on(t.productId)
      .where(sql`is_active = true AND deleted_at IS NULL`),
    sellerIdx: index('discounts_seller_idx').on(t.sellerId),
    timeActiveIdx: index('discounts_time_active_idx')
      .on(t.startsAt, t.endsAt)
      .where(sql`type = 'time_based' AND is_active = true`),
  }),
);
