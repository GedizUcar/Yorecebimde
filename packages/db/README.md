# @yorecebimde/db

> Drizzle ORM şemaları, migration'lar, seed.

## Yapı

```
packages/db/
├── src/
│   ├── schema/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── sellers.ts
│   │   ├── categories.ts
│   │   ├── products.ts
│   │   ├── discounts.ts
│   │   ├── stock.ts
│   │   ├── carts.ts
│   │   ├── orders.ts
│   │   ├── payments.ts
│   │   ├── disputes.ts
│   │   ├── chat.ts
│   │   ├── notifications.ts
│   │   ├── audit.ts
│   │   ├── boost.ts
│   │   ├── loyalty.ts
│   │   ├── referrals.ts
│   │   ├── coupons.ts
│   │   ├── reviews.ts
│   │   ├── settings.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── uuid.ts          # UUID v7
│   │   ├── timestamps.ts
│   │   ├── soft-delete.ts
│   │   └── rls.ts           # RLS policy generators
│   ├── client.ts            # postgres-js + drizzle
│   └── index.ts
├── migrations/              # drizzle-kit output
├── seed/
│   └── index.ts
├── drizzle.config.ts
└── package.json
```

## Komutlar

```bash
pnpm db:generate    # schema → migration SQL
pnpm db:migrate     # apply migrations
pnpm db:seed        # test verisi yükle
pnpm db:studio      # Drizzle Studio
```

## Multi-Tenant

Tüm tenant-bound tablolarda `seller_id` sütunu var. RLS policy `current_setting('app.current_seller_id')` ile filter eder. NestJS request context middleware her transaction başında `SET LOCAL`'i ayarlar.

Detay: [docs/DATABASE.md](../../docs/DATABASE.md)
