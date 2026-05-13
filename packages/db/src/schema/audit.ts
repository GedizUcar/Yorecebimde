import { sql } from 'drizzle-orm';
import { index, inet, jsonb, pgTable, text, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from './users.js';
import { userRoleEnum } from './users.js';

const newId = () => uuidv7();

/**
 * Audit log — append-only.
 * RLS policy UPDATE/DELETE'i engeller; sadece INSERT ve admin SELECT.
 * Partitioning (RANGE created_at, monthly) production'da uygulanır (migration sonrası);
 * Drizzle declarative partition'ı tam destekleyemez, ham SQL ile manage edilir.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => newId()),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    actorRole: userRoleEnum('actor_role'),
    actorIp: inet('actor_ip'),
    actorUserAgent: text('actor_user_agent'),
    action: varchar('action', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 50 }),
    targetId: uuid('target_id'),
    beforeData: jsonb('before_data'),
    afterData: jsonb('after_data'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    actorIdx: index('audit_logs_actor_idx').on(t.actorUserId, t.createdAt),
    targetIdx: index('audit_logs_target_idx').on(t.targetType, t.targetId, t.createdAt),
    actionIdx: index('audit_logs_action_idx').on(t.action, t.createdAt),
  }),
);
