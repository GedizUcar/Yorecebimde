/**
 * Seed script — test verisi yükler. Idempotent: zaten var olan kayıtlar atlanır.
 *
 * Faz 1: super admin + admin + 3 customer
 * Faz 2: kategori ağacı (~50 kategori) + 2 onaylı test satıcı
 *
 * Çalıştırma: `pnpm db:seed`
 */
import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '../../../.env') });

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, isNull } from 'drizzle-orm';
import pino from 'pino';
import { uuidv7 } from 'uuidv7';
import { hashPassword } from 'better-auth/crypto';
import * as schema from '../src/schema/index.js';
import { seedCategories } from './categories.js';
import { seedProducts } from './products.js';

const newId = () => uuidv7();
const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } },
});

/**
 * AES-256-GCM encrypt — seed verisi PII encrypt için kullanılır.
 * Test seed verileri için basit; gerçek prod'da `@yorecebimde/shared/crypto` kullanılır.
 */
function fakeEncrypt(value: string): string {
  // Seed için placeholder — gerçek encryption Faz 4 KYC akışında devreye girecek.
  // Şu an "fake:" prefix'i ile saklayalım ki ayırdedilebilsin.
  return `fake:${Buffer.from(value).toString('base64')}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.fatal('DATABASE_URL is required');
    process.exit(1);
  }

  const pg = postgres(url, { max: 1 });
  const db = drizzle(pg, { schema });

  logger.info('Seeding database...');

  // ─── Users ──────────────────────────────────────────────
  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, 'admin@yorecebimde.com'))
    .limit(1);

  if (existingAdmin.length === 0) {
    // Super Admin
    const superAdminAuthId = newId();
    await db.insert(schema.authUser).values({
      id: superAdminAuthId,
      email: 'admin@yorecebimde.com',
      emailVerified: true,
      name: 'Super Admin',
    });
    await db.insert(schema.users).values({
      authUserId: superAdminAuthId,
      email: 'admin@yorecebimde.com',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      status: 'active',
      preferredLocale: 'tr',
      kvkkAcceptedAt: new Date(),
    });
    logger.info('  ✓ Super admin (admin@yorecebimde.com)');

    // Admin
    const adminAuthId = newId();
    await db.insert(schema.authUser).values({
      id: adminAuthId,
      email: 'operasyon@yorecebimde.com',
      emailVerified: true,
      name: 'Ops Admin',
    });
    await db.insert(schema.users).values({
      authUserId: adminAuthId,
      email: 'operasyon@yorecebimde.com',
      firstName: 'Operasyon',
      lastName: 'Admin',
      role: 'admin',
      status: 'active',
      preferredLocale: 'tr',
      kvkkAcceptedAt: new Date(),
    });
    logger.info('  ✓ Admin (operasyon@yorecebimde.com)');

    // Customers
    for (const c of [
      { email: 'ayse@test.com', firstName: 'Ayşe', lastName: 'Yılmaz', phone: '+905551111111' },
      { email: 'mehmet@test.com', firstName: 'Mehmet', lastName: 'Demir', phone: '+905552222222' },
      { email: 'fatma@test.com', firstName: 'Fatma', lastName: 'Kaya', phone: '+905553333333' },
    ]) {
      const authId = newId();
      await db.insert(schema.authUser).values({
        id: authId,
        email: c.email,
        emailVerified: true,
        name: `${c.firstName} ${c.lastName}`,
      });
      await db.insert(schema.users).values({
        authUserId: authId,
        email: c.email,
        phone: c.phone,
        phoneVerified: true,
        firstName: c.firstName,
        lastName: c.lastName,
        role: 'customer',
        status: 'active',
        preferredLocale: 'tr',
        kvkkAcceptedAt: new Date(),
      });
      logger.info(`  ✓ Customer (${c.email})`);
    }
  } else {
    logger.info('  - Users zaten seedlenmiş, atlanıyor');
  }

  // ─── Categories (Faz 2) ─────────────────────────────────
  const inserted = await seedCategories(db);
  if (inserted > 0) {
    logger.info(`  ✓ ${inserted} kategori eklendi`);
  } else {
    logger.info('  - Categories zaten seedlenmiş, atlanıyor');
  }

  // ─── Test Sellers (Faz 2) ────────────────────────────────
  const existingSellers = await db.select().from(schema.sellers).limit(1);
  if (existingSellers.length === 0) {
    // Seller 1: Ezine Çiftliği (şahıs, peynir üreticisi)
    const seller1OwnerAuthId = newId();
    await db.insert(schema.authUser).values({
      id: seller1OwnerAuthId,
      email: 'ezine@test.com',
      emailVerified: true,
      name: 'Mehmet Ezine',
    });
    const [seller1Owner] = await db
      .insert(schema.users)
      .values({
        authUserId: seller1OwnerAuthId,
        email: 'ezine@test.com',
        phone: '+905554444444',
        phoneVerified: true,
        firstName: 'Mehmet',
        lastName: 'Ezine',
        role: 'seller',
        status: 'active',
        preferredLocale: 'tr',
        kvkkAcceptedAt: new Date(),
      })
      .returning();

    await db.insert(schema.sellers).values({
      userId: seller1Owner!.id,
      slug: 'ezine-ciftligi',
      displayName: 'Ezine Çiftliği',
      type: 'individual',
      tcKimlikEncrypted: fakeEncrypt('12345678901'),
      ibanEncrypted: fakeEncrypt('TR330006100519786457841326'),
      status: 'approved',
      approvedAt: new Date(),
      bio: 'Çanakkale Ezine\'den günlük taze beyaz peynir ve süt ürünleri.',
      contactEmail: 'ezine@test.com',
      contactPhone: '+905554444444',
      addressCountry: 'TR',
      addressProvince: 'Çanakkale',
      addressDistrict: 'Ezine',
      addressFull: 'Ezine, Çanakkale',
      foodBusinessRegNo: 'TR-17-ABC-2024',
    });
    logger.info('  ✓ Seller 1: Ezine Çiftliği (individual)');

    // Seller 2: Antep Baharat Evi (şirket, baharat/kuruyemiş)
    const seller2OwnerAuthId = newId();
    await db.insert(schema.authUser).values({
      id: seller2OwnerAuthId,
      email: 'antep@test.com',
      emailVerified: true,
      name: 'Hasan Antep',
    });
    const [seller2Owner] = await db
      .insert(schema.users)
      .values({
        authUserId: seller2OwnerAuthId,
        email: 'antep@test.com',
        phone: '+905555555555',
        phoneVerified: true,
        firstName: 'Hasan',
        lastName: 'Antep',
        role: 'seller',
        status: 'active',
        preferredLocale: 'tr',
        kvkkAcceptedAt: new Date(),
      })
      .returning();

    await db.insert(schema.sellers).values({
      userId: seller2Owner!.id,
      slug: 'antep-baharat-evi',
      displayName: 'Antep Baharat Evi',
      type: 'company',
      legalName: 'Antep Baharat Gıda A.Ş.',
      taxIdEncrypted: fakeEncrypt('1234567890'),
      taxOffice: 'Gaziantep Merkez',
      tradeRegistryNo: 'GAZ-2020-001234',
      ibanEncrypted: fakeEncrypt('TR110006400000010012345678'),
      status: 'approved',
      approvedAt: new Date(),
      bio: 'Gaziantep\'ten Antep fıstığı, baharat ve kuruyemiş.',
      contactEmail: 'antep@test.com',
      contactPhone: '+905555555555',
      addressCountry: 'TR',
      addressProvince: 'Gaziantep',
      addressDistrict: 'Şehitkamil',
      addressFull: 'Şehitkamil, Gaziantep',
      foodBusinessRegNo: 'TR-27-XYZ-2023',
    });
    logger.info('  ✓ Seller 2: Antep Baharat Evi (company)');
  } else {
    logger.info('  - Sellers zaten seedlenmiş, atlanıyor');
  }

  // ─── Test Seller Passwords (Faz 2.4) ─────────────────────
  // Test satıcılarına login parolası ekle (auth_account row).
  // Şifre: Yorecebim2026!
  const TEST_PASSWORD = 'Yorecebim2026!';
  const sellerEmails = ['ezine@test.com', 'antep@test.com'];
  for (const email of sellerEmails) {
    const authRow = await db
      .select({ id: schema.authUser.id })
      .from(schema.authUser)
      .where(eq(schema.authUser.email, email))
      .limit(1);
    if (!authRow[0]) continue;
    const userId = authRow[0].id;
    const existingAccount = await db
      .select({ id: schema.authAccount.id })
      .from(schema.authAccount)
      .where(
        and(eq(schema.authAccount.userId, userId), eq(schema.authAccount.providerId, 'credential')),
      )
      .limit(1);
    if (existingAccount.length > 0) {
      logger.info(`  - Auth account already set for ${email}`);
      continue;
    }
    const hashed = await hashPassword(TEST_PASSWORD);
    await db.insert(schema.authAccount).values({
      userId,
      accountId: userId,
      providerId: 'credential',
      password: hashed,
    });
    logger.info(`  ✓ Password set for ${email}: ${TEST_PASSWORD}`);
  }
  // Silence unused-import warning
  void isNull;

  // ─── Test Products (Faz 2) ───────────────────────────────
  const productsInserted = await seedProducts(db);
  if (productsInserted > 0) {
    logger.info(`  ✓ ${productsInserted} test ürünü eklendi (varyasyon + indirim ile)`);
  } else {
    logger.info('  - Products zaten seedlenmiş, atlanıyor');
  }

  logger.info('Seed complete');
  await pg.end();
}

main().catch((err) => {
  logger.fatal({ err }, 'Seed failed');
  process.exit(1);
});
