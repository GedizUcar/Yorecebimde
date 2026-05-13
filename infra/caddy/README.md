# Caddy

> Reverse proxy + TLS otomasyon + HTTP/3 + rate limit.

## Caddyfile

`infra/caddy/Caddyfile` — production config (bkz. [DEPLOYMENT.md §5](../../docs/DEPLOYMENT.md#5-caddy-konfigürasyon))

## Domain'ler

| Domain | Hedef |
|---|---|
| `yorecebimde.com`, `www.yorecebimde.com` | web (Next.js) |
| `api.yorecebimde.com` | NestJS API |
| `ws.yorecebimde.com` | WebSocket gateway |
| `storage.yorecebimde.com` | MinIO public bucket |
| `status.yorecebimde.com` | Uptime Kuma |
| `coolify.yorecebimde.internal` | Coolify panel (VPN-gated) |

## Test Domain (Faz 1)

`*.staging.gkteches.com` subdomain — Caddyfile staging override.

## TLS

Let's Encrypt otomatik. Wildcard için DNS challenge (Cloudflare API token gerekirse).

## Security Headers

CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy — hepsi Caddyfile'da.

## Rate Limit

`caddy-ratelimit` plugin ile zone-based:
- public_web: 120 req/dk/IP
- api: 300 req/dk/IP
- auth: 10 req/dk/IP

## Compression

gzip + zstd (HTTP/3 destekli).
