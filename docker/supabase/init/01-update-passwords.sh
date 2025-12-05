#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════════════════════════
#  Atualiza senhas de todos os usuários internos do Supabase
#  Este script roda automaticamente na primeira inicialização do PostgreSQL
# ═══════════════════════════════════════════════════════════════════════════════

echo "Atualizando senhas dos usuários internos do Supabase..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Atualiza senha do usuário de autenticação (GoTrue)
    ALTER USER supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    
    -- Atualiza senha do authenticator (PostgREST)
    ALTER USER authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
    
    -- Atualiza senha do admin geral
    ALTER USER supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    
    -- Atualiza senha do storage admin
    ALTER USER supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    
    -- Atualiza senha do functions admin
    ALTER USER supabase_functions_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    
    -- Atualiza senha do usuário read-only
    ALTER USER supabase_read_only_user WITH PASSWORD '$POSTGRES_PASSWORD';
    
    -- Atualiza senha do replication admin
    ALTER USER supabase_replication_admin WITH PASSWORD '$POSTGRES_PASSWORD';
EOSQL

echo "Senhas atualizadas com sucesso!"
