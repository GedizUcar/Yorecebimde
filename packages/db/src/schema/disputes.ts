import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { orders } from './orders.js';
import { sellers } from './sellers.js';
import { users } from './users.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const disputeStatusEnum = pgEnum('dispute_status', [
  'opened',
  'seller_responded',
  'escalated',
  'resolved_customer',
  'resolved_seller',
  'cancelled',
]);

export const disputeReasonEnum = pgEnum('dispute_reason', [
  'not_received',
  'damaged',
  'wrong_item',
  'not_as_described',
  'other',
]);

/**
 * Dispute (iade/şikayet) — buyer açar, seller cevap verir, 7 gün cevap yoksa
 * otomatik super_admin'e eskale olur (cron job).
 */
export const disputes = pgTable(
  'disputes',
  {
    id: idColumn(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    reason: disputeReasonEnum('reason').notNull(),
    customerMessage: text('customer_message').notNull(),
    customerEvidence: jsonb('customer_evidence').default(sql`'[]'::jsonb`).notNull(),
    sellerResponse: text('seller_response'),
    sellerEvidence: jsonb('seller_evidence').default(sql`'[]'::jsonb`).notNull(),
    status: disputeStatusEnum('status').default('opened').notNull(),
    /** Otomatik eskalasyon zamanı — seller cevap vermezse */
    autoEscalateAt: timestamp('auto_escalate_at', { withTimezone: true }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    resolution: text('resolution'),
    ...timestampColumns(),
  },
  (t) => ({
    orderIdx: index('disputes_order_idx').on(t.orderId),
    sellerIdx: index('disputes_seller_idx').on(t.sellerId, t.status),
    userIdx: index('disputes_user_idx').on(t.userId, t.status),
    escalateIdx: index('disputes_escalate_idx').on(t.autoEscalateAt).where(sql`status = 'seller_responded'`),
  }),
);
