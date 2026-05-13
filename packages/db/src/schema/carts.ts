import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products, productVariations } from './products.js';
import { users } from './users.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

/**
 * Sepet — kullanıcı login ise user_id, misafir için device_id.
 * Login sırasında device cart → user cart'a merge edilir (Faz 3 cart service).
 *
 * Sepet snapshot fiyatları ürün üzerinden gelir; checkout sırasında re-calculate
 * edilir (pricing.ts pure function).
 */
export const carts = pgTable(
  'carts',
  {
    id: idColumn(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    deviceId: varchar('device_id', { length: 100 }),
    ...timestampColumns(),
  },
  (t) => ({
    userUnique: uniqueIndex('carts_user_unique')
      .on(t.userId)
      .where(sql`user_id IS NOT NULL`),
    deviceUnique: uniqueIndex('carts_device_unique')
      .on(t.deviceId)
      .where(sql`user_id IS NULL AND device_id IS NOT NULL`),
    activityIdx: index('carts_updated_idx').on(t.updatedAt),
    eitherIdSet: check(
      'carts_user_or_device_required',
      sql`user_id IS NOT NULL OR device_id IS NOT NULL`,
    ),
  }),
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: idColumn(),
    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    variationId: uuid('variation_id').references(() => productVariations.id),
    quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
    /**
     * Sepete eklendiği andaki birim fiyat snapshot'ı. Pricing recalc'da
     * gerçek fiyat farkı varsa kullanıcıya uyarı gösteriyoruz.
     */
    unitPriceSnapshot: numeric('unit_price_snapshot', { precision: 15, scale: 2 }).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    cartIdx: index('cart_items_cart_idx').on(t.cartId),
    productIdx: index('cart_items_product_idx').on(t.productId),
    cartProductVariation: uniqueIndex('cart_items_unique')
      .on(t.cartId, t.productId, t.variationId)
      .where(sql`variation_id IS NOT NULL`),
    cartProductNoVar: uniqueIndex('cart_items_unique_no_var')
      .on(t.cartId, t.productId)
      .where(sql`variation_id IS NULL`),
  }),
);

/**
 * Stok rezervasyonu — checkout başlangıcında Redis ile değil DB'de tutulan
 * "soft hold" satırı. Redis TTL backup için kullanılır.
 *
 * Faz 3.1 MVP: Redis-only reservation; bu tabloyu Faz 3.2'de wallet/audit
 * için kullanmaya başlayacağız.
 */
export const stockReservations = pgTable(
  'stock_reservations',
  {
    id: idColumn(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    deviceId: varchar('device_id', { length: 100 }),
    cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    confirmed: boolean('confirmed').default(false).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    productIdx: index('stock_reservations_product_idx').on(t.productId, t.expiresAt),
    cartIdx: index('stock_reservations_cart_idx').on(t.cartId),
  }),
);
