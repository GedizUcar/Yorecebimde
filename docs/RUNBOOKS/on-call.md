# On-Call & Incident Response Runbook

> Production sorunlarına nasıl müdahale edileceğinin standart prosedürü.

---

## Roller

- **On-call mühendisi**: rotasyon, alert'lere ilk yanıt verir
- **Incident commander (IC)**: Sev-1'lerde belirlenir, koordinasyonu sağlar
- **Communicator**: müşteri destek, status page, social media

Faz 8'de PagerDuty/Opsgenie. Şu an: Slack #on-call kanalı + Telegram bot.

---

## Severity Sınıflandırma

| Severity | Tanım | SLO yanıt süresi | Örnek |
|---|---|---|---|
| **Sev-1** | Tam outage / data loss / KVKK ihlali | 15 dk | API down, ödeme alınamıyor, DB corrupt |
| **Sev-2** | Major degradation | 1 saat | P95 > 2s, %5+ error, bir feature çalışmıyor |
| **Sev-3** | Minor / partial | 4 saat | Tek satıcı login yapamıyor, image upload yavaş |
| **Sev-4** | Cosmetic / non-urgent | 1 iş günü | UI glitch, log gürültüsü |

---

## Alert → Aksiyon Matrisi

| Alert | İlk kontrol | Hızlı mitigation |
|---|---|---|
| `http_error_rate > 5%` | Grafana → endpoint kırılımı | Affected endpoint feature flag kapat |
| `http_p95 > 1s` | DB slow query / Redis lag | Cache warm-up, slow query EXPLAIN |
| `db_connections > 80%` | Idle in transaction sayısı | Stale connection kill, connection pool restart |
| `bullmq_failed > 100/h` | Failed job log | Retry mantığını incele, queue temizle |
| `iyzico_webhook_late` | Iyzico panel + paymentRef'i | Manuel verify + state machine ileri al |
| `disk_usage > 80%` | `df -h` | Log rotate, eski docker image temizle |
| `cert_expires_in < 14d` | Cloudflare Origin Cert | Cert yenile (15 yıl ama deneme) |
| `backup_failed` | `/var/lib/yorecebimde/backups/backup.log` | Manuel backup tetikle |

---

## Standart İlk 15 Dakika

### 1. Acknowledge (1 dk)
- Slack thread aç: `[SEV-X] başlık + ne biliyoruz`
- Status page'i "investigating" yap
- Müşteri destek'e durumu bildir

### 2. Triage (5 dk)
```bash
# Health
curl -f https://yorecebimde-staging.gkteches.com/api/healthz
curl -f https://yorecebimde-staging.gkteches.com/api/readyz

# Container'lar
ssh root@<vps>
docker compose -f /opt/yorecebimde/infra/docker/compose.staging.yml ps

# Son 100 satır API log
docker logs --tail 100 yorecebimde-api

# Son hatalar (Sentry'e bağlanılamıyorsa)
docker logs yorecebimde-api 2>&1 | grep -i error | tail -20

# DB connection sayısı
PGPASSWORD=$PGPASSWORD psql -h yorecebimde-postgres -U yorecebimde -d yorecebimde \
  -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# Redis durumu
docker exec yorecebimde-redis redis-cli INFO stats | head -20
```

### 3. Decide (5 dk)
- Düzeltebilir miyiz? → Fix
- Yayılma riski var mı? → Containment (feature flag / scale)
- Rollback gerek mi? → Önceki image'a dön

### 4. Communicate (sürekli)
- Slack thread'e her major adımı yaz
- 30 dk'da bir status page update
- Sev-1: yarım saat içinde tweet / banner

---

## Yaygın Mitigation'lar

### API restart
```bash
ssh root@<vps>
cd /opt/yorecebimde
docker compose -f infra/docker/compose.staging.yml restart yorecebimde-api
```

### Rollback (önceki image'a)
```bash
docker compose -f infra/docker/compose.staging.yml pull --policy missing
# image tag'i .env'de — önceki tag'i set et
sed -i 's|API_IMAGE_TAG=.*|API_IMAGE_TAG=v0.5.2|' infra/docker/.env
docker compose -f infra/docker/compose.staging.yml up -d yorecebimde-api
```

### Feature flag kapatma (Faz 7 system_settings UI)
- `/admin/settings` → bots: `ai.bot_enabled=false`
- API ya da queue worker'da etki için: setting cache invalidate (Faz 8 — şu an restart gerek)

### Rate limit'i daralt (DDoS şüphesi)
- Caddy reverse proxy `rate_limit` zone değiştir
- Veya: `RateLimitGuard` decorator'lı endpoint'lerde max'ı düşür → restart

### DB connection pool reset
```bash
PGPASSWORD=$PGPASSWORD psql -h yorecebimde-postgres -U yorecebimde -d yorecebimde \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE state='idle in transaction'
       AND state_change < now() - interval '5 minutes';"
```

### Queue temizleme (BullMQ stuck)
```bash
docker exec yorecebimde-redis redis-cli
> KEYS bull:*
> DEL bull:notifications:failed
```

---

## Post-mortem

Sev-1 ve Sev-2 sonrası 48 saat içinde post-mortem yazılır:

`docs/POSTMORTEMS/YYYY-MM-DD-short-title.md`:
1. Tarih + süre
2. Etki (kaç kullanıcı, kaç sipariş etkilendi)
3. Detection (nasıl fark edildi, ne kadar sürdü)
4. Timeline (UTC, dakika dakika)
5. Root cause
6. Mitigation (anlık ne yaptık)
7. Action items (kalıcı düzeltme, owner + due date)
8. Lessons

Blameless — odak "süreç nasıl iyileştirilir" üzerine, "kim hata yaptı" değil.

---

## Rotation Schedule

Faz 7 — tek developer (gediz). Faz 8'de ekip büyüyünce:
- Primary: 1 hafta rotasyon
- Secondary: backup, ulaşılamazsa devreye girer
- Handoff: cuma 17:00 — bir saatlik briefing meeting

---

## İletişim Listesi

| Rol | Kişi | İletişim |
|---|---|---|
| Tech lead | @gediz | Slack DM, Telegram |
| Iyzico support | (account manager) | iyzico_support@... |
| Cloudflare support | enterprise | dashboard ticket |
| Contabo support | VPS host | helpdesk@contabo.com |
| Hukuk (KVKK) | TBD | Faz 7.3 launch öncesi belirlenecek |
| Müşteri destek | support@yorecebimde.com | Slack #support |

---

## Üzücü Liste (asla yapma)

1. ❌ `DROP DATABASE` prod'da, restore plan'ı olmadan
2. ❌ Migration script'i prod'da test etmeden
3. ❌ Sırrı (env) Git'e commit
4. ❌ "Hızlı düzeltme" diye encryption'ı bypass
5. ❌ Production'da `console.log` ile PII dump
6. ❌ User şikayet eden bir kullanıcıyı tek başına `users` tablosundan sil — onun siparişleri/finansal kayıtları var
7. ❌ Cache'i tüm tenant'lar için flush — leak riski
