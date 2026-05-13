import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { users } from './users.js';
import { products } from './products.js';

/**
 * Wishlist — misafir için `device_id` (localStorage UUID), giriş yapanlar için `user_id`.
 * Login geçişinde merge (user_id boş kalan kayıtlar yeni user_id'ye taşınır).
 *
 * CHECK constraint: en az biri NOT NULL.
 */
export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    deviceId: varchar('device_id', { length: 100 }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    userProductUnique: uniqueIndex('wishlists_user_product_unique')
      .on(t.userId, t.productId)
      .where(sql`user_id IS NOT NULL`),
    deviceProductUnique: uniqueIndex('wishlists_device_product_unique')
      .on(t.deviceId, t.productId)
      .where(sql`user_id IS NULL AND device_id IS NOT NULL`),
    productIdx: index('wishlists_product_idx').on(t.productId),
    eitherIdSet: check(
      'wishlists_user_or_device_required',
      sql`user_id IS NOT NULL OR device_id IS NOT NULL`,
    ),
  }),
);
