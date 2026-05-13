# DEPLOYMENT — Yörecebimde

> Self-hosted production deploy mimarisi: Contabo VPS + Coolify + Caddy + Docker Compose,
> GitHub Actions CI, backup, monitoring, rollback, environment yönetimi.

---

## 1. Hosting

### 1.1. Sağlayıcı: Contabo VPS

**Önerilen specs (başlangıç):**
- CPU: 8 vCPU
- RAM: 32 GB
- Storage: 800 GB NVMe
- Bandwidth: 32 TB/ay
- Location: Almanya (Frankfurt) — TR'ye yakın latency
- ~ €30-40/ay

**Production önerisi (Faz 7 sonrası):**
- 2x VPS Cluster (app + worker ayrı)
- 1x DB-only VPS (16 GB RAM, 1 TB SSD)
- 1x Backup/observability VPS (8 GB RAM)

### 1.2. KVKK Düşüncesi

KVKK'da bazı veriler için Türkiye lokasyonu zorunlu (özel nitelikli kişisel veri). Bizde:
- Sağlık verisi yok
- Biyometrik veri yok
- TC kimlik var → "kimlik bilgileri" özel kategori sayılır

**Çözüm:** TR'ye yakın AB ülkesinde başla, KVK Kurumu yorumu netleşirse TR'ye geçiş kolay. Veya hibrit: app AB'de, PII şifrelenmiş DB ayrı TR sunucuda (ileride).

---

## 2. Production Mimarisi

```
                                                       Internet
                                                          │
                                                          ▼
                                              ┌──────────────────────┐
                                              │  Cloudflare / DNS    │  (opsiyonel, ileride)
                                              │  - DDoS protection   │
                                              │  - WAF               │
                                              │  - CDN (statik)      │
                                              └──────────┬───────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │   Caddy (reverse)    │
                                              │   - TLS 1.3 auto     │
                                              │   - HTTP/3           │
                                              │   - Rate limit       │
                                              │   - gzip/brotli      │
                                              └──────────┬───────────┘
                                                         │
                                  ┌──────────────────────┼──────────────────────┐
                                  ▼                      ▼                      ▼
                          ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
                          │  Next.js Web │       │  NestJS API  │       │  WS Gateway  │
                          │  (Docker x2) │       │  (Docker x2) │       │  (Docker x1) │
                          └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
                                 │                      │                      │
                                 │                      ▼                      │
                                 │              ┌──────────────┐               │
                                 │              │ BullMQ Worker│               │
                                 │              │  (Docker x2) │               │
                                 │              └──────┬───────┘               │
                                 │                      │                      │
                                 └──────────────┬──────┴──────────────┬───────┘
                                                ▼                     ▼
                                  ┌──────────────────────┐    ┌──────────────┐
                                  │  PgBouncer + Postgres │    │    Redis     │
                                  └──────────────────────┘    └──────────────┘
                                                ▼                     ▼
                                  ┌──────────────────────┐    ┌──────────────┐
                                  │  Meilisearch         │    │    MinIO     │
                                  └──────────────────────┘    └──────────────┘

                                  ┌──────────────────────────────────────────┐
                                  │  Coolify (orchestration)                 │
                                  │  - Git push → auto deploy                │
                                  │  - Env yönetimi                          │
                                  │  - Health check                          │
                                  │  - Rollback                              │
                                  └──────────────────────────────────────────┘

                                  ┌──────────────────────────────────────────┐
                                  │  Observability                           │
                                  │  - Sentry (self-host)                    │
                                  │  - Grafana + Loki + Prometheus           │
                                  │  - Uptime Kuma                           │
                                  └──────────────────────────────────────────┘
```

---

## 3. Coolify Kurulumu

### 3.1. Coolify Nedir

Self-hosted PaaS. Heroku/Vercel deneyimi ama kendi sunucunda. Docker Compose yönetir, git push'la auto-deploy, env yönetimi, SSL, logs, backups.

### 3.2. Kurulum

```bash
# Coolify sunucusunda (Ubuntu 22.04+)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Web UI: https://coolify.yorecebimde.internal (Caddy ile)
```

### 3.3. Proje Bağlantısı

1. Coolify UI'da yeni proje → GitHub repo bağla
2. Branch: `main` → production, `develop` → staging
3. Build pack: Docker Compose
4. Compose file: `infra/docker/compose.prod.yml`
5. Env vars: Coolify UI'dan eklenir (encrypted at-rest)

### 3.4. Health Check

Her servis için Coolify'da tanımlı:
- API: `GET /readyz` → 200
- Web: `GET /api/health` → 200
- Worker: process up (Docker healthcheck)

Health check başarısız → previous deployment'a rollback.

### 3.5. Deploy Akışı

