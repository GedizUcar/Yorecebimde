# PHASE 3 — Checkout & Payment

> Hedef: Müşteri ürün satın alabilir, satıcı sipariş alır, Iyzico üzerinden para akar, fatura kesilir.
> Süre: 4-5 hafta. Bu fazın sonunda E2E sipariş akışı tam çalışıyor (sandbox).

---

## 1. Hedefler

1. Sepet sistemi (guest + user, login geçişinde birleştirme)
2. Stok rezervasyonu (Redis TTL 15dk)
3. Adres yönetimi (TR il/ilçe)
4. Çoklu satıcı sepet → satıcı bazında order_group
5. Iyzico sub-merchant onboarding
6. Iyzico 3DS payment flow
7. Sipariş state machine (pending → confirmed → ... → completed)
8. Escrow + payout (BullMQ scheduler)
9. Nilvera e-Arşiv + e-Fatura kesimi
10. Kargo (self-managed manuel takip + entegre temel)
11. Bildirim sistemi (NetGSM SMS + Resend email + template engine)
12. Müşteri "siparişlerim" + satıcı "siparişlerim" UI

## 2. DB Migrasyonları

Yeni tablolar:
- `addresses` (Faz 1'de zaten vardı? — değilse şimdi)
- `carts`, `cart_items`
- `orders` (partitioned by month), `order_groups`, `order_items`
- `payments`, `payment_refunds`, `payouts`
- `notification_templates`, `notifications_log` (partitioned)

RLS: order_groups, order_items (seller_id ile), payments (user_id), payouts (seller_id).

## 3. Detaylı Task Listesi

### 3.1. Address (apps/api `AddressesModule`)
- [x] Repository, service, controller
- [ ] **Faz 4'e ertelendi** — TR il/ilçe data (`packages/shared/data/tr-cities.ts`) — şu an serbest text alan
- [x] Validation (Zod): phone format, alan uzunlukları
- [ ] **Faz 4'e ertelendi** — TC kimlik + tax_id encryption (KVKK), tax_office
- [x] Default address logic (her kullanıcı en fazla 1 default)
- [x] Endpoints: `GET / POST / PATCH / DELETE / POST :id/set-default`

### 3.2. Cart (apps/api `CartModule`)
- [x] Repository: getByUserId, getByDeviceId, mergeFromDeviceToUser (atomic transaction)
- [x] Service: addItem, updateQuantity, removeItem, clear, calculateTotals (pricing function + KDV ayrıştırma)
- [ ] **Faz 6'ya ertelendi** — applyCoupon / applyLoyalty (sadakat programı fazında)
- [x] Cart merge logic — quantity topla / yeni satır insert / device cart sil
- [x] Endpoints: GET, POST items, PATCH items/:id, DELETE items/:id, POST merge, POST clear
- [ ] **Faz 4'e ertelendi** — BullMQ `cart-cleanup` (30 gün eski misafir cart sil) — cron module hazır, job eklenecek

### 3.3. Stock Reservation
- [~] **Faz 3.2 partial** — Şu an stok düşürme order create anında oluyor (immediate sale).
  Redis-based reservation pattern Faz 3.3'te race condition için eklenecek.
- [x] `stock_reservations` tablosu schema'da hazır (placeholder, kullanılmıyor)
- [x] `stock.decreaseForSale` atomic (`UPDATE ... WHERE stock >= qty`) — yetersiz stok'ta exception
- [ ] **Faz 3.3'e ertelendi** — Redis MULTI/EXEC reservation, getEffectiveStock(), reservation-cleanup cron

### 3.4. Iyzico Sub-Merchant Onboarding (apps/api `PaymentsModule`)
- [x] **STUB** — `IyzicoProvider` adapter pattern, env.IYZICO_API_KEY yoksa stub mode
- [x] `createSubMerchant(seller)` stub — `stub-sm-{id}` döner
- [ ] **Faz 4'e ertelendi** — Iyzico Node SDK kurulumu, gerçek API çağrısı (sandbox)
- [ ] **Faz 4'e ertelendi** — Seller onboarding'de otomatik createSubMerchant trigger

### 3.5. Iyzico 3DS Payment
- [x] **STUB** — PaymentService.initiate3DS → mock redirect URL (`/odeme/iyzico-mock`)
- [x] **STUB** — verifyCallback (token format kontrolü, decline simulation)
- [x] **STUB** — refund (log + success)
- [x] Web mock 3DS sayfası — "Onayla / Reddet" butonları, test kart bilgisi gösterir
- [x] Webhook: `POST /v1/webhooks/iyzico/callback` — OrdersService.handlePaymentCallback
- [x] Idempotency: pending_payment dışındaki order'ları skip eder
- [ ] **Faz 4'e ertelendi** — Gerçek Iyzico SDK + marketplace `paymentTransactions[].subMerchantKey`
- [ ] **Faz 4'e ertelendi** — HMAC signature verify (callback güvenliği)
- [ ] **Faz 4'e ertelendi** — Saved cards (Iyzico card storage)

### 3.6. Orders (apps/api `OrdersModule`)
- [x] Repository: `orders` + `order_items` + `order_no_seq` (atomic YRC-YYYY-XXXXX)
- [ ] **Faz 3.3'e ertelendi** — order_groups (multi-seller'da şu an her satıcı için ayrı order; group seviyesinde bundled tracking)
- [x] OrderService.createFromCart:
  - groupBySeller → her satıcıya bir order
  - stok düşürme (atomic)
  - tek paymentRef (multi-seller'ı birleştirir)
  - initiate3DS → redirectUrl döner
  - sepet temizleme
- [x] handlePaymentCallback: token verify → paid/cancelled, notify, e-Arşiv kes
- [x] sellerTransition: paid → confirmed → preparing → shipped → delivered (+notification per step)
- [x] customerConfirmDelivery: delivered → completed
- [x] cancel (sebep zorunlu, satıcı + bildirim)
- [x] releaseEscrowDue: delivered + 14g → completed cron
- [x] Pricing engine entegre (`packages/shared/src/pricing.ts`)
- [x] State machine guard'ları — illegal transition reject
- [x] Endpoints: customer (`/v1/orders`...) + seller (`/v1/seller/orders`...)

### 3.7. Escrow + Payout
- [x] **Cron** `escrow-release` (saatlik) — status='delivered' + 14g → completed
- [x] OrdersService.releaseEscrowDue + notification trigger
- [ ] **Faz 4'e ertelendi** — Payouts table + Iyzico marketplace payout API çağrısı
- [ ] **Faz 4'e ertelendi** — Commission e-Fatura (biz → satıcı, haftalık batch)

### 3.8. Notifications (apps/api/src/modules/notifications)
- [x] **STUB** Providers — EmailProvider, SmsProvider, PushProvider (log-based, swap için adapter pattern)
- [x] Template engine — basit `{{var}}` interpolation (Faz 4'te Handlebars + DB templates)
- [x] NotificationsService — DB log + BullMQ enqueue + worker (3x retry exponential backoff)
- [x] notifications_log tablosu — queued/sent/failed/skipped status, providerRef
- [x] Triggers (TR şablonlar): order.paid (buyer+seller), confirmed, shipped, delivered, completed, cancelled (+seller)
- [ ] **Faz 6'ya ertelendi** — i18n locale-based template (şu an sadece TR)
- [ ] **Faz 4'e ertelendi** — Resend API (DKIM/SPF/DMARC setup)
- [ ] **Faz 4'e ertelendi** — NetGSM gönderici başlığı onayı + gerçek SMS
- [ ] **Faz 7'ye ertelendi** — Expo Push (mobile gelince)
- [ ] **Faz 4'e ertelendi** — InAppProvider WebSocket emit (seller real-time pop-up)
- [ ] **Faz 4'e ertelendi** — payout/refund/lowStock trigger'ları (ilgili modüllerle birlikte)

### 3.9. Invoicing (apps/api/src/modules/invoicing — Nilvera)
- [x] **STUB** — NilveraProvider adapter (env.NILVERA_API_KEY yoksa stub mode)
- [x] InvoicingService.issueForOrder — idempotent, paid order'da otomatik tetiklenir
- [x] `invoices` tablosu — type (e_arsiv/e_fatura), status, pdfUrl, providerRef
- [x] issueEArsiv + issueEFatura (commission) stub'ları
- [ ] **Faz 4'e ertelendi** — Gerçek Nilvera REST API client
- [ ] **Faz 4'e ertelendi** — PDF MinIO `invoices` bucket'a upload + presigned URL
- [ ] **Faz 4'e ertelendi** — Customer "Faturalar" sayfası UI
- [ ] **Faz 4'e ertelendi** — Haftalık komisyon e-Fatura BullMQ batch

### 3.10. Shipping (apps/api `ShippingModule`)
- [x] `cargo_mode` enum: self_managed | aras | mng | yurtici | ptt | integrated_other
- [x] Self-managed: seller manuel tracking_no input (ship transition'unda)
- [ ] **Faz 4'e ertelendi** — Adapter pattern + Aras/MNG/Yurtiçi/PTT entegrasyonları
- [ ] **Faz 4'e ertelendi** — Cold chain filter, kargo etiketi üretimi, webhook tracking
- [ ] **Faz 4'e ertelendi** — `listAvailableOptions` API'si (checkout'ta kargo seçimi)

### 3.11. Customer Web (apps/web `(public)`)
- [ ] **Faz 4'e ertelendi** — Cart drawer (sağdan açılan, header'dan tetiklenir)
- [x] `/sepet` sayfası — item listesi, quantity ± (canlı update), sil, özet
- [ ] **Faz 4'e ertelendi** — Satıcı bazında alt-toplam (multi-seller checkout UI'da göster)
- [ ] **Faz 6'ya ertelendi** — Kupon input
- [x] `/odeme` checkout sayfası — adres seç/ekle, sözleşme onayı, siparişi tamamla
- [x] 3DS flow — checkout'tan iyzico-mock'a redirect, "Onayla/Reddet" butonları
- [x] Callback sonrası: success → sipariş detayı, fail → sepet
- [x] `/hesabim/siparislerim` listesi + status badges
- [x] Detay sayfası: items, adres, kargo (tracking_no varsa), notlar, özet
- [x] "Siparişi onayla" butonu (delivered status'unda)
- [ ] **Faz 4'e ertelendi** — "İade aç" butonu (delivered, 14g içinde)
- [ ] **Faz 4'e ertelendi** — "Faturayı indir" link (Nilvera PDF gerçek olunca)
- [ ] **Faz 4'e ertelendi** — "Satıcıyla iletişime geç" chat

### 3.12. Seller Web (apps/web `(seller)`)
- [x] `/seller/orders` listesi + status filter chips
- [x] Sipariş detay: items, adres snapshot (kişisel veri minimum), kargo
- [x] Aksiyonlar: Onayla, Hazırlığa başla, Kargoya ver (tracking + mode), Teslim et, İptal (sebep)
- [ ] **Faz 4'e ertelendi** — Kargo etiketi yazdır (entegre kargo gelince)
- [ ] **Faz 4'e ertelendi** — WebSocket yeni sipariş pop-up + sound

### 3.13. Dispute (Faz 4 başında çalışacak)
- [ ] **Faz 4'e ertelendi** — disputes tablosu + endpoints + UI

### 3.14. Cron / Scheduled Jobs
- [x] `escrow-release` (saatlik) — BullMQ recurring, OrdersService.releaseEscrowDue
- [ ] **Faz 4'e ertelendi** — `low-stock-check` (günlük)
- [ ] **Faz 4'e ertelendi** — `cart-cleanup` (haftalık)
- [ ] **Faz 4'e ertelendi** — `commission-invoicing` (haftalık)
- [ ] **Faz 4'e ertelendi** — `notifications-retry-failed` (günlük backup)
- [ ] **Faz 7'ye ertelendi** — `partition-management` (declarative partitioning aktif olunca)

### 3.15. Testing
- [x] Unit: Pricing engine (25 test, %100)
- [x] State machine transition guard'ları implement (test'leri Faz 7)
- [ ] **Faz 7'ye ertelendi** — Cart merge logic unit testleri
- [ ] **Faz 7'ye ertelendi** — Integration testleri (Testcontainers)
- [ ] **Faz 7'ye ertelendi** — E2E Playwright

## 4. Çıkış Kriteri (Faz 3.2 — stub-based MVP)

- [x] Test kullanıcı **STUB Iyzico** ile multi-seller sipariş tamamlıyor (`/odeme/iyzico-mock` Onayla/Reddet)
- [x] Sipariş satıcı bazında bölünüyor (tek paymentRef, N order), her satıcı kendi order'ını görüyor
- [ ] **Faz 4'e ertelendi** — Satıcı yeni sipariş pop-up'ı WS ile (şu an email + log + dashboard refresh)
- [x] Email + SMS bildirimleri **STUB** olarak log'a düşüyor (notifications_log audit) — Faz 4'te gerçek Resend/NetGSM
- [x] e-Arşiv **STUB** — invoices tablosuna mock invoiceNo + pdfUrl yazılıyor
- [x] Satıcı onaylıyor → buyer bildirim alıyor (notifications_log doğrulanabilir)
- [ ] **Faz 3.3'e ertelendi** — Redis stok rezervasyonu (şu an immediate decrease + race window var)
- [x] İptal akışı çalışıyor (satıcı cancel, status=cancelled, sebep zorunlu)
- [ ] **Faz 4'e ertelendi** — Iyzico sandbox refund (şu an stub)
- [x] Test coverage: pricing %100 (Faz 3 checkout flow testleri Faz 7'de)
- [x] Faz 3 demo — staging'de canlı, E2E akış çalışıyor

## 4.1 Faz 4'e Bırakılan Borçlar (entegrasyon zamanı)

**Sadece adapter dosyalarını gerçekle değiştirip env credentials eklemek yeterli.**

| Stub | Faz 4 işlemi | Dosya |
|---|---|---|
| Iyzico Provider | `iyzipay` SDK install + sandbox creds | `apps/api/src/modules/payments/iyzico.provider.ts` |
| Nilvera Provider | Nilvera REST client + PDF MinIO upload | `apps/api/src/modules/invoicing/nilvera.provider.ts` |
| Resend Email | API key + DKIM/SPF/DMARC setup | `apps/api/src/modules/notifications/providers.ts` (EmailProvider) |
| NetGSM SMS | Başlık onayı + UserCode/Password env | `apps/api/src/modules/notifications/providers.ts` (SmsProvider) |
| Iyzico SubMerchant | Onboarding flow'da createSubMerchant çağrısı | Seller onboarding service (Faz 4) |
| Payout | Iyzico marketplace payout + payouts tablosu | Yeni: `apps/api/src/modules/payouts/` |

## 5. Riskler

| Risk | Önlem |
|---|---|
| Iyzico sandbox farklı davranış | Iyzico TR desteği erken devreye |
| Nilvera sandbox erişimi yok | Mevcut projeden secret + sandbox alt hesap |
| NetGSM başlık onayı geç | Faz 1'de başvur, alternatif provider ready |
| Email DKIM/DMARC setup yanlış | Resend dokümana sıkı uy, MXToolbox check |
| Multi-seller sepet karmaşıklığı | UX prototype + iç ekipte 5+ test sipariş |
| Concurrent stok rezerve race condition | Redis MULTI/EXEC veya Lua script atomic check |

## 6. Sonraki Faza Geçiş (Faz 4)

Faz 4'ün ön koşulları:
- Sipariş alma + temel chat altyapısı var
- Sub-merchant create API hazır
- Bildirim sistemi çalışıyor (satıcı stok uyarısı için kullanılacak)
- Dispute schema hazır
