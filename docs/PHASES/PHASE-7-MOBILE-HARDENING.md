# PHASE 7 — Mobile + Hardening + Test

> Hedef: Mobil app App Store + Play Store'da yayında. Platform üretim seviyesinde güvenlik, KVKK uyumu,
> performans testleri ile hardened. Public launch ready.
> Süre: 5-6 hafta.

---

## 0. Faz 7.1 — Hardening MVP (Tamamlandı 2026-05-13)

### KVKK Self-Service

- `KvkkUserService.exportData(userId)` — profil + adres + sipariş + yorum + Q&A + puan + referral + wishlist tek JSON
- `KvkkUserService.deleteAccount(userId)` — soft-delete + anonimize (firstName/lastName=REDACTED, email/phone redact, addresses redact, wishlist temizle, carts sil). Sipariş ve fatura yasal saklama (KVKK madde 28) için kalır
- Endpoints: `GET /v1/kvkk-me/export`, `POST /v1/kvkk-me/delete-account`
- UI: `/hesabim/veri-yonetimi` — JSON indir + "HESABIMI SİL" double-confirm
- Rate limit: export 5/saat, delete 3/gün

### Cookie Banner

- `CookieBanner` — ilk ziyaret + kategori bazlı opt-in (zorunlu/fonksiyonel/analitik/pazarlama)
- localStorage `yc.cookie_consent.v1` + custom event `yc:consent-changed` ile SDK reactivation
- "Sadece Zorunlu" / "Tümünü Kabul" / "Ayarla" 3 yol

### Mesafeli Satış Sözleşmesi

- `/hesabim/siparislerim/[orderNo]/sozlesme` — yazdırılabilir HTML (window.print → Save as PDF)
- 7 madde: taraflar, konu, ürün tablosu, cayma hakkı (gıda istisnası), teslimat, şikayet, yürürlük
- Order detayda "📄 Sözleşme" linki

### 2FA Enforcement

