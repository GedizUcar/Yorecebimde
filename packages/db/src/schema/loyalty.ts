import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { orders } from './orders.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const loyaltyTxTypeEnum = pgEnum('loyalty_tx_type', [
  'earn',
  'redeem',
  'expire',
  'refund_revoke',
  'admin_adjust',
]);

/**
 * Kullanıcı puan bakiyesi — her kullanıcı için tek satır.
 * `balance` = toplam aktif puan. Transactionlardan summed materialized değil,
 * her tx anında DB'de update edilir (atomik).
 */
export const loyaltyAccounts = pgTable(
  'loyalty_accounts',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    balance: integer('balance').default(0).notNull(),
    lifetimeEarned: integer('lifetime_earned').default(0).notNull(),
    lifetimeRedeemed: integer('lifetime_redeemed').default(0).notNull(),
    ...timestampColumns(),
  },
);

/**
 * Puan hareketleri. Append-only — düzeltme yapılmaz, ters tx eklenir.
 */
export const loyaltyTransactions = pgTable(
  'loyalty_transactions',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: loyaltyTxTypeEnum('type').notNull(),
    /** Pozitif (earn/admin_adjust+) veya negatif (redeem/expire/refund) */
    points: integer('points').notNull(),
    /** Earn için sipariş, redeem için cart/order */
    orderId: uuid('order_id').references(() => orders.id),
    note: text('note'),
    /** Earn tx için expire tarihi — null ise expire etmez */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestampColumns(),
  },
  (t) => ({
    userIdx: index('loyalty_tx_user_idx').on(t.userId, t.createdAt),
    expireIdx: index('loyalty_tx_expire_idx').on(t.expiresAt).where(sql`points > 0 AND type = 'earn'`),
  }),
);
