-- Execute manualmente no terminal: sudo -u postgres psql -X -d postgres -f scripts/setup-native-postgres.sql
-- Não apaga bancos ou registros. Não inclua sua senha neste arquivo.
\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'crazy') THEN
    CREATE ROLE crazy LOGIN;
  END IF;
END;
$$;

\echo 'Defina a senha do usuário crazy. Use a mesma senha na DATABASE_URL local.'
\password crazy

SELECT 'CREATE DATABASE crazy_training OWNER crazy'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'crazy_training')
\gexec

SELECT 'CREATE DATABASE crazy_training_test OWNER crazy'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'crazy_training_test')
\gexec

-- Permite aplicar as migrações mesmo se um banco existente pertence ao administrador.
GRANT CONNECT, CREATE, TEMPORARY ON DATABASE crazy_training TO crazy;
GRANT CONNECT, CREATE, TEMPORARY ON DATABASE crazy_training_test TO crazy;

\connect crazy_training
GRANT USAGE, CREATE ON SCHEMA public TO crazy;
\connect crazy_training_test
GRANT USAGE, CREATE ON SCHEMA public TO crazy;
\echo 'Bancos preparados. Configure apps/api/.env e execute npm run db:migrate na raiz do projeto.'
