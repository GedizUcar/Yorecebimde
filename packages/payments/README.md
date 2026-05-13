# @yorecebimde/payments

> Iyzico (marketplace / sub-merchant) entegrasyon wrapper'ı.
> Escrow modeli: biz tutuyoruz, kullanıcı onayladıktan veya 14 gün sonra satıcıya release.

## Kapsam

- Iyzico Sub-Merchant CRUD (satıcı onboard sırasında)
- 3DS payment initiation + callback
- Marketplace payment transaction (per sub-merchant)
- Refund (full + partial)
- Payout (release to seller IBAN)
- Saved card management (Iyzico card storage)
- Webhook signature verify (HMAC)

## API Soyutlaması

```ts
import { IyzicoClient } from '@yorecebimde/payments';

const iyzico = new IyzicoClient({ apiKey, secretKey, baseUrl });

await iyzico.subMerchant.create({ ... });
await iyzico.payment.initialize3DS({ ... });
await iyzico.payment.refund({ ... });
await iyzico.payout.create({ subMerchantKey, amount });
```

## Yapı

```
packages/payments/
├── src/
│   ├── iyzico/
│   │   ├── client.ts
│   │   ├── sub-merchant.ts
│   │   ├── payment.ts
│   │   ├── refund.ts
│   │   ├── payout.ts
│   │   ├── webhook.ts
│   │   └── types.ts
│   ├── interfaces/
│   │   ├── IPaymentProvider.ts
│   │   └── ...
│   └── index.ts
└── package.json
```

## Idempotency

Her payment + refund + payout call'da idempotency key zorunlu (Iyzico conversation_id veya kendi UUID v7).

## Sandbox

`IYZICO_BASE_URL=https://sandbox-api.iyzipay.com`

## Detay

[docs/PHASES/PHASE-3-CHECKOUT.md](../../docs/PHASES/PHASE-3-CHECKOUT.md)
