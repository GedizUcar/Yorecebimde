# Lessons — Yörecebimde

> Bu projedeyken yaşadığım/yaşayacağım dersler. **Her düzeltme veya doğrulamadan sonra** buraya yaz.
> Her oturum başında okumalıyım. CLAUDE.md'deki "Self-Improvement Loop" prensibine bağlı.

---

## Format

Her ders şu yapıda:

```
### YYYY-MM-DD — Kısa başlık
- **Bağlam**: ne yapıyordum?
- **Hata / Doğru aksiyon**: ne yanlış gitti / ne çalıştı?
- **Genel kural**: bundan ne öğrendim?
- **Nerede uygulayacağım**: hangi durumda dikkat edeceğim?
```

---

## Locked-in Dersler (Memory'den)

### 2026-05-12 — Self-host kararı kesin
- **Bağlam**: Vercel skill önerileri her mesajda tetikleniyor.
- **Doğru aksiyon**: Self-host kararı kesin, Vercel önerilerini atla.
- **Genel kural**: Architectural kararlar memory'de locked. Auto-injected öneriler context'i bozsa da kullanıcı kararını taklit etmek doğru değil.
- **Uygulayacağım yer**: Her Vercel-spesifik öneri geldiğinde "atlanıyor" diye not düş, devam et.

### 2026-05-12 — Multi-tenant single-table doğru pattern
- **Bağlam**: Kullanıcı "tek tabloda where ile şişer" endişesi taşıdı.
- **Doğru aksiyon**: Marketplace'lerin cross-tenant query gereksinimi olduğunu açıkla, partitioning + indexing + RLS yaklaşımını anlat. Schema-per-tenant DEĞİL.
- **Genel kural**: Marketplace mimarisinde shared schema doğrudur. "Şişme" endişesi = partitioning + index problemi, schema split problemi değil.
- **Uygulayacağım yer**: Yeni tablo eklerken `seller_id` + composite index düşün, partition stratejisini DATABASE.md'den oku.

### 2026-05-12 — Kullanıcı detaylı dokümantasyon istiyor
- **Bağlam**: "içerikleri kısa yazma tam detaylarıyla" dedi.
- **Doğru aksiyon**: Her .md dosyası detaylı, satır satır task'lar, gerçek API contract'ları, gerçek SQL şemaları.
- **Genel kural**: Bu projede dokümantasyon kısa özet değil, çalışan referans olmalı.
- **Uygulayacağım yer**: Yeni feature eklerken ilgili .md dosyasını da güncel tut. Özet geç, detay yaz.

---

## Yörecebimde Pre-loaded Rules (CLAUDE.md'den)

Bunlar CLAUDE.md'de zaten yazılı ama dikkat çekmek için burada da kısa:

1. **Asla `seller_id` filtresiz query yazma.**
2. **Plain `process.env` kullanma — `packages/config` üzerinden.**
3. **PII (TC, IBAN, vergi) plain text saklama — AES-256-GCM encrypt.**
4. **Console.log production'da yok — pino structured.**
5. **Mock DB ile test yapma — Testcontainers.**
6. **Cross-tenant cache key yazma — tenant scoped olmalı.**
7. **Sipariş, kargo, ödeme akışlarında dış servisler için idempotency key.**
8. **Yeni endpoint = Zod validation + e2e happy path test.**
9. **Yeni bildirim = `packages/notifications/triggers.ts` merkezine kayıt.**
10. **Migration breaking olmayacak — shadow column pattern.**

---

## Faz Bazlı Notlar

### Faz 1 — Foundation

#### 2026-05-12 — Lokal port'lar başka projelerle çakışıyor
- **Bağlam**: `pnpm dev:infra` ile Postgres 5432'yi açmaya çalıştık.
- **Sorun**: Geliştirme makinesinde `atlas-postgres` (5432) ve `hrmodel-postgres` (5433) çalışıyor.
- **Çözüm**: Yörecebimde portlarını "kendine özel" range'e taşıdım: Postgres 5434, Redis 6380, MinIO 9100/9101, Meilisearch 7710, Mailpit 1026/8026.
- **Genel kural**: Multi-proje geliştirme makinelerinde standart port'lara güvenme — her proje kendine özel port range'i tanımlamalı.
- **Uygulayacağım yer**: Yeni servis eklerken `.env.example` ve `compose.dev.yml`'de "yorecebimde-only" port'lar kullan.

