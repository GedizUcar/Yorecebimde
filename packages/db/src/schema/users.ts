import { sql } from 'drizzle-orm';
import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { authUser } from './auth.js';
import { idColumn, timestampColumns } from '../utils/columns.js';

export const userRoleEnum = pgEnum('user_role', ['customer', 'seller', 'admin', 'super_admin']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);

export const users = pgTable(
  'users',
  {
    id: idColumn(),
    authUserId: uuid('auth_user_id')
      .notNull()
      .unique()
      .references(() => authUser.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    role: userRoleEnum('role').default('customer').notNull(),
    status: userStatusEnum('status').default('active').notNull(),
    preferredLocale: varchar('preferred_locale', { length: 5 }).default('tr'),
    marketingEmailOptIn: boolean('marketing_email_opt_in').default(false).notNull(),
    marketingSmsOptIn: boolean('marketing_sms_opt_in').default(false).notNull(),
    kvkkAcceptedAt: timestamp('kvkk_accepted_at', { withTimezone: true }),
    kvkkVersionAccepted: varchar('kvkk_version_accepted', { length: 20 }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    twoFaEnabled: boolean('two_fa_enabled').default(false).notNull(),
    twoFaSecretEncrypted: text('two_fa_secret_encrypted'),
    ...timestampColumns(),
  },
  (t) => ({
    emailActiveIdx: uniqueIndex('users_email_active_idx')
      .on(t.email)
      .where(sql`deleted_at IS NULL`),
    roleIdx: index('users_role_idx').on(t.role),
    phoneIdx: index('users_phone_idx').on(t.phone),
  }),
);

export const addresses = pgTable(
  'addresses',
  {
    id: idColumn(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 50 }).notNull(),
    recipientName: varchar('recipient_name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    country: varchar('country', { length: 2 }).default('TR').notNull(),
    province: varchar('province', { length: 100 }).notNull(),
    district: varchar('district', { length: 100 }).notNull(),
    neighborhood: varchar('neighborhood', { length: 200 }),
    postalCode: varchar('postal_code', { length: 10 }),
    addressLine: text('address_line').notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    isBilling: boolean('is_billing').default(false).notNull(),
    tcKimlikEncrypted: text('tc_kimlik_encrypted'),
    taxIdEncrypted: text('tax_id_encrypted'),
    taxOffice: varchar('tax_office', { length: 200 }),
    ...timestampColumns(),
  },
  (t) => ({
    userIdx: index('addresses_user_idx').on(t.userId),
  }),
);
