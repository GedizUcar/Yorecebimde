# Yörecebimde

> Yöresel gıda ürünleri için multi-tenant marketplace platformu.
> **Self-hosted** — backend, deploy ve altyapı tamamen kontrolümüzde.

[![Status](https://img.shields.io/badge/status-development-yellow)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## 🎯 Proje Hakkında

Yörecebimde, yöresel gıda üreticilerinin (şahıs ve şirket) doğrudan son kullanıcıya satış yapabildiği bir pazaryeri platformudur. Trendyol/Hepsiburada modelinden ilham alınarak yöresel ve niş gıda ürünleri için tasarlandı.

**Üç ana arayüz:**
1. **Customer (Web + Mobile)** — son kullanıcının alışveriş yaptığı yüzey
2. **Seller Panel** — satıcıların ürün/sipariş/stok/finans yönetimi
3. **Super Admin Panel** — platform operasyonu (başvuru onayı, kategori, dispute, finans)

## 📚 Dökümantasyon

| Doküman | Açıklama |
|---|---|
| [PRD.md](docs/PRD.md) | Ürün gereksinim dökümanı (vizyon, kullanıcı hikayeleri, özellikler) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Sistem mimarisi, akışlar, sequence diagram'lar |
| [DATABASE.md](docs/DATABASE.md) | DB şeması, partitioning, RLS, multi-tenant strateji |
| [API.md](docs/API.md) | REST + WebSocket endpoint listesi |
| [SECURITY.md](docs/SECURITY.md) | KVKK, ETBİS, 2FA, audit, encryption |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Contabo + Coolify + Caddy deploy süreci |
| [ROADMAP.md](docs/ROADMAP.md) | 7 fazlı yol haritası |
| [PHASES/](docs/PHASES/) | Her fazın detaylı todo'su |
| [DESIGN.md](docs/DESIGN.md) | UI/UX tasarım dökümanı |
| [CLAUDE.md](CLAUDE.md) | Claude Code için repo rehberi |

## 🏗️ Mimari Özet

```
yorecebimde/
├── apps/
│   ├── web/         # Next.js — marketplace + seller paneli + super admin
│   ├── mobile/      # Expo (React Native) — customer
│   └── api/         # NestJS — REST + WebSocket
├── packages/
│   ├── db/          # Drizzle schema, migrations
│   ├── shared/      # Zod schemas, types
│   ├── ui/          # shadcn/ui shared components
│   ├── auth/        # Better-Auth config
│   ├── notifications/  # NetGSM + Resend + Expo Push
│   ├── payments/    # Iyzico wrapper
│   ├── invoicing/   # Nilvera wrapper
│   ├── search/      # Meilisearch wrapper
│   ├── storage/     # MinIO wrapper
│   ├── ai-bot/      # Gemini function-calling bot
│   └── config/      # env validation
├── infra/           # Docker, Caddy, scripts
├── docs/            # Tüm dökümanlar
└── tasks/           # todo.md, lessons.md (workflow)
```

## 🧰 Stack

| Katman | Teknoloji |
|---|---|
| Frontend Web | Next.js 15 (App Router) + Tailwind + shadcn/ui |
| Mobile | Expo (React Native) |
| Backend | NestJS + Fastify |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache / Queue | Redis + BullMQ |
| Search | Meilisearch |
| Object Storage | MinIO (S3-compatible) |
| Realtime | WebSocket (`ws`) |
| Auth | Better-Auth |
| Payment | Iyzico (escrow / sub-merchant) |
| e-Fatura | Nilvera |
| SMS | NetGSM |
| Email | Resend |
| Push | Expo Push Notifications |
| AI Bot | Google Gemini Flash Lite 3.1 |
| Reverse Proxy | Caddy |
| Container | Docker Compose |
| CI/CD | GitHub Actions + Coolify |
| Monitoring | Sentry (self-host) + Grafana + Loki + Prometheus + Uptime Kuma |
| Hosting | Contabo VPS |

## 🚀 Hızlı Başlangıç (Development)

> Bu kısım [PHASE-1-FOUNDATION.md](docs/PHASES/PHASE-1-FOUNDATION.md) tamamlandıktan sonra çalışır hale gelecek.

```bash
# Bağımlılıkları kur
pnpm install

# Lokal altyapıyı ayağa kaldır (Postgres, Redis, MinIO, Meilisearch)
docker compose -f infra/docker/compose.dev.yml up -d

# Env hazırla
cp .env.example .env

# DB migration + seed
pnpm db:migrate
pnpm db:seed

# Hepsini başlat
pnpm dev
```

## 📋 Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Tüm app'leri paralel başlat |
| `pnpm build` | Production build |
| `pnpm test` | Unit + integration testler |
| `pnpm test:e2e` | E2E testler (Playwright) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript kontrolü |
| `pnpm db:generate` | Drizzle migration üret |
| `pnpm db:migrate` | Migration uygula |
| `pnpm db:seed` | Test verisi yükle |
| `pnpm db:studio` | Drizzle Studio (DB GUI) |

## 🧪 Test Stratejisi

- **Unit tests**: Vitest (her package + apps/api)
- **Integration tests**: Vitest + Testcontainers (gerçek Postgres + Redis)
- **E2E tests**: Playwright (web) + Detox (mobile)
- **Load tests**: k6 (siparişe kadar tam akış)
- **Security tests**: OWASP ZAP, npm audit, Snyk

## 🔒 Güvenlik

- KVKK uyumlu (aydınlatma, açık rıza, veri silme, taşınabilirlik)
- ETBİS kayıtlı
- Mesafeli satış sözleşmesi otomatik üretim
- PII verisi at-rest AES-256-GCM şifreli
- 2FA (satıcı + admin zorunlu)
- Audit log tüm admin aksiyonları için
- Row Level Security (RLS) multi-tenant izolasyon
- Rate limiting: app + Caddy + Redis

Detay: [SECURITY.md](docs/SECURITY.md)

## 🤝 Katkı

Şu an iç geliştirme aşamasındayız. PR kuralları, branch stratejisi vs. için bkz. [CLAUDE.md](CLAUDE.md).

## 📄 Lisans

Proprietary. Tüm hakları saklıdır.
