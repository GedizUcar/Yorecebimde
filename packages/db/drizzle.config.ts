import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// Root .env (monorepo) → packages/db cwd'sinden iki dizin yukarı
loadDotenv({ path: resolve(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for drizzle-kit');
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
  casing: 'snake_case',
});
