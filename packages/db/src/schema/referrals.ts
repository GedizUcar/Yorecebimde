import {
  bigint,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { orders } from './orders.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const referralStatusEnum = pgEnum('referral_status', [
  'pending',
  'completed',
  'cancelled',
]);

/**
 * Davet sistemi. Her kullanıcı kayıt sırasında otomatik unique kod alır
 * (loyalty_accounts gibi tek satır). Referee başka kullanıcı kod'u ile
 * kayıt olduğunda yeni satır açılır. İlk sipariş `completed` olunca
 * referrer'a puan + referee'ye coupon verilir.
 */
export const referralCodes = pgTable(
  'referral_codes',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 16 }).notNull().unique(),
    totalRedemptions: bigint('total_redemptions', { mode: 'number' }).default(0).notNull(),
    ...timestampColumns(),
  },
);

export const referrals = pgTable(
  'referrals',
  {
    id: idColumn(),
    referrerUserId: uuid('referrer_user_id')
      .notNull()
      .references(() => users.id),
    refereeUserId: uuid('referee_user_id')
      .notNull()
      .references(() => users.id),
    code: varchar('code', { length: 16 }).notNull(),
    status: referralStatusEnum('status').default('pending').notNull(),
    /** Reward verildiyse ilgili sipariş */
    firstOrderId: uuid('first_order_id').references(() => orders.id),
    rewardedAt: timestamp('rewarded_at', { withTimezone: true }),
    /** Anti-abuse */
    refereeIp: varchar('referee_ip', { length: 45 }),
    ...timestampColumns(),
  },
  (t) => ({
    referrerIdx: index('referrals_referrer_idx').on(t.referrerUserId),
    refereeIdx: index('referrals_referee_idx').on(t.refereeUserId),
  }),
);
