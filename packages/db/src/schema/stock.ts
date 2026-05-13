import { sql } from 'drizzle-orm';
import { index, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { products } from './products.js';
import { sellers } from './sellers.js';
import { users } from './users.js';

/**
 * Stok hareket türleri (audit log):
 *   initial          — başlangıç stoğu
 *   sale             — sipariş düşüşü
 *   refund           — iade yükselişi
 *   manual_increase  — satıcı manuel artış
 *   manual_decrease  — satıcı manuel azaltma
 *   correction       — admin düzeltmesi
 */
export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'initial',
  'sale',
  'refund',
  'manual_increase',
  'manual_decrease',
  'correction',
]);

/**
 * Stok hareketleri — append-only audit. Faz 3'te declarative partition (aylık) eklenecek.
 * `quantityDelta`: ±, `quantityAfter`: hareket sonrası snapshot.
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    sellerId: uuid('seller_id')
      .notNull()
      .references(() => sellers.id),
    type: stockMovementTypeEnum('type').notNull(),
    quantityDelta: numeric('quantity_delta', { precision: 15, scale: 3 }).notNull(),
    quantityAfter: numeric('quantity_after', { precision: 15, scale: 3 }).notNull(),
    reason: text('reason'),
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),
    performedBy: uuid('performed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => ({
    productIdx: index('stock_movements_product_idx').on(t.productId, t.createdAt),
    sellerIdx: index('stock_movements_seller_idx').on(t.sellerId, t.createdAt),
  }),
);
