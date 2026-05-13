# @yorecebimde/invoicing

> Nilvera entegrasyonu — e-Arşiv (müşteriye, satıcı adına) ve e-Fatura (biz → satıcı, komisyon).
> Mevcut başka projedeki modül buraya adapte edilecek.

## Faturalar

### e-Arşiv (Müşteriye)
- Sipariş `confirmed` olunca tetiklenir
- Satıcı adına, müşteri için
- B2C
- Tutar < 5,000 ₺ ise e-Arşiv yeterli

### e-Fatura (Biz → Satıcı, Komisyon)
- Sipariş `completed` olunca (escrow release sonrası) tetiklenir
- Komisyon bedeli için
- B2B

## API

```ts
import { NilveraClient } from '@yorecebimde/invoicing';

const nilvera = new NilveraClient({ apiKey, baseUrl, testMode });

await nilvera.issueEArsiv({
  seller, customer, items, vat, total
});
await nilvera.issueEFatura({ 
  ourCompany, seller, commission, period 
});
await nilvera.downloadPdf({ invoiceId });
```

## Yapı

```
packages/invoicing/
├── src/
│   ├── nilvera/
│   │   ├── client.ts
│   │   ├── e-arsiv.ts
│   │   ├── e-fatura.ts
│   │   ├── pdf.ts
│   │   └── types.ts
│   ├── interfaces/
│   │   └── IInvoicingProvider.ts
│   └── index.ts
└── package.json
```

## BullMQ Jobs

- `invoicing.issueEArsiv` — confirmed sipariş için
- `invoicing.issueEFatura` — completed + commission için (haftalık batch ya da anlık)

## Detay

[docs/PHASES/PHASE-3-CHECKOUT.md §3.9](../../docs/PHASES/PHASE-3-CHECKOUT.md)
