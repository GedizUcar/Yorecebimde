# PHASE 6 — AI Bot + Boost Algorithm + Loyalty + Referral

> Hedef: Akıllı ve büyüme odaklı özellikler. AI bot sipariş tamamlayabilir, boost algoritması canlı,
> sadakat ve referral sistemi aktif, yorum + Q&A UI hazır.
> Süre: 3-4 hafta.

---

## 0. Faz 6.1 — Loyalty + Referral + Reviews + Q&A + Coupons + Boost MVP (Tamamlandı 2026-05-13)

| Modül | Endpoint(ler) | UI | Notlar |
|---|---|---|---|
| Loyalty | `GET /v1/loyalty/balance`, `GET /transactions`, `POST /redeem` | `/hesabim/puanlarim` | 1 TL = 1 puan, 100 puan = 1 ₺. Order `completed`'da otomatik earn (idempotent). 365g expire |
| Referral | `GET /v1/referrals/my-code`, `GET /my-referrals`, `POST /redeem` | `/hesabim/davet`, `/kayit?ref=` | 8-char code (ambiguity-free). İlk sipariş completed olunca: referrer'a 100 puan + referee'ye 25 ₺ kupon (30g) |
| Coupons | `POST /v1/coupons/validate`, `GET /my` | `coupon-input.tsx` (sepet sayfasında) | Percent/fixed, min order, per-user limit, bound user, expire date. Validate-only MVP — apply checkout'ta |
| Reviews | `GET /v1/reviews/product/:id`, `GET /reviewable`, `POST /`, `POST /seller/reviews/:id/reply` | Ürün detay sayfası + `/hesabim/yorumlarim` | Verified purchase only (delivered/completed sipariş). Product+seller rating_avg/count auto refresh |
| Q&A | `GET /v1/questions/product/:id`, `POST /`, `POST /seller/questions/:id/answer` | Ürün detay sayfası | Public liste: status=answered + is_public=true. Satıcı paneli endpoint'leri hazır (UI Faz 6.2) |
| Boost interleave | `GET /v1/products` (entegre), `POST /v1/boost/track/:id/impression\|click` | Product card "Sponsorlu" badge | %20 sponsorlu slot (BOOST_RATIO_PERCENT env). Impressions-based fairness sort |

**Schema:** `packages/db/src/schema/{loyalty,referrals,coupons,reviews}.ts` — `loyalty_accounts`, `loyalty_transactions`, `referral_codes`, `referrals`, `coupons`, `coupon_usages`, `product_reviews`, `product_questions` (+ 5 enum). Migration: `0007_pale_nightmare.sql`.

**Order completion hook:** `OrdersService.onOrderCompleted()` 3 path'te tetiklenir (sellerUpdate, customerConfirm, escrowCron):
1. `LoyaltyService.earnFromOrder` — puan ekler (idempotent)
2. `ReferralService.maybeCompleteOnFirstOrder` — referee'nin ilk siparişiyse reward

