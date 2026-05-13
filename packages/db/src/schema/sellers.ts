import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  numeric,
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

export const sellerTypeEnum = pgEnum('seller_type', ['individual', 'company']);
export const sellerStatusEnum = pgEnum('seller_status', [
  'pending',
  'approved',
  'suspended',
  'rejected',
  'closed',
]);

export const sellers = pgTable(
  'sellers',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .unique()
      .references(() => users.id),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    type: sellerTypeEnum('type').notNull(),
    legalName: varchar('legal_name', { length: 300 }),
    taxIdEncrypted: text('tax_id_encrypted'),
    taxOffice: varchar('tax_office', { length: 200 }),
    tcKimlikEncrypted: text('tc_kimlik_encrypted'),
    tradeRegistryNo: varchar('trade_registry_no', { length: 50 }),
    ibanEncrypted: text('iban_encrypted').notNull(),
    iyzicoSubmerchantId: varchar('iyzico_submerchant_id', { length: 100 }),
    iyzicoSubmerchantType: varchar('iyzico_submerchant_type', { length: 50 }),
    status: sellerStatusEnum('status').default('pending').notNull(),
    bio: text('bio'),
    logoUrl: text('logo_url'),
    coverUrl: text('cover_url'),
    workingHours: jsonb('working_hours'),
    foodBusinessRegNo: varchar('food_business_reg_no', { length: 50 }),
    foodBusinessRegDocUrl: text('food_business_reg_doc_url'),
    contactEmail: varchar('contact_email', { length: 320 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 20 }).notNull(),
    addressCountry: varchar('address_country', { length: 2 }).default('TR').notNull(),
    addressProvince: varchar('address_province', { length: 100 }),
    addressDistrict: varchar('address_district', { length: 100 }),
    addressFull: text('address_full'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => users.id),
    rejectionReason: text('rejection_reason'),
    ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }).default('0.00').notNull(),
    ratingCount: integer('rating_count').default(0).notNull(),
    totalSalesCount: integer('total_sales_count').default(0).notNull(),
    totalGmv: numeric('total_gmv', { precision: 15, scale: 2 }).default('0.00').notNull(),
    /**
     * Per-seller komisyon oran override (% bazında). NULL ise kategori default'u
     * kullanılır. Süper admin manuel ayarlayabilir.
     */
    commissionRateOverride: numeric('commission_rate_override', {
      precision: 5,
      scale: 2,
    }),
    ...timestampColumns(),
  },
  (t) => ({
    statusIdx: index('sellers_status_idx')
      .on(t.status)
      .where(sql`deleted_at IS NULL`),
    slugIdx: uniqueIndex('sellers_slug_idx')
      .on(t.slug)
      .where(sql`deleted_at IS NULL`),
  }),
);

export const sellerApplications = pgTable(
  'seller_applications',
  {
    id: idColumn(),
    email: varchar('email', { length: 320 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    contactName: varchar('contact_name', { length: 200 }).notNull(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    type: sellerTypeEnum('type').notNull(),
    legalName: varchar('legal_name', { length: 300 }),
    taxIdEncrypted: text('tax_id_encrypted'),
    ibanEncrypted: text('iban_encrypted').notNull(),
    tcKimlikEncrypted: text('tc_kimlik_encrypted'),
    tradeRegistryNo: varchar('trade_registry_no', { length: 50 }),
    foodBusinessRegNo: varchar('food_business_reg_no', { length: 50 }),
    documents: jsonb('documents').default(sql`'[]'::jsonb`).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    inviteToken: text('invite_token').unique(),
    inviteTokenExpiresAt: timestamp('invite_token_expires_at', { withTimezone: true }),
    sellerId: uuid('seller_id').references(() => sellers.id),
    ...timestampColumns(),
  },
  (t) => ({
    statusIdx: index('seller_applications_status_idx').on(t.status),
    emailIdx: index('seller_applications_email_idx').on(t.email),
  }),
);

export const sellerDocuments = pgTable(
  'seller_documents',
  {
    id: idColumn(),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    url: text('url').notNull(),
    uploadedBy: uuid('uploaded_by').references(() => users.id),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    notes: text('notes'),
    ...timestampColumns(),
  },
  (t) => ({
    sellerIdx: index('seller_documents_seller_idx').on(t.sellerId),
  }),
);
