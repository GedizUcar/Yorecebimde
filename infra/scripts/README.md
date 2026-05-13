# Scripts

> Operasyon scriptleri — backup, restore, seed, deploy helper, vs.

## Scripts

| Script | Açıklama |
|---|---|
| `backup-db.sh` | Postgres full dump + GPG encrypt + MinIO upload |
| `restore-db.sh` | Backup'tan restore (test/disaster recovery) |
| `backup-minio.sh` | MinIO bucket'larını off-site (B2) sync |
| `rotate-encryption-key.sh` | PII encryption key rotation (yıllık) |
| `partition-create.sh` | Gelecek ay partition'larını oluştur (cron job ile) |
| `seed-prod.sh` | Production'a temel kategori + admin user seed |
| `health-check.sh` | Tüm servislerin health endpoint'lerini ping et |
| `clamav-update.sh` | ClamAV virus signature update |

## Cron

`crontab` veya systemd timer:
- `0 3 * * *` — backup-db.sh
- `0 4 * * 0` — backup-minio.sh
- `0 0 25 * *` — partition-create.sh

## Deploy Helper

Coolify webhook'a alternatif manuel deploy:

```bash
./scripts/deploy.sh production v0.1.0
```

Manuel deployment sırasında:
1. Pre-deploy: migration run
2. Pull new image
3. `docker compose up -d` rolling
4. Health check
5. Rollback if fail

## Güvenlik

Tüm script'ler:
- Root değil, deploy user
- Log dosyalarına yazar
- Failed → Telegram/email notify
- Idempotent
