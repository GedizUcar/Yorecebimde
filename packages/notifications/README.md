# @yorecebimde/notifications

> Email + SMS + Push + In-App bildirim altyapısı. Tek bir merkezi `triggers.ts` üzerinden çalışır.

## Provider'lar

| Channel | Provider | Sandbox |
|---|---|---|
| Email | Resend | resend.com test |
| SMS | NetGSM | NetGSM test panel |
| Push | Expo Push | Expo console |
| In-App | WebSocket (NestJS gateway) | n/a |

Hepsi adapter pattern ile (`IEmailProvider`, `ISmsProvider`, ...). Yeni provider eklemek = adapter implement.

## Template Engine

- Handlebars
- DB-driven (`notification_templates` tablosu)
- i18n locale-based (TR/EN)
- Preview render with sample data
- Versiyon kontrolü + audit

## Triggers

`packages/notifications/src/triggers.ts` merkezi:

```ts
export async function notifyNewOrderToSeller(orderGroup: OrderGroup) { ... }
export async function notifyOrderShippedToBuyer(order: OrderGroup) { ... }
export async function notifyLowStockToSeller(product: Product) { ... }
// ...
```

Her trigger BullMQ job'una enqueue eder. Worker render edip provider'a gönderir.

## Kullanım

```ts
import { notifyNewOrderToSeller } from '@yorecebimde/notifications';

await notifyNewOrderToSeller(orderGroup);
```

## Yapı

```
packages/notifications/
├── src/
│   ├── providers/
│   │   ├── email/
│   │   │   └── resend.ts
│   │   ├── sms/
│   │   │   └── netgsm.ts
│   │   ├── push/
│   │   │   └── expo.ts
│   │   └── in-app/
│   │       └── ws.ts
│   ├── templates/
│   │   ├── engine.ts
│   │   └── handlebars-helpers.ts
│   ├── triggers.ts
│   ├── service.ts
│   └── index.ts
└── package.json
```

## Notification Log

Her gönderim `notifications_log` tablosuna kaydedilir. Failed → Sentry. Retry 3x backoff.
