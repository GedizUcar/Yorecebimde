import { parseEnv } from './loader.js';
import { mobileEnvSchema, type MobileEnv } from './schema.js';

export const env: MobileEnv = parseEnv(mobileEnvSchema);
export type { MobileEnv };