```
git push origin main
   ↓
GitHub Actions: test + lint + typecheck + build
   ↓ (success)
GitHub Actions: Docker images push (registry: ghcr.io)
   ↓
Coolify webhook fires
   ↓
Coolify: pull image + docker compose up -d (rolling)
   ↓
Health check → success → traffic switch
   ↓ (fail) → rollback
```

---

## 4. Docker Compose

### 4.1. Production `infra/docker/compose.prod.yml`

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [web, api, ws]

  web:
    image: ghcr.io/gedizucar/yorecebimde-web:${TAG:-latest}
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.yorecebimde.com
    deploy:
      replicas: 2
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  api:
    image: ghcr.io/gedizucar/yorecebimde-api:${TAG:-latest}
    restart: always
    env_file: .env.production
    deploy:
      replicas: 2
    depends_on: [postgres, redis, meilisearch, minio]
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/readyz"]
      interval: 30s
      timeout: 5s
      retries: 3

  ws:
    image: ghcr.io/gedizucar/yorecebimde-api:${TAG:-latest}
    command: node dist/ws-server.js
    restart: always
    env_file: .env.production
    deploy:
      replicas: 1

  worker:
    image: ghcr.io/gedizucar/yorecebimde-api:${TAG:-latest}
    command: node dist/worker.js
    restart: always
    env_file: .env.production
    deploy:
      replicas: 2
    depends_on: [postgres, redis]

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=yorecebimde
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s

  pgbouncer:
    image: edoburu/pgbouncer:latest
    restart: always
    environment:
      - DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/yorecebimde
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=20
    depends_on: [postgres]

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --save 60 1 --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data

  meilisearch:
    image: getmeili/meilisearch:v1.10
    restart: always
    environment:
      - MEILI_MASTER_KEY=${MEILISEARCH_API_KEY}
      - MEILI_ENV=production
    volumes:
      - meilisearch_data:/meili_data

  minio:
    image: minio/minio:latest
    restart: always
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${MINIO_ACCESS_KEY}
      - MINIO_ROOT_PASSWORD=${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data

volumes:
  caddy_data:
  caddy_config:
  postgres_data:
  redis_data:
  meilisearch_data:
  minio_data:
```

### 4.2. Dev `infra/docker/compose.dev.yml`

Sadece altyapı (Postgres, Redis, MinIO, Meilisearch) — app'ler `pnpm dev` ile lokal.

---

## 5. Caddy Konfigürasyon

`infra/caddy/Caddyfile`:

```caddyfile
{
  email admin@yorecebimde.com
  servers {
    protocols h1 h2 h3
  }
}

# Public web
yorecebimde.com, www.yorecebimde.com {
  reverse_proxy web:3000
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options "DENY"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    Permissions-Policy "geolocation=(self), camera=(), microphone=(), payment=(self)"
    -Server
  }
  rate_limit {
    zone public_web {
      key {remote_ip}
      events 120
      window 1m
    }
  }
}

# API
api.yorecebimde.com {
  reverse_proxy api:4000
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options "nosniff"
    Access-Control-Allow-Origin "https://yorecebimde.com"
    Access-Control-Allow-Credentials "true"
  }
  rate_limit {
    zone api {
      key {remote_ip}
      events 300
      window 1m
    }
  }
}

# WebSocket
ws.yorecebimde.com {
  reverse_proxy ws:4001 {
    transport http {
      versions h1
    }
  }
}

# Storage
storage.yorecebimde.com {
  reverse_proxy minio:9000
  encode gzip
  header Cache-Control "public, max-age=31536000, immutable"
}

# Admin Coolify (internal only — VPN gerekecek ileride)
coolify.yorecebimde.internal {
  reverse_proxy localhost:8000
}
```

---

## 6. GitHub Actions CI

### 6.1. `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: yorecebimde
          POSTGRES_PASSWORD: yorecebimde
          POSTGRES_DB: yorecebimde_test
        ports: [5432:5432]
        options: --health-cmd pg_isready
      redis:
        image: redis:7
        ports: [6379:6379]
      meilisearch:
        image: getmeili/meilisearch:v1.10
        env:
          MEILI_MASTER_KEY: masterKey
        ports: [7700:7700]
      minio:
        image: minio/minio:latest
        env:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        ports: [9000:9000]
        options: --entrypoint sh -c "minio server /data"

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9.12.0 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm db:migrate
      - run: pnpm test
      - run: pnpm test:e2e
```

### 6.2. `.github/workflows/build-and-deploy.yml`

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push web
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/web/Dockerfile
          push: true
          tags: ghcr.io/gedizucar/yorecebimde-web:latest,ghcr.io/gedizucar/yorecebimde-web:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build & push api
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/api/Dockerfile
          push: true
          tags: ghcr.io/gedizucar/yorecebimde-api:latest,ghcr.io/gedizucar/yorecebimde-api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Coolify deploy
        run: |
          curl -X POST -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN }}" \
            ${{ secrets.COOLIFY_WEBHOOK }}
```

