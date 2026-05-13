# PHASE 1 — Foundation

> Hedef: Boş monorepo'dan "auth + deploy hattı çalışan" production-ready iskelete.
> Süre: 3-4 hafta. Bu fazın çıktısı, sonraki tüm fazların üzerine inşa edileceği temeli oluşturur.

---

## 1. Hedefler

1. Monorepo, build sistemi, lint, format, commit hooks tam
2. Lokal dev altyapı tek komutla ayağa kalkıyor
3. Postgres + Drizzle + RLS baseline kurulu
4. Better-Auth ile kayıt + login + 2FA çalışıyor (NestJS + Next.js)
5. Tenant context middleware DB session ayarlıyor
6. NestJS skeleton modülleri (auth, users, health)
7. Next.js App Router skeleton + i18n + shadcn
8. Staging deploy hattı (Coolify + Caddy)
9. CI: test + lint + typecheck + build
10. Sentry + Grafana + Uptime Kuma kurulu

## 2. Detaylı Task Listesi

### 2.1. Monorepo Setup
- [x] `pnpm install` çalışıyor (workspace config) — ~930 paket, lockfile üretildi
- [x] `tsconfig.base.json` strict mode (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, vs.)
- [x] Per-package `tsconfig.json` (extends base) — 7 paket
- [x] `turbo.json` task pipeline (build, dev, lint, test, typecheck)
- [ ] ESLint config (`@yorecebimde/eslint-config` shared package) — **Faz 2 başında**
- [x] Prettier config + plugin (Tailwind) — `.prettierrc.json` ve plugin tanımlı
- [ ] Husky + lint-staged: pre-commit — root package.json'da var ama `.git` init'lenmediği için inactif
- [ ] Commitlint: conventional commits — **Faz 2 başında, repo init sonrası**
- [ ] Renovate config (.github/renovate.json) — **Faz 2'de**
- [x] .editorconfig

