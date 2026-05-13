# @yorecebimde/api

> NestJS + Fastify backend. REST + WebSocket. Web ve mobil tarafından tüketilir.

## Modüller

| Modül | Açıklama |
|---|---|
| `auth` | Better-Auth, 2FA, JWT (mobile) |
| `users` | Customer + admin user CRUD, adres |
| `sellers` | Başvuru, KYC, panel, Iyzico sub-merchant |
| `categories` | Hiyerarşi, talep akışı |
| `products` | CRUD, varyasyon, fiyat, stok |
| `discounts` | İndirim CRUD + pricing engine |
| `cart` | Sepet (guest + user), merge |
| `orders` | Sipariş state machine |
| `payments` | Iyzico 3DS + escrow + refund |
| `payouts` | Satıcı payout (BullMQ) |
| `invoices` | Nilvera e-Arşiv/e-Fatura |
| `notifications` | Bildirim triggers + log |
| `chat` | WebSocket chat |
| `disputes` | Dispute akışı |
| `boost` | Satın alma + algoritma |
| `loyalty` | Puan |
| `referrals` | Referral akışı |
| `coupons` | Validate + apply |
| `search` | Meilisearch proxy |
| `bot` | AI bot function endpoints |
| `storage` | MinIO presigned URL |
| `admin` | Super admin endpoints |
| `audit` | Audit log |
| `health` | /healthz, /readyz, /metrics |

## Stack

- NestJS + Fastify
- Drizzle (via `@yorecebimde/db`)
- Better-Auth (via `@yorecebimde/auth`)
- BullMQ + Redis
- Pino logger
- Sentry
- Zod validation

## Workers

Worker process ayrı entry point: `dist/worker.js`. Tüm BullMQ queue'larını consume eder.

```bash
node dist/main.js     # API server
node dist/worker.js   # BullMQ worker
node dist/ws-server.js  # WebSocket gateway (opsiyonel ayırma)
```

## Scripts

```bash
pnpm --filter @yorecebimde/api dev
pnpm --filter @yorecebimde/api build
pnpm --filter @yorecebimde/api typecheck
pnpm --filter @yorecebimde/api test
```

## Yapı

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── sellers/
│   │   └── ...
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── decorators/
│   │   └── middleware/
│   ├── workers/
│   │   ├── notifications.worker.ts
│   │   ├── escrow.worker.ts
│   │   └── ...
│   ├── main.ts
│   ├── worker.ts
│   └── ws-server.ts
├── test/
└── Dockerfile
```

## API Dokümantasyonu

OpenAPI / Swagger UI dev'de: `http://localhost:4000/v1/docs`.
Endpoint detayları: [docs/API.md](../../docs/API.md).

Detay: [docs/PHASES/PHASE-1-FOUNDATION.md](../../docs/PHASES/PHASE-1-FOUNDATION.md)