#### 2026-05-12 — Strict TypeScript + `exactOptionalPropertyTypes`
- **Bağlam**: `BaseAppError` constructor'ı `details?: Record<string, unknown>` alıyordu, optional alanları doğrudan iletiyordum.
- **Sorun**: `exactOptionalPropertyTypes: true` ile `optional?: T` ≠ `T | undefined` — explicit `undefined` geçemiyorsun.
- **Çözüm**: `if (opts.details !== undefined) this.details = opts.details` + `buildOpts()` helper ile koşullu spread.
- **Genel kural**: Optional alanlara değer atarken ya conditional spread (`...(x !== undefined ? { x } : {})`) ya da koşullu atama kullan. Asla `{ x: maybeUndefined }` doğrudan.
- **Uygulayacağım yer**: Domain error class'ları, DTO builder'lar, repository update methods.

#### 2026-05-12 — Class'ta `cause` field override etmek
- **Bağlam**: `BaseAppError` `Error`'dan extend ediyor, `cause` property ekliyor.
- **Sorun**: TS 5.5+ `noImplicitOverride` strict — base class'tan member override edenler `override` keyword'ü istiyor.
- **Çözüm**: `override readonly cause?: unknown` declaration.
- **Genel kural**: Tabandan extend ederken `name`, `message`, `cause`, `stack`, `toString`'i override ediyorsan `override` keyword'ü zorunlu.

