import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { orders } from './orders.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const couponDiscountTypeEnum = pgEnum('coupon_discount_type', [
  'percent',
  'fixed',
]);

/**
 * Coupon — admin (genel/promo) veya sistem (referral reward) tarafından üretilir.
 * `appliesTo`: kategori/satıcı kısıtı için JSONB { categoryIds: [], sellerIds: [] }.
 */
export const coupons = pgTable(
  'coupons',
  {
    id: idColumn(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    discountType: couponDiscountTypeEnum('discount_type').notNull(),
    /** percent: 1-100, fixed: cents */
    discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
    /** Min sepet tutarı (cents) */
    minOrderCents: bigint('min_order_cents', { mode: 'number' }).default(0).notNull(),
    /** Max indirim (percent için cap) — cents */
    maxDiscountCents: bigint('max_discount_cents', { mode: 'number' }),
    /** Toplam kullanım sınırı (null = sınırsız) */
    usageLimit: integer('usage_limit'),
    /** Kullanıcı başına sınır */
    perUserLimit: integer('per_user_limit').default(1).notNull(),
    usageCount: integer('usage_count').default(0).notNull(),
    appliesTo: jsonb('applies_to'),
    /** Referral-reward kupon: belirli kullanıcıya bağlı */
    boundUserId: uuid('bound_user_id').references(() => users.id),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull().default(sql`now()`),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    description: text('description'),
    ...timestampColumns(),
  },
  (t) => ({
    activeIdx: index('coupons_active_idx').on(t.isActive, t.validUntil),
    boundUserIdx: index('coupons_bound_user_idx').on(t.boundUserId).where(sql`bound_user_id IS NOT NULL`),
  }),
);

export const couponUsages = pgTable(
  'coupon_usages',
  {
    id: idColumn(),
    couponId: uuid('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    orderId: uuid('order_id').references(() => orders.id),
    discountAppliedCents: bigint('discount_applied_cents', { mode: 'number' }).notNull(),
    /** Refund'da rollback işareti */
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ...timestampColumns(),
  },
  (t) => ({
    couponUserIdx: index('coupon_usages_coupon_user_idx').on(t.couponId, t.userId),
    orderIdx: index('coupon_usages_order_idx').on(t.orderId),
  }),
);
