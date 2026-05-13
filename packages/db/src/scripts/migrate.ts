/**
 * Migration runner — `pnpm db:migrate` ile çalıştırılır.
 */
import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '../../../../.env') });

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import pino from 'pino';

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

  logger.info('Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });
  logger.info('Migrations complete');

  await pg.end();
}

main().catch((err) => {
  logger.fatal({ err }, 'Migration failed');
  process.exit(1);
});