### 2.2. Dev Altyapı (Docker Compose)
- [x] `infra/docker/compose.dev.yml` (port'lar başka projelerle çakışmaması için "yorecebimde-only" range):
  - postgres:16-alpine (5434) ✓
  - redis:7-alpine (6380) ✓
  - minio (9100 + 9101 console) ✓ — auto bucket init (products, seller-documents, invoices, chat-attachments, disputes, backups)
  - meilisearch v1.11 (7710) ✓
  - mailpit (1026 SMTP + 8026 UI) ✓
- [x] Postgres init scripts (extensions: pg_trgm, btree_gin, pgcrypto + app role `yorecebimde_app` NOBYPASSRLS)
- [x] `.env.example` ve geliştirme `.env` üretildi (BETTER_AUTH_SECRET, JWT_*, ENCRYPTION_KEY openssl rand ile)
- [x] `pnpm dev:infra` + `dev:infra:down` + `dev:infra:logs` script'leri

### 2.3. Database (packages/db)
- [x] Drizzle config (`drizzle.config.ts`) — postgres-js + snake_case casing
- [x] Migration directory yapısı (`migrations/0000_white_makkari.sql` üretildi, 11 tablo)
- [x] Schema dosyaları (Faz 1 minimum — diğerleri Faz 2-7'de):
  - [x] `schema/auth.ts` — Better-Auth tabloları (auth_user, auth_session, auth_account, auth_verification, auth_two_factor)
  - [x] `schema/users.ts` — users + addresses + role/status enum'ları
  - [x] `schema/sellers.ts` — sellers + seller_applications + seller_documents + type/status enum'ları
  - [x] `schema/audit.ts` — audit_logs (partition prep var, declarative partition Faz 3'te)
  - [ ] `schema/categories.ts` — **Faz 2**
  - [ ] `schema/products.ts`, `discounts.ts`, `stock.ts` — **Faz 2**
  - [ ] `schema/carts.ts` — **Faz 3**
  - [ ] `schema/orders.ts`, `payments.ts`, `disputes.ts` — **Faz 3**
  - [ ] `schema/chat.ts`, `notifications.ts` — **Faz 3-4**
- [x] **Faz 1'de sadece auth + users + sellers + audit migrate'lendi.** ✓
- [x] UUID v7 generator — `packages/shared/src/uuid.ts` + db içinde lokal `uuidv7` (drizzle-kit'in shared yüklemesini önlemek için kopyalandı)
- [x] Soft delete helper — `NOT_DELETED` sql template + `deleted_at` sütunu standart
- [x] Timestamps mixin (`timestampColumns()` → created_at + updated_at + deleted_at)
- [x] RLS helpers — `rlsEnable`, `rlsForceEnable`, `rlsTenantPolicy`, `rlsPublicReadActivePolicy`, `rlsAuditAppendOnly`, `setTenantContext`
- [x] Migration runner script (`pnpm db:migrate`)
- [x] RLS applier script (`pnpm db:rls`) — audit_logs için append-only policy aktif
- [x] Seed script (`packages/db/seed/index.ts`):
  - [x] 1 super admin (admin@yorecebimde.com)
  - [x] 1 admin (operasyon@yorecebimde.com)
  - [x] 3 test customer (ayse/mehmet/fatma@test.com)
  - [ ] 2 test seller — **Faz 2 başında** (sellers tablosu var, seed eklenecek)
  - [ ] Kategori ağacı — **Faz 2** (categories tablosu Faz 2'de gelecek)

### 2.4. Config (packages/config)
- [x] Zod-based env schema (`schema.ts` — base + api + web + mobile şemaları)
- [x] `loadDotEnv()` + `parseEnv()` — monorepo root .env auto-discovery (api.ts içinde `fileURLToPath` ile)
- [ ] Per-env override (development/staging/production/test) — şu an tek schema, NODE_ENV enum içinde validate; **Faz 2** veya **Deploy aşamasında** ayrı `.env.staging`/`.env.production` ile genişletilecek
- [x] Secrets ayrı tutulur (`BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `JWT_*` env-only, `.env.example`'da boş bırakılmış)

### 2.5. Shared (packages/shared)
- [x] Common Zod schemas (`schemas/common.ts`): email, password (Argon2 policy), TR phone normalize, uuid, money string, pagination/cursor, sort, IBAN (TR* + 24 hane), TC kimlik (checksum algoritması), tax_id
- [x] Common types/enums (`constants/index.ts`): UserRole, UserStatus, SellerType, SellerStatus, MeasurementUnit, VariationMode, DiscountType, OrderStatus, ShippingMode, PaymentStatus, NotificationChannel, AuditAction (40+ action), Locale
- [x] Date utilities (`dates.ts`) — TZ Europe/Istanbul, `toTrZone`, `fromTrZone`, `formatTr`, `addBusinessDays`, `isExpired`, `isActive`
- [x] Crypto utilities — AES-256-GCM encrypt/decrypt, IBAN mask, TC mask
- [x] Money utilities — bigint kuruş bazlı (`fromMajor`, `toMajor`, `applyPercentage`, `multiplyByQuantity`) — float ASLA
- [x] Slug üretici (TR transliterate + `ensureUniqueSlug`)
- [x] Phone normalizer (`normalizeTrPhone`, `maskTrPhone`)
- [x] Error classes — `BaseAppError`, `ValidationError`, `BusinessRuleError`, `AuthRequiredError`, `InvalidCredentialsError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `RateLimitedError`, `TenantMismatchError`, `ExternalServiceError`
- [x] Unit testler (13 test, 3 dosya): crypto round-trip + IV randomness + tamper detection, slug TR karakter, phone normalize/mask
- [ ] Result type (Either / Ok/Err) — **Faz 2'de gerek olursa**

### 2.6. Auth Package (packages/auth)
- [x] Better-Auth config (`createAuth` factory) — appName, secret, baseURL, trustedOrigins
- [x] Drizzle adapter (Better-Auth schema → bizim `auth_*` tabloları)
- [x] Plugins:
  - [x] Email/password — register + sign-in real flow doğrulandı (auth_user + auth_session DB'de persist)
  - [ ] SMS OTP (NetGSM provider) — **Faz 3'te NetGSM hesabı + başlık onayı alınca**
  - [ ] 2FA TOTP — şema tablosu (auth_two_factor) hazır, Better-Auth plugin enable Faz 2-4 arası
  - [x] Session refresh — Better-Auth built-in (expiresIn 30g + updateAge 1g)
  - [ ] Organization (multi-role) — Faz 4'te satıcı onboarding'iyle birlikte
- [ ] Hooks: onSignUp (users tablosuna row insert), onSignIn (audit log) — **Faz 2 başında** (şu an Better-Auth `auth_user` üretiyor, `users` tablomuza otomatik bağlanmıyor)
- [x] Client factory (`createBetterAuthClient`) — Next.js web + (ileride mobile) için

### 2.7. Logger
- [x] `packages/shared/src/logger.ts` — pino instance + `createLogger()` factory
- [x] Pretty in dev (pino-pretty), JSON in prod
- [x] Sensitive field redaction: `password`, `token`, `secret`, `iban`, `tc_kimlik`, `tcKimlik`, `cardNumber`, `cvc`, `authorization`, `cookie`
- [x] Request ID propagation — `RequestIdMiddleware` request'e `X-Request-Id` ekler ve response header'a yazar
- [ ] Sentry transport — **Faz 7 (Hardening)**, Sentry self-host kurulumuyla birlikte aktif olacak

### 2.8. NestJS API (apps/api)
- [x] NestJS 10 + Fastify adapter (helmet + cookie + cors registered) — `tsx` ile dev, `node dist/main.js` ile prod
- [x] Module: `AuthModule`
  - [x] Controller: Better-Auth catch-all `@All('*')` at `/api/auth/*` (sign-up/email, sign-in/email, get-session, sign-out — Better-Auth route table)
  - [x] Better-Auth wrapper service (`AuthService` — `createAuth` factory)
  - [ ] Strategies: cookie session (Better-Auth handles), JWT mobile için — **Faz 7'ye hazırlık**
  - [ ] Guards: `AuthGuard`, `RolesGuard` — **Faz 2** (gerçek korumalı endpoint'lerle birlikte)
- [x] Module: `UsersModule`
  - [x] Controller stub (Faz 2'de gerçek `/me` + update)
  - [x] Repository (`findById`, `findByEmail`, `findByAuthUserId`, `create`) — Faz 2'de `users.controller`'a inject edilecek
- [ ] Module: `SellersModule` — şema var, NestJS modülü **Faz 4 başında**
- [x] Module: `HealthModule`
  - [x] `/healthz` liveness (uptime + ts)
  - [x] `/readyz` readiness — Postgres ping ✓ (Redis ping **Faz 3**'te Redis client eklenince)
- [x] Module: `AuditModule`
  - [x] Append-only `AuditService.log()` — global injectable
  - [ ] Interceptor admin route'ları için — **Faz 5** (admin endpoint'leri eklenince otomatik audit'leyecek)
- [x] Global filter: `GlobalExceptionFilter` → JSON error response + ZodError handling + BaseAppError yakalama + request ID propagation
- [x] Global pipe: `ZodValidationPipe` (`nestjs-zod`) — APP_PIPE'a register edildi, ilk DTO'lar Faz 2'de eklenecek
- [x] Middleware: `TenantContextMiddleware` — Postgres GUC vars (`app.current_user_id`, `app.current_seller_id`, `app.current_role`) request başına `SET LOCAL`
- [x] Middleware: `RequestIdMiddleware` — `X-Request-Id` header üret/propagate
- [x] Interceptor: `LoggingInterceptor` (pino structured) — method, url, statusCode, durationMs
- [x] Swagger UI kodu yazıldı ama **Faz 1'de devre dışı** — Better-Auth catch-all `@All('*')` + Swagger explorer bootstrap'te kilitleniyor; Faz 2'de auth handler'ı middleware'e taşıyıp Swagger açılacak
- [x] Health check Docker-compatible — Dockerfile'da `wget --spider /healthz` ile

### 2.9. Next.js Web (apps/web)
- [x] Next.js 15 App Router + `output: 'standalone'`
- [x] Tailwind + shadcn-ready (UI paketinden `@yorecebimde/ui`)
- [ ] Theme provider (system/light/dark) — **Faz 2** (DESIGN.md netleşince)
- [x] i18n: next-intl v3.22+ modern API (`requestLocale`)
  - [x] Locale files: `apps/web/messages/tr.json`, `en.json`
  - [ ] Middleware locale detection — şu an default 'tr', explicit locale routing **Faz 2**
- [x] Route groups:
  - [x] `(public)/page.tsx` — Hero + dark tile + parchment CTA (DESIGN.md reference pattern)
  - [x] `(public)/layout.tsx` — global nav (black slim bar) + footer (parchment, 4 sütun)
  - [x] `(public)/giris/page.tsx` — Better-Auth client + react-hook-form + Zod
  - [x] `(public)/kayit/page.tsx` — KVKK + marketing opt-in checkbox'larıyla
  - [x] `(seller)/seller/dashboard/page.tsx` — placeholder
  - [x] `(admin)/admin/dashboard/page.tsx` — placeholder
- [x] Middleware: `src/middleware.ts` — deviceID cookie üretimi (misafir wishlist için)
- [ ] Middleware: auth check + role-based redirect — **Faz 2** (gerçek korumalı sayfalarla)
- [ ] API client: `src/lib/api.ts` — generic fetch wrapper; şu an sadece `lib/auth-client.ts` var. **Faz 2'de generic client + CSRF**
- [x] Better-Auth client (`@yorecebimde/auth/client` üzerinden)
- [x] Form helpers — react-hook-form + Zod resolver (login + register form'larında çalışıyor)
- [x] Next.js custom `/api/health` route (Docker healthcheck için)
- [x] `not-found.tsx` (404 sayfası)
- [x] Security headers (`next.config.ts` — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- [ ] Loading skeletons — **Faz 2**
- [ ] Error boundary + Sentry — **Faz 7**

### 2.10. UI (packages/ui)
- [x] shadcn base setup — **kısmi**: Button (primary/ghost/dark + size sm/md/lg) + Input (label + errorMessage) eklendi. **Form, Card, Dialog, Toast Faz 2'de** (gerçek formlarla birlikte).
- [x] `cn()` utility (clsx + tailwind-merge)
- [x] Custom Yörecebimde tema — Tailwind config'te DESIGN.md reference pattern tokenları (Action Blue, parchment, ink, hairline, divider, pill/sm/md/lg radius scale, product shadow)
- [ ] Logo placeholder — **Faz 2** (brand finalize olunca)
- [x] Icon set — lucide-react peer dep + tipler hazır
- [x] Layout shells — `apps/web/src/app/(public)/layout.tsx` çalışır durumda; `@yorecebimde/ui`'da paylaşılan layout shell'i **Faz 4-5'te** (seller/admin paneli ortak kullanım için ayıklanacak)

### 2.11. CI/CD
- [x] `.github/workflows/ci.yml`:
  - [x] pnpm install (frozen-lockfile)
  - [x] typecheck (Turbo)
  - [x] lint
  - [x] test (Postgres + Redis + Meilisearch + MinIO service containers)
  - [x] db:migrate + db:generate
- [x] `.github/workflows/build-and-deploy.yml`:
  - [x] Docker buildx + cache (gha)
  - [x] GHCR push (web + api images)
  - [x] Coolify webhook trigger (conditional on COOLIFY_WEBHOOK_URL secret)
- [x] apps/api/Dockerfile + apps/web/Dockerfile (multi-stage, healthcheck, non-root user)
- [ ] Branch protection rules — repo Git init edilince GitHub UI'dan elle yapılacak
- [ ] CODEOWNERS — **Faz 2 başında**
- _Test:_ Workflow'lar yazıldı ama henüz CI'da koşulmadı (repo Git init bekliyor).

### 2.12. Deployment
> Lokal smoke-test başarılı; gerçek VPS deploy'u Faz 1 sonu / Faz 2 başına bırakıldı.
- [x] Caddyfile yazıldı (`infra/caddy/Caddyfile`) — staging için gkteches subdomain config'leri
- [x] `infra/docker/compose.prod.yml` hazır
- [ ] Contabo VPS sağla — **sıradaki adım**
- [ ] Initial server hardening (SECURITY.md §17) — kullanıcı tetikleyecek
- [ ] Docker + Coolify kurulumu (VPS)
- [ ] DNS: `yorecebimde-staging.gkteches.com` → VPS IP
- [ ] Coolify proje setup: yorecebimde-staging
- [ ] Env vars Coolify'a girilir
- [ ] First deploy
- [ ] HTTPS: Caddy otomatik LE
- [ ] Smoke test: anasayfa staging'de açılıyor mu?
- [x] **Lokal smoke test başarılı** — anasayfa, /giris, /kayit, /api/auth/sign-up/email, /api/auth/sign-in/email, /healthz, /readyz hepsi 200/expected

### 2.13. Monitoring
> Tamamı Faz 1 sonu / Faz 2 başına bırakıldı — VPS deploy'u sonrası kurulacak.
- [ ] Sentry self-host (ayrı VPS veya aynı sunucu Docker) — **VPS sonrası**
- [ ] Sentry projeleri: yorecebimde-web, yorecebimde-api
- [ ] NestJS + Next.js Sentry SDK entegrasyonu
- [ ] Grafana stack (`infra/docker/compose.observability.yml` dosyası **henüz yok** — kurulumla birlikte eklenecek)
- [ ] Prometheus scrape: `/metrics` endpoint NestJS'e ekle (`@willsoto/nestjs-prometheus`)
- [ ] Loki + Promtail (Docker log driver)
- [ ] Basic dashboards (HTTP, DB, queue)
- [ ] Uptime Kuma kurulumu
- [ ] Telegram/Discord alert webhook

### 2.14. Testing Baseline
- [x] Vitest config per package (test script + `--passWithNoTests` flag)
- [ ] Testcontainers helper (Postgres + Redis) — **Faz 2 başında** (gerçek integration testleriyle)
- [x] First tests — 13/13 geçti:
  - [x] Crypto round-trip (encrypt → decrypt + IV randomness + tamper detection)
  - [x] Slug TR transliterate + collision retry
  - [x] Phone normalize (4 format) + mask + boolean wrapper
  - [ ] Auth register flow — **manuel smoke test geçti**, vitest integration **Faz 2**
  - [ ] Auth login + 2FA — **Faz 4** (2FA aktif olunca)
  - [ ] User repository CRUD — **Faz 2**
  - [ ] Tenant context middleware test — **Faz 2** (integration test w/ Postgres)
  - [ ] RLS policy: seller A ≠ seller B — **Faz 2** (sellers tablosu Faz 2'de aktive olunca)
- [ ] Playwright kurulumu — **Faz 2** (gerçek user flow'larla)

## 3. Çıkış Kriteri (Definition of Done)

### Lokal (✅ tamamlandı)
- [x] `pnpm install` (~930 paket, lockfile) çalışıyor
- [x] `pnpm dev:infra` ile Docker altyapısı ayakta (5 servis healthy)
- [x] `pnpm db:migrate` + `pnpm db:rls` + `pnpm db:seed` çalışıyor — 11 tablo + 5 user
- [x] `apps/api` (port 4000) ve `apps/web` (port 3000) `pnpm dev` ile başlıyor
- [x] Lokal anasayfa (http://localhost:3000) açılıyor — TR i18n render
- [x] Test kullanıcısı kayıt → login akışı baştan sona yürüyor — **email+password ile** (SMS OTP + 2FA Faz 3-4'te eklenecek)
- [x] Typecheck temiz (7/7 paket)
- [x] Unit tests (13/13)
- [x] tasks/todo.md temizlendi, lessons.md'ye Faz 1 dersleri detaylı yazıldı (10+ ders kaydı)

### Staging deploy (⏳ VPS sağlanınca)
- [ ] Anasayfa `https://yorecebimde-staging.gkteches.com` açılıyor
- [ ] Yeni PR açınca CI yeşil yanıyor (workflow yazıldı, repo Git init bekliyor)
- [ ] Merge'de Coolify otomatik deploy + rollback testli
- [ ] Sentry'de test error yakalanıyor (Faz 7)
- [ ] Grafana'da HTTP request grafiği (Faz 7)
- [ ] Uptime Kuma "up" gösteriyor (Faz 7)

### Demo (⏳)
- [ ] Faz 1 demo yapıldı

**Sonuç:** Faz 1'in **kod ve lokal smoke-test kısmı %100 tamam**. Staging deploy + monitoring tetiklenmesi kullanıcının VPS sağlamasıyla başlayacak.

## 4. Riskler

| Risk | Önlem |
|---|---|
| Better-Auth API'sinin NestJS adapter'ı henüz olgun değil | Eğer engel olursa custom JWT + Lucia fallback hazırla |
| Coolify kararsız davranır | Manuel Docker Compose + GitHub Actions SSH backup planı |
| Contabo VPS yavaş kalkar | DigitalOcean Frankfurt geçici tutulur |
| RLS performans etkisi | EXPLAIN ANALYZE benchmark, gerekirse policy basitleştir |

## 5. Sonraki Faza Geçiş

Faz 1 bitince Faz 2 başlar. Faz 2'nin ön koşulları:
- Auth çalışıyor (kullanıcı login olmadan ürün eklenemez)
- DB + Drizzle hazır (yeni tablolar eklenebilir)
- Deploy hattı kurulu (sürekli staging'e atılır)
- Logger + Sentry aktif (geliştirme sırasında error yakalanır)
