import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv, parseEnv } from './loader.js';
import { apiEnvSchema, type ApiEnv } from './schema.js';

const here = dirname(fileURLToPath(import.meta.url));
// Try monorepo root first (packages/config/src → root), then cwd as fallback.
const rootEnv = resolve(here, '../../../.env');
if (existsSync(rootEnv)) {
  loadDotEnv({ envFile: rootEnv });
} else {
  loadDotEnv();
}

export const env: ApiEnv = parseEnv(apiEnvSchema);
export type { ApiEnv };
