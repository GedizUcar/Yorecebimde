import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { products } from './products.js';
import { sellers } from './sellers.js';
import { orderItems } from './orders.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const reviewStatusEnum = pgEnum('review_status', [
  'visible',
  'hidden_by_admin',
  'removed_by_user',
]);

/**
 * Ürün yorumları — verified purchase only (order_item_id zorunlu, delivered/completed sipariş).
 * Bir order_item için bir yorum.
 */
export const productReviews = pgTable(
  'product_reviews',
  {
    id: idColumn(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id),
    rating: integer('rating').notNull(),
    body: text('body'),
    photos: jsonb('photos').default(sql`'[]'::jsonb`).notNull(),
    sellerReply: text('seller_reply'),
    sellerReplyAt: timestamp('seller_reply_at', { withTimezone: true }),
    status: reviewStatusEnum('status').default('visible').notNull(),
    hiddenReason: text('hidden_reason'),
    helpfulCount: integer('helpful_count').default(0).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    productIdx: index('product_reviews_product_idx').on(t.productId, t.createdAt),
    sellerIdx: index('product_reviews_seller_idx').on(t.sellerId, t.createdAt),
    uniqueOrderItem: uniqueIndex('product_reviews_order_item_unique').on(t.orderItemId),
  }),
);

export const questionStatusEnum = pgEnum('question_status', [
  'pending',
  'answered',
  'hidden',
]);

/**
 * Ürün soru-cevap. Satıcı `is_public=true` ile cevaplayınca public liste'ye düşer.
 */
export const productQuestions = pgTable(
  'product_questions',
  {
    id: idColumn(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    answer: text('answer'),
    answeredBy: uuid('answered_by').references(() => users.id),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    isPublic: boolean('is_public').default(true).notNull(),
    status: questionStatusEnum('status').default('pending').notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    productPublicIdx: index('product_questions_product_public_idx')
      .on(t.productId, t.status)
      .where(sql`is_public = true AND status = 'answered'`),
    sellerPendingIdx: index('product_questions_seller_pending_idx')
      .on(t.sellerId, t.status)
      .where(sql`status = 'pending'`),
  }),
);
