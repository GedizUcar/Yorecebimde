import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export type CreateDbOptions = {
  url: string;
  maxPoolSize?: number;
  ssl?: boolean;
  debug?: boolean;
};

export function createDb(opts: CreateDbOptions): { db: Database; pg: ReturnType<typeof postgres> } {
  const pg = postgres(opts.url, {
    max: opts.maxPoolSize ?? 20,
    ssl: opts.ssl ? 'require' : false,
    prepare: false, // PgBouncer transaction mode için
    debug: opts.debug ?? false,
  });

  const db = drizzle(pg, { schema, casing: 'snake_case' });

  return { db, pg };
}

export { schema };
