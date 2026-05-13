import { parseEnv } from './loader.js';
import { webEnvSchema, type WebEnv } from './schema.js';

// Next.js otomatik .env loader; sadece parse + validate
export const env: WebEnv = parseEnv(webEnvSchema);
export type { WebEnv };
