# CLAUDE.md — Yörecebimde Project Guide

> Bu dosya Claude Code (ve diğer LLM tabanlı agent'lar) için Yörecebimde repo'sundaki kuralları,
> mimari kararları, "yapma" listesini ve workflow orkestasyonunu tanımlar.
> **Her oturum başında bu dosyayı oku.** Her PR öncesi `tasks/lessons.md` dosyasını oku.

---

## Proje Kimliği

- **Ad:** Yörecebimde (placeholder; gelecekte değişebilir)
- **Domain:** `*.gkteches.com` subdomain (geçici), production domain ileride alınacak
- **Lisans:** Proprietary
- **Hosting:** Self-hosted (Contabo VPS) — **Vercel/Netlify/Railway YOK**
- **Dil:** Kodda İngilizce identifier + comment, kullanıcıya gösterilen string'ler TR/EN i18n
- **Para birimi:** TL (₺) başlangıçta

## Stack (kesin — değiştirme)

| Katman | Teknoloji | Sebep |
|---|---|---|
| Web | Next.js 15 App Router (standalone) | SEO, SSR, RSC, image optim |
| Mobile | Expo (React Native) | Tek codebase, OTA update |
| Backend | NestJS + Fastify | Modüler, DI, guard/interceptor disiplini |
| DB | PostgreSQL 16 + Drizzle | Tip güvenli, SQL kontrolü elde |
| Cache/Queue | Redis + BullMQ | Job queue + session + cache |
| Search | Meilisearch | Türkçe tokenization iyi |
| Storage | MinIO | S3-uyumlu, self-host |
| Realtime | Native WebSocket (`ws`) | Bağımlılık az |
| Auth | Better-Auth | Multi-role, 2FA, OAuth, session built-in |
| Payment | Iyzico (escrow) | Sub-merchant marketplace desteği |
| e-Fatura | Nilvera | Mevcut modül adapte edilecek |
| SMS | NetGSM | TR pazar standardı |
| Email | Resend | DX iyi, self-host'a alternatif |
| Push | Expo Push | Expo ile sıfır kurulum |
| AI Bot | Gemini Flash Lite 3.1 | Function calling, ucuz, hızlı |
| Proxy | Caddy | Otomatik TLS |
| Container | Docker Compose | MVP basit |
| CI | GitHub Actions | Test/lint/build |
| Deploy | Coolify | Self-host PaaS |
| Monitoring | Sentry self-host + Grafana + Loki + Prometheus + Uptime Kuma | |

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, **STOP and re-plan immediately** — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity
- **For Yörecebimde: always consider multi-tenant implications before coding** — her query'de seller_id var mı? RLS policy etkilenir mi? Cross-tenant leak riski var mı?

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- **One task per subagent** for focused execution
- Example: one subagent for entity design, another for API endpoints, another for tests

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project context

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- **For DB changes: verify RLS policies work, test tenant isolation**
- For UI: dev server'ı aç, browser'da feature'ı kullan, console'da error var mı bak

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.
- **Multi-Tenant Safety:** Every query, every endpoint, every piece of data — always scoped to `seller_id`. This is non-negotiable.
- **Type Safety:** No `any` types. Ever. Define proper interfaces for everything.

---

## Yörecebimde'ye Özel Kurallar

### Multi-Tenant Disiplin

Her tablonun `seller_id` sütunu vardır (kullanıcı/customer dahil değil — onlar tenant-bound değil).
Her query'de **mutlaka** seller_id filtreli olmalı. Üç katmanlı koruma:

1. **App seviyesi**: Repository'lerde `seller_id` parametresi zorunlu
2. **DB seviyesi**: Row Level Security (RLS) policy aktif (`session.seller_id` üzerinden)
3. **Audit**: Cross-tenant query'leri loglayan trigger'lar

**Asla yapma:**
- ❌ `SELECT * FROM products` — `WHERE seller_id = $1` olmadan
- ❌ Admin paneline `seller_id`'siz endpoint açmak (admin tüm satıcıları görür ama API path'i belli olmalı — `/admin/sellers/:sellerId/products`)
- ❌ Cache key'ine `seller_id`'siz item koymak — leak olur
- ❌ Foreign key zinciri ile leak (örn. `order_items → order → seller` ama `order_items.seller_id` yok → join'le gelmesi gerek, RLS deny eder)

### Variation Sistemi — Generic

Ürün varyasyonu **iki modda** çalışır:
- **`discrete`**: satıcı sabit seçenekler belirler (1kg, 2kg, 5kg)
- **`stepper`**: satıcı min/max/step belirler (min: 0.5, max: 10, step: 0.5 → kullanıcı slider/spinner ile seçer)

Birim (`unit`) generic — `kg`, `g`, `lt`, `ml`, `adet`, `paket`, `kasa`, vs. Sistem birim listesi DB'de.

**Fiyat birim bazında girilir** (örn. 50 ₺/kg). Toplam fiyat = `unit_price * quantity * unit_conversion_factor`. Otomatik hesaplanır.

### İndirim Sistemi

Bir üründe birden fazla indirim aktif olabilir. Öncelik sırası:
1. **Süreli indirim** (eğer aktif tarih aralığındaysa)
2. **Miktar bazlı indirim** (eğer sepetteki quantity threshold'u geçtiyse)
3. **Kalıcı indirim**

Hepsi tetiklenirse **en yüksek indirim** uygulanır (kullanıcı lehine). UI'da eski fiyat çizik, yeni fiyat kalın.

### Sipariş State Machine

```
pending → confirmed → preparing → shipped → delivered → completed
   ↓         ↓           ↓           ↓          ↓
cancelled  cancelled  cancelled  return_requested
                                     ↓
                                  returned → refunded
                                     ↓
                                  disputed → resolved
```

- `confirmed` durumuna **satıcı manuel** geçirir
- `delivered` sonrası **14 gün** sonra otomatik `completed` (escrow release)
- Kullanıcı `delivered` durumda "Siparişi onayla" → erken `completed`
- Dispute süreci otomatik: satıcının 3 gün cevap hakkı, 7 gün sonra super admin'e eskalasyon

### Bot ve AI

- Gemini Flash Lite 3.1 — function calling
- **Bot konuşması persist edilmez** — sayfa kapanınca silinir
- **Misafir kullanıcı checkout yapamaz** — bot "lütfen giriş yapın" diyecek
- Function call'ların hepsi backend `/api/bot/functions/*` üzerinden — auth+rate-limit zorunlu
- Bot'a verilen function spec'ler `packages/ai-bot/src/functions/` altında, her function ayrı dosya

### Boost Algoritması

- Listelemenin **her 5 üründen 1'i** sponsorlu (ENV ile ayarlanabilir, default 20%)
- Sponsorlu ürünler "Sponsorlu" rozetiyle gösterilir (yasal şeffaflık)
- Sıralama: aktif boost paketleri **paket türü + kalan süre + ürün CTR** ile skorlanır
- Boost listesi Meilisearch'ten gelir, sponsorlu slot'ları sonradan interleave edilir

### Para Akışı

- Iyzico sub-merchant marketplace API
- Müşteri öder → para **Iyzico escrow havuzunda** bekler
- Sipariş `delivered` + 14 gün → otomatik release → satıcı IBAN'ına geçer
- Komisyon **kategori bazlı**, release sırasında otomatik kesilir
- Refund/iade: Iyzico refund API + escrow'dan geri
- Negatif satıcı bakiyesi (refund payout sonrası) → admin uyarı

### Bildirim Tetikleyicileri

Her tetikleyici BullMQ job'una düşer (async, retry'lı). Tüm tetikleyiciler `packages/notifications/triggers.ts` içinde merkezi tanımlı.

| Trigger | Alıcı | Kanallar |
|---|---|---|
| New order | Buyer + Seller | Email + SMS (+ Push) |
| Order confirmed | Buyer | Email + Push |
| Order shipped | Buyer | Email + SMS + Push |
| Order delivered | Buyer | Email + Push |
| Low stock | Seller | Email + SMS |
| New seller application | Super admin | Email |
| Application approved | Seller | Email + SMS (invite link) |
| New dispute | Seller + Super admin | Email |
| Dispute escalated | Super admin | Email |
| Payout completed | Seller | Email |

### Kargo Modeli

İki opsiyon, satıcı seçer:
1. **Self-managed**: Satıcı kendi kargosu ile gönderir, takip no manuel girer
2. **Integrated**: Aras/MNG/Yurtiçi/PTT entegrasyonu — etiket sistem üretir

**Soğuk zincir** ayrı bir bayrak (`is_cold_chain`) — kargo seçeneklerini filtreler.

---

## Kod Konvansiyonları

### Genel

- **TypeScript strict mode** — `tsconfig.base.json`'a bağlı
- **No `any`** — bilmediğin tip için `unknown` + narrowing
- **Path alias**: her package için `@yorecebimde/<package>/*`
- **Import ordering**: external → internal aliases → relative
- **Side-effect free modules** — top-level'da DB call vs. yok
- **Errors**: domain-specific error class'lar (`UserError`, `ValidationError`, `BusinessRuleError`, vs.)
- **Validators**: Zod, her API boundary'de

### Naming

- Dosyalar: `kebab-case.ts` (örn. `seller-onboarding.service.ts`)
- Class'lar: `PascalCase`
- Functions/vars: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- DB tablo: `snake_case` plural (örn. `seller_applications`)
- DB sütun: `snake_case`

### NestJS Pattern

```
apps/api/src/
  modules/
    sellers/
      sellers.module.ts
      sellers.controller.ts        ← HTTP layer
      sellers.service.ts           ← business logic
      sellers.repository.ts        ← DB (Drizzle)
      dto/
        create-seller.dto.ts       ← Zod schemas
      events/
        seller.events.ts
      tests/
```

### Next.js App Router Pattern

```
apps/web/src/app/
  (public)/              ← marketplace (misafir + giriş yapmış)
    page.tsx             ← anasayfa
    products/[slug]/
    cart/
    checkout/
  (seller)/              ← seller paneli (auth: role=seller)
    seller/
      dashboard/
      products/
      orders/
  (admin)/               ← super admin (auth: role=admin)
    admin/
      sellers/
      categories/
      disputes/
  api/                   ← sadece BFF endpoint'leri (auth callback, vs.)
```

**Backend API çağrıları doğrudan NestJS `api/`'ye gider** — Next.js sadece BFF/proxy katmanı.

---

## Yapma Listesi (DO NOT)

- ❌ Vercel-specific kod (Edge Functions, Vercel Cron, Vercel Blob, vs.) — self-host
- ❌ `prisma` — Drizzle kullanıyoruz
- ❌ `any` type — strict mode
- ❌ `seller_id` filtre olmadan query
- ❌ Frontend'den doğrudan DB'ye erişim (Server Action'lar BFF olabilir ama core DB NestJS'te)
- ❌ Misafir kullanıcı için fingerprinting (KVKK) — sadece localStorage UUID
- ❌ Plain-text PII (TC kimlik, IBAN) — AES-256-GCM encrypt
- ❌ Console.log production'da — pino logger zorunlu
- ❌ Mocked DB testlerinde — Testcontainers ile gerçek Postgres
- ❌ Subdomain-per-tenant — tek domain
- ❌ Schema-per-tenant veya DB-per-tenant — shared schema + RLS
- ❌ Doğrudan `process.env` okuma — `packages/config` üzerinden Zod-validated
- ❌ Hardcoded string — i18n key kullan
- ❌ `useEffect` ile data fetching — Server Component veya `@tanstack/react-query`

## Yap Listesi (DO)

- ✅ Her API boundary'de Zod validation
- ✅ Her DB tablosunda `created_at`, `updated_at`, `deleted_at` (soft delete)
- ✅ Her admin aksiyonu → audit log
- ✅ Her business event → BullMQ job (sync side-effect değil)
- ✅ Her PR'da typecheck + lint + test geçmeli
- ✅ Her yeni endpoint için: e2e happy path testi
- ✅ Her form için: client + server Zod validation (aynı schema)
- ✅ Her file upload için: MIME tip + boyut + virus scan (ClamAV)
- ✅ Her job için: idempotency key
- ✅ Her external API call için: timeout + retry policy

---

## Git / PR

### Branch

- `main` → production
- `develop` → staging
- `feat/<phase>-<short-desc>` → feature
- `fix/<short-desc>` → bugfix
- `chore/<short-desc>` → housekeeping
- `refactor/<short-desc>` → refactor

### Commit

Conventional Commits:
```
feat(scope): summary
fix(scope): summary
chore(scope): summary
docs(scope): summary
refactor(scope): summary
test(scope): summary
```

Örn: `feat(catalog): add stepper variation mode to products`

### PR Checklist

- [ ] Plan `tasks/todo.md`'de var ve onaylı
- [ ] Typecheck + lint + test geçiyor
- [ ] Yeni endpoint'lerin Zod schema'sı + e2e test'i var
- [ ] DB değişikliği varsa migration üretilmiş ve seed güncel
- [ ] RLS policy etkilendi mi? Tenant isolation testi var mı?
- [ ] PII içeren alan eklediysen encryption tanımlı mı?
- [ ] Bildirim ekledin mi → `triggers.ts` güncel mi?
- [ ] Audit log gerekiyor mu? Eklendi mi?
- [ ] Yeni env var? `.env.example` güncel mi?
- [ ] Loglama: pino structured (no console.log)
- [ ] i18n: TR + EN string'leri var mı?

---

## Karar Verme: Ne Zaman Ne Yapılır

| Senaryo | Aksiyon |
|---|---|
| Belirsizlik var | Önce `tasks/lessons.md` oku, sonra plan mode'a gir, gerekirse kullanıcıya sor |
| Yeni feature ekleyeceğim | İlgili faz dosyasını oku (`docs/PHASES/PHASE-N-*.md`), todo'ya yaz |
| Multi-tenant ihlali tespit ettim | DERHAL durdur, kullanıcıya raporla |
| 3+ adımlı task | Plan mode + todo list |
| Refactor düşünüyorum | Niye? Bug fix'in scope'una sokma, ayrı PR'a böl |
| API contract değişiyor | Versionla (`/v2/...`) veya backward-compatible et |
| Migration breaking | Rollout plan: shadow column → backfill → swap → cleanup |

---

## Hızlı Referans Dosyalar

| İhtiyaç | Bak |
|---|---|
| Ürün gereksinimleri | [docs/PRD.md](docs/PRD.md) |
| Sistem akışları | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| DB şeması | [docs/DATABASE.md](docs/DATABASE.md) |
| Endpoint listesi | [docs/API.md](docs/API.md) |
| Güvenlik gereksinimleri | [docs/SECURITY.md](docs/SECURITY.md) |
| Deploy süreci | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Fazlar | [docs/ROADMAP.md](docs/ROADMAP.md) + [docs/PHASES/](docs/PHASES/) |
| Şu anki todo | [tasks/todo.md](tasks/todo.md) |
| Hatalar/dersler | [tasks/lessons.md](tasks/lessons.md) |
| UI/UX deseni | [docs/DESIGN.md](docs/DESIGN.md) |
