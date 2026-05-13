#!/usr/bin/env bash
# Yörecebimde — DR restore. Tüm verileri kaybedip backup'tan dönmek için.
# Kullanım:
#   ./restore-db.sh <backup-file.dump.gpg> [target-db-name]
# Default target: yorecebimde_restore_test (drill için ayrı DB)

set -euo pipefail

: "${POSTGRES_HOST:=yorecebimde-postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:=yorecebimde}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD env required}"

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-yorecebimde_restore_test}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "USAGE: $0 <backup-file.dump.gpg> [target-db]"
  echo "Mevcut backup'lar:"
  ls -lh /var/lib/yorecebimde/backups/*.dump.gpg 2>/dev/null || echo "  (yok)"
  exit 1
fi

echo "==> Restore başlıyor: $BACKUP_FILE → $TARGET_DB"

if [[ "$TARGET_DB" == "yorecebimde" ]]; then
  echo "⚠⚠⚠ DİKKAT: PRODUCTION DB'sine restore yapıyorsun!"
  echo "Mevcut tüm veriler SİLİNECEK. Devam etmek için 'EVET RESTORE' yaz:"
  read -r confirmation
  if [[ "$confirmation" != "EVET RESTORE" ]]; then
    echo "İptal edildi"
    exit 1
  fi
fi

# 1) Decrypt
DECRYPTED=$(mktemp -t restore-XXXX.dump)
trap 'rm -f "$DECRYPTED"' EXIT

echo "==> GPG decrypt..."
gpg --batch --decrypt --output "$DECRYPTED" "$BACKUP_FILE"

# 2) Target DB drop + create
echo "==> Target DB drop + create: $TARGET_DB"
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname=postgres \
  --command="DROP DATABASE IF EXISTS \"$TARGET_DB\";"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname=postgres \
  --command="CREATE DATABASE \"$TARGET_DB\" OWNER \"$POSTGRES_USER\";"

# 3) pg_restore
echo "==> pg_restore..."
PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$TARGET_DB" \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  "$DECRYPTED"

# 4) Smoke verification
echo "==> Smoke verification..."
TABLE_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$TARGET_DB" \
  --tuples-only \
  --command="SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")

echo "  Public schema'da $TABLE_COUNT tablo"

USER_COUNT=$(PGPASSWORD="$POSTGRES_PASSWORD" psql \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$TARGET_DB" \
  --tuples-only \
  --command="SELECT count(*) FROM users;" 2>/dev/null || echo "0")

echo "  users tablosunda $USER_COUNT kayıt"

echo "==> Restore BAŞARILI: $TARGET_DB"
echo ""
echo "Sonraki adımlar:"
echo "  1. App'i bu DB'ye yönlendirmek için DATABASE_URL güncelle"
echo "  2. Migration eksikliği kontrolü: pnpm db:status"
echo "  3. RLS policy'leri tekrar uygula: pnpm db:apply-rls"
