import { sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products, productVariations } from './products.js';
import { sellers } from './sellers.js';
import { users } from './users.js';
import { addresses } from './users.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

/**
 * Sipariş durumları — Faz 3.1 MVP'de ödeme entegre değil; ana akış:
 *   created (sepet → sipariş) → pending_payment → paid → confirmed → preparing →
 *   shipped → delivered → completed
 *   |          |              |       |          |          |
 *   cancelled  cancelled      cancelled                     return_requested → returned → refunded
 *                                                                              disputed → resolved
 */
export const orderStatusEnum = pgEnum('order_status', [
  'created',
  'pending_payment',
  'paid',
  'confirmed',
  'preparing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'return_requested',
  'returned',
  'refunded',
  'disputed',
  'resolved',
]);

export const cargoModeEnum = pgEnum('cargo_mode', [
  'self_managed',
  'aras',
  'mng',
  'yurtici',
  'ptt',
  'integrated_other',
]);

/**
 * Ana sipariş — checkout başına bir tane. Multi-seller durumda alt-order_group'lara
 * bölünür (Faz 3.2). Faz 3.1 MVP'de tek satıcı varsayımıyla başlıyoruz.
 *
 * orderNo: kullanıcı dostu (örn. YRC-2026-00042) — sequence ile üretilir.
 */
export const orders = pgTable(
  'orders',
  {
    id: idColumn(),
    orderNo: varchar('order_no', { length: 30 }).notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    shippingAddressId: uuid('shipping_address_id')
      .notNull()
      .references(() => addresses.id),
    billingAddressId: uuid('billing_address_id').references(() => addresses.id),
    // Snapshot'lar — adres silinse bile sipariş bütünlüğü kalır
    shippingAddressSnapshot: jsonb('shipping_address_snapshot').notNull(),
    billingAddressSnapshot: jsonb('billing_address_snapshot'),

    status: orderStatusEnum('status').default('created').notNull(),

    // Para birimi kuruş bazlı (bigint). 100 = 1 TL.
    subtotalCents: bigint('subtotal_cents', { mode: 'number' }).notNull(),
    discountCents: bigint('discount_cents', { mode: 'number' }).default(0).notNull(),
    shippingCents: bigint('shipping_cents', { mode: 'number' }).default(0).notNull(),
    kdvCents: bigint('kdv_cents', { mode: 'number' }).default(0).notNull(),
    totalCents: bigint('total_cents', { mode: 'number' }).notNull(),
    commissionCents: bigint('commission_cents', { mode: 'number' }).default(0).notNull(),
    sellerPayoutCents: bigint('seller_payout_cents', { mode: 'number' }).default(0).notNull(),

    // Kargo
    cargoMode: cargoModeEnum('cargo_mode').default('self_managed').notNull(),
    trackingNo: varchar('tracking_no', { length: 100 }),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),

    // Ödeme — Faz 3.2 Iyzico entegrasyonunda doldurulacak
    paymentProvider: varchar('payment_provider', { length: 50 }),
    paymentRef: varchar('payment_ref', { length: 200 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    note: text('note'),

    ...timestampColumns(),
  },
  (t) => ({
    userIdx: index('orders_user_idx').on(t.userId, t.createdAt),
    sellerIdx: index('orders_seller_idx').on(t.sellerId, t.createdAt),
    statusIdx: index('orders_status_idx').on(t.status, t.createdAt),
  }),
);

export const orderItems = pgTable(
  'order_items',
  {
    id: idColumn(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    variationId: uuid('variation_id').references(() => productVariations.id),

    // Snapshot — ürün/varyasyon silinse de sipariş geçmişi tutulur
    productNameSnapshot: varchar('product_name_snapshot', { length: 300 }).notNull(),
    variationLabelSnapshot: varchar('variation_label_snapshot', { length: 100 }),
    unitSnapshot: varchar('unit_snapshot', { length: 20 }).notNull(),

    quantity: numeric('quantity', { precision: 15, scale: 3 }).notNull(),
    unitPriceCents: bigint('unit_price_cents', { mode: 'number' }).notNull(),
    lineTotalCents: bigint('line_total_cents', { mode: 'number' }).notNull(),
    discountCents: bigint('discount_cents', { mode: 'number' }).default(0).notNull(),
    kdvRate: numeric('kdv_rate', { precision: 5, scale: 2 }).notNull(),

    ...timestampColumns(),
  },
  (t) => ({
    orderIdx: index('order_items_order_idx').on(t.orderId),
    sellerIdx: index('order_items_seller_idx').on(t.sellerId),
    productIdx: index('order_items_product_idx').on(t.productId),
  }),
);

/**
 * Sipariş numarası sequence — `YRC-YYYY-XXXXX` formatı için.
 */
export const orderNoSeq = pgTable('order_no_seq', {
  id: serial('id').primaryKey(),
  yearVal: integer('year_val').notNull(),
  lastNo: integer('last_no').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
}, (t) => ({
  yearUnique: uniqueIndex('order_no_seq_year_unique').on(t.yearVal),
}));
