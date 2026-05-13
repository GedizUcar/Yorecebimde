import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { idColumn } from '../utils/columns.js';

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'sms',
  'push',
  'in_app',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'failed',
  'skipped',
]);

/**
 * Tüm bildirim gönderimlerinin audit log'u. Faz 3.2'de notifications_log
 * partitioning'e geçecek (aylık). Faz 3.1'de plain table.
 */
export const notificationsLog = pgTable(
  'notifications_log',
  {
    id: idColumn(),
    /** Domain trigger key — örn. 'order.paid', 'order.shipped' */
    triggerKey: varchar('trigger_key', { length: 100 }).notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    /** Alıcı (email adresi, telefon numarası, push token, vb.) */
    recipient: varchar('recipient', { length: 320 }).notNull(),
    /** İlgili user/seller id (denormalized — query için) */
    userId: uuid('user_id'),
    sellerId: uuid('seller_id'),
    /** Render edilmiş içerik */
    subject: varchar('subject', { length: 300 }),
    body: text('body').notNull(),
    /** Trigger context (orderId, productId, vb.) — debug için */
    context: jsonb('context'),
    status: notificationStatusEnum('status').default('queued').notNull(),
    error: text('error'),
    providerRef: varchar('provider_ref', { length: 200 }),
    queuedAt: timestamp('queued_at', { withTimezone: true }).notNull().default(sql`now()`),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index('notifications_log_status_idx').on(t.status, t.queuedAt),
    userIdx: index('notifications_log_user_idx').on(t.userId, t.queuedAt),
    sellerIdx: index('notifications_log_seller_idx').on(t.sellerId, t.queuedAt),
    triggerIdx: index('notifications_log_trigger_idx').on(t.triggerKey, t.queuedAt),
  }),
);

export const invoiceTypeEnum = pgEnum('invoice_type', ['e_arsiv', 'e_fatura']);
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'pending',
  'issued',
  'failed',
  'cancelled',
]);

/**
 * e-Arşiv (B2C) ve e-Fatura (B2B / komisyon) fatura kayıtları.
 * Nilvera adapter stub döndürdüğü mock PDF URL'i burada saklanır;
 * Faz 4'te gerçek Nilvera entegrasyonu tek satır değişikliğiyle aktive olur.
 */
export const invoices = pgTable(
  'invoices',
  {
    id: idColumn(),
    type: invoiceTypeEnum('type').notNull(),
    invoiceNo: varchar('invoice_no', { length: 100 }),
    orderId: uuid('order_id'),
    sellerId: uuid('seller_id'),
    userId: uuid('user_id'),
    /** Para birimi kuruş (bigint), fatura görüldüğü gibi toplam. */
    grossCents: text('gross_cents').notNull(),
    netCents: text('net_cents').notNull(),
    kdvCents: text('kdv_cents').notNull(),
    status: invoiceStatusEnum('status').default('pending').notNull(),
    providerRef: varchar('provider_ref', { length: 200 }),
    pdfUrl: text('pdf_url'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    error: text('error'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    orderIdx: index('invoices_order_idx').on(t.orderId),
    sellerIdx: index('invoices_seller_idx').on(t.sellerId),
    statusIdx: index('invoices_status_idx').on(t.status, t.createdAt),
  }),
);
