# Docker

> Docker Compose dosyaları (dev + prod + observability) ve servis Dockerfile'ları.

## Compose Dosyaları

| Dosya | Kullanım |
|---|---|
| `compose.dev.yml` | Lokal dev altyapı (Postgres, Redis, MinIO, Meilisearch, Mailpit) |
| `compose.prod.yml` | Production stack (Caddy, web, api, ws, worker, postgres, redis, vs.) |
| `compose.observability.yml` | Sentry self-host, Grafana, Loki, Prometheus, Uptime Kuma |

## Dockerfile'lar

| App | Dockerfile |
|---|---|
| web | `apps/web/Dockerfile` |
| api | `apps/api/Dockerfile` |
| (ws/worker aynı image) | `apps/api/Dockerfile` (entrypoint farklı) |
| mobile | Yok (Expo EAS Build cloud) |

Multi-stage:
1. `deps` — pnpm install
2. `builder` — pnpm build (Turbo cached)
3. `runner` — minimal Node alpine + dist

## Lokal Dev

```bash
docker compose -f infra/docker/compose.dev.yml up -d
```

Servisler:
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- MinIO: `localhost:9000` (API), `localhost:9001` (Console)
- Meilisearch: `localhost:7700`
- Mailpit: `localhost:8025` (email catchall UI)

## Production

Coolify yönetiyor. Manuel:

```bash
TAG=v0.1.0 docker compose -f infra/docker/compose.prod.yml up -d
```

## Yapı

```
infra/docker/
├── compose.dev.yml
├── compose.prod.yml
├── compose.observability.yml
├── postgres/
│   ├── postgresql.conf
│   └── init/
├── prometheus/
│   └── prometheus.yml
├── loki/
│   └── loki-config.yml
├── promtail/
│   └── promtail-config.yml
└── README.md
```

## Detay

[docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)
