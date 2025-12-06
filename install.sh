#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    DASH ORIGEM VIVA - INSTALADOR                           ║
# ║         Supabase Self-Hosted + Aplicação (Docker Swarm/Portainer)          ║
# ╚════════════════════════════════════════════════════════════════════════════╝

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funções de output
print_header() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Verifica se está rodando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Este script precisa ser executado como root (sudo)"
        exit 1
    fi
}

# Verifica requisitos do sistema
check_requirements() {
    print_header "Verificando Requisitos do Sistema"
    
    # Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
        print_success "Docker instalado (v$DOCKER_VERSION)"
    else
        print_info "Docker não encontrado. Instalando..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
        print_success "Docker instalado com sucesso"
    fi
    
    # Verifica/Inicializa Docker Swarm
    if docker info 2>/dev/null | grep -q "Swarm: active"; then
        print_success "Docker Swarm já está ativo"
    else
        print_info "Inicializando Docker Swarm..."
        docker swarm init --advertise-addr $(hostname -I | awk '{print $1}') 2>/dev/null || true
        print_success "Docker Swarm inicializado"
    fi
    
    # OpenSSL
    if command -v openssl &> /dev/null; then
        print_success "OpenSSL instalado"
    else
        apt-get update && apt-get install -y openssl
        print_success "OpenSSL instalado"
    fi
    
    # jq (para manipulação JSON)
    if command -v jq &> /dev/null; then
        print_success "jq instalado"
    else
        apt-get install -y jq
        print_success "jq instalado"
    fi
    
    # curl
    if command -v curl &> /dev/null; then
        print_success "curl instalado"
    else
        apt-get install -y curl
        print_success "curl instalado"
    fi
}

# Gera string aleatória
generate_random_string() {
    openssl rand -base64 $1 | tr -dc 'a-zA-Z0-9' | head -c $1
}

