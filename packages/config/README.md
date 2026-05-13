# @yorecebimde/config

> Tüm uygulamaların paylaştığı Zod-validated environment config'i.

## Neden

- `process.env` doğrudan kullanmak hatalı (type yok, validate yok, default'lar nerede?)
- Tek merkezde tüm env'ler ve schema
- Startup'ta validate edilir, hata varsa boot etmez

## Kullanım

```ts
import { env } from '@yorecebimde/config';

// type-safe
const dbUrl = env.DATABASE_URL;
const escrowDays = env.ESCROW_AUTO_RELEASE_DAYS; // number, default 14
```

## Per-App Override

```ts
import { loadEnv } from '@yorecebimde/config';

export const env = loadEnv({
  app: 'web',  // 'web' | 'api' | 'mobile'
});
```

## Schema

`packages/config/src/schema.ts`:

```ts
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  // ...
});
```

App-spesifik schema:
- `apiEnvSchema = baseEnvSchema.merge(z.object({ JWT_ACCESS_SECRET: ... }))`
- `webEnvSchema = baseEnvSchema.merge(z.object({ NEXT_PUBLIC_API_URL: ... }))`
- `mobileEnvSchema = z.object({ EXPO_PUBLIC_API_URL: ... })`

## Secret vs Public

- Public env'ler (frontend'e gider) `NEXT_PUBLIC_*` veya `EXPO_PUBLIC_*` prefix
- Secret'lar sadece backend'de (`JWT_ACCESS_SECRET`, `IYZICO_SECRET_KEY`, vs.)
- `EnvironmentSecret` type ile compile-time leak kontrolü

## Detay

[.env.example](../../.env.example) — tüm env değişkenleri listesi
