import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { sellers } from './sellers.js';
import { users } from './users.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const chatThreadKindEnum = pgEnum('chat_thread_kind', ['order', 'direct']);

/**
 * Chat thread — müşteri ↔ satıcı.
 *   - `order`: sipariş bazlı (orderId zorunlu)
 *   - `direct`: kullanıcı satıcıdan en az 1 sipariş geçmişine sahip olmalı
 */
export const chatThreads = pgTable(
  'chat_threads',
  {
    id: idColumn(),
    kind: chatThreadKindEnum('kind').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    /** Okunmamış mesaj sayısı per role */
    unreadByUser: jsonb('unread_counts').default(sql`'{"user":0,"seller":0}'::jsonb`).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    userIdx: index('chat_threads_user_idx').on(t.userId, t.lastMessageAt),
    sellerIdx: index('chat_threads_seller_idx').on(t.sellerId, t.lastMessageAt),
    orderUnique: uniqueIndex('chat_threads_order_unique').on(t.orderId).where(sql`kind = 'order'`),
    directUnique: uniqueIndex('chat_threads_direct_unique')
      .on(t.userId, t.sellerId)
      .where(sql`kind = 'direct'`),
  }),
);

export const chatSenderRoleEnum = pgEnum('chat_sender_role', ['user', 'seller', 'system']);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: idColumn(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    senderRole: chatSenderRoleEnum('sender_role').notNull(),
    /** Hangi tarafın user'ı gönderdi (sender_role='user' iken users.id, sender_role='seller' iken seller'ın user'ı) */
    senderUserId: uuid('sender_user_id').references(() => users.id),
    body: text('body').notNull(),
    /** Eklenen dosyalar (MinIO presigned URL'ler) */
    attachments: jsonb('attachments').default(sql`'[]'::jsonb`).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    ...timestampColumns(),
  },
  (t) => ({
    threadIdx: index('chat_messages_thread_idx').on(t.threadId, t.createdAt),
  }),
);
