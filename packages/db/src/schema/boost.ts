import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products.js';
import { sellers } from './sellers.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

/**
 * Boost paketleri — super admin tanımlar. Satıcı ürününe satın alır.
 */
export const boostPackages = pgTable(
  'boost_packages',
  {
    id: idColumn(),
    name: varchar('name', { length: 100 }).notNull(),
    durationDays: integer('duration_days').notNull(),
    priceCents: bigint('price_cents', { mode: 'number' }).notNull(),
    /** Algoritmik ağırlık (Faz 6'da kullanılacak) */
    weight: integer('weight').default(1).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    activeIdx: index('boost_packages_active_idx').on(t.isActive, t.sortOrder),
  }),
);

/**
 * Satıcının ürünü için aktif boost. starts_at - ends_at arası listing'de
 * "Sponsorlu" badge ile gösterilir. Algoritmik interleave Faz 6.
 */
export const sellerBoosts = pgTable(
  'seller_boosts',
  {
    id: idColumn(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    packageId: uuid('package_id')
      .notNull()
      .references(() => boostPackages.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().default(sql`now()`),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    /** Performans takip (Faz 6'da artırılır) */
    impressions: integer('impressions').default(0).notNull(),
    clicks: integer('clicks').default(0).notNull(),
    /** Ödeme — Iyzico paymentRef */
    paymentRef: varchar('payment_ref', { length: 200 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    pricePaidCents: bigint('price_paid_cents', { mode: 'number' }).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    sellerIdx: index('seller_boosts_seller_idx').on(t.sellerId, t.endsAt),
    productActiveIdx: index('seller_boosts_product_active_idx')
      .on(t.productId, t.startsAt, t.endsAt)
      .where(sql`cancelled_at IS NULL`),
  }),
);
