# ARCHITECTURE — Yörecebimde

> Sistem mimarisi, bileşenler arası ilişkiler, kritik akışlar (sequence diagram'lar) ve mimari kararlar.

---

## 1. Üst Seviye Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│  ┌────────────────┐   ┌──────────────────┐   ┌─────────────────────┐    │
│  │  Customer Web  │   │  Customer Mobile │   │  Seller Web (panel) │    │
│  │  Next.js SSR   │   │  Expo / RN       │   │  Next.js            │    │
│  └───────┬────────┘   └────────┬─────────┘   └──────────┬──────────┘    │
│          │                     │                        │               │
│  ┌───────┴────────┐   ┌────────┴──────┐    ┌────────────┴─────────┐     │
│  │  Super Admin   │   │  AI Bot UI    │    │ Iyzico Hosted Pay UI │     │
│  │  Next.js       │   │  Web Widget   │    │ (3DS redirect)       │     │
│  └───────┬────────┘   └────────┬──────┘    └────────────┬─────────┘     │
└──────────┼─────────────────────┼─────────────────────────┼──────────────┘
           │                     │                         │
           ▼                     ▼                         ▼
    ┌──────────────────────────────────────────────────────────────┐
    │                    CADDY  (reverse proxy + TLS)              │
    │   Routes:                                                    │
    │   - yorecebimde.com           → web (Next.js SSR)            │
    │   - api.yorecebimde.com       → NestJS backend               │
    │   - ws.yorecebimde.com        → NestJS WebSocket             │
    │   - storage.yorecebimde.com   → MinIO public                 │
    │   - admin.yorecebimde.com     → web (admin route group)      │
    │   - seller.yorecebimde.com    → web (seller route group)     │
    │   Rate limiting, HTTP/3, gzip/brotli                         │
    └────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                               │
│                                                                       │
│  ┌──────────────────┐    ┌───────────────────────┐                    │
│  │  Next.js (web)   │    │   NestJS (api)        │                    │
│  │  - SSR pages     │    │   - REST controllers  │                    │
│  │  - Server Action │◀──▶│   - WS gateway        │                    │
│  │  - Route groups  │    │   - Auth guards       │                    │
│  │   (public/       │    │   - RLS context       │                    │
│  │    seller/       │    │   - BullMQ producers  │                    │
│  │    admin)        │    │   - Health, metrics   │                    │
│  └──────────────────┘    └──────────┬────────────┘                    │
│                                     │                                 │
│                              ┌──────┴──────┐                          │
│                              ▼             ▼                          │
│                   ┌─────────────────┐  ┌────────────────┐             │
│                   │  BullMQ Worker  │  │  WS Consumer   │             │
│                   │  - notify       │  │  - chat        │             │
│                   │  - payout       │  │  - order push  │             │
│                   │  - escrow rel.  │  │  - typing      │             │
│                   │  - dispute esc. │  └────────────────┘             │
│                   │  - search idx   │                                 │
│                   │  - boost rotate │                                 │
│                   └─────────────────┘                                 │
└───────────────────────────────────────────────────────────────────────┘
           │                  │                 │                  │
           ▼                  ▼                 ▼                  ▼
┌─────────────────┐ ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│   PostgreSQL    │ │      Redis        │ │ Meilisearch  │ │    MinIO     │
│   - primary     │ │  - cache          │ │  - products  │ │  - product   │
│   - read replic │ │  - session        │ │  - sellers   │ │    images    │
│   - PgBouncer   │ │  - BullMQ         │ │  - categs    │ │  - documents │
│   - PITR backup │ │  - rate-limit     │ │              │ │  - invoices  │
│   - RLS         │ │  - reservations   │ │              │ │              │
└─────────────────┘ └──────────────────┘ └──────────────┘ └──────────────┘
           │                  │                                  │
           └──────────────────┴──────────────────┬───────────────┘
                                                 │
                  ┌──────────────────────────────┴───────────────────────────────┐
                  ▼                                                              ▼
        ┌──────────────────────┐                                ┌────────────────────────────┐
        │  EXTERNAL PROVIDERS  │                                │      OBSERVABILITY         │
        │  - Iyzico            │                                │  - Sentry (self-host)      │
        │  - Nilvera (fatura)  │                                │  - Grafana + Loki + Prom.  │
        │  - NetGSM (SMS)      │                                │  - Uptime Kuma             │
        │  - Resend (email)    │                                │  - OpenTelemetry collector │
        │  - Expo Push         │                                │                            │
        │  - Gemini API        │                                │                            │
        │  - Cargo APIs        │                                │                            │
        │   (Aras/MNG/Yurtiçi) │                                │                            │
        └──────────────────────┘                                └────────────────────────────┘
```

## 2. Bileşen Detayları

### 2.1. Next.js Web (apps/web)

**Sorumluluğu:**
- SSR/RSC ile SEO-friendly anasayfa, kategori, ürün detay
- Misafir + giriş yapmış kullanıcı arayüzleri
- Seller paneli (route group: `(seller)`)
- Super admin paneli (route group: `(admin)`)
- Better-Auth session middleware
- Server Actions ile NestJS API'ye BFF proxy (auth, form submit)
- i18n (next-intl)
- Image optimization (built-in)

**Bağımlılıkları:**
- NestJS API (HTTP + WebSocket)
- MinIO (public read için)
- Meilisearch (search ?)
  - **Karar**: Search çağrıları NestJS üzerinden gider (auth + rate limit + caching) — Meilisearch'e direkt erişim YOK
- Iyzico hosted UI (3DS redirect)

**Build/deploy:**
- `output: 'standalone'` — Docker'da çalışır
- Caching: ISR + Next data cache + Redis-backed cache (gerekirse)

### 2.2. Expo Mobile (apps/mobile)

**Sorumluluğu:**
- Customer marketplace (alışveriş, sipariş takip, chat, AI bot)
- Push notification (Expo Push)
- Biometric login (FaceID/TouchID — TOTP yedek)
- Native modüller: kamera (ürün ara), location (en yakın satıcılar — ileride)

**Bağımlılıkları:**
- NestJS API (REST + WebSocket)
- Expo Push servers

**Build/deploy:**
- EAS Build (Expo Application Services) self-host alternatifi: `expo prebuild` + GitHub Actions ile native build
- OTA update: Expo Updates (self-host alternatifi: expo-updates with own server)

### 2.3. NestJS API (apps/api)

**Modüller:**
- `auth` — Better-Auth wrapper, JWT (mobil için), 2FA TOTP
- `users` — kullanıcı CRUD, adres, telefon doğrulama
- `sellers` — başvuru, KYC, panel, Iyzico sub-merchant
- `categories` — hiyerarşi, talep akışı
- `products` — CRUD, varyasyon, indirim, stok
- `cart` — sepet (misafir + user), birleştirme
- `orders` — sipariş akışı, state machine, dispute
- `payments` — Iyzico entegrasyon, escrow, refund
- `payouts` — satıcıya release, komisyon hesabı
- `invoices` — Nilvera fatura kesimi
- `notifications` — bildirim trigger'ları, template engine
- `chat` — WebSocket chat (customer-seller, customer-admin)
- `search` — Meilisearch index + query proxy
- `boost` — paket satın alma, rotasyon algoritması
- `loyalty` — puan + referral
- `coupons` — kupon yönetimi
- `disputes` — dispute akışı
- `audit` — admin aksiyon log
- `health` — readiness + liveness + metrics
- `admin` — super admin endpoint'leri
- `bot` — AI bot function call endpoint'leri (auth + rate limit)
- `storage` — MinIO presigned URL üretimi
- `i18n` — bildirim + sözleşme şablon yönetimi

**Cross-cutting:**
- Global exception filter (Sentry'ye loglar)
- Pino structured logging
- Request ID propagation
- Tenant context middleware (Postgres `SET LOCAL session.seller_id`)
- Rate limit guard (Redis-backed)
- Audit interceptor (admin route'lar için)

**Tasarım:**
- Layer'lar: `Controller → Service → Repository`
- Repository → Drizzle queries
- Service'ler stateless, dependency injected
- Event-driven: business event → BullMQ job

### 2.4. PostgreSQL

bkz. [DATABASE.md](DATABASE.md)

- **Primary** (writes + reads)
- **Read replica** (search aggregations, reports — ileride)
- **PgBouncer** connection pool
- **Drizzle ORM** (NestJS içinde)
- **Row Level Security** policies
- **Declarative partitioning** orders/order_items için
- **WAL streaming** backup için (PITR)

### 2.5. Redis

**Kullanımlar:**
- **Cache** — product list, category tree, hot products
- **Session** — Better-Auth session store
- **BullMQ** — job queue
- **Rate limit** — sliding window counter
- **Stock reservation** — TTL key (15 dk)
- **Boost rotation** — rotation state
- **WebSocket presence** — kim online

**Yapı:**
- Key prefix: `yc:` ile başlar
- Namespace: `yc:cache:`, `yc:session:`, `yc:reserve:`, `yc:rate:`, `yc:boost:`

### 2.6. Meilisearch

**Indexler:**
- `products` — ürün arama (ad, açıklama, kategori, satıcı, fiyat, etiket)
- `sellers` — mağaza arama
- `categories` — kategori arama

**Sync:**
- Product `INSERT/UPDATE/DELETE` → BullMQ job → Meilisearch upsert/delete
- Bulk reindex: gece batch job

**Türkçe:**
- Custom stop words (Türkçe ek listesi)
- Synonym (örn. `domates` ↔ `pomadoro`)

### 2.7. MinIO

**Bucket'lar:**
- `products` — ürün görselleri (public read, presigned write)
- `seller-documents` — KYC belgeleri (private)
- `invoices` — fatura PDF'leri (private, presigned URL ile sahip okur)
- `chat-attachments` — chat ek dosyaları (private)
- `disputes` — dispute delilleri (private)

**Image processing:**
- Upload sonrası Sharp ile WebP'ye dönüşüm + thumbnail (BullMQ job)
- Public URL: `https://storage.yorecebimde.com/<bucket>/<key>`

### 2.8. BullMQ Workers

Job tipleri:

| Queue | İş |
|---|---|
| `notifications` | Email, SMS, Push gönderimi |
| `search-index` | Meilisearch sync |
| `image-processing` | WebP dönüşüm, thumbnail |
| `escrow-release` | Sipariş `delivered` + 14 gün sonrası release |
| `dispute-escalation` | Dispute auto-eskalasyon |
| `payouts` | Satıcıya Iyzico release |
| `invoicing` | Nilvera fatura kesimi |
| `boost-rotation` | Boost slot rotasyonu |
| `cart-cleanup` | Eski misafir sepetlerini sil (30 gün) |
| `reservation-cleanup` | Süresi bitmiş stok rezervasyonu sil |
| `low-stock-check` | Düşük stok uyarısı tarama (cron) |
| `analytics-aggregation` | Günlük rapor verisi |
| `audit-archival` | Audit log eski kayıt arşivleme |

Her job:
- Retry: 3x exponential backoff
- Failed job → Sentry
- Idempotency key (DB unique constraint veya Redis SET NX)

### 2.9. WebSocket Gateway

**Endpoint:** `wss://ws.yorecebimde.com`

**Kanallar:**
- `chat:order:<orderId>` — customer-seller order chat
- `chat:direct:<sellerId>:<userId>` — direkt chat (sipariş bağımsız)
- `chat:support:<userId>` — customer-admin chat
- `notifications:<userId>` — in-app bildirim push
- `seller:dashboard:<sellerId>` — yeni sipariş, düşük stok anlık push

**Authentication:**
- WS connect handshake'inde JWT veya session cookie
- Connect sonrası → user context yüklenir, kanallara subscribe edilebilir
- Kanal subscribe → permission check (RLS-like)

### 2.10. AI Bot (Gemini Function Calling)

**Akış:**
```
Kullanıcı: "kayısı arıyorum"
   ↓
Gemini API → function call: searchProducts({ query: "kayısı" })
   ↓
NestJS: POST /api/bot/functions/searchProducts (auth header)
   ↓
ProductsService.search() → Meilisearch query
   ↓
Sonuç JSON → Gemini'ye geri
   ↓
Gemini doğal dil cevap: "5 farklı kayısı bulundu..."
   ↓
Kullanıcı UI'da gösterilir + ürün kartları
```

**Korumalar:**
- Her function call NestJS auth check'ten geçer
- Rate limit: 60 mesaj/saat/kullanıcı
- Bot persona prompt'unda iş kuralları (örn. "misafir checkout yapamaz")
- Function call hata kodları kullanıcıya doğal dilde sunulur

## 3. Kritik Akışlar (Sequence Diagrams)

### 3.1. Satıcı Başvuru Akışı

```
Satıcı (web)         NestJS API         Postgres          NetGSM/Resend         Iyzico
    │                    │                  │                   │                  │
    │── POST /sellers/apply (form + docs) ─▶│                   │                  │
    │                    │── upload docs ──▶ MinIO              │                  │
    │                    │── INSERT seller_application ─▶       │                  │
    │                    │── BullMQ: notify-admin ─────▶ Email  │                  │
    │◀── 201 application_id ───            │                    │                  │
    │                    │                  │                   │                  │
    │              [Super admin reviews in panel]                 │                  │
    │                    │                  │                   │                  │
    │              POST /admin/applications/:id/approve         │                  │
    │                    │── INSERT seller (approved) ─▶       │                  │
    │                    │── BullMQ: create-iyzico-submerchant ────────────────────▶│
    │                    │                                       │◀── submerchant_id│
    │                    │── UPDATE seller SET iyzico_id ─▶     │                  │
    │                    │── BullMQ: send-invite-link ─▶ Email + SMS               │
    │                    │                                                          │
    │── GET /sellers/invite?token=xxx ──▶                                          │
    │                    │── INSERT user (role=seller) ─▶                          │
    │                    │── 2FA setup screen ─▶                                   │
    │◀── seller dashboard ────                                                     │
```

### 3.2. Müşteri Sipariş Akışı (Multi-Seller)

```
Customer        Next.js Web      NestJS API        Postgres        Redis          Iyzico        Nilvera
   │                │                │                │              │              │              │
   │── view cart ──▶│── GET /cart ──▶│                │              │              │              │
   │                │                │── SELECT cart_items ─▶        │              │              │
   │◀── cart UI ────│◀── 200 ────────│                              │              │              │
   │                                                                                              │
   │── checkout ───▶│── POST /orders/checkout ───────▶              │              │              │
   │                │                │── lock stock (RESERVE 15min) ────▶ TTL key   │              │
   │                │                │── INSERT orders + order_groups ─▶            │              │
   │                │                │── call Iyzico initialize3DS ────────────────▶│              │
   │                │                │◀── 3DS HTML / redirect URL ─────────────────│              │
   │◀── redirect to Iyzico 3DS ────────────────────────────────────────────────────│              │
   │                                                                                              │
   │── 3DS auth on Iyzico ─────────────────────────────────────────────────────────▶│              │
   │                                                                                              │
   │◀── callback to /api/payment/iyzico/callback ──────────────────────────────────│              │
   │                │                │── verify payment with Iyzico ───────────────▶│              │
   │                │                │◀── PAID ────────────────────────────────────│              │
   │                │                │── UPDATE orders SET status=pending ─▶         │              │
   │                │                │── confirm reservation → DEC stock ─▶          │              │
   │                │                │── BullMQ: notify-seller, notify-buyer ─▶ Email+SMS+Push     │
   │                │                │── BullMQ: invoicing job ─────────────────────────────────────▶│
   │                │                │                                                              │◀ e-Arşiv keser
   │                                                                                              │
   │                          [Seller confirms order in panel]                                    │
   │                                                                                              │
   │                                  PUT /orders/:id/confirm (seller)                            │
   │                                  ── status=confirmed                                          │
   │                                  ── BullMQ: notify-buyer (confirmed) ──▶                     │
   │                                                                                              │
   │                          [Seller prepares + ships]                                           │
   │                                  PUT /orders/:id/ship (tracking_no)                          │
   │                                  ── status=shipped                                            │
   │                                  ── BullMQ: notify-buyer (shipped)                           │
   │                                                                                              │
   │                          [Cargo company marks as delivered OR seller manually]               │
   │                                  ── status=delivered                                          │
   │                                  ── BullMQ schedule: escrow-release (+14d)                   │
   │                                                                                              │
   │                          [14 days later (or buyer confirms early)]                           │
   │                                  ── status=completed                                          │
   │                                  ── BullMQ: payout-to-seller ──────────────────▶              │
   │                                                                                              │◀ Iyzico release
   │                                  ── BullMQ: commission-invoice (Nilvera) ────────────────────▶│
```

### 3.3. Dispute Akışı

```
Customer       NestJS API       Postgres       BullMQ Scheduler    Seller        Super Admin
   │              │                │                 │                │              │
   │── POST /orders/:id/return-request (reason, photos) ──▶            │              │
   │              │── UPDATE status=return_requested ─▶                 │              │
   │              │── INSERT dispute ─▶                                  │              │
   │              │── BullMQ: notify-seller ──────────────────────────▶│              │
   │              │── BullMQ: schedule(3 days) check-response ─▶        │              │
   │                                                                    │              │
   │                              [Seller has 3 days to respond]        │              │
   │                                                                    │              │
   │                                  Option A: Seller approves         │              │
   │                                    PUT /disputes/:id/approve ─▶    │              │
   │                                    ── status=returned              │              │
   │                                    ── BullMQ: refund (Iyzico) ──▶  │              │
   │                                    ── status=refunded              │              │
   │                                                                                   │
   │                                  Option B: Seller rejects + evidence              │
   │                                    PUT /disputes/:id/reject + photos ─▶           │
   │                                    ── status=disputed                              │
   │                                    ── BullMQ: schedule(7 days) auto-escalate ─▶   │
   │                                                                                   │
   │              [3 days timer fires, no seller response]                              │
   │                              ── auto-escalate to admin ────────────────────────────▶│
   │                              ── notify admin                                       │
   │                                                                                   │
   │                              [Super admin reviews + decides]                      │
   │                                  PUT /admin/disputes/:id/resolve (winner)         │
   │                                  ── status=resolved                                │
   │                                  ── if customer wins: refund                       │
   │                                  ── if seller wins: release escrow as normal       │
   │                                  ── audit log entry                                │
```

### 3.4. AI Bot Sipariş Tamamlama Akışı

```
Customer       Web (bot UI)     NestJS /bot      Gemini API     Cart/Orders Service
   │              │                │                 │                 │
   │── "5kg kayısı sepete ekle" ─▶│                 │                 │
   │              │── POST /bot/chat ──────────────▶│                 │
   │              │                │── invoke ──────▶│                 │
   │              │                │                 │── func: searchProducts ─▶
   │              │                │                 │◀── results ──── │
   │              │                │                 │                 │
   │              │                │                 │── func: addToCart(productId, qty=5) ─▶
   │              │                │                 │◀── added ────── │
   │              │                │                 │                 │
   │              │                │                 │── final text response                     │
   │              │                │◀── "Eklendi"                                                 │
   │              │◀── response + cart update event                                              │
   │◀── chat msg + UI updates                                                                    │
   │                                                                                              │
   │── "siparişi tamamla" ───▶                                                                    │
   │              │── POST /bot/chat ──────────────▶                                              │
   │              │                │                 │── func: placeOrder() ─▶                    │
   │              │                │                 │                 │── checks: address ok? card ok?
   │              │                │                 │                 │── if NOT login: error "login required"
   │              │                │                 │                 │── else: initiate 3DS flow
   │              │                │◀── 3DS redirect URL                                          │
   │              │◀── "3DS ekranına yönlendiriyorum..."                                          │
   │◀── opens 3DS modal                                                                          │
   │── [3DS auth]                                                                                │
```

## 4. Mimari Kararlar (ADR — Architecture Decision Records)

### ADR-001: NestJS Ayrı Backend
- **Bağlam**: Web + mobil + 2 admin paneli aynı API'yi tüketecek
- **Karar**: NestJS ayrı backend, Next.js sadece SSR + BFF
- **Sonuç**: Mobil app temiz REST tüketir, web BFF olarak gerekirse proxy yapar
- **Alternatif**: Next.js API routes (reddedildi — mobil için ayırma maliyeti gelecekte yüksek)

### ADR-002: Drizzle ORM
- **Bağlam**: Tip güvenli, performant, SQL kontrolü
- **Karar**: Drizzle (Prisma yerine)
- **Sonuç**: SQL'e yakın yazım, daha küçük bundle, daha hızlı queries
- **Alternatif**: Prisma (reddedildi — büyük datasette perf sorunları, magic var)

### ADR-003: Shared Schema + RLS Multi-Tenant
- **Bağlam**: Marketplace = cross-tenant query gerekir (kategori sayfası, arama)
- **Karar**: Shared schema, her tabloda `seller_id`, Postgres RLS policies
- **Sonuç**: Cross-tenant query basit, DB-seviyesi izolasyon
- **Alternatif**: Schema-per-tenant (reddedildi — UNION yapmak imkansız)

### ADR-004: Iyzico Marketplace (Escrow)
- **Bağlam**: TR ödeme sağlayıcı + sub-merchant + marketplace desteği
- **Karar**: Iyzico, escrow modeli (biz tutuyoruz, release ediyoruz)
- **Sonuç**: Sub-merchant per seller, escrow 14 gün
- **Alternatif**: PayTR, Param (reddedildi — marketplace sub-merchant desteği daha zayıf)

### ADR-005: Postgres Declarative Partitioning
- **Bağlam**: orders, order_items, stock_movements tablolar zamanla devasa olur
- **Karar**: `PARTITION BY RANGE (created_at)` ay bazında
- **Sonuç**: Eski partition'lar arşive taşınabilir, query partition pruning ile hızlanır
- **Alternatif**: Tek tablo + sadece index (reddedildi — uzun vadede bakım sıkıntısı)

### ADR-006: Caddy Reverse Proxy
- **Bağlam**: Otomatik TLS, basit config, HTTP/3 desteği
- **Karar**: Caddy (Nginx yerine)
- **Sonuç**: TLS dert değil, config az
- **Alternatif**: Nginx (reddedildi — TLS yönetimi manuel)

### ADR-007: Better-Auth
- **Bağlam**: Multi-role (customer/seller/admin), 2FA, OAuth, session yönetimi
- **Karar**: Better-Auth (framework-agnostic core)
- **Sonuç**: Built-in 2FA, organization plugin, session refresh, OAuth provider'lar
- **Alternatif**: Custom JWT, Lucia (reddedildi — 2FA + organization için ek iş)

### ADR-008: Misafir DeviceID Sadece LocalStorage
- **Bağlam**: Misafir wishlist + cart için identifier
- **Karar**: localStorage UUID v7
- **Sonuç**: KVKK uyumlu, fingerprint yok
- **Alternatif**: FingerprintJS (reddedildi — KVKK gri alan, açık rıza zor)

### ADR-009: Boost — Süreli Paket
- **Bağlam**: Reklam modeli karmaşıklığı
- **Karar**: MVP'de süreli paket (7g, 30g), %20 sponsorlu slot oran
- **Sonuç**: Implementation basit, kullanıcıya tahmin edilebilir
- **Alternatif**: CPC, CPM (ileride veri toplandıktan sonra)

### ADR-010: Tek Domain, Mağaza Sayfası Path-based
- **Bağlam**: Subdomain-per-seller mi, path mi?
- **Karar**: `/magaza/<slug>` path-based
- **Sonuç**: SSL ve DNS yönetimi tek, SEO basit
- **Alternatif**: `<slug>.yorecebimde.com` (reddedildi — wildcard TLS + DNS karmaşası)

### ADR-011: Gemini Flash Lite 3.1 AI Bot
- **Bağlam**: Function calling ile aksiyon alabilen bot
- **Karar**: Google Gemini Flash Lite 3.1
- **Sonuç**: Ucuz, hızlı, function calling iyi
- **Alternatif**: OpenAI GPT-4o-mini, Claude Haiku, Ollama self-host (reddedildi — Gemini TR + maliyet dengesi)

## 5. Performans Konuları

- **N+1 önleme**: Drizzle'da `with()` ile eager loading, gerekirse manual JOIN
- **Index stratejisi**: Her query'nin WHERE/ORDER BY'a uygun composite index'i olmalı (bkz. DATABASE.md)
- **Cache katmanları**:
  1. Browser cache (Cache-Control headers, immutable for static)
  2. CDN/Caddy cache (kısa süreli, public endpoints)
  3. Redis cache (kategori tree, hot product list, currency rates)
  4. DB query plan cache
- **N siparişlik bir admin listeleme** → paginated, cursor-based (offset değil)
- **Image lazy load**: Next.js Image + Intersection Observer
- **Bundle splitting**: route bazlı + dynamic import for heavy components

## 6. Disaster Recovery

- **Backup**: Postgres günlük full + 15dk WAL streaming → MinIO (ayrı bucket)
- **Off-site copy**: Backblaze B2 veya AWS S3 ayrı region (haftalık)
- **Restore drill**: 3 ayda bir test restore
- **RTO**: 4 saat (sunucu yenilenir, backup restore, DNS switch)
- **RPO**: 15 dakika (WAL streaming sayesinde)

## 7. Gelecek Mimari Genişlemeleri

- **Multi-region**: ileride Avrupa + TR çoklu region için DB sharding
- **CQRS + Event Sourcing**: sipariş ve finans için (Faz 8+)
- **Service mesh**: Microservice'e geçilirse (Linkerd / Istio)
- **CDN**: Cloudflare veya BunnyCDN (public images için)
- **Kubernetes**: ölçek > 1 makine olunca (Coolify zaten Compose orchestration yapıyor)
