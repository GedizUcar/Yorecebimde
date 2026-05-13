-- Yörecebimde — Application role
-- App, superuser olarak değil dedicated role ile bağlanır (RLS bypass etmek için NOBYPASSRLS önemli)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'yorecebimde_app') THEN
    CREATE ROLE yorecebimde_app WITH LOGIN PASSWORD 'yorecebimde_app_dev' NOBYPASSRLS;
  END IF;
END$$;

GRANT CONNECT ON DATABASE yorecebimde TO yorecebimde_app;
GRANT USAGE ON SCHEMA public TO yorecebimde_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO yorecebimde_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO yorecebimde_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO yorecebimde_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO yorecebimde_app;