#### 2026-05-12 — Drizzle-kit `.js` extension'lı schema import'ları çözemiyor (0.28)
- **Bağlam**: `packages/db/src/schema/index.ts` `export * from './auth.js'` pattern'i ile başladı.
- **Sorun**: Drizzle-kit 0.28 esbuild-kit ile CJS-style require ediyor; `.js` ext'li relative path'ler TS dosyalarına resolve olmuyor (`Cannot find module './auth.js'`).
- **Çözüm**: İki katmanlı — (a) db package'ı kendi `uuidv7`'sini kullanır (`@yorecebimde/shared`'i load etmek zorunda kalmaz), (b) drizzle-kit'in yüklediği `packages/db` ağacında `.js` ext'leri tutulur ama 3rd-party paketleri tetiklemez.
- **Genel kural**: Drizzle-kit schema'sını minimum bağımlılıkla tut — workspace shared paketleri import etme. Schema dosyaları "saf" Drizzle DSL olsun.
- **Uygulayacağım yer**: Yeni şema dosyaları eklerken `@yorecebimde/*` import'undan kaçın; sabitler/utility'leri lokal kopyala.

#### 2026-05-12 — ESM `__dirname` yok
- **Bağlam**: `seed/index.ts`, `migrate.ts`, `apply-rls.ts` — `loadDotenv({ path: resolve(__dirname, ...) })`.
- **Sorun**: `"type": "module"` paketlerde `__dirname` tanımlı değil → `ReferenceError`.
- **Çözüm**: `const __dirname = dirname(fileURLToPath(import.meta.url))` standardı.
- **Genel kural**: Workspace TS dosyaları "module" tipindedir; `__dirname`/`__filename` her zaman `import.meta.url`'den türet.

#### 2026-05-12 — NestJS + Fastify + Swagger catch-all controller çakışıyor
- **Bağlam**: `AuthController @All('*')` Better-Auth catch-all + `SwaggerModule.createDocument` çalıştırıldığında bootstrap kilitleniyor.
- **Sorun**: Swagger explorer wildcard route'u tararken takılıyor (`@ApiExcludeController()` olsa bile).
- **Çözüm**: Faz 1'de Swagger'ı devre dışı bıraktım; Faz 2'de Better-Auth handler'ı ayrı bir HTTP context'e taşıdığımda yeniden açılacak.
- **Genel kural**: Swagger ve framework-agnostic catch-all controller'lar birlikte çalışmaz. Auth handler'ı global filter veya middleware'e geçir, controller olarak bırakma.

#### 2026-05-12 — tsx (Node loader) NestJS class-based DI metadata'sını emit etmiyor
- **Bağlam**: `AuthController` constructor'da `private readonly authService: AuthService` — tsx tarafından load edildiğinde `this.authService` undefined.
- **Sebep**: tsx 4.21 default'unda `emitDecoratorMetadata` etkili değil. NestJS class-token DI bunu bekliyor. Symbol token (örn. `@Inject(DB_TOKEN)`) ile sorun yok çünkü explicit.
- **Geçici fix (Faz 1)**: `@Inject(AuthService)` explicit yazdım.
- **Kalıcı fix (Faz 2)**: `@swc-node/register` veya `@nestjs/swc` dev loader'a geç. swc decorator-metadata semantic'i NestJS ile tam uyumlu.
- **Genel kural**: Class-based injection sayısı arttıkça tsx + tsx-watch yetersiz kalır. SWC tabanlı bir loader'a geç.

#### 2026-05-12 — Better-Auth varsayılan base path `/api/auth/...`
- **Bağlam**: AuthController'ı `/auth/*`'a koymuş, global prefix `v1` ile `/v1/auth/*` haline gelmişti.
- **Sorun**: Better-Auth route table `/api/auth/sign-up/email` arar, `/v1/auth/...`'i tanımaz → 404.
- **Çözüm**: AuthController path'ini `api/auth` yaptım + `setGlobalPrefix`'in exclude'una `/api/auth/(.*)` ekledim.
- **Genel kural**: Üçüncü taraf "handler" tipi route'ları global prefix dışında bırak. Her zaman exclude listesine `/api/auth/(.*)` (Better-Auth) gibi external base path'leri yaz.

#### 2026-05-12 — `next-intl` v3.22+ async API
- **Bağlam**: `getRequestConfig(async ({ locale }) => ...)` deprecated; runtime'da `headers().get()` await'siz hata fırlatıyor.
- **Çözüm**: `getRequestConfig(async ({ requestLocale }) => { const locale = await requestLocale; ... })`.
- **Genel kural**: next-intl güncellerken release notes'u oku; `requestLocale` artık standart.

#### 2026-05-12 — Next.js 15.1 → 15.5 `experimental.typedRoutes` taşındı
- **Bağlam**: `next.config.ts` içinde `experimental: { typedRoutes: true }`.
- **Düzeltilecek**: Faz 2 başında `typedRoutes: true` (top-level) yapılacak.
- **Genel kural**: Next.js minor upgrade'lerde "experimental" namespace düzenli olarak temizleniyor; deprecated warning'leri biriktirme.

#### 2026-05-12 — VPS nginx: template vs runtime drift (KRİTİK)
- **Bağlam**: orkestra-nginx config'i bind-mount `nginx.conf → /etc/nginx/nginx.conf.template`. docker-entrypoint.sh start'ta `envsubst < template > /etc/nginx/nginx.conf` ile process eder.
- **Sorun**: 3 paralel projeden ikisinin (plaskal, ikcebimde) vhost'ları **template'de yoktu** — runtime'da container içine elle eklenmiş + `nginx -s reload` ile yüklenmişlerdi. `docker restart` envsubst'ı yeniden çalıştırınca **bu vhost'lar silindi** ve plaskal/ikcebimde production'da düştü.
- **Geçici düzeltme**: vhost'ları template'e kalıcı olarak ekledim (append-only marker'lı) + orkestra-nginx'i ilgili Docker network'lere yeniden bağladım.
- **Genel kural**:
  1. **Bind-mount template'i değil — runtime config'i kontrol et.** Container'a config inject etmeden önce `docker exec <c> cat /actual/path` ile gerçek state'i gör.
  2. **Container restart'tan önce mutlaka template ile runtime farkını kıyasla** (diff). Çakışma varsa template'e taşı, sonra restart.
  3. **`nginx -s reload`** sadece config'i okur, **`docker restart`** entrypoint'ten geçer — bu fark hassas.
- **Uygulayacağım yer**: shared multi-project nginx setup'larda her seferinde önce `docker exec <nginx-container> cat /etc/nginx/nginx.conf` ile gerçek aktif config'i alıp diff'le; template ile uyumsuzluk varsa önce senkronize et.

#### 2026-05-12 — Cloudflare Origin Cert + Proxy ON setup
- **Bağlam**: Yörecebimde için CF Origin CA cert üretip nginx'e koydum, DNS'ler Proxy ON.
- **Doğru aksiyon**: CF dashboard'dan tek bir cert (15 yıl) tüm subdomain'leri kapsayan SAN'larla üret (`*.subdomain.example.com` + `subdomain.example.com`). Cert ve key modulus eşleşmesi `openssl x509 ... -modulus` vs `openssl rsa ... -modulus` ile doğrula.
- **Genel kural**: Cloudflare proxy arkasında origin cert kullanmak — origin'in TLS'i CF ile arasında, public TLS CF'in. SSL/TLS modu **Full (strict)** olmalı (panelinden kontrol). HTTP 526 → CF origin TLS handshake fail; HTTP 520 → origin TCP timeout/empty reply.
- **Uygulayacağım yer**: yeni subdomain eklerken (1) DNS A kaydı CF proxy ON, (2) cert wildcard'a giriyor mu kontrol et, (3) origin nginx vhost'unda `ssl_certificate` yolu doğru mu test et.

#### 2026-05-12 — Faz 1 DOD aşıldı
Yapılan smoke-test:
- ✅ pnpm install (~930 paket, lockfile)
- ✅ Typecheck — 7/7 paket temiz
- ✅ Unit test — 13/13 (crypto round-trip, slug TR, phone mask)
- ✅ Docker dev infra (Postgres + Redis + MinIO + Meilisearch + Mailpit)
- ✅ DB: 11 tablo migrate + RLS append-only (audit_logs) + 5 user seed
- ✅ API: `/healthz`, `/readyz` (Postgres ping), `/v1/users/count` çalışıyor
- ✅ Better-Auth: `/api/auth/sign-up/email` ve `/api/auth/sign-in/email` real flow başarılı; auth_user + auth_session DB'de persist
- ✅ Web: anasayfa, /giris, /kayit 200 OK; TR/EN i18n çalışıyor (next-intl modern API)
- ⚠ DI workaround (`@Inject(AuthService)`) — Faz 2'de swc-node loader'a geçince temizlenir
- ⚠ users tablosuna onSignUp hook bağlanmadı (auth_user var, users yok) — Faz 2'de Better-Auth hook ile bağlanacak

### Faz 2 — Catalog
_TBD_

### Faz 3 — Checkout
_TBD_

### Faz 4 — Seller Panel
_TBD_

### Faz 5 — Super Admin
_TBD_

### Faz 6 — AI Bot + Boost
_TBD_

### Faz 7 — Mobile + Hardening

### 2026-05-13 — React 19 ReactNode/ReactPortal tip bug'ı
- **Bağlam**: Web typecheck `<ToastContext.Provider>` üzerinde `ReactElement<unknown,...> is not assignable to ReactPortal: 'children' missing` hatası. Aynı dosya path'inden iki kez yüklenmiş ReactNode tipleri identity-mismatch yapıyor.
- **Doğru aksiyon**: pnpm root'a `overrides: { "@types/react": "19.0.7", "@types/react-dom": "19.0.3" }` pin et. Yeni patch versiyonları (19.2.14) `ReactPortal` interface'inde `children: ReactNode` requirement değişikliği yüzünden user-space JSX'i kıyor.
- **Genel kural**: Yeni @types/react patch versiyonları breaking olabiliyor. Workspace çok pakette farklı React versiyon kullanıyorsa (web 19, mobile 18) override şart.
- **Uygulayacağım yer**: Her pnpm install sonrası web typecheck'i kontrol et.

### 2026-05-13 — Drizzle-kit `.js` extension drift
- **Bağlam**: ESM Node runtime `from './users.js'` ister, drizzle-kit `from './users'` (without `.js`) ister. Migration üretimi öncesi sed ile strip + sonra restore manuel yapılıyordu, unutulup commit'lere sızıyor.
- **Doğru aksiyon**: `pnpm db:generate` artık `src/scripts/generate-migration.ts` wrapper'ı çağırıyor — strip → drizzle-kit → restore otomatik. Raw çağrı için `pnpm db:generate:raw`.
- **Genel kural**: Build/codegen tooling source code'u modify ediyorsa, wrapper script ile invariant'ı koru. Manuel adım = drift kaynağı.

### 2026-05-13 — Validation hook false positive: Expo + Next.js conflate
- **Bağlam**: `apps/mobile` (Expo) dosyalarına yazarken `"use client" directive` ve `headers() async` uyarıları geliyor — Expo dosyalarına Next.js skill'i yanlış match oluyor.
- **Doğru aksiyon**: Path'i kontrol et (`apps/mobile/` ise Expo, `apps/web/` ise Next.js). False positive'leri kullanıcıya not düşüp atla, "use client" Expo'da geçersiz.
- **Genel kural**: Validation hook'ları monorepo'da yanlış skill match edebilir. Path'e bak, gerçek framework'ü doğrula.

### 2026-05-13 — Better-Auth plugin types wrapper'da kaybolur
- **Bağlam**: `@yorecebimde/auth/client` wrapper'ı `createAuthClient({ plugins: [twoFactorClient()] })` çağırıyor ama dönüş tipi wrapper imzasına generik olmadığı için plugin metodlarını (`authClient.twoFactor.enable`) tip-safe açmıyordu. `as any` cast'lerle çözülmüştü.
- **Doğru aksiyon**: Wrapper return type'ını explicit annotate etme, inference'a bırak. Cast'leri kaldır + `result.data.totpURI` (Better-Auth `Data<T>` wrapper'ı).
- **Genel kural**: Generic factory wrapper yazarken explicit return type ANNOTATE etme. Type-cast workaround'ları genellikle wrapper'ın return imzasının çok dar olmasından kaynaklanır.

### 2026-05-13 — Stale tsbuildinfo cache yanıltıcı errors
- **Bağlam**: `pnpm install` sonrası Fastify override değişti, tsc hâlâ eski path'ler için "type not assignable" hatası veriyordu (`fastify@4.28.1` ↔ `fastify@4.29.1`). pnpm lockfile temiz ama tsc inkremental cache stale.
- **Doğru aksiyon**: `rm -f apps/*/tsconfig.tsbuildinfo` çalıştır, sonra `pnpm typecheck`.
- **Genel kural**: Beklenmedik "type X not assignable to X" (aynı versiyon görünen) errors → tsbuildinfo'yu sil. Stale `.pnpm/<pkg>@<old-version>/` dirini de elle sil.

### 2026-05-13 — Fastify plugin TS augmentation hell
- **Bağlam**: `@fastify/cookie` plugin'i `FastifyInstance` interface'ini augment ediyor. NestJS adapter ile direct Fastify dep arasında version mismatch typing'i kırıyor.
- **Doğru aksiyon**: `pnpm.overrides` ile fastify pin et + plugin'leri `FastifyPluginAsync<HelmetOptions>` / `FastifyPluginCallback<CookieOptions>` ile cast et (as any yerine).
- **Genel kural**: Fastify ecosystem'inde plugin augmentation versiyon hassas. Monorepo'da fastify'ı override ile pin et.

### 2026-05-13 — typedRoutes + `as never` cleanup
- **Bağlam**: `experimental.typedRoutes: true` açıldı. Tüm `<Link href={... as never}>` cast'leri (22 adet) sed batch ile temizlendi.
- **Doğru aksiyon**: `sed -i 's/ as never}/}/g' *.tsx` + `sed -i 's/ as never)/)/g'`. Template literal href'ler Next.js inference ile type-safe.
- **Genel kural**: Yeni route eklendikçe typedRoutes uyarısı verir → düzelt. `as never` artık code smell.

### 2026-05-13 — NestJS DI cleanup: zaten temiz
- **Bağlam**: Faz 1 review notları "explicit @Inject() kaldır" diyordu.
- **Doğru aksiyon**: Audit sonucu — kalan `@Inject(...)` sadece **Symbol token'lar** (DB_TOKEN, S3_TOKEN, REDIS_TOKEN, MEILI_INDEXES) + `forwardRef` için. Bunlar TS metadata reflection ile çözülemez, zorunlu.
- **Genel kural**: NestJS'te class-typed providers için `@Inject()` gerekmez ama Symbol/string token'lar için ZORUNLU.

### 2026-05-13 — Redis sliding window rate limit
- **Bağlam**: In-memory `Map<key, slot>` rate limit multi-instance ölçeklenmiyor.
- **Doğru aksiyon**: `RateLimitGuard` Redis `ZADD/ZREMRANGEBYSCORE/ZCARD` ile sliding window. Pipeline atomik. TTL = window seconds (auto-cleanup).
- **Genel kural**: Distributed state için Redis. In-memory Map sadece single-instance dev için.
