import { z } from 'zod';

const stringToBoolean = z
  .union([z.string(), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'));

const stringToInt = z.union([z.string(), z.number()]).transform((v) => Number(v));

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  TZ: z.string().default('Europe/Istanbul'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: stringToBoolean.default(true),
});

export const apiEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().url(),
  DATABASE_READ_REPLICA_URL: z.string().url().optional(),
  DATABASE_MAX_POOL_SIZE: stringToInt.default(20),
  DATABASE_SSL: stringToBoolean.default(false),

  REDIS_URL: z.string().url(),
  REDIS_TLS: stringToBoolean.default(false),

  BETTER_AUTH_SECRET: z.string().min(32, 'Min 32 char (run `openssl rand -base64 32`)'),
  BETTER_AUTH_URL: z.string().url(),
  // Comma-separated extra origins for CORS allowlist (e.g. panel subdomain).
  // BETTER_AUTH_URL is always included.
  CORS_EXTRA_ORIGINS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])),
  SESSION_COOKIE_NAME: z.string().default('yorecebimde_session'),
  SESSION_MAX_AGE_DAYS: stringToInt.default(30),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  ENCRYPTION_KEY: z.string().min(32, 'AES-256-GCM key must be ≥32 chars (base64)'),
  ENCRYPTION_ALGORITHM: z.string().default('aes-256-gcm'),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: stringToInt.default(9000),
  MINIO_USE_SSL: stringToBoolean.default(false),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('yorecebimde'),
  MINIO_PUBLIC_URL: z.string().url(),

  MEILISEARCH_HOST: z.string().url(),
  MEILISEARCH_API_KEY: z.string(),
  MEILISEARCH_INDEX_PREFIX: z.string().default('yorecebimde_'),

  IYZICO_API_KEY: z.string().optional(),
  IYZICO_SECRET_KEY: z.string().optional(),
  IYZICO_BASE_URL: z.string().url().default('https://sandbox-api.iyzipay.com'),
  IYZICO_CALLBACK_URL: z.string().url().optional(),

  NILVERA_API_KEY: z.string().optional(),
  NILVERA_BASE_URL: z.string().url().default('https://api.nilvera.com'),
  NILVERA_TEST_MODE: stringToBoolean.default(true),

  NETGSM_USERCODE: z.string().optional(),
  NETGSM_PASSWORD: z.string().optional(),
  NETGSM_HEADER: z.string().default('YORECEBIM'),
  NETGSM_BASE_URL: z.string().url().default('https://api.netgsm.com.tr'),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default('Yörecebimde <noreply@yorecebimde.com>'),

  EXPO_ACCESS_TOKEN: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-flash-lite-3.1'),

  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE: z.union([z.string(), z.number()]).transform(Number).default(0.1),

  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

  RATE_LIMIT_WINDOW_MS: stringToInt.default(60_000),
  RATE_LIMIT_MAX_REQUESTS: stringToInt.default(100),
  RATE_LIMIT_AUTH_MAX_REQUESTS: stringToInt.default(10),

  ESCROW_AUTO_RELEASE_DAYS: stringToInt.default(14),
  CART_RESERVATION_MINUTES: stringToInt.default(15),
  BOOST_RATIO_PERCENT: stringToInt.default(20),
  MAX_PRODUCT_IMAGES: stringToInt.default(3),
  LOW_STOCK_DEFAULT_THRESHOLD: stringToInt.default(5),
  DISPUTE_SELLER_RESPONSE_DAYS: stringToInt.default(3),
  DISPUTE_AUTO_ESCALATE_DAYS: stringToInt.default(7),
});

export const webEnvSchema = baseEnvSchema.extend({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WEB_URL: z.string().url(),
  NEXT_PUBLIC_PANEL_URL: z.string().url().optional(),
  NEXT_PUBLIC_CDN_URL: z.string().url(),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.enum(['tr', 'en']).default('tr'),
  NEXT_PUBLIC_SUPPORTED_LOCALES: z.string().default('tr,en'),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export const mobileEnvSchema = baseEnvSchema.extend({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_WS_URL: z.string().url(),
  EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type MobileEnv = z.infer<typeof mobileEnvSchema>;
