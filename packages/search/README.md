# @yorecebimde/search

> Meilisearch wrapper. Türkçe-friendly arama; ürün, satıcı, kategori index'leri.

## Index'ler

- **products** — ana ürün arama
- **sellers** — mağaza arama
- **categories** — kategori arama (otomatik tamamlama)

## Index Config

### products
- searchableAttributes: `name_tr`, `name_en`, `description_tr`, `seller_name`, `category_names`
- filterableAttributes: `seller_id`, `category_ids`, `is_cold_chain`, `has_discount`, `price_range`, `is_active`
- sortableAttributes: `created_at`, `sales_count`, `rating_avg`, `effective_price`
- typo tolerance: TR-aware
- synonyms: domates ↔ pomadoro, vs.
- stopWords: TR ekleri

## API

```ts
import { SearchClient } from '@yorecebimde/search';

const search = new SearchClient({ host, apiKey });

await search.products.upsert(product);
await search.products.delete(id);
await search.products.search({ q, filters, sort, page, limit });
```

## BullMQ Sync

Product/seller/category CRUD → `search-index` queue → Meilisearch upsert/delete. Bulk reindex job (admin tetikler).

## Türkçe Tuning

Faz 2'de:
- Custom synonym listesi (TR yerel adlar)
- Stop words listesi (TR ek ve bağlaçlar)
- Tokenizer override
- Tested empirically with çoğul/tekil/ek variations

## Detay

[docs/ARCHITECTURE.md §2.6](../../docs/ARCHITECTURE.md)
