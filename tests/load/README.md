# Load Tests (k6)

Yörecebimde için yük testleri — staging veya prod-like environment'a karşı çalıştırılır.

## Kurulum

```bash
# macOS
brew install k6

# Linux
sudo apt install k6
```

## Senaryolar

| Script | Tip | VU | Süre | Amaç |
|---|---|---|---|---|
| `smoke.js` | Smoke | 1 | 5dk | Sanity — endpoint'ler ayakta mı |
| `load.js` | Load | 100 | 30dk | Beklenen production yük (P95 < 500ms hedef) |
| `stress.js` | Stress | 1000 | 15dk | Peak / spike — sistemin kırılma noktası |
| `soak.js` | Soak | 100 | 24h | Memory leak, replika lag, queue drift |

## Çalıştırma

```bash
# Staging'e karşı smoke
BASE_URL=https://yorecebimde-staging.gkteches.com/api \
  k6 run tests/load/smoke.js

# Production benzeri load
BASE_URL=https://yorecebimde-staging.gkteches.com/api \
  k6 run tests/load/load.js

# Stress test (uyarı — DB connection pool zorlanacak)
BASE_URL=https://yorecebimde-staging.gkteches.com/api \
  k6 run tests/load/stress.js

# Sonuçları Grafana Cloud'a gönder (opsiyonel)
K6_CLOUD_TOKEN=xxx \
  k6 run --out cloud tests/load/load.js
```

## Hedefler (SLO)

- **Smoke**: %100 başarılı, error_rate=0
- **Load**: P95 < 500ms, error_rate < 0.1%, DB connection pool < 80%
- **Stress**: Bozulma noktasını belirle, graceful degradation kontrolü
- **Soak**: 24h sonunda memory growth < %10, FD leak yok

## CI Entegrasyonu

Manuel trigger (`workflow_dispatch`) — production load test'leri otomatik PR'da çalışmaz (maliyet + traffic spike).

```yaml
on:
  workflow_dispatch:
    inputs:
      scenario:
        type: choice
        options: [smoke, load, stress, soak]
```

## Backend Tarafı Hazırlık

Load test öncesi:
1. Staging DB'de yeterli seed data (1000+ ürün, 100+ satıcı)
2. Redis cache temizle (cold cache senaryosu için)
3. Sentry sample rate düşür (load test SDK overhead'i)
4. Slack/Telegram alert'leri "load test in progress" notu

## Rapor

`k6 run --summary-export=summary.json` → CI artifact olarak yüklenir.
Grafana dashboard'da k6 datasource ile metrikler görselleşir (Faz 7.4 — Grafana deploy sonrası).
