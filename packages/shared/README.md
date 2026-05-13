# @yorecebimde/shared

> Web + mobile + api üçü tarafından paylaşılan Zod schemas, TypeScript types, utility'ler.
> **Asla** runtime-only dependency (express, nestjs, react) içermez. Pure logic.

## İçerik

- `schemas/` — Zod schemas (form validation, API contracts)
  - email, phone, uuid, money, address
  - product, variation, discount, cart, order
  - user, seller
- `types/` — TypeScript types
  - enums: UserRole, OrderStatus, ShippingMode, etc.
  - DTOs (Zod'tan infer edilen)
- `utils/` — pure utility functions
  - date.ts (Europe/Istanbul TZ)
  - money.ts (TL formatting, kuruş)
  - slug.ts (TR transliterate)
  - pricing.ts (indirim hesaplama — Faz 2)
  - phone.ts (TR phone normalize)
- `errors/` — domain error class'ları
- `constants/` — sabit değerler
  - TR cities/districts
  - VAT rates per category
  - Currency codes

## Kullanım

```ts
// Web
import { ProductSchema } from '@yorecebimde/shared/schemas/product';
import { calculatePrice } from '@yorecebimde/shared/utils/pricing';

// API
import { ProductSchema } from '@yorecebimde/shared';
```

## Build

```bash
pnpm --filter @yorecebimde/shared build
pnpm --filter @yorecebimde/shared test
```
