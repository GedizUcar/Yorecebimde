import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

const newId = () => uuidv7();

/**
 * Standart primary key: UUID v7, app-tarafında üretilir (zaman sıralı, B-tree friendly).
 */
export const idColumn = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => newId());

/**
 * created_at + updated_at + deleted_at (soft delete) standardı.
 * Bütün tablolarda olur.
 */
export const timestampColumns = () => ({
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

/**
 * Soft-delete predicate'i (query'lerde kullan).
 */
export const NOT_DELETED = sql`deleted_at IS NULL`;
