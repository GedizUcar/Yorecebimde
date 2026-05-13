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
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

/**
 * Sistem ayarları — key-value, JSON value. Süper admin DB-backed config'i
 * yönetir (env vars'a alternatif). Hassas alanlar (API keys vs.) `isSecret`
 * ile işaretlenir.
 */
export const systemSettings = pgTable(
  'system_settings',
  {
    id: idColumn(),
    /** `commerce.escrow_release_days`, `payments.iyzico_api_key`, vs. */
    key: varchar('key', { length: 100 }).notNull().unique(),
    value: jsonb('value').notNull(),
    description: text('description'),
    /** Mask in API responses (Iyzico keys, vs.) */
    isSecret: text('is_secret').default('false').notNull(),
    /** Hangi sekmede gösterilir — general, commerce, payments, shipping, notifications, ai, security */
    category: varchar('category', { length: 50 }).notNull(),
    updatedBy: uuid('updated_by').references(() => users.id),
    ...timestampColumns(),
  },
  (t) => ({
    categoryIdx: index('system_settings_category_idx').on(t.category),
  }),
);

/**
 * Bildirim şablonları — DB-backed (hardcoded templates.ts'in yerini alır).
 * i18n locale + channel + trigger key kombinasyonu unique.
 */
export const notificationTemplates = pgTable(
  'notification_templates',
  {
    id: idColumn(),
    triggerKey: varchar('trigger_key', { length: 100 }).notNull(),
    channel: varchar('channel', { length: 20 }).notNull(),
    locale: varchar('locale', { length: 5 }).default('tr').notNull(),
    subject: varchar('subject', { length: 300 }),
    body: text('body').notNull(),
    /** Aktif değilse fallback olarak hardcoded template kullanılır. */
    isActive: text('is_active').default('true').notNull(),
    updatedBy: uuid('updated_by').references(() => users.id),
    ...timestampColumns(),
  },
  (t) => ({
    uniqueTriggerChannel: uniqueIndex('notification_templates_unique')
      .on(t.triggerKey, t.channel, t.locale),
  }),
);

export const kvkkRequestTypeEnum = pgEnum('kvkk_request_type', [
  'access',
  'deletion',
  'rectification',
  'portability',
  'objection',
]);

export const kvkkRequestStatusEnum = pgEnum('kvkk_request_status', [
  'pending',
  'in_progress',
  'completed',
  'rejected',
]);

/**
 * KVKK / GDPR talepleri. 30 gün içinde cevaplanmalı (KVKK madde 13).
 */
export const kvkkRequests = pgTable(
  'kvkk_requests',
  {
    id: idColumn(),
    /** Login yapmışsa user_id, değilse sadece email/telefon */
    userId: uuid('user_id').references(() => users.id),
    email: varchar('email', { length: 320 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    contactName: varchar('contact_name', { length: 200 }).notNull(),
    type: kvkkRequestTypeEnum('type').notNull(),
    requestText: text('request_text').notNull(),
    status: kvkkRequestStatusEnum('status').default('pending').notNull(),
    handledBy: uuid('handled_by').references(() => users.id),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    response: text('response'),
    /** Export PDF / anonimleştirme jobu için referans */
    referenceData: jsonb('reference_data'),
    /** KVKK 30g cevap deadline */
    dueBy: timestamp('due_by', { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '30 days'`),
    ...timestampColumns(),
  },
  (t) => ({
    statusIdx: index('kvkk_requests_status_idx').on(t.status, t.dueBy),
    emailIdx: index('kvkk_requests_email_idx').on(t.email),
  }),
);