---

## 7. Dockerfile'lar

### 7.1. `apps/web/Dockerfile`

Multi-stage build, `output: 'standalone'` ile minimal image.

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/*/package.json packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @yorecebimde/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=builder --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### 7.2. `apps/api/Dockerfile`

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/*/package.json packages/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @yorecebimde/api build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/apps/api/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/apps/api/package.json ./
USER app
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

---

## 8. Environment Yönetimi

### 8.1. Katmanlar

| Ortam | Branch | Domain | Coolify proje |
|---|---|---|---|
| development | (local) | localhost | — |
| staging | `develop` | `*.staging.gkteches.com` | yorecebimde-staging |
| production | `main` | `yorecebimde.com` | yorecebimde-prod |

### 8.2. Secrets Yönetimi

- **Coolify UI'da**: encrypted at-rest, per-environment
- **Lokal**: `.env` (gitignored), `.env.example` ile referans
- **CI**: GitHub Secrets

### 8.3. Env Validation

`packages/config/src/env.ts` Zod schema ile:

```ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  // ...
});

export const env = envSchema.parse(process.env);
```

Startup'ta validate edilir, hata varsa app boot etmez.

---

## 9. Database Migrations

### 9.1. Workflow

1. Local'da schema değiştir (`packages/db/schema/*.ts`)
2. `pnpm db:generate` → migration SQL üretilir (`packages/db/migrations/*.sql`)
3. Test: lokal Postgres'te `pnpm db:migrate`
4. PR → CI'da staging DB'ye migrate dry run
5. Merge → staging deploy → migrate
6. Test sonrası → production deploy → migrate

### 9.2. Production Migration Çalıştırma

Deploy script:

```bash
# Coolify pre-deploy hook
docker compose run --rm api pnpm db:migrate
```

Migration başarısız → deploy abort, eski version aktif kalır.

### 9.3. Breaking Migration Pattern

ASLA mevcut sütunu DROP etmek/rename'lemek. Pattern:

1. **Shadow column**: yeni sütun ekle (nullable)
2. **Backfill**: BullMQ job ile değerleri taşı
3. **Dual-write**: yeni kod hem eski hem yeni sütuna yazar
4. **Switch**: yeni kod sadece yeni sütuna yazar/okur
5. **Cleanup**: eski sütun DROP (sonraki release)

---

## 10. Backup

### 10.1. Postgres

**Full backup (günlük, gece 03:00):**

```bash
# Cron / systemd timer / BullMQ job
pg_dump --format=custom --jobs=4 --compress=9 yorecebimde > /backups/db-$(date +%Y%m%d).dump
gpg --encrypt -r backup@yorecebimde.com /backups/db-$(date +%Y%m%d).dump
mc cp /backups/*.dump.gpg minio/backups/postgres/
```

**WAL streaming (15 dk):**

`postgresql.conf`:
```
archive_mode = on
archive_command = 'mc cp %p minio/backups/wal/%f'
wal_level = replica
```

### 10.2. MinIO

- Bucket replication: production MinIO → backup MinIO (haftalık)
- Off-site: Backblaze B2 (haftalık `mc mirror`)

### 10.3. Test Restore

3 ayda bir staging'e restore drill:

```bash
gpg --decrypt /backups/db-20260512.dump.gpg | pg_restore --jobs=4 -d yorecebimde_staging
```

---

## 11. Monitoring

### 11.1. Sentry (Self-host)

- Repo: https://github.com/getsentry/self-hosted
- Kurulum: kendi VPS'inde Docker Compose
- App entegrasyon: `@sentry/nextjs`, `@sentry/nestjs`, `expo-sentry`
- Error sampling: %100 dev, %10 prod
- Performance traces: %5 prod

### 11.2. Grafana Stack

```yaml
# infra/docker/compose.observability.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro

  loki:
    image: grafana/loki:latest
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml:ro

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail/promtail-config.yml:/etc/promtail/config.yml:ro

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
```

### 11.3. Metrikler

NestJS expose eder `/metrics` endpoint:

- HTTP request duration (histogram)
- HTTP error rate
- DB query duration
- BullMQ job duration & failure rate
- Active WebSocket connections
- Redis ops/sec
- Custom business metrics: orders/min, GMV, signup rate

### 11.4. Alerting

Grafana → AlertManager → Telegram/Slack/Email:

- Error rate > 5% → SEV-2
- P95 latency > 1s → SEV-3
- DB connections > 80% pool → SEV-3
- Disk > 80% → SEV-2
- Memory > 90% → SEV-2
- Postgres replica lag > 5m → SEV-2

