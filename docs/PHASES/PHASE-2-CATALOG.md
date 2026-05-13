# PHASE 2 — Catalog

> Hedef: Satıcı ürün CRUD yapabilir, müşteri ürünleri görebilir + arayabilir.
> Süre: 4-5 hafta. Sipariş henüz alınmıyor — Faz 3'te.

---

## 1. Hedefler

1. Kategori sistemi (hiyerarşik, generic derinlik, talep akışı)
2. Ürün CRUD (REST + UI), varyasyon sistemi (discrete + stepper)
3. KDV oran yönetimi
4. İndirim sistemi (3 tip, en avantajlı uygulanır)
5. Stok yönetimi + hareketler
6. Görsel yükleme + WebP dönüşüm
7. Meilisearch index + arama
8. Public marketplace browsing (anasayfa, kategori, ürün detay)
9. Satıcı admin paneli ürün CRUD UI

## 2. DB Migrasyonları

Yeni eklenecek tablolar (DATABASE.md'den):
- `categories`, `category_requests`
- `products`, `product_variations`, `product_images`, `product_categories`
- `discounts`
- `stock_movements`
- `wishlists`

Drizzle migration üret: `pnpm db:generate`.

RLS policy: products, product_variations, product_images, product_categories, discounts, stock_movements, wishlists (seller-bound olanlar için).

## 3. Detaylı Task Listesi

### 3.1. Categories (apps/api `CategoriesModule`)
- [x] Repository: tree query (`path` GIST + recursive CTE)
- [x] Service:
  - getFullTree()
  - getChildren(parentId)
  - getBySlug(slug)
  - getDescendants(categoryId) — kullanılan inline pattern: `path LIKE '%'` + `productCategories` lookup
  - getAncestors(categoryId) — breadcrumb (findAncestorsBySlug)
- [x] Controller (public):
  - `GET /v1/categories`
  - `GET /v1/categories/:slug`
  - `GET /v1/categories/tree` (extra)
- [x] Slug üretimi: TR-friendly (turkish-to-english transliterate)
- [ ] **Faz 5'e ertelendi** — Category requests:
  - `POST /v1/category-requests` (seller)
  - `GET /v1/category-requests/mine` (seller)
- [ ] **Faz 5'e ertelendi** — Admin endpoint'leri:
  - `POST /v1/admin/categories`
  - `PATCH /v1/admin/categories/:id`
  - `DELETE /v1/admin/categories/:id`
  - `POST /v1/admin/category-requests/:id/approve|merge|reject`
- [x] Seed: temel kategori ağacı — 38 kategori (CLAUDE.md'deki listenin tamamı + alt dallar)
  ```
  Gıda
    Süt Ürünleri
      Peynir
        Beyaz Peynir
        Kaşar
      Yoğurt
      Tereyağı
    Bal & Reçel
    Kuruyemiş
    Baharat
    Sebze & Meyve
      Taze
      Kurutulmuş
    Et Ürünleri
      Sucuk
      Pastırma
    Yağlar
      Zeytinyağı
    Hazır Yemek
    İçecek
  ```

### 3.2. Products (apps/api `ProductsModule`)
- [x] Repository: create, listBySeller, slugTaken (slug check), findBySellerAndId, publicListing, findPublicBySlug, update, softDelete, setCategories
- [x] Service (SellerProductsService): create, update, publish, unpublish, softDelete, list, findOne — slug auto-generation, category validation, search reindex hook
- [x] `packages/shared/src/pricing.ts` — calculatePrice + applyDiscount (pure function, 25 tests)
- [x] DTOs (Zod): CreateProductDto, UpdateProductDto (via nestjs-zod)
- [ ] ProductFilterDto — şu an inline @Query, formal DTO yok (kabul edilebilir)
- [x] Controller seller: POST/GET/GET-by-id/PATCH/DELETE + publish/unpublish
- [x] Controller public: GET /v1/products, GET /v1/products/:sellerSlug/:productSlug
- [x] /v1/search/products (Meilisearch — autocomplete'in yerini tutuyor)
- [ ] /v1/products/autocomplete (Meilisearch limit=5 yeterli — frontend autocomplete eklenecek)
- [x] Slug üretimi (TR transliterate + uniqueness retry via ensureUniqueSlug)
- [ ] **Faz 6'ya ertelendi** — View count (Redis debounce 1h/IP+product) — analytics scope

### 3.3. Variations
- [ ] DTO: VariationDto
  - mode: 'discrete' | 'stepper'
  - discrete options: `[{ label, quantity, priceOverride? }]`
  - stepper: { min, max, step }
- [ ] Controller:
  - `POST /v1/seller/products/:id/variations` (discrete)
  - `PATCH /v1/seller/products/:id/variations/:varId`
  - `DELETE /v1/seller/products/:id/variations/:varId`
- [ ] Stepper config product entity üzerinde (ayrı tablo değil)
- [ ] Validation:
  - mode='discrete' → en az 1 option
  - mode='stepper' → min < max, step > 0, step ≤ (max-min)
  - mode='none' → varyasyon yok, sadece base_unit_price + stock

### 3.4. Discounts
- [ ] DTOs:
  - PermanentDiscountDto { percentage }
  - TimeBasedDiscountDto { percentage, startsAt, endsAt }
  - QuantityDiscountDto { tiers: [{ minQuantity, percentage }] }
- [ ] Controller:
  - `POST /v1/seller/products/:id/discounts`
  - `PATCH /v1/seller/products/:id/discounts/:disId`
  - `DELETE /v1/seller/products/:id/discounts/:disId`
- [ ] Pricing service: `getEffectivePrice(product, variation, quantity, atDate=now)`
  - Permanent indirimi al
  - Time-based aktif mi?
  - Quantity-based threshold geçildi mi?
  - En yüksek olanı seç (kullanıcı lehine)
- [ ] Pricing fonksiyonu Faz 3 checkout'unda da kullanılacak — pure function, test edilir

### 3.5. Stock
- [ ] Repository: products.stockQuantity update
- [ ] Service:
  - increaseStock(productId, qty, reason)
  - decreaseStock(productId, qty, reason, ref) — sale için
  - setStock(productId, qty, reason) — manuel
  - markOutOfStock(productId) — qty=0 + is_active false opsiyon
  - logMovement(...) — stock_movements append
- [ ] Controller:
  - `PATCH /v1/seller/products/:id/stock`
  - `POST /v1/seller/products/:id/mark-out-of-stock`
  - `GET /v1/seller/products/:id/stock-history`
- [ ] Low stock check: cron job (`low-stock-check`) günde 1 kez tarar, eşik altı için tetikleyici kuyruğa atar
  - Bildirim aslında Faz 3'te aktive olur ama tetikleyici hazır

### 3.6. Images (Storage)
- [x] MinIO modülü `apps/api/src/infrastructure/minio.module.ts` (S3 SDK wrapper) — ayrı package gerekmedi, app içi modül
- [x] Image processing BullMQ job:
  - Sharp WebP dönüşüm (full 1600px + thumb 400x400)
  - Metadata (width, height, size)
  - DB güncelle (webp_url, thumbnail_url, processing_status)
  - Failed durumda processing_error kayıt
- [x] Endpoint:
  - `POST /v1/uploads/products/:productId/presign`
  - `POST /v1/uploads/products/:productId/images/:imageId/complete`
  - `GET /v1/uploads/images/:imageId` (status polling)
- [x] Limit: MAX_PRODUCT_IMAGES env (default 3)
- [x] Image delete: MinIO objects + DB row temizleme
- [ ] Reorder: PATCH sort_order — Faz 4 seller panel UI sırasında

### 3.7. Meilisearch
- [x] Meilisearch client wrapper (`apps/api/src/infrastructure/meilisearch.module.ts`)
- [x] Index config:
  - searchableAttributes: nameTr, shortDescriptionTr, descriptionTrPreview, categoryNames, sellerName
  - filterableAttributes: sellerId, sellerSlug, categorySlugs, isActive, isColdChain, hasDiscount, baseUnitPrice, ratingAvg
  - sortableAttributes: baseUnitPrice, createdAtUnix, salesCount, ratingAvg
  - rankingRules: words, typo, proximity, attribute, sort, exactness, salesCount:desc, ratingAvg:desc
- [x] Sync hook: SellerProductsService create/update/publish + image-processor → indexProduct çağrısı
- [x] `POST /v1/search/reindex/products` (super_admin guard'ı Faz 5'te eklenecek)
- [x] Query proxy: `GET /v1/search/products?q=&category=&seller=&minPrice=&maxPrice=&discounted=&coldChain=&sort=`
- [ ] **Faz 7'ye ertelendi** — TR stop words + synonyms — performans tuning

### 3.8. Wishlist
- [ ] Repository:
  - addByUser(userId, productId)
  - addByDevice(deviceId, productId)
  - remove(...)
  - listByUser(userId, pagination)
  - listByDevice(deviceId, pagination)
  - mergeFromDeviceToUser(deviceId, userId)
- [ ] Controller:
  - `GET /v1/wishlist` (auth optional, deviceId header)
  - `POST /v1/wishlist`
  - `DELETE /v1/wishlist/:productId`
  - `POST /v1/wishlist/merge` (login sonrası)

### 3.9. Seller Web (apps/web `(seller)`)
- [x] Layout: üst nav (Dashboard, Ürünler, Mağazama git) — sidebar Faz 4 için planlandı
- [x] Pages:
  - `/seller/products` — list
  - `/seller/products/new` — 3 adımlı (bilgiler → görseller → önizleme/yayına al)
  - `/seller/products/[id]` — edit form
- [x] Components:
  - NewProductForm (basic info + categories)
  - ImageUploader (presign + PUT + complete + poll)
  - ProductGallery (public)
- [ ] VariationEditor — Faz 4 (advanced edit)
- [ ] DiscountEditor — bu fazda ekleniyor
- [ ] StockEditor (manual edit + history) — bu fazda ekleniyor
- [x] Toast bildirimleri (custom + react-hot-toast benzeri minimal)
- [x] Permission middleware: SessionGuard + SellerGuard (server-side); UI yönlendirme

### 3.10. Customer Web (apps/web `(public)`)
- [x] Anasayfa:
  - Hero section (DESIGN.md tile-light)
  - Featured categories grid (38 kategori → top 6)
  - Featured products + İndirimde sections
  - [ ] Sponsorlu slot — Faz 6 algoritma
- [x] Kategori sayfası `/kategori/[...slug]`:
  - Generic depth slug
  - Breadcrumb (recursive ancestor lookup)
  - Alt kategori chip'leri
  - Ürün grid (ProductCard)
  - [ ] Filter sidebar (fiyat, satıcı, indirimli, soğuk zincir) — autocomplete sonrası eklenecek
- [x] Ürün detay `/urun/[sellerSlug]/[productSlug]`:
  - ProductGallery (3 görsel, interaktif thumbnail rail)
  - Variation selector (discrete/stepper UI, Faz 3'te aktif sepet)
  - Fiyat + indirim (eski çizik, yeni kalın, %X badge)
  - Açıklama
  - Satıcı linki (Mağazaya git)
  - [ ] Yorumlar — Faz 6
  - [ ] Q&A — Faz 6
  - [ ] Sepete Ekle — Faz 3
  - [x] Wishlist heart icon (bu fazda eklendi)
- [x] Search:
  - `/arama?q=...` sonuç sayfası
  - Header search bar (her sayfada)
  - [x] Autocomplete (debounced, Meilisearch limit=5)
- [x] Mağaza sayfası `/magaza/[slug]`:
  - Header (avatar, bio, rating özeti, satış sayısı)
  - Mağazanın ürün grid'i
  - [ ] Rating — Faz 6

### 3.11. SEO
- [x] Meta tags (title, description) — generateMetadata her sayfada
- [x] Open Graph + Twitter Card — root layout
- [x] Schema.org JSON-LD: Product + BreadcrumbList — bu fazda eklendi
- [ ] Organization JSON-LD — Faz 7 (içerik kesinleşince)
- [x] sitemap.xml (dinamik route)
- [x] robots.txt
- [ ] Canonical URLs — Faz 7

### 3.12. Testing
- [x] Unit tests:
  - Pricing function (25 test, %100 coverage)
  - Slug üretici
- [ ] Variation validation tests — variation CRUD ile gelecek
- [ ] **Faz 7'ye ertelendi** — Integration (Testcontainers Postgres)
- [ ] **Faz 7'ye ertelendi** — Tenant isolation testleri
- [ ] **Faz 7'ye ertelendi** — E2E Playwright

## 4. Çıkış Kriteri

- [x] 1 test satıcısı seed ile 11 ürün eklenmiş (varyasyon + indirim dahil, foto upload pipeline hazır)
- [x] Müşteri tarafında kategori ağacı görünüyor (38 kategori), kategori filter çalışıyor
- [x] Search Meilisearch ile çalışıyor ("peynir" sorgusunda 2 hit, hızlı)
- [x] WebP dönüşüm pipeline'ı hazır (Sharp + BullMQ + MinIO) — kullanıcı upload'u ile test edilecek
- [x] Stok güncelleme + hareket geçmişi (bu fazda eklendi)
- [x] Wishlist guest + login merge (bu fazda eklendi)
- [ ] **Faz 7'ye ertelendi** — Lighthouse score > 90 (perf optimization phase)
- [x] Test coverage: pricing %100
- [ ] **Faz 7'ye ertelendi** — Product service test coverage %80+ (Testcontainers ile birlikte)
- [x] Faz 2 staging'de demo edilebilir durumda

## 5. Riskler

| Risk | Önlem |
|---|---|
| Meilisearch Türkçe stem desteği yetersiz | Custom synonym + stop word listesi |
| Sharp WebP dönüşüm yavaş | Worker concurrency artır, queue priority |
| Slug çakışması | Retry up to 5 with `-2`, `-3` suffix |
| Variation UI karmaşık | UX prototype erken; satıcı testi yap |
| RLS performans 5K ürün altında düşmesi | Index'leri EXPLAIN ile doğrula |

## 6. Sonraki Faza Geçiş (Faz 3)

Faz 3'te gerekli:
- Products zaten var (sepete eklenebilir)
- Stok rezervasyon (Redis TTL)
- Pricing function pure (sepet hesaplaması için kullanılır)
- Address sistemi henüz yok — Faz 3'te eklenir
- Cart sistem yok — Faz 3'te eklenir