# Gera JWT para Supabase
generate_jwt() {
    local role=$1
    local jwt_secret=$2
    local iat=$(date +%s)
    local exp=$((iat + 315360000)) # 10 anos
    
    # Header
    local header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    # Payload
    local payload=$(echo -n "{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}" | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    # Signature
    local signature=$(echo -n "$header.$payload" | openssl dgst -sha256 -hmac "$jwt_secret" -binary | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    echo "$header.$payload.$signature"
}

# Gera VAPID keys para Push Notifications
generate_vapid_keys() {
    # Gera par de chaves EC P-256
    openssl ecparam -genkey -name prime256v1 -out /tmp/vapid_private.pem 2>/dev/null
    
    # Extrai chave privada em formato raw
    VAPID_PRIVATE=$(openssl ec -in /tmp/vapid_private.pem -outform DER 2>/dev/null | tail -c +8 | head -c 32 | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    # Extrai chave pública
    VAPID_PUBLIC=$(openssl ec -in /tmp/vapid_private.pem -pubout -outform DER 2>/dev/null | tail -c 65 | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    rm -f /tmp/vapid_private.pem
    
    echo "$VAPID_PUBLIC|$VAPID_PRIVATE"
}

# Coleta informações do usuário
collect_user_input() {
    print_header "Configuração da Instalação"
    
    # Domínio
    while true; do
        read -p "$(echo -e ${CYAN}📌 Domínio da aplicação${NC} [ex: dashboard.seusite.com.br]: )" DOMAIN
        if [[ -n "$DOMAIN" ]]; then
            break
        fi
        print_warning "Domínio é obrigatório"
    done
    
    # Email admin
    while true; do
        read -p "$(echo -e ${CYAN}📧 Email do administrador${NC}: )" ADMIN_EMAIL
        if [[ "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
            break
        fi
        print_warning "Email inválido"
    done
    
    # Senha admin
    while true; do
        read -s -p "$(echo -e ${CYAN}🔐 Senha do administrador${NC} [mínimo 8 caracteres]: )" ADMIN_PASSWORD
        echo
        if [[ ${#ADMIN_PASSWORD} -ge 8 ]]; then
            read -s -p "$(echo -e ${CYAN}🔐 Confirme a senha${NC}: )" ADMIN_PASSWORD_CONFIRM
            echo
            if [[ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]]; then
                break
            else
                print_warning "Senhas não conferem"
            fi
        else
            print_warning "Senha deve ter no mínimo 8 caracteres"
        fi
    done
    
    # Telefone (opcional)
    read -p "$(echo -e ${CYAN}📱 Telefone do administrador${NC} [opcional]: )" ADMIN_PHONE
}

# Gera todas as credenciais
generate_credentials() {
    print_header "Gerando Credenciais de Segurança"
    
    # Senha do PostgreSQL
    POSTGRES_PASSWORD=$(generate_random_string 32)
    print_success "Senha PostgreSQL gerada"
    
    # JWT Secret
    JWT_SECRET=$(generate_random_string 64)
    print_success "JWT Secret gerado"
    
    # Anon Key
    ANON_KEY=$(generate_jwt "anon" "$JWT_SECRET")
    print_success "Anon Key gerada"
    
    # Service Role Key
    SERVICE_ROLE_KEY=$(generate_jwt "service_role" "$JWT_SECRET")
    print_success "Service Role Key gerada"
    
    # VAPID Keys
    VAPID_KEYS=$(generate_vapid_keys)
    VAPID_PUBLIC_KEY=$(echo "$VAPID_KEYS" | cut -d'|' -f1)
    VAPID_PRIVATE_KEY=$(echo "$VAPID_KEYS" | cut -d'|' -f2)
    print_success "VAPID Keys geradas (Push Notifications)"
    
    # Dashboard Password (para Supabase Studio)
    DASHBOARD_PASSWORD=$(generate_random_string 24)
    print_success "Senha do Dashboard gerada"
    
    # Logflare API Key
    LOGFLARE_API_KEY=$(generate_random_string 32)
    print_success "Logflare API Key gerada"
}

# Cria estrutura de diretórios
create_directories() {
    print_header "Criando Estrutura de Diretórios"
    
    mkdir -p docker/supabase
    mkdir -p backups
    mkdir -p logs
    
    print_success "Diretórios criados"
}

# Cria kong.yml com chaves JWT reais
create_kong_config() {
    print_header "Criando Configuração do Kong API Gateway"
    
    cat > docker/supabase/kong.yml << EOF
_format_version: "2.1"
_transform: true

consumers:
  - username: DASHBOARD
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_ROLE_KEY}

acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: admin

services:
  ## Auth Service
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors
  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors
  - name: auth-v1-open-authorize
    url: http://auth:9999/authorize
    routes:
      - name: auth-v1-open-authorize
        strip_path: true
        paths:
          - /auth/v1/authorize
    plugins:
      - name: cors
  - name: auth-v1
    url: http://auth:9999
    routes:
      - name: auth-v1
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  ## REST Service
  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  ## Realtime Service
  - name: realtime-v1
    url: http://realtime:4000/socket
    routes:
      - name: realtime-v1
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  ## Storage Service
  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  ## Meta Service
  - name: meta
    url: http://meta:8080/
    routes:
      - name: meta
        strip_path: true
        paths:
          - /pg/
    plugins:
      - name: key-auth
        config:
          hide_credentials: false

  ## Edge Functions Service
  - name: functions-v1
    url: http://functions:9000/
    routes:
      - name: functions-v1
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors
EOF

    print_success "kong.yml criado com chaves JWT"
}

# Cria arquivo .env
create_env_file() {
    print_header "Criando Arquivo de Configuração .env"
    
    cat > .env << EOF
############################################################
# CONFIGURAÇÕES GERADAS AUTOMATICAMENTE
# Data: $(date '+%Y-%m-%d %H:%M:%S')
############################################################

# ═══════════════════════════════════════════════════════════
# DOMÍNIO E URLs
# ═══════════════════════════════════════════════════════════
DOMAIN=${DOMAIN}
SITE_URL=https://${DOMAIN}
API_EXTERNAL_URL=https://${DOMAIN}

# ═══════════════════════════════════════════════════════════
# PORTAS
# ═══════════════════════════════════════════════════════════
KONG_HTTP_PORT=8000
STUDIO_PORT=3000

# ═══════════════════════════════════════════════════════════
# POSTGRESQL
# ═══════════════════════════════════════════════════════════
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# ═══════════════════════════════════════════════════════════
# JWT (NÃO ALTERAR - Gerados automaticamente)
# ═══════════════════════════════════════════════════════════
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# ═══════════════════════════════════════════════════════════
# VAPID KEYS (Push Notifications)
# ═══════════════════════════════════════════════════════════
VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}

# ═══════════════════════════════════════════════════════════
# ADMINISTRADOR INICIAL
# ═══════════════════════════════════════════════════════════
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_PHONE=${ADMIN_PHONE}

# ═══════════════════════════════════════════════════════════
# SUPABASE STUDIO
# ═══════════════════════════════════════════════════════════
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}

# ═══════════════════════════════════════════════════════════
# LOGFLARE (Analytics)
# ═══════════════════════════════════════════════════════════
LOGFLARE_API_KEY=${LOGFLARE_API_KEY}

# ═══════════════════════════════════════════════════════════
# SUPABASE AUTH (GoTrue)
# ═══════════════════════════════════════════════════════════
GOTRUE_SITE_URL=https://${DOMAIN}
GOTRUE_URI_ALLOW_LIST=https://${DOMAIN}
GOTRUE_DISABLE_SIGNUP=false
GOTRUE_JWT_EXPIRY=3600
GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
GOTRUE_MAILER_AUTOCONFIRM=true

# ═══════════════════════════════════════════════════════════
# INTEGRAÇÕES (Configurar manualmente depois)
# ═══════════════════════════════════════════════════════════
TYPEBOT_API_TOKEN=
RESEND_API_KEY=

# ═══════════════════════════════════════════════════════════
# VARIÁVEIS PARA BUILD DA APLICAÇÃO (Vite)
# ═══════════════════════════════════════════════════════════
VITE_SUPABASE_URL=https://${DOMAIN}/api
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=self-hosted
VITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
EOF

    chmod 600 .env
    print_success "Arquivo .env criado"
}

# Cria main function para Edge Runtime
create_main_function() {
    print_header "Criando Edge Functions"
    
    mkdir -p supabase/functions/main
    
    cat > supabase/functions/main/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const functionName = url.pathname.split('/')[1];

  const availableFunctions = [
    'webhook-receiver',
    'webhook-groups', 
    'webhook-abandoned',
    'typebot-stats',
    'admin-create-user',
    'admin-delete-user',
    'admin-reset-password',
    'delivery-access',
    'pdf-proxy',
    'import-transactions',
    'import-abandoned-events'
  ];

  if (!functionName || functionName === 'main') {
    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        message: 'Supabase Edge Functions Running',
        available_functions: availableFunctions,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }

  try {
    const functionModule = await import(`../${functionName}/index.ts`);
    
    if (typeof functionModule.default === 'function') {
      return await functionModule.default(req);
    }
    
    return new Response(
      JSON.stringify({ error: 'Function not properly exported' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  } catch (error) {
    console.error(`Error loading function ${functionName}:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Function not found or error loading',
        function: functionName,
        message: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404 
      }
    );
  }
});
EOF

    print_success "Edge Functions criadas"
}

# Build da imagem da aplicação
build_app_image() {
    print_header "Construindo Imagem da Aplicação"
    
    print_info "Isso pode levar alguns minutos..."
    
    # Build com argumentos
    docker build \
        --build-arg VITE_SUPABASE_URL="https://${DOMAIN}/api" \
        --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="${ANON_KEY}" \
        --build-arg VITE_SUPABASE_PROJECT_ID="self-hosted" \
        --build-arg VITE_VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY}" \
        -t dash-origem-viva:latest \
        . 2>&1 | while read line; do
            echo -e "  ${BLUE}│${NC} $line"
        done
    
    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
        print_success "Imagem construída com sucesso"
    else
        print_error "Erro ao construir imagem"
        exit 1
    fi
}

# Copia Edge Functions para volume
setup_functions_volume() {
    print_header "Configurando Volume de Edge Functions"
    
    # Cria volume se não existir
    docker volume create dash-origem-viva_functions-data 2>/dev/null || true
    
    # Copia arquivos para o volume usando container temporário
    docker run --rm \
        -v "$(pwd)/supabase/functions:/src:ro" \
        -v dash-origem-viva_functions-data:/dest \
        alpine sh -c "cp -r /src/* /dest/" 2>/dev/null || true
    
    print_success "Edge Functions configuradas no volume"
}

# Inicializa banco de dados
init_database() {
    print_header "Inicializando Banco de Dados"
    
    print_info "Aguardando PostgreSQL iniciar..."
    
    # Aguarda DB ficar pronto
    for i in {1..60}; do
        if docker exec $(docker ps -q -f name=dash-origem-viva_db) pg_isready -U postgres 2>/dev/null; then
            print_success "PostgreSQL pronto"
            break
        fi
        if [[ $i -eq 60 ]]; then
            print_error "Timeout aguardando PostgreSQL"
            return 1
        fi
        sleep 2
    done
    
    # Script SQL para criar roles e schemas
    docker exec -i $(docker ps -q -f name=dash-origem-viva_db) psql -U postgres << 'EOSQL'
    -- Cria roles necessárias para o Supabase
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
            CREATE ROLE supabase_admin LOGIN SUPERUSER;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
            CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
            CREATE ROLE supabase_storage_admin NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
            CREATE ROLE authenticator NOLOGIN NOINHERIT;
        END IF;
    END
    $$;
    
    -- Grants
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    GRANT supabase_admin TO authenticator;
    
    -- Schemas
    CREATE SCHEMA IF NOT EXISTS auth;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    
    CREATE SCHEMA IF NOT EXISTS storage;
    GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    
    CREATE SCHEMA IF NOT EXISTS _realtime;
    CREATE SCHEMA IF NOT EXISTS _analytics;
    GRANT ALL ON SCHEMA _analytics TO supabase_admin;
    
    -- Public schema
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
    
    -- Default privileges
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
    
    -- Extensões
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
    
    -- Configuração de senha para roles
EOSQL

    # Configura senhas
    docker exec -i $(docker ps -q -f name=dash-origem-viva_db) psql -U postgres << EOF
    ALTER ROLE supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
    ALTER ROLE supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
    ALTER ROLE authenticator WITH PASSWORD '${POSTGRES_PASSWORD}';
    ALTER ROLE supabase_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
EOF

    print_success "Banco de dados inicializado"
}

# Executa migrações
run_migrations() {
    print_header "Executando Migrações"
    
    if [[ -d "supabase/migrations" ]] && [[ -n "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]]; then
        for file in $(ls supabase/migrations/*.sql 2>/dev/null | sort); do
            filename=$(basename "$file")
            print_info "Executando: $filename"
            docker exec -i $(docker ps -q -f name=dash-origem-viva_db) psql -U postgres < "$file" 2>/dev/null || true
        done
        print_success "Migrações executadas"
    else
        print_warning "Nenhuma migração encontrada"
    fi
}

# Cria usuário administrador
create_admin_user() {
    print_header "Criando Usuário Administrador"
    
    print_info "Aguardando serviço de autenticação..."
    
    for i in {1..60}; do
        if curl -sf http://localhost:9999/health > /dev/null 2>&1; then
            print_success "Serviço de autenticação disponível"
            break
        fi
        if [[ $i -eq 60 ]]; then
            print_warning "Serviço de auth não respondeu. Admin será criado depois."
            return 0
        fi
        sleep 2
    done
    
    print_info "Criando usuário ${ADMIN_EMAIL}..."
    
    RESPONSE=$(curl -s --max-time 30 -X POST "http://localhost:9999/admin/users" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${ADMIN_EMAIL}\",
            \"password\": \"${ADMIN_PASSWORD}\",
            \"email_confirm\": true,
            \"user_metadata\": {
                \"name\": \"Administrador\",
                \"phone\": \"${ADMIN_PHONE}\"
            }
        }" 2>/dev/null)
    
    USER_ID=$(echo "$RESPONSE" | jq -r '.id // empty' 2>/dev/null)
    
    if [[ -n "$USER_ID" && "$USER_ID" != "null" ]]; then
        print_success "Usuário criado: ${ADMIN_EMAIL}"
        
        # Adiciona role admin
        docker exec -i $(docker ps -q -f name=dash-origem-viva_db) psql -U postgres << EOF
INSERT INTO public.user_roles (user_id, role)
VALUES ('${USER_ID}', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (user_id, name, phone)
VALUES ('${USER_ID}', 'Administrador', '${ADMIN_PHONE}')
ON CONFLICT (user_id) DO UPDATE SET name = 'Administrador', phone = '${ADMIN_PHONE}';
EOF
        
        print_success "Role admin atribuída"
    else
        ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // .msg // .message // "erro desconhecido"' 2>/dev/null)
        print_warning "Não foi possível criar usuário automaticamente: $ERROR_MSG"
        print_info "Você pode criar o admin manualmente via Supabase Studio"
    fi
}

# Deploy do stack via Docker Swarm
deploy_stack() {
    print_header "Fazendo Deploy do Stack"
    
    # Remove stack antigo se existir
    docker stack rm dash-origem-viva 2>/dev/null || true
    sleep 10
    
    # Deploy
    print_info "Iniciando deploy..."
    docker stack deploy -c docker-compose.yml dash-origem-viva
    
    print_success "Stack deployado"
    
    # Aguarda serviços
    print_info "Aguardando serviços iniciarem (pode levar 2-3 minutos)..."
    sleep 30
    
    # Verifica status
    docker stack services dash-origem-viva
}

# Exibe resumo final
show_summary() {
    print_header "Instalação Concluída!"
    
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}                    ${CYAN}RESUMO DA INSTALAÇÃO${NC}                    ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "  ${CYAN}📌 Aplicação:${NC}        https://${DOMAIN}"
    echo -e "  ${CYAN}🔧 Supabase Studio:${NC}  https://${DOMAIN}:3000"
    echo -e "  ${CYAN}🔌 API Supabase:${NC}     https://${DOMAIN}/api"
    echo
    echo -e "  ${CYAN}👤 Login Admin:${NC}"
    echo -e "     Email: ${ADMIN_EMAIL}"
    echo -e "     Senha: ********** (a que você definiu)"
    echo
    echo -e "  ${CYAN}🔧 Supabase Studio:${NC}"
    echo -e "     Usuário: admin"
    echo -e "     Senha: ${DASHBOARD_PASSWORD}"
    echo
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}                    ${CYAN}PRÓXIMOS PASSOS${NC}                         ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "  1. ${CYAN}Configure DNS:${NC} Aponte ${DOMAIN} para o IP desta VPS"
    echo
    echo -e "  2. ${CYAN}Configure Traefik:${NC} Certifique-se que Traefik está configurado"
    echo
    echo -e "  3. ${CYAN}Verifique os serviços:${NC}"
    echo -e "     docker stack services dash-origem-viva"
    echo
    echo -e "  4. ${CYAN}Ver logs:${NC}"
    echo -e "     docker service logs dash-origem-viva_db -f"
    echo -e "     docker service logs dash-origem-viva_auth -f"
    echo -e "     docker service logs dash-origem-viva_app -f"
    echo
    echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
    echo
    
    # Salva resumo em arquivo
    cat > CREDENCIAIS.txt << EOF
═══════════════════════════════════════════════════════════════
           CREDENCIAIS - DASH ORIGEM VIVA
           Gerado em: $(date '+%Y-%m-%d %H:%M:%S')
═══════════════════════════════════════════════════════════════

APLICAÇÃO
---------
URL: https://${DOMAIN}
Email Admin: ${ADMIN_EMAIL}

SUPABASE STUDIO
---------------
URL: https://${DOMAIN}:3000
Usuário: admin
Senha: ${DASHBOARD_PASSWORD}

API SUPABASE
------------
URL: https://${DOMAIN}/api
Anon Key: ${ANON_KEY}

POSTGRESQL
----------
Host: db (interno ao Docker)
Database: postgres
Usuário: postgres
Senha: ${POSTGRES_PASSWORD}

JWT SECRET
----------
${JWT_SECRET}

SERVICE ROLE KEY
----------------
${SERVICE_ROLE_KEY}

VAPID KEYS
----------
Public: ${VAPID_PUBLIC_KEY}
Private: ${VAPID_PRIVATE_KEY}

═══════════════════════════════════════════════════════════════
IMPORTANTE: Guarde este arquivo em local seguro e delete-o
após anotar as credenciais!
═══════════════════════════════════════════════════════════════
EOF

    chmod 600 CREDENCIAIS.txt
    print_warning "Credenciais salvas em CREDENCIAIS.txt - GUARDE E DELETE ESTE ARQUIVO!"
}

# Função principal
main() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                            ║"
    echo "║     ██████╗  █████╗ ███████╗██╗  ██╗     ██████╗ ██╗   ██╗               ║"
    echo "║     ██╔══██╗██╔══██╗██╔════╝██║  ██║    ██╔═══██╗██║   ██║               ║"
    echo "║     ██║  ██║███████║███████╗███████║    ██║   ██║██║   ██║               ║"
    echo "║     ██║  ██║██╔══██║╚════██║██╔══██║    ██║   ██║╚██╗ ██╔╝               ║"
    echo "║     ██████╔╝██║  ██║███████║██║  ██║    ╚██████╔╝ ╚████╔╝                ║"
    echo "║     ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝     ╚═════╝   ╚═══╝                 ║"
    echo "║                                                                            ║"
    echo "║                    ORIGEM VIVA - INSTALADOR                               ║"
    echo "║         Supabase Self-Hosted + Docker Swarm/Portainer                     ║"
    echo "║                                                                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    
    check_root
    check_requirements
    collect_user_input
    generate_credentials
    create_directories
    create_kong_config
    create_env_file
    create_main_function
    build_app_image
    setup_functions_volume
    deploy_stack
    
    # Aguarda um pouco antes de inicializar DB
    sleep 30
    
    init_database
    run_migrations
    create_admin_user
    show_summary
}

# Executa
main "$@"