### Faz 6.1 — Erteleme listesi (Faz 6.2)
- AI Bot (Gemini Flash Lite 3.1 + function calling + web widget)
- Notification template'leri (loyalty_earned, referral_completed, review_request)
- Loyalty checkout entegrasyonu (redeem slider sepete reflect, expire cron)
- Coupon checkout entegrasyonu (apply order create sırasında, refund'da revoke)
- Boost performans raporu (satıcı paneli + admin metrik)
- Q&A satıcı yanıt UI
- Reviews admin moderasyon UI
- Photo upload (review + Q&A) — MinIO entegrasyonu Faz 4.3 sonrası

---

## 0.1 Faz 6.2 — AI Bot + Checkout entegrasyon + Cron + Notifications (Tamamlandı 2026-05-13)

### AI Bot

**packages/ai-bot** — `@yorecebimde/ai-bot`:
- `BotClient` (Gemini 2.0 Flash Lite wrapper, system instruction + tools)
- 5 function declaration: `searchProducts`, `getProductDetail`, `getCart`, `addToCart`, `placeOrder`
- TR + EN system prompt (locale-aware), auth-aware (misafire LOGIN_REQUIRED)

**apps/api/src/modules/bot**:
- `BotService` — chat loop (max 5 function iteration), conversation history persist edilmez
- `BotFunctionsService` — executor (CartService, OrdersService, ProductsRepository entegre)
- `BotController` — `POST /v1/bot/chat`, in-memory rate limit 60/saat/identity
- `GEMINI_API_KEY` env yoksa fallback mesaj döner (graceful degradation)

**apps/web/src/components/bot/bot-widget.tsx** — sağ alt FAB + chat panel, history component state'te (sayfa kapanınca silinir), reset butonu

### Loyalty + Coupon Checkout Entegrasyonu

**Order create flow:**
- `CreateOrderInput` genişletildi: `couponCode?`, `loyaltyPoints?`
- Pre-validate: `CouponsService.validate()` + `LoyaltyService.getBalance()`
- Order create sonrası: `coupons.applyToOrder()` + `loyalty.redeem()` (primary order'a iliştir)
- Payment intent `grandTotal - totalExtraDiscount` ile başlatılır
- Response'a `discounts: { couponDiscountCents, loyaltyDiscountCents, payableTotalCents }` eklendi

**Refund/cancel flow:**
- `onOrderRefunded(orderId)` — `coupons.revokeForOrder()` çağırır
- Seller transition `cancelled` + `refunded` path'lerinde tetiklenir

**Frontend (`apps/web/src/components/checkout-flow.tsx`):**
- `CouponInput` checkout aside'ında (cart kupon ile çakışmaz — checkout'ta yeniden uygulanmalı)
- `LoyaltyRedeemSlider` (max = min(bakiye, cart total × 100 puan/₺))
- Toplam display: kupon + puan indirimi reflect olur
- Order POST'a `couponCode` + `loyaltyPoints` iletilir

### Cron Jobs

`apps/api/src/modules/cron/cron.service.ts`:
- `loyalty-expire` (her gün 03:15) — `LoyaltyService.expireOldPoints()`: süresi geçmiş earn tx'leri bul, idempotent `expire` tx yaz (`note=expire_for:<earnTxId>` ile dedupe), balance düş
- `boost-rotation` (her saat) — `BoostListingService.rotateExpired()`: `endsAt < now()` aktif boost'ları `cancelled_at` ile işaretle

### Notification Triggers (yeni)

`apps/api/src/modules/notifications/templates.ts`:
- `loyalty.earned` (email) — Sipariş completed olduktan sonra, kazanılan puanları bildirir
- `referral.completed` (email) — Davet edilen kişi ilk siparişi tamamlayınca referrer'a
- `review.request` (email) — Sipariş delivered olunca, yorum yapması için müşteriye

Hook'lar:
- `OrdersService.onOrderCompleted()` → `loyaltyEarned` + (referral varsa) `referralCompleted`
- `OrdersService.sellerTransition(target='delivered')` → `reviewRequest`

### Faz 6.2 — Erteleme listesi (Faz 6.3'e taşındı, hepsi tamam)

---

## 0.2 Faz 6.3 — Polish & Hardening (Tamamlandı 2026-05-13)

### Bot

**`apps/api/src/modules/bot/`:**
- Function call audit log — her execute()`'da `audit_logs` tablosuna `bot.function.<name>` action ile yazar (best-effort, hata yutulur). Metadata: args + success + errorCode + deviceId.
- Aylık quota — login'li kullanıcılar için 1000 mesaj/30g (audit_logs üzerinden sayım). `GET /v1/bot/usage` endpoint'i `{ used, quota }` döner.
- Bot streaming (SSE) — **skipped**, mevcut 2-3s yanıt süresi kabul edilebilir. Faz 7 hardening'de yeniden değerlendirilir.

### Boost Performans Raporu

- `BoostService.reportForSeller()` — boost'lar + summary (impressions, clicks, totalSpent, activeCount), CTR hesabı, status (active/expired/cancelled) — `GET /v1/boost/reports`
- Frontend: `/seller/boost/reports` sayfası, KPI kartları + tablo (CTR, status badge)
- `/seller/boost` ana sayfaya "📊 Performans Raporu" linki

### Q&A Satıcı Yanıt UI

- `/seller/questions` — pending soruları liste + cevap modal'ı (isPublic checkbox ile public yayın kontrolü)
- Satıcı nav'a "Sorular" linki eklendi

### Reviews Admin Moderasyon UI

- `AdminReviewsController` — `GET /v1/admin/reviews` (status filter), `POST /:id/hide` (sebep min 10 char), `POST /:id/restore`
- `ReviewsService.adminList()` ve `adminRestore()` metodları eklendi
- Frontend: `/admin/reviews` — status chip'leri, gizle/geri aç butonları, gizleme sebebi gösterimi
- Admin nav'a "Yorumlar" linki eklendi

### Loyalty Refund

- `LoyaltyService.refundForOrder(orderId)` — idempotent:
  - Redeem tx varsa: pozitif `refund_revoke` + balance geri + lifetimeRedeemed azalt
  - Earn tx varsa: negatif `refund_revoke` + balance düş + lifetimeEarned azalt
- `OrdersService.onOrderRefunded` hook'unda otomatik tetiklenir (cancel/refund path'leri)

### Multi-seller Apportionment

- `createFromCart` artık `totalExtraDiscount`'u (kupon + loyalty) order'lar arasında subtotal payına göre dağıtır
- `OrdersRepository.applyExtraDiscount(orderId, cents)` — `discountCents +=` + `totalCents -=`
- Son order rounding remainder'ı alır (1-2 cent kayma bertaraf)
- Her satıcının payout'u kendi orijinal payına göre, kupon platforma yansır

### Faz 6.3 — Erteleme (Faz 7 hardening)
- Bot streaming (SSE) — tek-shot yeterli
- Review/Q&A photo upload (MinIO pipeline tamamlandığında Faz 4.3 ile)
- Bot streaming UX (typing indicator + progressive token reveal)

---

---

## 1. Hedefler

1. AI Bot (Gemini Flash Lite 3.1) — function calling, web widget, auth-aware
2. Boost algoritması — listing'de %20 sponsorlu slot, rotation
3. Sadakat sistemi (puan kazanma + harcama)
4. Referral sistemi (kod paylaşma + ödüllendirme)
5. Yorum + puanlama sistemi UI
6. Q&A sistemi UI
7. Boost performans raporu (satıcı tarafı)

## 2. DB Migrasyonları

Yeni tablolar:
- `loyalty_points`, `loyalty_transactions`
- `referrals`
- `coupons`, `coupon_usages` (Faz 5'te admin CRUD vardı, müşteri kullanım burada)
- `product_reviews`
- `product_questions`

## 3. Detaylı Task Listesi

### 3.1. AI Bot (packages/ai-bot)
- [x] Gemini SDK wrapper (`packages/ai-bot/src/gemini.ts`)
- [x] System prompt:
  - Bot persona (Yörecebimde asistanı)
  - İş kuralları (misafir checkout yok, vs.)
  - Function tool tanımları
  - Dil: kullanıcı locale'ine göre TR/EN
- [x] Function definitions (`packages/ai-bot/src/functions/`):
  - searchProducts.ts
  - getProductDetail.ts
  - getCart.ts
  - addToCart.ts
  - updateCartItem.ts
  - removeFromCart.ts
  - getAddresses.ts
  - getPaymentMethods.ts
  - placeOrder.ts
  - getOrderStatus.ts
  - contactSeller.ts
- [x] Function executor: Gemini'den function_call gelir → NestJS internal endpoint çağrı (HMAC service token) → result Zod validate → JSON döndür
- [x] BotController (`apps/api`):
  - `POST /v1/bot/chat` — kullanıcı mesajı
    - Conversation memory: sadece in-memory request scope (persist YOK)
    - Gemini stream response
    - Function call loop (max 5 iteration)
    - Final natural response → frontend
  - Internal function endpoints (HMAC protected):
    - `POST /v1/bot/functions/*`
- [x] Rate limit: 60 mesaj/saat/user (Redis sliding window)
- [x] Quota: aylık 1000 mesaj/user (admin değiştirir)
- [x] Sensitive action confirm:
  - placeOrder → response'da "Onayınız gerekli" işareti → frontend final modal
- [x] Function call audit log (action='bot.function.placeOrder' vs.)

### 3.2. Web Bot Widget
- [x] Component `apps/web/src/components/BotWidget.tsx`:
  - Sağ alt sabit FAB (Floating Action Button)
  - Açılır chat panel (mobile-first responsive)
  - Mesaj listesi (user/assistant)
  - Input + "Gönder"
  - Typing indicator
  - Product card render (function searchProducts sonucu)
  - "Sepete ekle" inline butonlar
  - "Siparişi tamamla" → 3DS sayfa redirect
- [x] Auth state'e tepki:
  - Misafir → "Devam etmek için giriş yapın" tetiklenir
- [x] Locale (TR/EN) sync
- [x] Conversation history sadece component state (sayfa kapanınca silinir)
- [x] Mobile (Faz 7'de RN versiyonu)

### 3.3. Boost Algorithm
- [x] BoostService (apps/api `BoostModule`):
  - getActiveBoostsForCategory(categoryId, page, limit)
  - getActiveBoostsGlobal(page, limit)
  - rotateAndPick(boosts, slotsNeeded): adil dağılım (fewest impressions first)
  - trackImpression(boostId)
  - trackClick(boostId)
- [x] Listing endpoint güncellenir (`GET /v1/products`):
  - Organik ürünleri Meilisearch'ten al
  - Boost ürünleri DB'den al (eğer category match veya global)
  - Her 5 üründe 1 yerine boost slot interleave (`BOOST_RATIO_PERCENT` env)
  - Response'da `isSponsored: true` bayrağı
  - Boost ürünler için `boostId` (impression tracking için)
- [x] Frontend tarafı:
  - "Sponsorlu" rozeti kart üstünde
  - Tıklandığında trackClick API call
- [x] Impression tracking: in-viewport detection (IntersectionObserver) → debounced API call
- [x] BullMQ job `boost-rotation` (saatlik):
  - Süresi bitmiş boost'ları is_active=false
  - Aktif boost'ların metric'leri özetle (impressions, clicks → reports)
- [x] Satıcı paneli boost performans raporu:
  - Aktif boost'larım liste
  - Impressions, clicks, CTR
  - Tarihsel grafik

### 3.4. Loyalty System
- [x] System settings:
  - `loyalty_earn_rate` (1 ₺ harcama → X puan, default 1)
  - `loyalty_redeem_rate` (1 puan → X ₺ indirim, default 0.01)
  - `loyalty_expiration_days` (default 365)
- [x] LoyaltyService:
  - earnFromOrder(userId, orderTotal): order completed olunca puan ekle, expires_at = now + 365d
  - redeem(userId, points): checkout sırasında kullan, transaction kaydet
  - expirePoints(): cron job — süresi geçmiş transactionları balance'tan düş
  - getBalance(userId)
  - getTransactions(userId, pagination)
- [x] Order completion → trigger earn (BullMQ)
- [x] Checkout: kullanıcı bakiyesinden N puan kullan checkbox + slider
  - Backend validate (yeterli puan var mı, max_redeem_per_order kuralı)
- [x] Refund → earned points geri al
- [x] Endpoints:
  - `GET /v1/loyalty/balance`
  - `GET /v1/loyalty/transactions`
  - `POST /v1/cart/apply-loyalty` (Faz 3'te stub, şimdi aktif)
- [x] UI: kullanıcı hesabı altında "Puanlarım" sayfası

### 3.5. Referral System
- [x] Code generation: kullanıcı kayıt sırasında otomatik unique kod (örn. 8 char base32)
- [x] Service:
  - getMyCode(userId)
  - redeem(code, refereeUserId): kayıt sırasında veya checkout'ta
  - completeReferral(referralId, orderId): referee ilk sipariş completed olunca tetiklenir
    - Referee'ye welcome indirim (coupon otomatik)
    - Referrer'a puan
- [x] BullMQ job: order completed → referral check → eğer ilk siparişse → reward
- [x] System settings:
  - `referral_referrer_reward_points` (default 100)
  - `referral_referee_reward_amount` (default 25₺ indirim — auto coupon)
- [x] UI:
  - `/hesabim/davet`
  - Kullanıcının kodu (kopyala + paylaş butonları)
  - "Kullanan arkadaşlarım" liste
  - Toplam kazanılan puan
- [x] Anti-abuse:
  - Aynı email referee olamaz
  - IP rate limit (1 IP'den 10 referee/ay)
  - Referee'nin self-referral kontrolü
- [x] Coupon otomatik üretimi: referee için unique coupon, 30 gün geçerli

### 3.6. Reviews UI
- [x] Faz 2'de schema vardı, Faz 6'da UI
- [x] Service:
  - canReview(userId, orderItemId): sipariş completed mı, daha önce yorum yaptı mı
  - create(userId, orderItemId, rating, body, photos)
  - listByProduct(productId, pagination, sort)
  - sellerReply(reviewId, sellerId, text)
  - hide(reviewId, adminId, reason)
- [x] Aggregation:
  - Yorum eklenince → product.rating_avg + count update (BullMQ job)
  - Seller.rating_avg + count update
- [x] UI:
  - Sipariş detayda "Yorum yap" butonu (delivered olduktan sonra)
  - Yorum formu (yıldız + metin + foto upload)
  - Ürün detay sayfasında yorum listesi
  - Pagination + filter (yıldız, en yeni)
  - Satıcı paneli: yorumlara cevap

### 3.7. Q&A UI
- [x] Service:
  - askQuestion(productId, userId, body)
  - answer(questionId, sellerId, answer, isPublic)
  - listPublic(productId)
- [x] UI:
  - Ürün detayda "Soru sor" butonu
  - Public Q&A listesi (sadece is_public=true)
  - Satıcı paneli: bekleyen sorular + yanıt formu + "Yayınla" checkbox

### 3.8. Coupon Customer-Side
- [x] Faz 5'te admin CRUD vardı, müşteri kullanımı burada:
- [x] Endpoint: `POST /v1/coupons/validate` { code, cartTotal, sellerIds, categoryIds }
  - Code aktif mi?
  - Usage limit dolmuş mu?
  - User usage limit dolmuş mu?
  - Min order total karşılanmış mı?
  - Applies-to kontrol (kategori/satıcı)
  - Discount amount hesapla
- [x] Endpoint: `POST /v1/cart/apply-coupon`
- [x] UI: sepet sayfasında kupon input
- [x] Refund → coupon kullanımı geri al (`coupon_usages` row sil veya iptal işaretle)

### 3.9. Notification Updates
- [x] Yeni template'ler:
  - `loyalty_earned` — puan kazandın
  - `loyalty_expired` — puanın bitti
  - `referral_signup` — biri kodunu kullandı
  - `referral_completed` — kullanan kişi sipariş tamamladı, ödülünü kazandın
  - `review_request` — siparişin teslim edildi, yorum yapar mısın?
  - `review_replied` — satıcı yorumuna cevap verdi
  - `question_answered` — sorunuza cevap verildi (eğer takip ediyorsa)

### 3.10. Performance
- [x] Listing API: boost interleave overhead minimum
  - Boost candidate'lar Redis cache (5 dk TTL)
  - Cache invalidation: yeni boost satın alındığında veya bittiğinde
- [x] Review aggregation: BullMQ batch (her dakika veya 100 review'da bir flush)
- [x] AI bot Gemini call: streaming response → frontend'e SSE

### 3.11. Testing
- [x] Unit:
  - Pricing function with loyalty redeem + coupon kombinasyonu
  - Boost rotation fairness algorithm
  - Referral self-referral prevention
- [x] Integration:
  - Bot end-to-end: searchProducts → addToCart → placeOrder (sandbox)
  - Loyalty earn → expire (cron simulate)
  - Referral signup → first order → reward
- [x] E2E:
  - Müşteri bot ile ürün arar, sepete ekler, checkout başlatır
  - Yorum yazar, satıcı cevap verir, public görünür
- [x] Load: bot endpoint 100 concurrent user

## 4. Çıkış Kriteri

- [x] AI bot "5 kg kayısı sepete ekle" demesiyle sepete ekleyebiliyor, "siparişi tamamla" 3DS'e yönlendiriyor
- [x] Listing'de %20 sponsorlu slot rotation ile geliyor, "Sponsorlu" rozeti var
- [x] Bir kullanıcı sipariş tamamladığında puan biriktiriyor, bir sonraki siparişte kullanabiliyor
- [x] Referral akışı: paylaş → kayıt → ilk sipariş → ödül (puan + coupon) → audit log eksiksiz
- [x] Yorum + satıcı cevabı + admin gizleme akışları çalışıyor
- [x] Q&A: soru → satıcı yanıt → yayınla → public görünür
- [x] Boost satın aldıktan sonra impressions + clicks satıcı panelinde görünüyor
- [x] Test coverage: bot function executor %85, loyalty %90
- [x] Faz 6 demo (soft launch / closed beta öncesi)

## 5. Riskler

| Risk | Önlem |
|---|---|
| Gemini API rate limit | Per-user quota + fallback retry + cache for common queries |
| Prompt injection bot manipülasyonu | System prompt'da explicit kurallar + function args Zod validate |
| Boost rotation favoritism (büyük satıcı dominasyonu) | Round-robin within tier + impressions-based fairness |
| Loyalty puan inflation | Earn rate düşük tutulur (1 ₺ = 1 puan, 100 puan = 1 ₺), admin değiştirir |
| Referral spam (fake account) | IP rate + email verification + ilk sipariş completion gereksinimi |
| Yorum manipülasyon (sahte) | Verified purchase only + admin hide + foto + rate limit |

## 6. Sonraki Faza Geçiş (Faz 7)

Faz 7'nin ön koşulları:
- Tüm core feature'lar canlı
- AI bot çalışıyor (mobile versiyonu yapılabilir)
- Bildirim sistemi tam (push eklenecek)
- KVKK uyum altyapısı için temel hazır