- `GET /v1/2fa/status` — enabled/enforced/role/gracePeriodDays
- `TwoFaBanner` seller + admin layout'larda mount edildi
- `/hesabim/2fa-kurulum` placeholder (gerçek TOTP setup Faz 8'de Better-Auth twoFactor plugin)

### Push Notification Backend

- Schema: `user_push_tokens` (token, platform: ios/android/web, deviceLabel, lastUsedAt)
- Migration: `0008_redundant_deathstrike.sql`
- `PushService` — registerToken (idempotent), deleteToken, listUserTokens, sendToUser/sendToToken (Expo Push HTTP Faz 8 — şu an log stub)
- Endpoints: `POST/GET/DELETE /v1/push-tokens`

### Security Headers + Helmet/CSP

- Production CSP: default 'self', img 'self'+data+https+blob, script 'self', frame-ancestors 'none'
- HSTS 2 yıl + includeSubDomains + preload (prod only)
- referrerPolicy strict-origin-when-cross-origin, X-Frame-Options DENY, X-Content-Type-Options nosniff

### Rate Limit Per-Endpoint

- `RateLimitGuard` + `@RateLimit({ max, windowSeconds, keyBy: 'user'|'ip' })` decorator
- In-memory storage (Faz 8: Redis sliding window)

### Sentry SDK (lazy-init)

- `apps/api/src/instrumentation/sentry.ts` — `@sentry/node` runtime dynamic import; paket yoksa no-op
- `apps/web/src/instrumentation.ts` — Next.js instrumentation hook, `@sentry/nextjs` dynamic import
- `SENTRY_DSN` env set + paket install ile prod'a alınır

### Prometheus Metrics

- `GET /metrics` — text exposition format v0.0.4
- Process-level: uptime, heap, RSS, CPU user/system
- Faz 8: `prom-client` ile request histogram + DB pool + BullMQ depth

### Test Foundations

- `tests/e2e/` — Playwright config + 3 spec: homepage, auth-flow, cookie-banner
- `tests/integration/` — Testcontainers + Postgres + RLS context helper + `tenant-isolation.test.ts`

### Faz 7.1 — Erteleme (Faz 7.2'ye taşındı, hepsi tamam)

---

## 0.1 Faz 7.2 — Mobile + Production Hardening (Tamamlandı 2026-05-13)

### Mobile App (Expo) — Scaffold

`apps/mobile/`:
- Expo SDK 52 + expo-router 4 + new architecture
- 5 ekran: login, (tabs)/{index, search, orders, profile}
- `src/lib/api.ts` — Better-Auth session cookie SecureStore'da, fetch wrapper
- `src/lib/push.ts` — Expo Push token register → `/v1/push-tokens`
- Biyometrik aktivasyon (`expo-local-authentication`) profile'da
- `app.json` — scheme `yorecebimde://`, bundle id `com.yorecebimde.app`, infoPlist FaceID açıklaması
- `eas.json` — development/preview/production profiles
- Deep linking: `yorecebimde://order/<orderNo>`, `yorecebimde://product/...`

### AI Bot SSE Streaming

`packages/ai-bot/src/client.ts`:
- `chatStream()` — `generateContentStream` ile async generator (token/functionCall yield)

`apps/api/src/modules/bot/`:
- `BotService.chatStream()` — function loop + final text token-by-token
- `POST /v1/bot/chat-stream` — Fastify reply.raw ile SSE (event: token/function/function_result/done/error)

`apps/web/src/components/bot/bot-widget.tsx`:
- Fetch + ReadableStream + manual SSE parse (EventSource POST'u desteklemez)
- Progressive token reveal — kullanıcı yazma deneyimi gibi

### Mesafeli Satış Server-Side PDF (pdfkit)

`apps/api/src/modules/contracts/`:
- `ContractsService.generateMesafeliSatisPdf(userId, orderNo)` — pdfkit ile 7-madde sözleşme
- TR karakter ASCII fallback (Helvetica Latin-1 yeterli, prod'da DejaVu Faz 8'de)
- `GET /v1/orders/:orderNo/sozlesme.pdf` — auth'lu, Content-Type application/pdf
- Order detayda "⬇ PDF" linki HTML "📄 Sözleşme" yanında

### ETBIS Otomatik Bildirim

`apps/api/src/modules/etbis/`:
- `EtbisService.monthlySummary(year, month)` — toplam sipariş, paid sipariş, GMV, aktif satıcı, yeni satıcı
- `lastTwelveMonths()` + `toCsv()` — admin manuel form doldurma rehberi için
- Endpoints: `GET /v1/admin/etbis/{monthly,last-12-months,export.csv}`
- Admin nav'a "ETBİS" linki + `/admin/etbis` sayfası (KPI tablosu + CSV indir)

### Better-Auth twoFactor Plugin

`packages/auth/src/config.ts`:
- `twoFactor()` plugin eklendi: issuer Yörecebimde, TOTP digits=6 period=30, 8 backup kod
- Better-Auth otomatik endpoint'ler: `/api/auth/two-factor/{enable,verify-totp,generate-backup-codes,disable}`

`packages/auth/src/client.ts`:
- `twoFactorClient()` plugin'i hem vanilla hem React client'a eklendi

`apps/api/src/modules/two-fa/`:
- `GET /v1/2fa/status` Better-Auth `twoFactorEnabled` field'ından okuyor + users tablosu fallback

`apps/web/src/components/auth/two-fa-setup.tsx`:
- 4-aşamalı setup wizard: password → QR (qrserver.com görsel) → 6 haneli verify → backup kodları
- Disable flow: confirm + password
- `/hesabim/2fa-kurulum` artık fonksiyonel

### Real Expo Push HTTP

`PushService.sendBatch()`:
- `https://exp.host/--/api/v2/push/send` real call (batch 100, retry)
- DeviceNotRegistered → token sil (cleanup)
- Non-Expo (test) token'lar log stub'a düşer

### prom-client Metrics

`apps/api/src/modules/health/metrics.service.ts`:
- `prom-client` Registry — defaultMetrics (heap, GC, event loop lag, CPU)
- Custom: `yorecebimde_http_requests_total` (counter, labels: method/route/status)
- `yorecebimde_http_request_duration_seconds` (histogram, 11 bucket)
- `yorecebimde_orders_created_total`, `yorecebimde_bot_function_calls_total` (business KPI)

`MetricsInterceptor` — APP_INTERCEPTOR olarak global, route normalize edilir (UUID → `:id`)

### CI Workflows

`.github/workflows/`:
- `e2e.yml` — Playwright on PR/push: PG + Redis services, migrate, seed, start api+web, wait-on, run tests, upload report on fail
- `integration.yml` — Testcontainers + Postgres, tenant isolation tests
- `lighthouse.yml` — Web build + 4 URL audit, budget `.github/lighthouse-budget.json` (LCP 2.5s, CLS 0.1, JS 350kb)

### Faz 7.2 — Erteleme (Faz 7.3'e taşındı)

---

## 0.2 Faz 7.3 — Production Hardening + Full Mobile (Tamamlandı 2026-05-13)

### CI Workflows

`.github/workflows/`:
- `a11y.yml` — axe-core via Playwright (WCAG 2.1 AA, critical/serious fail), [scripts/axe-scan.mjs](.github/scripts/axe-scan.mjs)
- `load-test.yml` — k6 manual trigger (smoke/load/stress/soak), 24h timeout soak için
- `sentry-release.yml` — Sentry release + source map upload (SENTRY_ENABLED var ile gated)
- `mobile-ota.yml` — EAS Update on push (channel: production/staging by branch)
- `mobile-build.yml` — EAS Build manual trigger (profile + platform select)

### Load Tests (k6)

`tests/load/`:
- `smoke.js` — 1 VU 5dk sanity
- `load.js` — 100 VU 30dk (P95 < 500ms hedef)
- `stress.js` — ramping 1000 VU 15dk (kırılma noktası)
- `soak.js` — 100 VU 24h (memory leak + drift)
- README — SLO hedefleri + Grafana integration notu

### Backup + DR

`infra/scripts/`:
- `backup-db.sh` — pg_dump custom format + GPG encrypt + MinIO + B2 off-site + retention + Prometheus metric
- `restore-db.sh` — GPG decrypt + pg_restore (drill DB önce), production swap double-confirm

`docs/RUNBOOKS/`:
- `disaster-recovery.md` — Postgres data loss, VPS down, MinIO loss, Iyzico mismatch senaryoları (RTO 1h, RPO 24h)
- `on-call.md` — severity matrix, alert→aksiyon, ilk 15dk, post-mortem template

### Monitoring Stack (docker compose, deploy hazır)

`infra/docker/compose.monitoring.yml`:
- Grafana 11.3 + Prometheus 3 + Loki 3.3 + Promtail + Uptime Kuma 1 + cAdvisor + node-exporter + Alertmanager 0.28
- `monitoring/prometheus/prometheus.yml` + `rules/yorecebimde.yml` (APIDown, ErrorRate, P95High, DiskFull, BackupOld, NoOrdersHour)
- `monitoring/alertmanager/alertmanager.yml` — Telegram routing + severity inhibit
- `monitoring/grafana/dashboards/api-overview.json` — request rate, p50/p95/p99, error rate by route, orders/h, bot calls/h, heap, Loki tail
- `monitoring/loki/loki-config.yaml` — 30g retention, compactor
- `monitoring/promtail/config.yml` — pino JSON parse, Docker discovery

### Photo Upload (MinIO presigned)

`apps/api/src/modules/user-media/`:
- `UserMediaService.presignUpload()` — review/question_attachment/profile_avatar context'leri
- 5MB max, 20 upload/saat rate limit
- `POST /v1/user-media/presign` → uploadUrl + publicUrl
- Bucket: `user-media` (yeni)

`apps/web/src/components/user-media-uploader.tsx` — drag+preview+remove UI, my-reviews form'una entegre

### Mobile App (Full Customer Experience)

`apps/mobile/src/app/`:
- `product/[sellerSlug]/[productSlug].tsx` — galeri + fiyat + stok + soğuk zincir + Sepete Ekle (Haptics)
- `cart.tsx` — quantity controls + remove + warnings + checkout CTA
- `checkout.tsx` — adres seç + sipariş özet + Iyzico 3DS via `expo-web-browser.openAuthSessionAsync`
- `addresses.tsx` — list + add + setDefault + delete
- `wishlist.tsx` — beğenilen ürünler
- `loyalty.tsx` — bakiye + lifetime + tx history
- `referral.tsx` — kod + paylaş (native Share API) + clipboard + geçmiş
- `kvkk.tsx` — verilerimi indir (`expo-sharing`) + hesap silme (HESABIMI SİL double-confirm)
- `bot.tsx` — SSE streaming chat (KeyboardAvoidingView, native fetch ReadableStream)
- `(tabs)/index.tsx` — sepet butonu + bot FAB + product card → detail nav
- `(tabs)/profile.tsx` — biyometrik + 5 link (adresler/beğendiklerim/puanlarım/davet/KVKK)
- `_layout.tsx` — Stack screen tanımları (tüm sayfa başlıkları)

### Native Configuration

`apps/mobile/app.json`:
- iOS Privacy Manifest (NSPrivacyAccessedAPITypes + NSPrivacyCollectedDataTypes — email, phone, address, purchase history)
- iOS infoPlist: FaceID + camera + photo library Türkçe açıklamalar
- Android permissions: INTERNET, RECEIVE_BOOT_COMPLETED, USE_BIOMETRIC, USE_FINGERPRINT, VIBRATE
- EAS Updates config: runtimeVersion appVersion policy
- `apps/mobile/assets/README.md` — asset boyut spec'leri

### Faz 7'ye Kalan (truly external — fiili infra/insan)

- Sentry self-host fiili deploy (getsentry/self-hosted clone + VPS)
- Monitoring stack fiili deploy (`docker compose -f compose.monitoring.yml up -d` VPS'te)
- Pentest (3rd party — ECzine/Biznet kontratı)
- Load test gerçek run (k6 scripts hazır, running staging gerekli)
- App Store + Play Store submission (Apple Developer + Google Play console hesabı)
- DR drill (running infra)
- Native asset designer'dan PNG'ler (icon, splash, adaptive, notification-icon)
- ETBİS API gerçek entegrasyon (API anahtarı + sözleşme + form)

---

## 1. Hedefler

### Mobile
1. Expo (React Native) customer app
2. Auth + 2FA + biyometrik login
3. Full marketplace (browse, search, ürün detay)
4. Sepet + checkout (Iyzico WebView 3DS)
5. Sipariş takip + chat + AI bot
6. Push notification (Expo Push)
7. OTA update
8. iOS + Android EAS Build
9. App Store + Play Store yayın

### Hardening
1. KVKK uyumu tamamlanmış (aydınlatma, açık rıza, veri export, silme)
2. ETBİS otomatize bildirim
3. Mesafeli satış sözleşmesi + ön bilgilendirme formu üretimi
4. Çerez yönetimi (cookie banner)
5. PII at-rest encryption tüm geçmiş veri için migration
6. 2FA zorunluluğu satıcı + admin
7. Audit log retention policy uygulama
8. Rate limit production tuning
9. Security headers final

### Test
1. E2E test kapsamı > %70 kritik akışlar
2. Tenant isolation test suite eksiksiz
3. Load test (k6) — 100, 1000, sustained
4. Pentest (3rd party)
5. Accessibility audit (WCAG 2.1 AA)
6. Performance audit (Lighthouse > 90)

### Monitoring
1. Sentry release tracking
2. Grafana dashboards (HTTP, DB, queue, business KPI)
3. Loki log aggregation
4. Uptime Kuma public status page
5. Alert tuning

---

## 2. Mobile (apps/mobile)

### 2.1. Project Setup
- [ ] Expo SDK latest, EAS CLI kurulum
- [ ] TypeScript strict
- [ ] Path alias (`@/` for src)
- [ ] State management: Zustand veya Jotai (basit, küçük)
- [ ] Data fetching: TanStack Query
- [ ] Form: react-hook-form + Zod
- [ ] Navigation: expo-router (file-based)

### 2.2. App Structure
```
apps/mobile/src/
  app/                  # expo-router
    (auth)/
      login.tsx
      register.tsx
      verify-otp.tsx
      2fa.tsx
    (tabs)/             # bottom tabs
      index.tsx         # home
      search.tsx
      orders.tsx
      profile.tsx
    product/[slug].tsx
    cart.tsx
    checkout.tsx
    order/[id].tsx
    chat/[threadId].tsx
    bot.tsx
    wishlist.tsx
    addresses.tsx
  components/
  lib/
  hooks/
  services/
```

### 2.3. Features Parity (with web)
- [ ] Anasayfa: kategori, featured, kampanya banner
- [ ] Kategori sayfası
- [ ] Search (autocomplete + sonuç)
- [ ] Ürün detay (galeri swiper, variyasyon, miktar)
- [ ] Sepet + miktar değiştir + sil
- [ ] Checkout: adres, kargo, ödeme yöntemi, sözleşme onay
- [ ] Iyzico 3DS WebView (expo-web-browser ile in-app)
- [ ] Siparişlerim + detay
- [ ] Iade aç + dispute takip
- [ ] Chat (WebSocket)
- [ ] AI Bot (FAB widget)
- [ ] Beğendiğim ürünler
- [ ] Hesap profili + adresler + 2FA
- [ ] Sadakat puanları + referral
- [ ] Kuponlarım

### 2.4. Native Özellikler
- [ ] Biyometrik login (expo-local-authentication — FaceID/TouchID)
  - İlk login sonrası "biyometrik aktifle" prompt
  - Refresh token keychain'de (expo-secure-store)
- [ ] Push notification (expo-notifications):
  - Permission request
  - Token register (backend'e POST)
  - Topic subscribe
  - In-app notification handler
  - Deep link routing
- [ ] Camera (ürün ara — opsiyonel "fotoğrafla ara")
- [ ] Share (referral kodu sosyal medya)
- [ ] Haptic feedback (ödeme onay, sipariş başarılı)
- [ ] Offline support (basit: cache last products + cart)

### 2.5. Push Notification Backend
- [ ] Expo Push tokens table (`user_push_tokens`)
- [ ] `PushProvider` (packages/notifications):
  - sendToUser(userId, payload)
  - sendToToken(token, payload)
  - bulk send
- [ ] Notification triggers'a push channel ekle
- [ ] Deep link payload (`/order/123`)

### 2.6. OTA Updates
- [ ] Expo Updates kurulumu
- [ ] EAS Update channel: production, staging
- [ ] CI: merge to main → expo-updates publish
- [ ] Critical update force prompt

### 2.7. Build & Deploy
- [ ] EAS Build profiles:
  - development (internal distribution)
  - preview (staging API)
  - production (prod API)
- [ ] iOS:
  - Apple Developer hesabı + signing
  - App icon, splash screen
  - App Store metadata (screenshots, description TR/EN)
- [ ] Android:
  - Keystore üret + güvenli sakla
  - Play Store listing
- [ ] Privacy manifest (iOS 17+)
- [ ] Permission açıklamaları (Info.plist + Android manifest)

### 2.8. Mobile-Specific Hardening
- [ ] Certificate pinning (gerekirse)
- [ ] Jailbreak/root detection (uyarı, hard block değil)
- [ ] Screenshot/recording koruması (3DS sayfasında)
- [ ] App-level lock (Settings: 2FA every X minutes)

### 2.9. Mobile Sentry
- [ ] expo-sentry kurulum
- [ ] Release tracking
- [ ] Native crash reporting

---

## 3. Hardening

### 3.1. KVKK Compliance Full
- [ ] Aydınlatma metni v1 (hukuk danışmanı onaylı):
  - Veri sorumlusu bilgileri
  - Hangi veriyi neden işliyoruz
  - Veri sahibinin hakları
  - İletişim
- [ ] Açık rıza checkbox'ları:
  - Kayıt sırasında ana checkbox (zorunlu)
  - Marketing email/SMS opt-in (ayrı, opsiyonel)
  - Çerez kategori opt-in (banner)
- [ ] "Verilerimi indir" endpoint + UI:
  - JSON export (tüm profil, sipariş, adres, vs.)
  - Async (BullMQ job) → email ile ZIP gönder
- [ ] "Hesabımı sil" endpoint + UI:
  - Talep oluşturur
  - Super admin onayı (KVKK page)
  - Anonimleştirme: users.name → REDACTED, addresses sil, vs.
  - Yasal saklama (sipariş, fatura) kalır ama anonim
- [ ] Veri işleme kayıtları (`etbis_records` tablo)
- [ ] KVKK page footer link
- [ ] Veri ihlali bildirim hazır şablonu (incident response)

### 3.2. ETBİS Otomatize
- [ ] Yeni satıcı eklenince ETBİS API'ye bildirim (eğer API açıksa)
- [ ] Aylık özet rapor otomatik (admin paneline indir butonuyla başla)
- [ ] Manuel form doldurma rehberi (admin için)

### 3.3. Mesafeli Satış Süreç
- [ ] Sözleşme şablon üretimi (Faz 5 notification template editor ile)
- [ ] Dinamik field'lar:
  - Satıcı bilgileri
  - Müşteri bilgileri (anonim opt)
  - Ürünler tablosu
  - Cayma hakkı bildirimi (gıda için istisna kontrol)
  - Şikayet/itiraz mercii
- [ ] PDF üretim (puppeteer veya pdfkit)
- [ ] Sipariş confirm sonrası otomatik mail attachment
- [ ] User panelden indirme

### 3.4. Cookie Banner
- [ ] CookieConsent component (kategori-bazlı):
  - Zorunlu (default açık, kapatılamaz)
  - Analytics (opt-in)
  - Marketing (opt-in)
  - Functional (opt-in)
- [ ] LocalStorage state
- [ ] Settings sayfasından geri açılabilir
- [ ] Banner GDPR + KVKK + ePrivacy uyumlu

### 3.5. PII Encryption Migration
- [ ] Mevcut DB'de plain-text PII var ise:
  - Migration script: encrypt + güncelle (batch)
- [ ] Tüm yeni write'lar encrypted (Faz 1'den bu yana zaten öyle olmalı, audit)
- [ ] Key rotation hazırlığı (yılda 1 kez)

### 3.6. 2FA Enforcement
- [ ] Satıcı için zorunlu: dashboard'a girince setup zorunlu (Faz 4'te zaten)
- [ ] Admin için zorunlu (Faz 5)
- [ ] 2FA olmayan eski hesaplar varsa: forced setup pop-up next login

### 3.7. Audit Log Retention
- [ ] Partition strategy çalışıyor
- [ ] 10 yıl saklama policy uygulanır (eski partition arşive)
- [ ] Off-site backup (Backblaze)

### 3.8. Rate Limit Production Tuning
- [ ] Trafik gözlemleyip threshold ayarla
- [ ] Endpoint başına farklı limit
- [ ] IP allowlist (admin static IP)
- [ ] Caddy DDoS protection

### 3.9. Security Headers Final
- [ ] CSP test edildi, console error'sız
- [ ] HSTS preload list submission
- [ ] SecurityHeaders.com A+ skoru
- [ ] Mozilla Observatory A+

---

## 4. Testing

### 4.1. E2E Test Suite
- [ ] Playwright web E2E:
  - Anasayfa → ürün → sepet → checkout (full Iyzico sandbox)
  - Satıcı: başvuru → onay → ilk ürün → ilk sipariş alma
  - Admin: başvuru onay → kategori onay → dispute karar
- [ ] Detox mobile E2E:
  - Login + biyometrik
  - Browse + purchase
  - Push notification handle
- [ ] Critical coverage: %70+
- [ ] CI'da her PR'da çalışır (gerçek service ile)

### 4.2. Tenant Isolation Test Suite
- [ ] Her tenant-bound tablo için test:
  - Seller A's data, seller B can't read
  - Customer A's order, customer B can't read
  - Admin can read all (with audit)
- [ ] RLS policy direct DB test:
  - SET LOCAL → query → verify result count
- [ ] Cache key tenant scoped test (Redis introspection)

### 4.3. Load Test (k6)
- [ ] Senaryolar:
  - **Smoke**: 1 VU, 5 dk — sanity check
  - **Load**: 100 VU, 30 dk — beklenen production yük
  - **Stress**: 1000 VU, 15 dk — peak
  - **Soak**: 100 VU, 24 saat — memory leak
- [ ] Endpoints:
  - GET /products listing
  - POST /cart/items
  - POST /orders/checkout (sandbox payment)
  - WS chat connect + message
- [ ] Metric hedefleri:
  - P95 < 500ms (Load)
  - Error rate < 0.1%
  - DB connections < 80% pool
- [ ] Sonuçlar Grafana dashboard

### 4.4. Pentest
- [ ] 3rd party güvenlik firması seç (ECzine, Biznet, vs.)
- [ ] Scope: web + mobile + API
- [ ] Süre: 2 hafta
- [ ] Rapor: Critical/High remediation zorunlu, Medium tartışılır
- [ ] Re-test sonrası
- [ ] OWASP ZAP automated scan CI'da (haftalık)

### 4.5. Accessibility
- [ ] axe-core CI integration
- [ ] WCAG 2.1 AA target
- [ ] Manual testing:
  - Klavye navigasyon
  - Screen reader (VoiceOver, TalkBack)
  - Contrast ratio
  - Focus visible
  - Alt text tüm görsellerde

### 4.6. Performance Audit
- [ ] Lighthouse CI:
  - Anasayfa, kategori, ürün detay, checkout
  - Score > 90 (Performance, Accessibility, Best Practices, SEO)
- [ ] Core Web Vitals:
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- [ ] Bundle analyzer: dead code, large dependencies
- [ ] Image optimization audit (WebP, lazy load, sizes)

---

## 5. Monitoring Final

### 5.1. Sentry
- [ ] Release tracking (git SHA → Sentry release)
- [ ] Source map upload (CI step)
- [ ] Error sampling: %10 prod, %100 staging
- [ ] Performance: %5 trace prod
- [ ] User feedback widget

### 5.2. Grafana Dashboards
- [ ] **HTTP**: request rate, latency P50/P95/P99, error rate, by endpoint
- [ ] **Database**: connections, query time, slow queries, replication lag
- [ ] **Redis**: ops/sec, memory, hit ratio, key count
- [ ] **BullMQ**: queue depth, failed jobs, processing time
- [ ] **Business**: orders/min, GMV/hour, signups/day, payment success rate, dispute rate
- [ ] **Mobile**: crash rate, ANR, session duration

### 5.3. Alerts
- [ ] Sev-1: error rate > 5%, payment service down, DB primary down
- [ ] Sev-2: P95 > 1s, disk > 80%, replica lag > 5m
- [ ] Sev-3: queue depth > 1000, failed jobs > 50/hour
- [ ] Telegram + Email notifications

### 5.4. Uptime Kuma
- [ ] Public status page: status.yorecebimde.com
- [ ] Monitor: all endpoints
- [ ] Subscription: email notification users (opsiyonel)

### 5.5. Logs (Loki)
- [ ] Structured pino logs
- [ ] Request ID across services (correlation)
- [ ] Retention: 30 gün hot, 90 gün cold

---

## 6. Çıkış Kriteri (Production Go-Live Ready)

- [ ] Mobile app App Store + Play Store'da yayında ve onaylı
- [ ] 1000 concurrent user load test başarılı, P95 < 500ms
- [ ] Pentest report: Critical 0, High 0
- [ ] KVKK audit (iç): tüm gereksinimler karşılanıyor
- [ ] Hukuk danışmanı sözleşmeleri onaylı
- [ ] ETBİS kayıt + ilk rapor gönderildi
- [ ] Backup + restore drill başarılı
- [ ] Monitoring dashboard'ları canlı, alert'ler test edildi
- [ ] On-call procedure dokümante
- [ ] Disaster recovery plan dokümante
- [ ] Incident response runbook
- [ ] Production go-live checklist tüm maddeleri yeşil

## 7. Riskler

| Risk | Önlem |
|---|---|
| App Store onay reddi | App Review Guidelines'ı önceden incele, iç review yap |
| Mobile + Web parite kayması | Shared package'lar (`@yorecebimde/shared`) ile contract tut |
| Pentest critical bulgu | Hardening Faz 5'ten başlamış, iç sec review erken |
| Performance regression launch sonrası | Load test sürekli, CI'da baseline regression check |
| KVKK denetimi | Hukuk + uzman audit Faz 6 sonu |

## 8. Launch Hazırlığı

- [ ] PR / iletişim plan
- [ ] Müşteri destek ekibi eğitim (panel + dispute prosedürü)
- [ ] Bilinen issue listesi
- [ ] First 1000 users campaign
- [ ] Feedback toplama mekanizması
- [ ] Hotfix prosedürü

## 9. Launch Sonrası (Faz 8+)

(Bu fazın kapsamı dışı, gelecek planlama için):
- WhatsApp Business entegrasyonu
- B2B (toptan)
- Abonelik sistemi
- Subscription delivery
- Çoklu para birimi
- Yurtdışı satış
- Influencer affiliate
- CDN (Cloudflare)
- Kubernetes migration
- ML-based recommendation
