/**
 * RLS policy applier — Drizzle migration sonrası çalıştırılır.
 *
 * Faz 1: audit_logs (append-only)
 * Faz 2: categories (public read) + tenant-bound tablolar (products, variations, images,
 *        product_categories, discounts, stock_movements, wishlists)
 *
 * Çalıştırma: `pnpm db:rls`
 *
 * Idempotent: tüm policy'ler `DROP IF EXISTS` ile önce silinir, sonra yeniden oluşturulur.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '../../../../.env') });

import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import pino from 'pino';
import {
  rlsEnable,
  rlsForceEnable,
  rlsAuditAppendOnly,
  rlsTenantPolicy,
  rlsPublicReadActivePolicy,
} from '../utils/rls.js';

const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } },
});

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.fatal('DATABASE_URL is required');
    process.exit(1);
  }

  const pg = postgres(url, { max: 1 });
  const db = drizzle(pg);

  logger.info('Applying RLS policies...');

  // ─── audit_logs (append-only) ─────────────────────────────
  await db.execute(sql`DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;`);
  await db.execute(sql`DROP POLICY IF EXISTS audit_logs_select ON audit_logs;`);
  await db.execute(rlsEnable('audit_logs'));
  await db.execute(rlsForceEnable('audit_logs'));
  await db.execute(rlsAuditAppendOnly('audit_logs'));
  logger.info('  ✓ audit_logs — append-only');

  // ─── categories (public read; admin write) ────────────────
  // Kategori tablosu tenant-bound değil — herkes okur, sadece admin yazar.
  // App seviyesinde admin-only write zaten guard'da; RLS sadece anonymous read'i açar.
  await db.execute(sql`DROP POLICY IF EXISTS categories_public_read ON categories;`);
  await db.execute(rlsEnable('categories'));
  await db.execute(rlsPublicReadActivePolicy('categories'));
  logger.info('  ✓ categories — public read');

  // ─── Tenant-bound tablolar (Faz 2) ─────────────────────────
  for (const table of [
    'products',
    'product_variations',
    'product_images',
    'product_categories',
    'discounts',
    'stock_movements',
    'category_requests',
  ] as const) {
    await db.execute(sql.raw(`DROP POLICY IF EXISTS ${table}_tenant_iso ON ${table};`));
    await db.execute(rlsEnable(table));
    await db.execute(rlsTenantPolicy(table));
    logger.info(`  ✓ ${table} — tenant isolation`);
  }

  // ─── products: ek olarak public read (anonymous marketplace) ─
  await db.execute(sql`DROP POLICY IF EXISTS products_public_read ON products;`);
  await db.execute(rlsPublicReadActivePolicy('products'));
  logger.info('  ✓ products — public read (active + non-deleted)');

  // ─── wishlists: user_id veya device_id'ye göre özel policy ──
  // Tenant değil — kullanıcı veya cihaz başına.
  await db.execute(sql`DROP POLICY IF EXISTS wishlists_user_iso ON wishlists;`);
  await db.execute(rlsEnable('wishlists'));
  await db.execute(sql`
    CREATE POLICY wishlists_user_iso ON wishlists
      USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR device_id IS NOT NULL
        OR current_setting('app.current_role', true) IN ('admin', 'super_admin')
      )
      WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        OR (user_id IS NULL AND device_id IS NOT NULL)
        OR current_setting('app.current_role', true) IN ('admin', 'super_admin')
      );
  `);
  logger.info('  ✓ wishlists — user/device isolation');

  logger.info('RLS policies applied successfully');
  await pg.end();
}

main().catch((err) => {
  logger.fatal({ err }, 'RLS apply failed');
  process.exit(1);
});
