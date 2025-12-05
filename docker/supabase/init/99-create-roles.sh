#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
#  Cria e configura todos os usuários internos do Supabase
#  Este script roda automaticamente na primeira inicialização do PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════════════"
echo "  Criando e configurando usuários do Supabase..."
echo "═══════════════════════════════════════════════════════════════════"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Cria o role supabase_admin (superuser)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
            CREATE ROLE supabase_admin LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Role supabase_admin criado';
        ELSE
            ALTER ROLE supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Senha do supabase_admin atualizada';
        END IF;
    END
    \$\$;

    -- Cria o role authenticator (usado pelo PostgREST)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
            CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Role authenticator criado';
        ELSE
            ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Senha do authenticator atualizada';
        END IF;
    END
    \$\$;

    -- Cria o role supabase_auth_admin (usado pelo GoTrue)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
            CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Role supabase_auth_admin criado';
        ELSE
            ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Senha do supabase_auth_admin atualizada';
        END IF;
    END
    \$\$;

    -- Cria o role supabase_storage_admin (usado pelo Storage)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
            CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Role supabase_storage_admin criado';
        ELSE
            ALTER ROLE supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Senha do supabase_storage_admin atualizada';
        END IF;
    END
    \$\$;

    -- Cria o role supabase_functions_admin (usado pelas Edge Functions)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_functions_admin') THEN
            CREATE ROLE supabase_functions_admin NOINHERIT CREATEROLE LOGIN PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Role supabase_functions_admin criado';
        ELSE
            ALTER ROLE supabase_functions_admin WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Senha do supabase_functions_admin atualizada';
        END IF;
    END
    \$\$;

    -- Cria o role supabase_read_only_user
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_read_only_user') THEN
            CREATE ROLE supabase_read_only_user NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Role supabase_read_only_user criado';
        ELSE
            ALTER ROLE supabase_read_only_user WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Senha do supabase_read_only_user atualizada';
        END IF;
    END
    \$\$;

    -- Cria o role supabase_replication_admin
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_replication_admin') THEN
            CREATE ROLE supabase_replication_admin NOINHERIT LOGIN REPLICATION PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Role supabase_replication_admin criado';
        ELSE
            ALTER ROLE supabase_replication_admin WITH PASSWORD '$POSTGRES_PASSWORD';
            RAISE NOTICE 'Senha do supabase_replication_admin atualizada';
        END IF;
    END
    \$\$;

    -- Cria roles anon e authenticated (usados pelo RLS)
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN NOINHERIT;
            RAISE NOTICE 'Role anon criado';
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN NOINHERIT;
            RAISE NOTICE 'Role authenticated criado';
        END IF;
        
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
            RAISE NOTICE 'Role service_role criado';
        END IF;
    END
    \$\$;

    -- Concede permissões ao authenticator
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    GRANT supabase_admin TO authenticator;

    -- Cria schema auth se não existir
    CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
    
    -- Cria schema storage se não existir
    CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
    
    -- Cria schema extensions se não existir
    CREATE SCHEMA IF NOT EXISTS extensions;
    
    -- Concede permissões nos schemas
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA public TO supabase_admin;
    
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
    
    GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

EOSQL

echo "═══════════════════════════════════════════════════════════════════"
echo "  ✓ Usuários do Supabase configurados com sucesso!"
echo "═══════════════════════════════════════════════════════════════════"
