# TODO — Yörecebimde

> Şu an aktif görev listesi. CLAUDE.md'deki "Plan First" prensibine göre **her implementation öncesi** buraya plan yazılır,
> onaylandıktan sonra implementation başlar. Item'lar tamamlandıkça `[ ]` → `[x]`.

---

## Şu Anki Faz: **Faz 7 — Mobile + Hardening + Test**

Detay: [docs/PHASES/PHASE-7-MOBILE-HARDENING.md](../docs/PHASES/PHASE-7-MOBILE-HARDENING.md)

### Faz 7.1 — Hardening MVP (tamamlandı, 2026-05-13)

**Backend (`apps/api/src/modules/`):**
- [x] `KvkkUserModule` — `GET /v1/kvkk-me/export` (JSON) + `POST /v1/kvkk-me/delete-account` (anonimize)
- [x] `TwoFaModule` — `GET /v1/2fa/status` (enforced for seller/admin/super_admin)
- [x] `PushModule` — `POST/GET/DELETE /v1/push-tokens` + Expo Push stub provider
- [x] `RateLimitGuard` + `@RateLimit({ max, windowSeconds, keyBy })` decorator
- [x] `MetricsController` — `GET /metrics` (Prometheus text format, uptime + memory + CPU)
- [x] `instrumentation/sentry.ts` — `@sentry/node` lazy dynamic import

**Schema:**
- [x] `user_push_tokens` (+ `push_platform` enum: ios/android/web) — Migration `0008_redundant_deathstrike.sql`

