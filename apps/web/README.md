# @yorecebimde/web

> Next.js 15 (App Router) frontend — marketplace + seller paneli + super admin paneli.
> Self-hosted, `output: 'standalone'`.

## Route Groups

- `(public)/` — anasayfa, kategori, ürün, sepet, checkout, hesap, mağaza vitrini
- `(seller)/` — `/seller/...` — satıcı paneli (role=seller)
- `(admin)/` — `/admin/...` — super admin paneli (role=admin)
- `api/` — sadece BFF callback'leri (Better-Auth, Iyzico callback redirect, vs.)

## Stack

- Next.js 15 App Router
- React 19
- Tailwind CSS + shadcn/ui
- next-intl (TR/EN i18n)
- TanStack Query (client data fetch)
- react-hook-form + Zod
- Better-Auth (client)
- Sentry

## Scripts

```bash
pnpm --filter @yorecebimde/web dev
pnpm --filter @yorecebimde/web build
pnpm --filter @yorecebimde/web typecheck
pnpm --filter @yorecebimde/web lint
```

## Yapı

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   ├── (seller)/
│   │   ├── (admin)/
│   │   ├── api/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   │   ├── api.ts          # backend client
│   │   ├── auth.ts         # Better-Auth client
│   │   └── ...
│   ├── hooks/
│   └── messages/           # next-intl files
├── public/
├── next.config.ts
├── tailwind.config.ts
└── Dockerfile
```

## Backend Bağlantısı

API: `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:4000`)
WS: `process.env.NEXT_PUBLIC_WS_URL`

Backend için bkz. [@yorecebimde/api](../api/README.md).

Detay: [docs/PHASES/PHASE-1-FOUNDATION.md](../../docs/PHASES/PHASE-1-FOUNDATION.md)
