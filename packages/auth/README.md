# @yorecebimde/auth

> Better-Auth wrapper + Drizzle adapter + plugin config'leri.

## Plugin'ler

- Email/Password
- SMS OTP (NetGSM provider — `@yorecebimde/notifications`)
- 2FA TOTP
- Session refresh
- Organization plugin (multi-role: customer / seller / admin / super_admin)
- OAuth (Google, Apple — Faz 7+)

## Yapı

```
packages/auth/
├── src/
│   ├── config.ts          # Better-Auth config
│   ├── adapter.ts         # Drizzle adapter
│   ├── plugins/
│   │   ├── sms-otp.ts
│   │   ├── totp.ts
│   │   └── ...
│   ├── hooks/
│   │   ├── on-sign-up.ts  # user row create
│   │   └── on-sign-in.ts  # audit log
│   └── index.ts
└── package.json
```

## Kullanım (NestJS API)

```ts
import { auth } from '@yorecebimde/auth';

// app.module.ts
@Module({
  imports: [
    AuthModule.forRoot(auth),
  ],
})
```

## Kullanım (Next.js)

```ts
import { createAuthClient } from '@yorecebimde/auth/client';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
});
```

## Detay

[docs/SECURITY.md §2-3](../../docs/SECURITY.md)
