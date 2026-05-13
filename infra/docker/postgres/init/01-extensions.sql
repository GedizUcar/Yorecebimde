-- Yörecebimde — Postgres extensions
-- pg_trgm: ILIKE / trigram search for slugs, names
-- pgcrypto: gen_random_uuid() fallback (UUID v7 app-side ama emergency için)

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Custom GUC variables for tenant context (RLS uses these)
-- Default boş — middleware her request başında SET LOCAL ile doldurur.
-- ALTER SYSTEM kullanılmıyor; her connection için pgbouncer'da/middleware'da yapılır.