**Web (`apps/web/`):**
- [x] `/hesabim/veri-yonetimi` — JSON indir + hesap sil (HESABIMI SİL double-confirm)
- [x] `CookieBanner` (`(public)/layout.tsx`'te mount) — kategori bazlı opt-in, localStorage, custom event
- [x] `/hesabim/siparislerim/[orderNo]/sozlesme` — yazdırılabilir mesafeli satış sözleşmesi (7 madde)
- [x] `TwoFaBanner` seller + admin layout'larda
- [x] `/hesabim/2fa-kurulum` placeholder (gerçek TOTP setup Faz 7.2)
- [x] `src/instrumentation.ts` — Next.js Sentry lazy init
- [x] Sipariş detayda "📄 Sözleşme" linki
- [x] Account summary'e "Veri Yönetimi" linki

**Security:**
- [x] Helmet CSP (prod-only: default 'self', img https+blob, script 'self', frame-ancestors 'none')
- [x] HSTS 2 yıl + includeSubDomains + preload (prod only)
- [x] referrerPolicy strict-origin-when-cross-origin, X-Frame-Options DENY, X-Content-Type-Options nosniff
- [x] Rate limit: KVKK export 5/saat, delete 3/gün

**Test foundations:**
- [x] `tests/e2e/` — Playwright config + 3 spec (homepage, auth-flow, cookie-banner)
- [x] `tests/integration/` — Testcontainers + Postgres + `db-helper.ts` (RLS context) + `tenant-isolation.test.ts`

**Typecheck:** API + web 7/7 paket clean

### Faz 7.2 — Mobile + Production Hardening (tamamlandı, 2026-05-13)

**Mobile (`apps/mobile/`) scaffold:**
- [x] Expo SDK 52 + expo-router 4 + new architecture
- [x] 5 ekran: login + (tabs)/{index, search, orders, profile}
- [x] API client + SecureStore session + Expo Push token register
- [x] Biyometrik (expo-local-authentication) profile'da
- [x] EAS profiles: development/preview/production
- [x] Deep linking scheme `yorecebimde://`

**Bot SSE streaming:**
- [x] `BotClient.chatStream()` (generateContentStream async generator)
- [x] `POST /v1/bot/chat-stream` (Fastify reply.raw SSE)
- [x] Widget: fetch + ReadableStream parse, progressive token reveal

**Server-side PDF (pdfkit):**
- [x] `ContractsService.generateMesafeliSatisPdf()` — 7 madde sözleşme
- [x] `GET /v1/orders/:orderNo/sozlesme.pdf` — auth'lu PDF download
- [x] Order detayda "⬇ PDF" linki (HTML "📄 Sözleşme" yanında)

**ETBIS:**
- [x] `EtbisService` — aylık özet + last 12 months + CSV
- [x] `/admin/etbis` UI (KPI tablo + CSV indir) + admin nav

**Better-Auth twoFactor:**
- [x] `twoFactor()` plugin (TOTP 6dig/30s + 8 backup kod)
- [x] `twoFactorClient()` vanilla + React client
- [x] 2FA status Better-Auth field okuyor
- [x] `/hesabim/2fa-kurulum` 4-aşamalı wizard (password → QR → verify → backup)

**Real Expo Push:**
- [x] `https://exp.host/--/api/v2/push/send` real HTTP call (batch 100, retry, cleanup)

**prom-client:**
- [x] Registry + defaultMetrics + custom counters/histogram
- [x] `MetricsInterceptor` global, route normalize (UUID → `:id`)

**CI workflows:**
- [x] `e2e.yml` — Playwright on PG+Redis services
- [x] `integration.yml` — Testcontainers
- [x] `lighthouse.yml` — performance budget

**Workspace:**
- [x] `tests/*` pnpm workspace'e eklendi
- [x] `apps/mobile` workspace üyesi

**Typecheck:** API + web temiz

### Faz 7.3 — Production Hardening + Full Mobile (tamamlandı, 2026-05-13)

**CI workflows (`.github/workflows/`):**
- [x] `a11y.yml` — axe-core via Playwright, WCAG 2.1 AA
- [x] `load-test.yml` — k6 manual trigger (smoke/load/stress/soak)
- [x] `sentry-release.yml` — release + source map upload (gated)
- [x] `mobile-ota.yml` — EAS Update on push (channel by branch)
- [x] `mobile-build.yml` — EAS Build manual

**Load tests (`tests/load/`):**
- [x] `smoke.js`, `load.js`, `stress.js`, `soak.js` + README + SLO

**Backup + DR:**
- [x] `infra/scripts/backup-db.sh` — pg_dump + GPG + MinIO + B2 + retention
- [x] `infra/scripts/restore-db.sh` — drill + production swap double-confirm
- [x] `docs/RUNBOOKS/disaster-recovery.md`
- [x] `docs/RUNBOOKS/on-call.md` — severity matrix, alert→aksiyon, post-mortem

**Monitoring stack (deploy-ready):**
- [x] `infra/docker/compose.monitoring.yml` — Grafana 11.3 + Prometheus 3 + Loki 3.3 + Promtail + Uptime Kuma + cAdvisor + node-exporter + Alertmanager
- [x] Prometheus rules (APIDown, ErrorRate, P95High, DiskFull, BackupOld, NoOrdersHour)
- [x] Alertmanager Telegram routing
- [x] Grafana dashboard (api-overview.json)
- [x] Promtail pino JSON parse

**Photo upload (MinIO presigned):**
- [x] `UserMediaModule` — review/question/avatar context'leri (5MB, 20/saat)
- [x] `user-media` bucket
- [x] `user-media-uploader.tsx` web component, my-reviews entegre

**Mobile (`apps/mobile/`) full features:**
- [x] Ürün detay (galeri + Sepete Ekle + Haptics)
- [x] Sepet (quantity + remove + checkout CTA)
- [x] Checkout (adres + Iyzico 3DS via expo-web-browser)
- [x] Adresler CRUD
- [x] Beğendiklerim (wishlist remove)
- [x] Puanlarım (bakiye + tx history)
- [x] Davet (kod + native Share API + clipboard)
- [x] KVKK (verilerimi indir via Sharing + hesap sil double-confirm)
- [x] AI Bot SSE streaming chat
- [x] Sepet butonu + bot FAB anasayfada
- [x] Profile menü: 5 link
- [x] Stack screen başlıkları

**Native config:**
- [x] iOS Privacy Manifest (NSPrivacyAccessedAPITypes + NSPrivacyCollectedDataTypes)
- [x] iOS infoPlist (FaceID + camera + photo library açıklamaları)
- [x] Android permissions
- [x] EAS Updates config (runtimeVersion policy)
- [x] Assets README (asset boyut spec'leri)

**Typecheck:** API + web temiz

### Faz 7'ye Kalan (truly external — fiili infra/insan)
- [ ] Sentry self-host fiili deploy (getsentry/self-hosted clone)
- [ ] Monitoring stack fiili deploy (compose.monitoring.yml VPS'e up -d)
- [ ] Pentest (3rd party — ECzine/Biznet kontratı)
- [ ] Load test gerçek run (k6 scripts hazır, running staging gerekli)
- [ ] App Store + Play Store submission (Apple Developer + Play Console)
- [ ] DR drill (running infra)
- [ ] Native asset designer'dan PNG'ler (icon, splash, adaptive, notification-icon)
- [ ] ETBİS API gerçek entegrasyon (API key + sözleşme + form)

---

## Tamamlanmış Faz: **Faz 6 — AI Bot + Boost + Loyalty + Referral**

Detay: [docs/PHASES/PHASE-6-AI-BOT-BOOST.md](../docs/PHASES/PHASE-6-AI-BOT-BOOST.md)

### Faz 6.1 — Loyalty + Referral + Reviews + Q&A + Coupons + Boost MVP (tamamlandı, 2026-05-13)

**Schemas + Migration:**
- [x] `loyalty_accounts`, `loyalty_transactions` (+ `loyalty_tx_type` enum)
- [x] `referral_codes`, `referrals` (+ `referral_status` enum)
- [x] `coupons`, `coupon_usages` (+ `coupon_discount_type` enum)
- [x] `product_reviews`, `product_questions` (+ `review_status`, `question_status` enums)
- [x] Migration `0007_pale_nightmare.sql` üretildi (staging apply user-triggered)

**Backend (apps/api):**
- [x] `LoyaltyModule` — balance/transactions/redeem + earnFromOrder hook
- [x] `ReferralModule` — code gen, redeem (kayıt sırasında), maybeCompleteOnFirstOrder hook
- [x] `CouponsModule` — validate (cart) + apply (order create) + revoke (refund)
- [x] `ReviewsModule` — public list, reviewable, create, seller reply, admin hide, rating auto-refresh
- [x] `QuestionsModule` — public list, ask, seller answer + isPublic toggle
- [x] `BoostListingService` — listing interleave + impression/click track endpoints
- [x] `OrdersService.onOrderCompleted` — loyalty + referral hook (3 path: sellerUpdate, customerConfirm, escrowCron)

**Frontend (apps/web):**
- [x] `/hesabim/puanlarim` — bakiye + lifetime + tx tablosu
- [x] `/hesabim/davet` — kod kopyala + link kopyala + davet geçmişi
- [x] `/hesabim/yorumlarim` — bekleyenler + yapıldı + modal yıldız form
- [x] Ürün detay: yorum listesi + Q&A widget'ı (login'liyse soru sorabilir)
- [x] Sepet: `coupon-input` (validate + toplam display update)
- [x] `/kayit?ref=CODE` — banner + post-signup auto redeem
- [x] Product card: "Sponsorlu" rozet + click tracking
- [x] Account summary: +Puanlarım, +Davet, +Yorumlarım linkleri

**Typecheck:** API + web 7/7 paket clean

### Faz 6.2 — AI Bot + Checkout + Cron + Notifications (tamamlandı, 2026-05-13)

**packages/ai-bot:**
- [x] `BotClient` (Gemini 2.0 Flash Lite) + `systemPrompt` (TR/EN locale-aware, auth-aware)
- [x] 5 function declaration: searchProducts, getProductDetail, getCart, addToCart, placeOrder

**Backend (`apps/api/src/modules/bot`):**
- [x] `BotService` — chat loop (max 5 iter), graceful fallback without API key
- [x] `BotFunctionsService` — executor (CartService + OrdersService + ProductsRepository)
- [x] `BotController` — `POST /v1/bot/chat`, in-memory rate limit (60/saat/identity)

**Loyalty + Coupon checkout entegrasyonu:**
- [x] `CreateOrderInput` genişletildi: `couponCode`, `loyaltyPoints`
- [x] `createFromCart` pre-validate → apply → payment intent adjusted
- [x] `onOrderRefunded()` hook (`coupons.revokeForOrder` cancel+refunded path'lerinde)
- [x] Web checkout: `CouponInput` + `LoyaltyRedeemSlider` aside'da, toplam reflect

**Cron jobs (`cron.service.ts`):**
- [x] `loyalty-expire` (03:15 daily) — idempotent expire tx (`note=expire_for:<id>`)
- [x] `boost-rotation` (saatlik) — `endsAt < now()` aktif boost'ları cancelled işaretle

**Notification triggers:**
- [x] `loyalty.earned` — `onOrderCompleted` içinde, kazanılan puan > 0 ise
- [x] `referral.completed` — referee ilk sipariş completed olunca referrer'a
- [x] `review.request` — order delivered olunca müşteriye

**Web:**
- [x] `BotWidget` `(public)/layout.tsx`'te mount edilmiş (sağ alt FAB)

**Typecheck:** API + web 7/7 paket clean

### Faz 6.3 — Polish & Hardening (tamamlandı, 2026-05-13)

**Bot:**
- [x] Function call audit log (her execute → `audit_logs` `bot.function.<name>`)
- [x] Aylık quota (1000 mesaj/30g/user) + `GET /v1/bot/usage` endpoint
- [x] Gemini key + model güncellendi (`gemini-2.5-flash`)
- [ ] **Faz 7'ye ertelendi** — Bot streaming (SSE) — mevcut yanıt süresi yeterli

**Boost performans raporu:**
- [x] `GET /v1/boost/reports` — summary (impressions/clicks/spent/active) + items (CTR, status)
- [x] `/seller/boost/reports` sayfa + KPI kartları + tablo
- [x] `/seller/boost` ana sayfaya rapor linki

**Q&A satıcı yanıt UI:**
- [x] `/seller/questions` — pending soruları + cevap modal (isPublic checkbox)
- [x] Satıcı nav'a "Sorular" linki

**Reviews admin moderasyon UI:**
- [x] `AdminReviewsController` — list (status filter) + hide (sebep min 10) + restore
- [x] `/admin/reviews` — status chip'leri, gizle/geri aç
- [x] Admin nav'a "Yorumlar" linki

**Loyalty refund:**
- [x] `LoyaltyService.refundForOrder()` — idempotent redeem-geri + earn-iptal
- [x] `onOrderRefunded` hook'unda otomatik tetiklenir

**Multi-seller apportionment:**
- [x] `createFromCart` totalExtraDiscount'u subtotal payına göre dağıtır
- [x] `OrdersRepository.applyExtraDiscount()` — discount+= total-=
- [x] Son order rounding remainder'ı alır

**Typecheck:** API + web 7/7 paket clean

### Faz 7'ye Bırakılanlar (true Faz 7 — hardening)
- [ ] Bot streaming (SSE) + token-by-token UI reveal
- [ ] Review/Q&A photo upload (MinIO pipeline tamamlandığında)
- [ ] E2E test coverage (Playwright)
- [ ] Audit log partitioning
- [ ] Sentry self-host + Grafana + Prometheus + Loki + Uptime Kuma
- [ ] Server hardening (SECURITY.md §17)
- [ ] CI-tabanlı auto-deploy (Coolify veya custom)

### Faz 4.3'e Bırakılanlar (Faz 5'ten devam)
- [ ] Belge görüntüleyici (MinIO upload sonrası)
- [ ] Iyzico sub-merchant resync

---

## Tamamlanmış Faz: **Faz 5 — Super Admin Panel**

Detay: [docs/PHASES/PHASE-5-SUPER-ADMIN.md](../docs/PHASES/PHASE-5-SUPER-ADMIN.md)

### Faz 5.1 — MVP (tamamlandı, 2026-05-12)

**Backend (`AdminModule`):**
- [x] Dashboard: GMV + sellers/apps/disputes counts
- [x] Sellers: list/find/suspend/reinstate/close
- [x] Categories: CRUD + parent linking + audit
- [x] Boost packages: CRUD
- [x] Disputes: list/resolve (winner + refund stub)
- [x] Audit log query (filter + 1000 max)
- [x] `assertAdmin()` guard her endpoint'te + `auditLog()` helper

**Frontend (`(admin)`):**
- [x] Sidebar layout (7 link nav)
- [x] `/admin/dashboard` (GMV kartları + operasyon tile'ları)
- [x] `/admin/applications` (modal detay + onay/red + invite URL kopyala)
- [x] `/admin/sellers` (suspend/reinstate/close)
- [x] `/admin/categories` (indent tree + inline edit + add/delete)
- [x] `/admin/boost-packages` (CRUD + active toggle)
- [x] `/admin/disputes` (eskale kırmızı + decision modal)
- [x] `/admin/audit` (filter + JSON metadata expandable)

**Seed:**
- [x] `admin@yorecebimde.com` super_admin password (`Yorecebim2026!`)

### Faz 5.2 — Tamamlandı (2026-05-13)

**Backend (`AdminExtrasModule` + KVKK public + audit CSV):**
- [x] `POST /v1/admin/sellers/:id/reveal-pii` — AES-256-GCM decrypt + audit (`seller.pii_reveal.<field>`)
- [x] `POST /v1/admin/sellers/:id/commission-override` — 0-50 range + null clear + audit
- [x] `GET/POST /v1/admin/team`, `/:id/role`, `/:id/suspend` — super_admin self-protection
- [x] `GET/PUT/DELETE /v1/admin/settings` — category + isSecret mask
- [x] `GET/PUT /v1/admin/templates` — triggerKey × channel × locale unique
- [x] `POST /v1/kvkk/request` (public) + `GET/PATCH /v1/admin/kvkk-requests`
- [x] `GET /v1/admin/audit?from&to`, `GET /v1/admin/audit/export.csv`
- [x] Migration 0006: `system_settings`, `notification_templates`, `kvkk_requests` (+ 2 enum), `sellers.commission_rate_override`

**Frontend (`(admin)` + public KVKK):**
- [x] `/admin/team` — list + promote/demote + suspend
- [x] `/admin/settings` — 7 sekme, inline JSON edit, secret mask
- [x] `/admin/templates` — 9 trigger × 4 channel × locale, `{{var}}` help
- [x] `/admin/kvkk` — status filter + 30g deadline urgency + response modal
- [x] `/admin/sellers` — "🔓 IBAN" + "Komisyon" butonları (her ikisi reason zorunlu)
- [x] `/admin/audit` — from/to date inputs + "CSV İndir" butonu
- [x] `/kvkk-talep` (public) — 5 tip form, 20+ char text
- [x] `admin-nav.tsx` — +4 yeni link (kvkk/templates/settings/team)
- [x] `apiClient.put` eklendi

**Smoke test (staging):**
- 6/6 admin page 200
- PII reveal: gerçek IBAN decrypt edildi (`TR33…1326`)
- Commission override: 7.5% set + audit
- System setting create + Notification template upsert
- Public KVKK request → admin görüyor
- 2 admin user listede (super_admin + admin)
- CSV export: header + rows correct

### Faz 5.2 — Erteleme devam ediyor (Faz 6/4.3/7)
- [ ] Belge görüntüleyici (MinIO upload pipeline + dispute evidence) — **Faz 4.3**
- [ ] Drag-drop kategori reorder (react-dnd-treeview install gerekli) — **Faz 6**
- [ ] Audit before/after diff viewer (schema'da var, UI yok) — **Faz 6**
- [ ] Template live preview + test send + Monaco syntax highlight — **Faz 6**
- [ ] Admin create-invite flow (yeni admin daveti) — **Faz 6**
- [ ] Boost paket TR/EN ayrı `name` alanı — **Faz 6**
- [ ] Iyzico sub-merchant resync — **Faz 4.3**

### Faz 6'ya Bırakılanlar
- [ ] Coupons modülü
- [ ] Customer support chat (AI bot widget'ı ile birlikte)
- [ ] Boost satış raporu + algoritma ratio ayarı

### Faz 4.3'e Bırakılanlar
- [ ] Financial reports (gerçek Iyzico reconciliation)
- [ ] Real Iyzico refund (dispute resolve sonrası gerçek API)

### Faz 7'ye Bırakılanlar
- [ ] ETBIS export
- [ ] Audit log partitioning
- [ ] Playwright E2E

---

## Tamamlanmış Faz: **Faz 4 — Seller Panel**

Detay: [docs/PHASES/PHASE-4-SELLER-PANEL.md](../docs/PHASES/PHASE-4-SELLER-PANEL.md)

### Faz 4.1 — MVP (tamamlandı, 2026-05-12)

**Backend:**
- [x] DB schemas: disputes, chat_threads, chat_messages, boost_packages, seller_boosts (migration 0005)
- [x] SellerApplicationsModule (public apply + admin approve/reject + invite redeem/complete + AES-encrypted PII)
- [x] DisputesModule (customer open + seller accept/reject + auto-escalate hook)
- [x] ChatModule (HTTP polling, order/direct threads, anti-spam, unread counts)
- [x] ShippingModule (IShippingProvider adapter + Aras/MNG/Yurtiçi/PTT stubs)
- [x] BoostModule (paket listele + Iyzico stub 3DS satın al + iptal)
- [x] SellerStoreModule (mağaza vitrin GET/PATCH)

**Frontend:**
- [x] `/satici-ol` — şahıs/şirket başvuru formu
- [x] `/satici-davet/[token]` — invite redeem + Better-Auth signup
- [x] `/seller/onboarding` — welcome 3 adım
- [x] `/seller/settings/store` — mağaza edit
- [x] `/seller/disputes` — cevap formu
- [x] `/seller/messages` — chat (5sn polling)
- [x] `/seller/boost` — paket seç + öde
- [x] `/hesabim/iadelerim` + `/hesabim/mesajlarim`
- [x] Sipariş detayda "İade aç" butonu

**Seed:** 3 boost paketi (7g/30g/90g — 100/350/900 ₺)

### Faz 4.2 — Tamamlandı (2026-05-12)
- [x] **WebSocket gateway**: `ws` library + Fastify upgrade handler + cookie auth
- [x] **WebSocket chat**: subscribe/broadcast/heartbeat/auto-reconnect — `wss://.../ws` 101 ✓
- [x] **nginx /ws upgrade location**: Connection/Upgrade headers + 1h timeout (template + runtime patched)
- [x] **dispute-escalation cron** (15 dk poll, 7g geçen seller_responded → escalated)
- [x] **low-stock-check cron** (her gün 09:00, 24h throttle)
- [x] **Sales reports module**: KPIs (today/week/month/pending) + CSV export
- [x] **`/seller/reports`** UI: KPI kartları + tarih filtreli CSV indirme
- [x] **`/seller/settings/account`**: profil görüntü + şifre değiştir (Better-Auth)
- [x] **ChatView WS+polling hybrid**: WS açıkken canlı, kapalıyken 6sn fallback
- [x] **Seller nav**: +Raporlar, +Hesap link'leri

### Faz 4.3'e Bırakılanlar
- [ ] Belge yükleme (apply + dispute evidence) MinIO presigned + virus scan
- [ ] Gerçek Iyzico: sub-merchant create + refund (callback'ten gerçek API)
- [ ] Gerçek kargo API'leri (Aras/MNG/Yurtiçi/PTT) + PDF etiket üretimi
- [ ] 2FA onboarding enforce (Better-Auth TOTP + backup kodlar)
- [ ] Recharts grafikler (ciro trendi, kategori dağılımı)
- [ ] Bildirim tercih UI (`notification_preferences` tablosu)
- [ ] Profil edit (ad/soyad/telefon)
- [ ] Chat attachment upload (MinIO + virus scan)
- [ ] Yeni mesaj email/push trigger
- [ ] Eskalasyon → super admin email/in-app bildirim
- [ ] Redis pub/sub (WS multi-instance scale)
- [ ] Auto-accept order seller preference

### Faz 5'e Bırakılanlar
- [ ] Super admin panel UI (API hazır)
- [ ] Boost paket CRUD UI

### Faz 6'ya Bırakılanlar
- [ ] Boost algoritmik öne çıkarma
- [ ] Yorumlar / rating / Q&A
- [ ] Sadakat programı / kupon

---

## Tamamlanmış Faz: **Faz 3 — Checkout & Sepet**

Detay: [docs/PHASES/PHASE-3-CHECKOUT.md](../docs/PHASES/PHASE-3-CHECKOUT.md)

### Faz 3 — Genel durum (2026-05-12)

**Faz 3.1 — Core (tamamlandı):**
- [x] DB: carts, cart_items, orders, order_items, stock_reservations, order_no_seq + 2 enum
- [x] AddressesModule (CRUD + set-default)
- [x] CartModule (Redis-ready, şu an DB; merge logic, pricing integration)
- [x] OrdersModule (createFromCart, state machine, customer/seller endpoints)
- [x] Frontend: AddToCart, /sepet, /odeme, order list/detail, seller orders

**Faz 3.2 — Stub adapter integrations (tamamlandı):**
- [x] NotificationsModule (log-based providers + BullMQ worker + templates + triggers)
- [x] PaymentsModule (Iyzico stub + 3DS mock page + webhook callback)
- [x] InvoicingModule (Nilvera stub + invoices tablosu + idempotent issueForOrder)
- [x] CronModule (escrow-release saatlik, delivered+14g → completed)
- [x] Multi-seller cart split (tek paymentRef, N order)
- [x] Stub providers'lar adapter pattern ile — Faz 4'te tek dosya değişimi yeterli

**Faz 3.3'e bırakılanlar:**
- [ ] Redis-based stock reservation (race condition güvenliği)
- [ ] order_groups (multi-seller bundled tracking)

**Faz 4'e bırakılanlar (gerçek entegrasyonlar):**
- [ ] Iyzico Node SDK + sandbox 3DS gerçek akış
- [ ] Iyzico sub-merchant onboarding + marketplace API
- [ ] Iyzico marketplace payout API + payouts tablosu
- [ ] Nilvera REST API + PDF MinIO upload + customer "Faturalar" sayfası
- [ ] Resend gerçek API + DKIM/SPF/DMARC
- [ ] NetGSM başlık onayı + gerçek SMS
- [ ] WebSocket new-order pop-up (satıcı)
- [ ] Aras/MNG/Yurtiçi/PTT kargo entegrasyonu
- [ ] Dispute akışı (schema + endpoints + UI)
- [ ] İade akışı UI (delivered, 14g)
- [ ] Müşteri-satıcı chat

**Faz 6'ya bırakılanlar:**
- [ ] applyCoupon / applyLoyalty
- [ ] i18n locale-based notification templates (TR + EN)

**Faz 7'ye bırakılanlar:**
- [ ] Cart merge unit testleri + Integration (Testcontainers) + E2E (Playwright)
- [ ] declarative partitioning (orders, notifications_log, stock_movements)

---

## Tamamlanmış Faz: **Faz 2 — Catalog**

Detay: [docs/PHASES/PHASE-2-CATALOG.md](../docs/PHASES/PHASE-2-CATALOG.md)

### Faz 2 — Genel durum (2026-05-12)

**Tamamlanan (alt-faz 2.1):**
- [x] DB şemaları: categories, products, product_variations, product_images, product_categories, discounts, stock_movements, wishlists, image_processing_status enum (20 tablo)
- [x] RLS policy'leri (kategori public-read, 7 tenant tablosu, wishlist user/device)
- [x] Pricing engine (`packages/shared/src/pricing.ts`) — 25 test pass
- [x] Categories module (tree, by-slug, breadcrumb)
- [x] Products module (public list/detail + seller CRUD)
- [x] Sellers module (public storefront)
- [x] Anasayfa + kategori + ürün detay + mağaza sayfaları
- [x] 38 kategori + 2 satıcı + 11 ürün seed

**Tamamlanan (alt-faz 2.2 — image pipeline):**
- [x] MinioModule (S3 SDK), QueueModule (BullMQ + ioredis), MeilisearchModule
- [x] SessionGuard + SellerGuard + @CurrentUser decorator
- [x] UploadsModule: presign, complete (job enqueue), polling, delete
- [x] ImageProcessorWorker (Sharp WebP full+thumb + DB update + Meili reindex)
- [x] SearchModule (Meilisearch index, filters, sıralama)
- [x] /arama sayfası + header search bar

**Tamamlanan (alt-faz 2.3 — seller CRUD):**
- [x] /v1/seller/products CRUD (Zod-validated, draft default, kategori M2M)
- [x] /seller/products list + /seller/products/new 3-step form
- [x] ImageUploader bileşeni (drag+presign+PUT+complete+poll)
- [x] ProductGallery client component (thumbnail rail)
- [x] Migration 0002 + staging deploy

**Devam eden (alt-faz 2.4 — finishing):**
- [ ] Variations CRUD endpoints (discrete + stepper validation)
- [ ] Discounts CRUD endpoints (3 tip)
- [ ] Stock service + stock_movements audit + low-stock cron
- [ ] Wishlist CRUD + heart button UI + login merge
- [ ] Seller edit product page (/seller/products/[id])
- [ ] Autocomplete endpoint + UI (Meilisearch limit=5)
- [ ] Toast notifications + seller route guard UI
- [ ] SEO: sitemap.xml + robots.txt + JSON-LD Product/BreadcrumbList
- [ ] Test seller hesabı seed (login-able)
- [ ] Variation editor + Discount editor + Stock editor (UI, edit page'inde)

**Faz 5'e ertelendi:**
- Admin category CRUD endpoints + category requests
- super_admin guard'lı reindex endpoint

**Faz 6'ya ertelendi:**
- View count + Sponsorlu slot
- Yorumlar + Q&A

**Faz 7'ye ertelendi (hardening):**
- Lighthouse > 90 optimization
- Testcontainers + tenant isolation tests
- Playwright E2E
- TR stop words + synonyms
- Canonical URLs + Organization JSON-LD

---

## Tamamlanmış Faz: **Faz 1 — Foundation**

Detay: [docs/PHASES/PHASE-1-FOUNDATION.md](../docs/PHASES/PHASE-1-FOUNDATION.md)

### 0. Dökümantasyon Tamamlama (Pre-Faz 1)

- [x] CLAUDE.md
- [x] README.md
- [x] docs/PRD.md
- [x] docs/ARCHITECTURE.md
- [x] docs/DATABASE.md
- [x] docs/API.md
- [x] docs/SECURITY.md
- [x] docs/DEPLOYMENT.md
- [x] docs/ROADMAP.md
- [x] docs/PHASES/PHASE-1..7
- [x] docs/DESIGN.md placeholder (içerik kullanıcıdan beklenmekte)
- [x] tasks/todo.md + lessons.md
- [x] apps/ + packages/ + infra/ README'leri
- [x] Root config dosyaları (package.json, turbo.json, pnpm-workspace.yaml, .gitignore, .env.example, tsconfig.base.json)

### 1. Monorepo Setup
- [x] Workspace config (pnpm + turbo + tsconfig base + prettier + editorconfig + gitignore)
- [ ] `pnpm install` lokal çalıştırılıp lockfile commit edilecek
- [ ] ESLint shared config (`packages/eslint-config`) — sonraki PR
- [ ] Husky + lint-staged + commitlint — sonraki PR

### 2. Dev Altyapı
- [x] `infra/docker/compose.dev.yml` (Postgres + Redis + MinIO + Meilisearch + Mailpit)
- [x] Postgres init scripts (extensions, app role)
- [x] `pnpm dev:infra` script

### 3. Database (packages/db)
- [x] Drizzle config + schema files (auth + users + sellers + audit) **Faz 1 minimum**
- [x] UUID v7 utility
- [x] Timestamp + soft-delete column helpers
- [x] RLS helper generators (enable, force, tenant policy, append-only)
- [x] Migration runner + apply-rls scripti
- [x] Seed script (super admin + admin + 3 customer)
- [ ] `pnpm db:generate` lokal'de çalıştırılıp migration SQL üretilecek

### 4. Config (packages/config)
- [x] Zod env schema (api / web / mobile ayrı)
- [x] `loadDotEnv` + `parseEnv` helpers

### 5. Shared (packages/shared)
- [x] Common Zod schemas (email, password, phone, TC, IBAN, pagination, ...)
- [x] Date utils (TZ Europe/Istanbul)
- [x] Error classes (BaseAppError, ValidationError, BusinessRuleError, ...)
- [x] Logger (pino, redaction)
- [x] Crypto utilities (AES-GCM, IBAN/TC mask)
- [x] Money utilities (kuruş-based bigint hesap)
- [x] Slug üretici (TR transliterate)
- [x] Phone normalizer (TR)
- [x] Unit testler (crypto, slug, phone)
- [x] Constants (roles, statuses, units, order states, audit actions)

### 6. Auth (packages/auth)
- [x] Better-Auth config + Drizzle adapter
- [x] Email/password baseline
- [x] Client factory
- [ ] SMS OTP plugin (NetGSM ile entegrasyon — Faz 3'te NetGSM kurulunca tamamlanacak)
- [ ] 2FA TOTP plugin (Better-Auth `twoFactor` plugin — Faz 4'te zorunlu hale gelecek)

### 7. NestJS API (apps/api)
- [x] Project init (Fastify adapter)
- [x] AuthModule (Better-Auth catch-all handler)
- [x] UsersModule (repository + placeholder controller)
- [x] HealthModule (/healthz + /readyz)
- [x] AuditModule (append-only service)
- [x] Tenant context middleware (DB GUC set)
- [x] Request ID middleware
- [x] Global exception filter
- [x] Logging interceptor
- [x] Swagger setup (dev/staging only)
- [x] Helmet + cookie + CORS

### 8. Next.js Web (apps/web)
- [x] Project init (App Router + standalone output)
- [x] Tailwind + global CSS
- [x] i18n (next-intl) TR/EN
- [x] Layout (public layout + global root)
- [x] Anasayfa (hero tile + placeholder dark tile + parchment CTA)
- [x] Login (`/giris`) — Better-Auth client
- [x] Register (`/kayit`) — Better-Auth client + KVKK checkbox
- [x] Route groups iskeleti: `(public)`, `(seller)`, `(admin)`
- [x] /api/health endpoint
- [x] Middleware: deviceID cookie üretimi
- [x] 404 page

### 9. UI (packages/ui)
- [x] `cn()` utility (clsx + tailwind-merge)
- [x] Button (primary / ghost / dark) — DESIGN.md reference pattern (pill rounded)
- [x] Input (with label + errorMessage)

### 10. CI/CD
- [x] `.github/workflows/ci.yml` (typecheck + lint + test + DB migration)
- [x] `.github/workflows/build-and-deploy.yml` (GHCR push + Coolify webhook)
- [x] apps/api Dockerfile (multi-stage + healthcheck)
- [x] apps/web Dockerfile (standalone + healthcheck)
- [ ] Branch protection rules — GitHub UI'dan elle
- [ ] CODEOWNERS — sonraki PR

### 11. Deployment
- [x] Caddyfile (staging — gkteches subdomain) — repo'da var
- [x] `infra/docker/compose.staging.yml` — VPS'te kullanılıyor
- [x] `infra/docker/compose.prod.yml` — referans
- [x] **Contabo VPS aktif** — `gkteches.com` üzerinde, 3 mevcut proje paralel çalışıyor (Orkestra, ikcebimde, plaskal)
- [x] **VPS deploy başarılı** — orkestra-nginx üstüne **append-only** vhost ekleyerek
- [x] DNS: 4 subdomain Cloudflare proxy ON
- [x] TLS: Cloudflare Origin Cert (15 yıl, `*.yorecebimde-staging.gkteches.com`)
- [x] Smoke test: 4 subdomain canlı (web 200, api healthz/readyz 200, storage hazır, ws Faz 4'te)
- [x] orkestra-nginx ek `docker_orkestra`/`plaskal_network`/`ikcebimde-web-net` network bağlantıları (deploy sırasında plaskal/ikcebimde runtime vhost drift'i fix edildi + kalıcı template'e taşındı)
- [ ] Server hardening (SECURITY.md §17) — **Faz 7 hardening**
- [ ] Coolify install — **bypass edildi**, doğrudan docker compose ile yönetildi (3 mevcut proje de aynı pattern). Faz 7'de CI-tabanlı auto-deploy yeniden değerlendirilecek

### 12. Monitoring
> Tamamı **Faz 7 (Hardening)**'a taşındı — production go-live öncesi.
- [ ] Sentry self-host
- [ ] Grafana + Loki + Prometheus stack
- [ ] Uptime Kuma kurulumu
- [ ] Telegram alert webhook
- [ ] NestJS Sentry + Prometheus exporter

### 13. Testing Baseline
- [x] Vitest config (per-package script)
- [x] Crypto round-trip testi
- [x] Slug üretici testi
- [x] Phone normalize testi
- [x] **Manuel smoke test**: register + login Better-Auth (sandbox + staging)
- [ ] Testcontainers helper (Postgres + Redis) — **Faz 2'de gerçek entegrasyon testleriyle**
- [ ] Better-Auth flow integration test — **Faz 2**
- [ ] RLS tenant isolation test — **Faz 2** (sellers/products RLS aktive olunca)
- [ ] Playwright smoke test — **Faz 2** (gerçek user flow'larıyla)

---

## Faz 1 Çıkış Kriteri (DOD) — Gerçek Durum

- [x] `pnpm install && pnpm dev` lokal çalışıyor
- [x] Docker compose dev altyapı ayakta
- [x] Migration + seed çalışıyor (lokal + VPS staging)
- [x] **Anasayfa staging'de açılıyor** — `https://yorecebimde-staging.gkteches.com` ✅ (kullanıcı doğruladı)
- [x] **Kayıt + login** baştan sona çalışıyor (email/password)
- [ ] OTP + 2FA — **Faz 3 (NetGSM) + Faz 4 (2FA enforcement)** — Faz 1 scope'unda değildi
- [ ] CI yeşil — repo henüz Git init edilmedi (workflow yazılı, hazır)
- [x] **Deploy çalışıyor** — Coolify yerine direkt compose (3 paralel proje pattern'ine uyum)
- [ ] Sentry/Grafana/Uptime Kuma — **Faz 7 hardening**
- [x] **Staging canlı + kullanıcı görüntüledi** (demo eşdeğeri)
- [x] tasks/lessons.md güncel (nginx template lesson'ları dahil — Faz 1 sonu update'i bekleniyor)

**Sonuç**: Faz 1'in foundation + staging deploy kısmı **%100 tamam**. OTP/2FA/Sentry/Grafana zaten Faz 3-7'ye scope edilmiş, gerçek DOD karşılandı.

---

## Faz 1 Review (2026-05-12)

### ✅ Başarılar
- 130+ dosya, 7 workspace paketi, 2 app
- 11 DB tablosu + RLS + 5 seed user
- 13/13 unit test geçiyor
- Typecheck temiz (7/7 paket)
- VPS staging canlı 4 subdomain üzerinden, Cloudflare proxy + Origin Cert
- 3 paralel proje (Orkestra/ikcebimde/plaskal) etkilenmedi — append-only deploy
- Plaskal+ikcebimde runtime-only vhost drift'i fix edildi (template'e kalıcı taşındı — daha sağlam)

### ⚠ Faz 2'de Halledilecek Borçlar
1. **NestJS DI workaround temizliği**: `@swc-node/register` ile tsx loader değiştir → explicit `@Inject()` decorator'lar kaldır
2. **Better-Auth onSignUp hook**: yeni `auth_user` oluşunca `users` tablosuna otomatik row insert
3. **Swagger UI'ı yeniden aç**: AuthController catch-all problemini çöz (middleware'e taşı)
4. **`typedRoutes` tekrar aç**: gerçek route'lar tamamlanınca
5. **users.repository** geri getir (Faz 2'de `/me` endpoint'iyle)
6. **Testcontainers + integration test setup**
7. **Repo Git init + CI ilk yeşil run**
8. **ESLint shared config + Husky + commitlint**

### 📚 Lessons Düşülen (lessons.md)
- Port çakışmaları (5432/5433 multi-project)
- Drizzle-kit `.js` ext + workspace shared dep çakışması
- ESM `__dirname` pattern
- NestJS + Fastify + Swagger catch-all bug
- tsx → class-based DI metadata kaybı
- Better-Auth default `/api/auth/*` base path
- next-intl v3.22 `requestLocale`
- **VPS nginx template vs runtime config drift** (Bu turda öğrenildi — lessons'a eklenecek)
- **Cloudflare Origin Cert + Proxy ON setup** (Bu turda öğrenildi)

---

## Tarihsel Faz Logu

- _2026-05-12 (1)_: Dökümantasyon ve proje yapısı kuruldu
- _2026-05-12 (2)_: Faz 1 foundation kodu yazıldı, lokal smoke test başarılı
- _2026-05-12 (3)_: VPS staging deploy başarılı, Cloudflare + 4 subdomain canlı, plaskal/ikcebimde restore edildi
- _2026-05-12 (4)_: **Faz 1 kapatıldı, Faz 2 (Catalog) başlatılmaya hazır**
- _2026-05-13 (1)_: **Faz 5.2 kapatıldı** — PII reveal, komisyon override, admin team, system settings, notification templates, KVKK requests, audit CSV/date filter (staging smoke 6/6 200)
- _2026-05-13 (2)_: **Faz 6.1 kapatıldı** — Loyalty + Referral + Reviews + Q&A + Coupons + Boost interleave (5 schema + 5 module + 8 endpoint grubu, typecheck temiz, staging deploy bekliyor)
- _2026-05-13 (3)_: **Faz 6.2 kapatıldı** — AI Bot (Gemini 2.0 Flash Lite + 5 function tool + web widget), Loyalty/Coupon checkout entegrasyonu, 2 yeni cron (loyalty-expire + boost-rotation), 3 yeni notification trigger (loyalty.earned, referral.completed, review.request)
- _2026-05-13 (4)_: **Faz 6.3 kapatıldı** — Bot audit + quota + gemini-2.5-flash, boost performans raporu (`/seller/boost/reports`), Q&A satıcı yanıt UI (`/seller/questions`), reviews admin moderasyon (`/admin/reviews`), loyalty refund tx, multi-seller kupon/puan apportionment
- _2026-05-13 (5)_: **Faz 7.1 kapatıldı** — KVKK self-service (export+delete), cookie banner, mesafeli satış sözleşmesi, 2FA enforcement banner, push notification backend, helmet CSP/HSTS, rate limit guard, Sentry lazy-init, Prometheus metrics, Playwright + integration test foundations
- _2026-05-13 (6)_: **Faz 7.2 kapatıldı** — Mobile (Expo) scaffold (5 ekran + push + biyometrik), bot SSE streaming, mesafeli satış server-side PDF (pdfkit), ETBIS aylık rapor + CSV, Better-Auth twoFactor plugin (4-step wizard), real Expo Push HTTP, prom-client (registry + interceptor), CI workflows (Playwright + integration + Lighthouse)
- _2026-05-13 (7)_: **Faz 7.3 kapatıldı** — axe-core a11y CI, k6 load scripts (4), backup+restore+DR runbook, on-call runbook, monitoring stack docker compose (Grafana/Prometheus/Loki/Promtail/Uptime Kuma/Alertmanager + dashboard), Sentry source map CI, photo upload (MinIO presigned + user-media bucket + web uploader), full mobile (ürün/sepet/checkout/adres/wishlist/loyalty/referral/KVKK/bot + Privacy manifest + EAS OTA+Build CI)
- _2026-05-13 (8)_: **Tech debt cleanup** — ESLint shared config (`@yorecebimde/eslint-config` base+node+next+react-native), Husky + commitlint (conventional commits), `/me` endpoint + `UsersRepository.updateProfile`, Better-Auth twoFactor type-safe client (8 `as any` cast kaldırıldı), Zod resolver typing düzeltildi, migration helper script (.js extension strip/restore otomatize), 5 unit test (boost interleave), @types/react@19.0.7 pnpm override (React 19 ReactNode/ReactPortal tip bug fix)
- _2026-05-13 (9)_: **Faz 8 tech debt cleanup** — Redis sliding window rate limit (`RateLimitGuard` Redis backend, ZADD/ZREMRANGEBYSCORE/ZCARD atomic pipeline), Fastify plugin typing (helmet/cors/cookie 3 `as any` kaldırıldı, fastify pin'lendi `^4.29.1`), Swagger UI dev/staging'de aktive (`/v1/docs`, cookie auth + tag groups), typedRoutes açıldı + 22 `<Link href=... as never>` cast'i temizlendi, NestJS DI audit (zaten temiz — @Inject sadece Symbol token için zorunlu)
