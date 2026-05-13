import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let container: StartedPostgreSqlContainer | null = null;
let client: ReturnType<typeof postgres> | null = null;
let db: PostgresJsDatabase | null = null;

export async function setupTestDb(): Promise<PostgresJsDatabase> {
  if (db) return db;
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('yorecebimde_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const url = container.getConnectionUri();
  client = postgres(url, { max: 5 });
  db = drizzle(client);

  // Migration'ları çalıştır
  const migrationsFolder = resolve(__dirname, '../../../packages/db/migrations');
  await migrate(db, { migrationsFolder });

  return db;
}

export async function teardownTestDb() {
  if (client) await client.end();
  if (container) await container.stop();
  db = null;
  client = null;
  container = null;
}

/** RLS context'ini set et — endpoint middleware'ın yaptığı şey. */
export async function setRlsContext(
  db: PostgresJsDatabase,
  opts: { userId?: string; sellerId?: string; role?: string },
) {
  await db.execute(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (await import('drizzle-orm')).sql`SELECT
      set_config('app.current_user_id', ${opts.userId ?? ''}, true),
      set_config('app.current_seller_id', ${opts.sellerId ?? ''}, true),
      set_config('app.current_role', ${opts.role ?? 'guest'}, true)`,
  );
}
