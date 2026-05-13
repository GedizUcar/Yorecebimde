import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import type { ZodTypeAny, z } from 'zod';

type LoadOptions = {
  envFile?: string;
  override?: boolean;
};

export function loadDotEnv(opts: LoadOptions = {}): void {
  const { envFile = '.env', override = false } = opts;
  loadDotenv({ path: resolve(process.cwd(), envFile), override });
}

export function parseEnv<S extends ZodTypeAny>(schema: S, source: NodeJS.ProcessEnv = process.env): z.infer<S> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${lines}`);
  }
  return result.data;
}
