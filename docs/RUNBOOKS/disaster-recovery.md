# Disaster Recovery Runbook

> Production outage / data loss durumunda izlenecek prosedür.
> **RTO hedefi**: 1 saat | **RPO hedefi**: 24 saat (günlük backup)

---

## 0. İlk Müdahale (5 dakika)

1. **Incident Slack/Telegram kanalına bildir**: kim, ne, ne zaman, etki
2. **Status page'i güncelle**: status.yorecebimde.com (Uptime Kuma)
3. **On-call mühendisini ara** (rotasyon: docs/RUNBOOKS/on-call.md)

---

## 1. Senaryo: Postgres veri kaybı

### 1.1. Tetikleyiciler
- `DROP TABLE`/`TRUNCATE` yanlışlıkla prod'da
- Disk corruption (S.M.A.R.T. alert)
- Migration breaking change rollback gerekli
- DB pod crash + volume corruption

### 1.2. Hemen yap

```bash
# 1) Hangi servisleri durdur (yazma trafiğini kes)
ssh root@<vps>
docker compose -f /opt/yorecebimde/infra/docker/compose.staging.yml stop yorecebimde-api yorecebimde-web

# 2) Backup listesi
ls -lh /var/lib/yorecebimde/backups/*.dump.gpg

# 3) En son successful backup'ı tespit et
tail -50 /var/lib/yorecebimde/backups/backup.log
```

### 1.3. Restore (drill DB'ye önce — production'a doğrudan ASLA)

```bash
# Test DB'ye restore (data validation için)
./infra/scripts/restore-db.sh \
  /var/lib/yorecebimde/backups/yorecebimde-20260512-030001.dump.gpg \
  yorecebimde_restore_test

# Smoke check
PGPASSWORD=$POSTGRES_PASSWORD psql -h yorecebimde-postgres -U yorecebimde \
  -d yorecebimde_restore_test \
  -c "SELECT count(*) FROM users; SELECT count(*) FROM orders;"
```

### 1.4. Production'a swap (downtime ~5dk)

```bash
# Mevcut prod DB'yi yedekle (post-incident analiz için)
PGPASSWORD=$POSTGRES_PASSWORD psql -h yorecebimde-postgres -U yorecebimde \
  -d postgres \
  -c "ALTER DATABASE yorecebimde RENAME TO yorecebimde_corrupted_$(date +%s);"

# Restore ettiğin test DB'yi prod adına geçir
PGPASSWORD=$POSTGRES_PASSWORD psql -h yorecebimde-postgres -U yorecebimde \
  -d postgres \
  -c "ALTER DATABASE yorecebimde_restore_test RENAME TO yorecebimde;"

# Servisleri tekrar başlat
docker compose -f /opt/yorecebimde/infra/docker/compose.staging.yml start yorecebimde-api yorecebimde-web

# Health check
curl -f https://yorecebimde-staging.gkteches.com/api/healthz
curl -f https://yorecebimde-staging.gkteches.com/api/readyz
```

### 1.5. Post-restore kontroller

- [ ] Auth: kullanıcı login olabiliyor mu?
- [ ] Order list: son siparişler görünüyor mu?
- [ ] Image: ürün görselleri yükleniyor mu? (MinIO ayrı backup gerekli — `backup-minio.sh`)
- [ ] Iyzico webhook idempotency: aynı paymentRef double-process etmeyecek mi?
- [ ] BullMQ: kuyruktaki job'lar Redis'ten gelir, persist yok — kullanıcıya kayıp bildirim olabilir

---

## 2. Senaryo: VPS tamamen çöktü (Contabo down)

### 2.1. Hemen yap

1. **Cloudflare**: maintenance page görselli error page'i aktive et
2. **Yeni VPS provisioning** (yedek provider: Hetzner CCX13 hazır hesabı)

### 2.2. Yeni VPS setup (~45 dakika hedef)

```bash
# 1) Yeni VPS'te base setup (SECURITY.md §17)
curl -fsSL https://get.docker.com | sh
apt install -y postgresql-client gnupg awscli

# 2) Repo clone
cd /opt
git clone <repo> yorecebimde
cd yorecebimde
git checkout main

# 3) Env restore (Bitwarden / 1Password vault'tan)
cp /tmp/env.staging.encrypted.gpg .env.staging.gpg
gpg --decrypt .env.staging.gpg > infra/docker/.env

# 4) B2'den en son backup'ı çek
b2 authorize-account $B2_KEY_ID $B2_APPLICATION_KEY
LATEST=$(b2 ls $B2_BUCKET postgres/ | sort | tail -1 | awk '{print $NF}')
b2 download-file-by-name $B2_BUCKET "$LATEST" /tmp/latest.dump.gpg

# 5) Compose up + restore
docker compose -f infra/docker/compose.staging.yml up -d yorecebimde-postgres yorecebimde-redis yorecebimde-minio
sleep 10
./infra/scripts/restore-db.sh /tmp/latest.dump.gpg yorecebimde

# 6) Full stack
docker compose -f infra/docker/compose.staging.yml up -d

# 7) DNS değiştir (Cloudflare API)
# yorecebimde-staging.gkteches.com → yeni IP
```

### 2.3. Data loss penceresi

Backup günde 1 kez (03:00 UTC). Worst case: 24h transactions kayıp.
**Mitigation**: WAL archiving Faz 8'de eklenecek (Point-in-time recovery, RPO < 5dk).

---

## 3. Senaryo: MinIO bucket kayboldu (ürün görselleri)

```bash
# 1) Off-site B2'den sync
b2 sync b2://yorecebimde-images/ /tmp/minio-restore/
mc cp --recursive /tmp/minio-restore/ minio/yorecebimde-images/

# 2) processing_status field'larını doğrula
psql -d yorecebimde -c "SELECT count(*) FROM product_images WHERE processing_status='ready';"
```

---

## 4. Senaryo: Iyzico para tutarsızlığı

Bu mali bir incident — finance ekibi koordinasyonu gerekli.

1. Tüm yeni ödemeleri DURDUR (`PAYMENTS_DISABLED=true` env flag — Faz 8 sistem ayarı UI'dan)
2. Iyzico admin panelinden son 24h ödeme listesini al
3. `payments` tablosu ile cross-check (her ödeme bizim sistemde var mı?)
4. Kayıp ödeme varsa: manual reconciliation Slack #finance

---

## 5. Drill Programı

| Sıklık | Senaryo | Hedef |
|---|---|---|
| Aylık | DB restore test (test DB'ye) | RTO < 30dk |
| 3 ayda 1 | VPS provisioning drill | RTO < 1h |
| 6 ayda 1 | Tam stack failover (yeni provider'a) | RTO < 2h |
| Yılda 1 | "Tabletop" exercise — incident simulation | Runbook'taki tüm adımları gözden geçir |

Drill sonuçları `docs/RUNBOOKS/drill-results.md`'ye log.

---

## 6. İletişim

- **Tech lead**: @gediz
- **Finance**: @gediz (Faz 8'de ayrı kişi)
- **Hukuk** (KVKK ihlali şüphesi): @gediz → harici müşavir
- **Müşteri destek**: support@yorecebimde.com
- **Status page**: status.yorecebimde.com
