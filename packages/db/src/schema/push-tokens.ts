import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const pushPlatformEnum = pgEnum('push_platform', ['ios', 'android', 'web']);

/**
 * Mobile (Expo) ve web push tokens. Aynı kullanıcı birden çok cihazda kayıt
 * yapabilir. Token cihaza özgüdür, app reset/reinstall sonrası değişir.
 */
export const userPushTokens = pgTable(
  'user_push_tokens',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    platform: pushPlatformEnum('platform').notNull(),
    deviceLabel: varchar('device_label', { length: 100 }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).default(sql`now()`).notNull(),
    ...timestampColumns(),
  },
  (t) => ({
    userIdx: index('user_push_tokens_user_idx').on(t.userId),
    tokenUnique: uniqueIndex('user_push_tokens_token_unique').on(t.token),
  }),
);
