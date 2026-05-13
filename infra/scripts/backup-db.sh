#!/usr/bin/env bash
# Yörecebimde — Postgres full dump + GPG encrypt + MinIO + B2 off-site
# Cron: 0 3 * * * /opt/yorecebimde/infra/scripts/backup-db.sh

set -euo pipefail

# ─── Config (env'den oku) ────────────────────────────────────────
: "${POSTGRES_HOST:=yorecebimde-postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:=yorecebimde}"
: "${POSTGRES_USER:=yorecebimde}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD env required}"
: "${BACKUP_DIR:=/var/lib/yorecebimde/backups}"
: "${BACKUP_GPG_RECIPIENT:?BACKUP_GPG_RECIPIENT (public key id) required}"
: "${BACKUP_RETENTION_DAYS:=30}"

: "${MINIO_ENDPOINT:=}"
: "${MINIO_BUCKET:=yorecebimde-backups}"
: "${MINIO_ACCESS_KEY:=}"
: "${MINIO_SECRET_KEY:=}"

: "${B2_BUCKET:=}"
: "${B2_KEY_ID:=}"
: "${B2_APPLICATION_KEY:=}"

# ─── Setup ───────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
BACKUP_NAME="yorecebimde-${TIMESTAMP}.dump"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
ENCRYPTED_PATH="${BACKUP_PATH}.gpg"
LOG_FILE="${BACKUP_DIR}/backup.log"

log() {
  echo "[$(date -u '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

trap 'log "FATAL: $0 failed at line $LINENO"; exit 1' ERR

log "==> Backup başladı: $BACKUP_NAME"

# ─── 1) pg_dump (custom format, paralel) ─────────────────────────
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --file="$BACKUP_PATH"

DUMP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log "pg_dump tamam: $DUMP_SIZE"

# ─── 2) GPG encrypt ──────────────────────────────────────────────
gpg --batch --yes --trust-model always \
  --output "$ENCRYPTED_PATH" \
  --encrypt --recipient "$BACKUP_GPG_RECIPIENT" \
  "$BACKUP_PATH"

# Plain dump'ı sil
rm "$BACKUP_PATH"
log "GPG encrypt tamam: ${ENCRYPTED_PATH}"

# ─── 3) MinIO upload ─────────────────────────────────────────────
if [[ -n "$MINIO_ENDPOINT" && -n "$MINIO_ACCESS_KEY" ]]; then
  AWS_ACCESS_KEY_ID="$MINIO_ACCESS_KEY" \
  AWS_SECRET_ACCESS_KEY="$MINIO_SECRET_KEY" \
  aws --endpoint-url "$MINIO_ENDPOINT" \
    s3 cp "$ENCRYPTED_PATH" "s3://${MINIO_BUCKET}/postgres/${BACKUP_NAME}.gpg"
  log "MinIO upload tamam"
else
  log "MinIO config yok — atlandı"
fi

# ─── 4) B2 off-site (Backblaze) ──────────────────────────────────
if [[ -n "$B2_KEY_ID" && -n "$B2_BUCKET" ]]; then
  b2 authorize-account "$B2_KEY_ID" "$B2_APPLICATION_KEY" >/dev/null
  b2 upload-file --quiet "$B2_BUCKET" "$ENCRYPTED_PATH" "postgres/${BACKUP_NAME}.gpg"
  log "B2 off-site upload tamam"
else
  log "B2 config yok — atlandı (off-site backup kritik, en kısa sürede yapılandır)"
fi

# ─── 5) Retention — eski backup'ları sil ─────────────────────────
find "$BACKUP_DIR" -name '*.dump.gpg' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
log "Retention temizliği tamam (>${BACKUP_RETENTION_DAYS}g eski silindi)"

# ─── 6) Health metric ────────────────────────────────────────────
echo "yorecebimde_backup_last_success_timestamp $(date +%s)" > /var/lib/node_exporter/textfile_collector/backup.prom 2>/dev/null || true

log "==> Backup BAŞARILI"
