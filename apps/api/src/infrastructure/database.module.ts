import { Global, Module } from '@nestjs/common';
import { env } from '@yorecebimde/config/api';
import { createDb, type Database } from '@yorecebimde/db';
import postgres from 'postgres';

export const DB_TOKEN = Symbol('DRIZZLE_DB');
export const PG_TOKEN = Symbol('POSTGRES_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useFactory: () => {
        const { db } = createDb({
          url: env.DATABASE_URL,
          maxPoolSize: env.DATABASE_MAX_POOL_SIZE,
          ssl: env.DATABASE_SSL,
        });
        return db;
      },
    },
    {
      provide: PG_TOKEN,
      useFactory: () => postgres(env.DATABASE_URL, { max: 1, prepare: false }),
    },
  ],
  exports: [DB_TOKEN, PG_TOKEN],
})
export class DatabaseModule {}

export type DbToken = Database;