### 11.5. Uptime Kuma

- Endpoint'leri her dakika ping'ler
- Status page (public): `status.yorecebimde.com`
- Discord/Telegram bildirim

---

## 12. Rollback

### 12.1. Coolify ile

Coolify UI'da "Deployments" → eski versiyona "Redeploy" tıkla.

### 12.2. Manuel

```bash
# Sunucuda
cd /var/lib/coolify/applications/yorecebimde
docker compose pull api:OLD_SHA
TAG=OLD_SHA docker compose up -d
```

### 12.3. Database Migration Rollback

Drizzle migration'lar tek yönlü (forward). Rollback için:

1. Eski versiyona app rollback
2. Schema değişikliği geri alınmaz (data loss riski)
3. Kritikse: manuel SQL ile düzelt (her zaman migration history'sini sync'leyerek)

**Pratik**: shadow column pattern sayesinde rollback nadiren gerekir.

---

## 13. Scaling

### 13.1. Vertical (kolay)

Coolify panelinden replica sayısını artır:
- `web: replicas: 4` (HTTP load)
- `api: replicas: 4` (HTTP load)
- `worker: replicas: 4` (queue depth artıkça)

Caddy zaten round-robin yapar.

### 13.2. Horizontal (zor)

- Postgres → read replica + PgBouncer pool
- Redis → cluster mode (BullMQ destekler)
- Meilisearch → sharding (manuel)
- MinIO → distributed mode (4+ node)

### 13.3. K8s'e Geçiş

Coolify Docker Swarm benzeri orchestration yapıyor. Faz 8+'da gerekirse:
- Helm chart üret
- Managed K8s (DigitalOcean / OVH)
- Argo CD

---

## 14. SSL / TLS

- Caddy otomatik Let's Encrypt
- Wildcard sertifika: `*.yorecebimde.com` (DNS challenge ile)
- HSTS preload list başvurusu (yıllık)
- TLS 1.3 zorunlu, eski siphersuites kapalı

---

## 15. DNS

- DNS sağlayıcı: Cloudflare (ileride) veya `gkteches` mevcut sağlayıcısı
- Records:
  - `yorecebimde.com` A → VPS IP
  - `www.yorecebimde.com` CNAME → `yorecebimde.com`
  - `api.yorecebimde.com` A → VPS IP
  - `ws.yorecebimde.com` A → VPS IP
  - `storage.yorecebimde.com` A → VPS IP
  - `status.yorecebimde.com` A → Uptime Kuma VPS
  - MX → email sağlayıcı (Mailgun/Resend doğrulama TXT)
  - TXT → SPF, DKIM, DMARC

---

## 16. Disaster Recovery Drill

3 ayda bir:

1. **Backup restore**: production dump'ı staging'e restore et, app'i staging'de çalıştır
2. **Sunucu replacement**: yeni VPS provision, Coolify install, app deploy
3. **DNS switch**: TTL 60s ayarlı olduğu için hızlı switch
4. **Veri kaybı testi**: WAL streaming sayesinde son 15dk'yı kurtar
5. **Süre ölçümü**: RTO < 4 saat hedefine ulaşıyor muyuz?

---

## 17. Server Hardening (Initial Setup)

```bash
# Ubuntu 22.04 LTS
# 1. Sistem güncelle
apt update && apt upgrade -y

# 2. Firewall (ufw)
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# 3. SSH hardening
# /etc/ssh/sshd_config
# PermitRootLogin no
# PasswordAuthentication no
# Port 2222 (default 22'den değiştir)

# 4. Fail2Ban
apt install fail2ban -y
systemctl enable fail2ban

# 5. Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# 6. Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 7. Unattended-upgrades (security patches)
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades

# 8. Auditd
apt install auditd -y
```

---

## 18. Cost Estimate (Aylık, Production)

| Kalem | Maliyet |
|---|---|
| Contabo VPS (app+db+worker bir arada) | €35 |
| Backup VPS (lighter) | €15 |
| Backblaze B2 (off-site backup) | $5 |
| Domain | $15/yıl |
| Resend email | $0 (3k email/ay free) - $20 |
| NetGSM SMS | ~₺500 (paket bazlı) |
| Sentry self-host | $0 (kendi VPS'imizde) |
| Cloudflare (ileride) | $0 (free tier) |
| Iyzico | %1.5 işlem başı |
| Gemini API | ~$10 (düşük hacim) |
| **Toplam (alt limit)** | ~€60 + ₺500 |

Scale olunca:
- DB ayrı VPS → +€30
- CDN → +€20
- More worker → +€30

---

## 19. Yapılacaklar Listesi

bkz. [PHASES/PHASE-1-FOUNDATION.md](PHASES/PHASE-1-FOUNDATION.md) altı detaylı liste.
