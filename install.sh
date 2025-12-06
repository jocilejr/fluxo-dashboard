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
    VAPID_PUBLIC_KEY=$(echo $VAPID_KEYS | cut -d'|' -f1)
    VAPID_PRIVATE_KEY=$(echo $VAPID_KEYS | cut -d'|' -f2)
    print_success "VAPID Keys geradas"
    
    # Dashboard Password (para Studio)
    DASHBOARD_PASSWORD=$(generate_random_string 24)
    print_success "Senha do Dashboard gerada"
    
    # Logflare API Key
    LOGFLARE_API_KEY=$(generate_random_string 32)
    print_success "Logflare API Key gerada"
}

# Cria diretórios necessários
create_directories() {
    print_header "Criando Diretórios"
    
    mkdir -p docker/supabase
    mkdir -p supabase/functions/main
    mkdir -p backups
    mkdir -p logs
    
    print_success "Diretórios criados"
}

# Cria arquivo kong.yml
create_kong_config() {
    print_header "Criando Configuração do Kong"
    
    cat > docker/supabase/kong.yml << EOF
_format_version: "1.1"

consumers:
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
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  - name: rest-v1
    url: http://rest:3000
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
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

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
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  - name: storage-v1
    url: http://storage:5000
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
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon

  - name: functions-v1
    url: http://functions:9000
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
    print_header "Criando Arquivo .env"
    
    cat > .env << EOF
# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    DASH ORIGEM VIVA - CONFIGURAÇÕES                        ║
# ╚════════════════════════════════════════════════════════════════════════════╝

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURAÇÕES GERAIS
# ═══════════════════════════════════════════════════════════════════════════════
DOMAIN=${DOMAIN}
SITE_URL=https://${DOMAIN}
API_EXTERNAL_URL=https://${DOMAIN}

# ═══════════════════════════════════════════════════════════════════════════════
#  POSTGRESQL
# ═══════════════════════════════════════════════════════════════════════════════
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=postgres
POSTGRES_USER=postgres

# ═══════════════════════════════════════════════════════════════════════════════
#  JWT / AUTENTICAÇÃO
# ═══════════════════════════════════════════════════════════════════════════════
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}

# ═══════════════════════════════════════════════════════════════════════════════
#  GOTRUE (Auth)
# ═══════════════════════════════════════════════════════════════════════════════
GOTRUE_JWT_EXPIRY=3600
GOTRUE_DISABLE_SIGNUP=true
GOTRUE_MAILER_AUTOCONFIRM=true

# ═══════════════════════════════════════════════════════════════════════════════
#  ADMINISTRADOR
# ═══════════════════════════════════════════════════════════════════════════════
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_PHONE=${ADMIN_PHONE:-}

# ═══════════════════════════════════════════════════════════════════════════════
#  PUSH NOTIFICATIONS (VAPID)
# ═══════════════════════════════════════════════════════════════════════════════
VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}

# ═══════════════════════════════════════════════════════════════════════════════
#  PORTAS
# ═══════════════════════════════════════════════════════════════════════════════
KONG_HTTP_PORT=8000
STUDIO_PORT=3000

# ═══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD / STUDIO
# ═══════════════════════════════════════════════════════════════════════════════
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
LOGFLARE_API_KEY=${LOGFLARE_API_KEY}

# ═══════════════════════════════════════════════════════════════════════════════
#  INTEGRAÇÕES (configure depois se necessário)
# ═══════════════════════════════════════════════════════════════════════════════
TYPEBOT_API_TOKEN=
RESEND_API_KEY=

# ═══════════════════════════════════════════════════════════════════════════════
#  VITE (para build da aplicação)
# ═══════════════════════════════════════════════════════════════════════════════
VITE_SUPABASE_URL=https://${DOMAIN}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=self-hosted
VITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
EOF

    print_success "Arquivo .env criado"
}

# Cria o main function para edge functions
create_main_function() {
    print_header "Criando Edge Functions"
    
    cat > supabase/functions/main/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  // Extract function name from path
  const functionMatch = path.match(/^\/([^\/]+)/);
  const functionName = functionMatch ? functionMatch[1] : null;
  
  if (!functionName) {
    return new Response(
      JSON.stringify({ error: "Function name required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  try {
    // Dynamic import of the function
    const module = await import(`../${functionName}/index.ts`);
    
    if (typeof module.default === "function") {
      return await module.default(req);
    }
    
    return new Response(
      JSON.stringify({ error: "Function not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error loading function ${functionName}:`, error);
    return new Response(
      JSON.stringify({ error: `Function '${functionName}' not found`, details: error.message }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
EOF

    print_success "Edge Functions criadas"
}

# Constrói imagem Docker da aplicação
build_app_image() {
    print_header "Construindo Imagem Docker da Aplicação"
    
    print_info "Isso pode levar alguns minutos..."
    
    # Build com argumentos de ambiente
    docker build \
        --build-arg VITE_SUPABASE_URL="https://${DOMAIN}" \
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

# Obtém container ID do serviço no Swarm (busca parcial no nome)
get_container_id() {
    local service_name=$1
    # No Swarm, containers têm nomes como: dash-origem-viva_db.1.xxxxx
    # Usamos grep para busca mais flexível
    docker ps --format '{{.ID}} {{.Names}}' 2>/dev/null | grep -E "${service_name}\." | awk '{print $1}' | head -1
}

# Aguarda container ficar disponível
wait_for_container() {
    local service_name=$1
    local max_attempts=${2:-120}
    
    print_info "Aguardando container ${service_name}..."
    
    for i in $(seq 1 $max_attempts); do
        local container_id=$(get_container_id "$service_name")
        if [[ -n "$container_id" ]]; then
            # Verifica se container está rodando
            local status=$(docker inspect -f '{{.State.Running}}' "$container_id" 2>/dev/null)
            if [[ "$status" == "true" ]]; then
                print_success "Container ${service_name} disponível (ID: ${container_id:0:12})"
                return 0
            fi
        fi
        
        # Debug: mostra containers existentes a cada 10 tentativas
        if (( i % 10 == 0 )); then
            print_info "Containers Swarm ativos:"
            docker ps --format '{{.Names}}' 2>/dev/null | grep "dash-origem-viva" || echo "(nenhum)"
        fi
        
        sleep 2
    done
    
    print_error "Timeout aguardando container ${service_name}"
    return 1
}

# Aguarda PostgreSQL com verificação completa
wait_for_postgres() {
    print_info "Aguardando PostgreSQL inicializar completamente..."
    
    # Primeiro aguarda container existir
    wait_for_container "dash-origem-viva_db" 180 || return 1
    
    local container_id=$(get_container_id "dash-origem-viva_db")
    
    if [[ -z "$container_id" ]]; then
        print_error "Não foi possível obter ID do container PostgreSQL"
        return 1
    fi
    
    print_info "Container PostgreSQL: ${container_id:0:12}"
    
    # Aguarda PostgreSQL estar pronto para conexões
    for i in $(seq 1 90); do
        local result=$(docker exec "$container_id" pg_isready -U postgres -h localhost 2>&1)
        if echo "$result" | grep -q "accepting connections"; then
            print_success "PostgreSQL pronto para conexões"
            return 0
        fi
        
        # Mostra progresso
        if (( i % 5 == 0 )); then
            print_info "Tentativa $i/90 - PostgreSQL inicializando... ($result)"
        fi
        sleep 2
    done
    
    print_error "Timeout aguardando PostgreSQL aceitar conexões"
    # Debug final
    print_info "Logs do container PostgreSQL:"
    docker logs "$container_id" --tail 30 2>&1 | head -20
    return 1
}

# Inicializa banco de dados
init_database() {
    print_header "Inicializando Banco de Dados"
    
    # Aguarda PostgreSQL
    wait_for_postgres || return 1
    
    local container_id=$(get_container_id "dash-origem-viva_db")
    
    print_info "Criando roles e schemas..."
    
    # Script SQL para criar roles e schemas
    docker exec -i "$container_id" psql -U postgres << 'EOSQL'
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
    
    -- Configura herança de roles
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    GRANT supabase_admin TO authenticator;
    
    -- Login para roles que precisam
    ALTER ROLE supabase_auth_admin WITH LOGIN;
    ALTER ROLE supabase_storage_admin WITH LOGIN;
    ALTER ROLE authenticator WITH LOGIN;
    ALTER ROLE supabase_admin WITH LOGIN;
    
    -- Schemas
    CREATE SCHEMA IF NOT EXISTS auth;
    ALTER SCHEMA auth OWNER TO supabase_auth_admin;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    
    CREATE SCHEMA IF NOT EXISTS storage;
    ALTER SCHEMA storage OWNER TO supabase_storage_admin;
    GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    
    CREATE SCHEMA IF NOT EXISTS _realtime;
    CREATE SCHEMA IF NOT EXISTS _analytics;
    GRANT ALL ON SCHEMA _analytics TO supabase_admin;
    
    -- Public schema
    GRANT ALL ON SCHEMA public TO postgres, supabase_admin;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, supabase_admin;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, supabase_admin;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, supabase_admin;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
    
    -- Database permissions
    GRANT ALL ON DATABASE postgres TO postgres, supabase_admin;
    GRANT CONNECT ON DATABASE postgres TO anon, authenticated, service_role;
    GRANT CONNECT ON DATABASE postgres TO supabase_auth_admin, supabase_storage_admin, authenticator;
    
    -- Default privileges
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
    
    -- Extensões
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
    CREATE EXTENSION IF NOT EXISTS "pgjwt" SCHEMA public;
EOSQL

    # Configura senhas usando variáveis de ambiente (não usar heredoc com variáveis)
    docker exec "$container_id" psql -U postgres -c "ALTER ROLE supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD}';"
    docker exec "$container_id" psql -U postgres -c "ALTER ROLE supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}';"
    docker exec "$container_id" psql -U postgres -c "ALTER ROLE authenticator WITH PASSWORD '${POSTGRES_PASSWORD}';"
    docker exec "$container_id" psql -U postgres -c "ALTER ROLE supabase_admin WITH PASSWORD '${POSTGRES_PASSWORD}';"
    docker exec "$container_id" psql -U postgres -c "ALTER ROLE postgres WITH PASSWORD '${POSTGRES_PASSWORD}';"

    print_success "Banco de dados inicializado"
}

# Executa migrações
run_migrations() {
    print_header "Executando Migrações"
    
    local container_id=$(get_container_id "dash-origem-viva_db")
    
    if [[ -z "$container_id" ]]; then
        print_warning "Container do banco não encontrado, pulando migrações"
        return 1
    fi
    
    if [[ -d "supabase/migrations" ]] && [[ -n "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]]; then
        for file in $(ls supabase/migrations/*.sql 2>/dev/null | sort); do
            filename=$(basename "$file")
            print_info "Executando: $filename"
            docker exec -i "$container_id" psql -U postgres < "$file" 2>/dev/null || true
        done
        print_success "Migrações executadas"
    else
        print_warning "Nenhuma migração encontrada"
    fi
}

# Aguarda serviço Auth
wait_for_auth() {
    print_info "Aguardando serviço de autenticação..."
    
    for i in $(seq 1 60); do
        if curl -sf http://localhost:9999/health > /dev/null 2>&1; then
            print_success "Serviço de autenticação pronto"
            return 0
        fi
        print_info "Tentativa $i/60 - Auth ainda inicializando..."
        sleep 3
    done
    
    print_warning "Serviço de autenticação não respondeu, tentando criar usuário mesmo assim..."
    return 1
}

# Cria usuário administrador
create_admin_user() {
    print_header "Criando Usuário Administrador"
    
    # Aguarda serviço de auth (não falha se timeout)
    wait_for_auth
    
    # Monta o payload JSON
    local payload=$(cat << EOF
{
    "email": "${ADMIN_EMAIL}",
    "password": "${ADMIN_PASSWORD}",
    "email_confirm": true,
    "user_metadata": {
        "name": "Administrador",
        "phone": "${ADMIN_PHONE:-}"
    }
}
EOF
    )
    
    # Tenta criar via Auth API
    local response=$(curl -sf -X POST \
        "http://localhost:9999/admin/users" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -H "apikey: ${SERVICE_ROLE_KEY}" \
        -d "$payload" 2>/dev/null)
    
    if [[ -n "$response" ]] && echo "$response" | jq -e '.id' > /dev/null 2>&1; then
        local user_id=$(echo "$response" | jq -r '.id')
        print_success "Usuário administrador criado (ID: $user_id)"
        
        # Adiciona role de admin
        local container_id=$(get_container_id "dash-origem-viva_db")
        if [[ -n "$container_id" ]]; then
            docker exec "$container_id" psql -U postgres -c \
                "INSERT INTO public.user_roles (user_id, role) VALUES ('$user_id', 'admin') ON CONFLICT DO NOTHING;" 2>/dev/null || true
            print_success "Role de administrador atribuída"
        fi
    else
        print_warning "Não foi possível criar usuário via API"
        print_info "Você pode criar o usuário manualmente após a instalação"
    fi
}

# Remove stack existente
remove_existing_stack() {
    print_header "Removendo Instalação Anterior (se existir)"
    
    if docker stack ls 2>/dev/null | grep -q "dash-origem-viva"; then
        print_info "Removendo stack existente..."
        docker stack rm dash-origem-viva 2>/dev/null || true
        
        # Aguarda remoção completa
        print_info "Aguardando remoção completa..."
        for i in $(seq 1 30); do
            if ! docker network ls 2>/dev/null | grep -q "dash-origem-viva"; then
                break
            fi
            sleep 2
        done
        
        print_success "Stack anterior removida"
    else
        print_info "Nenhuma instalação anterior encontrada"
    fi
}

# Deploy do stack
deploy_stack() {
    print_header "Fazendo Deploy do Stack"
    
    # Remove stack existente primeiro
    remove_existing_stack
    
    # Aguarda um pouco para garantir limpeza
    sleep 5
    
    print_info "Iniciando deploy via Docker Swarm..."
    
    docker stack deploy -c docker-compose.yml dash-origem-viva
    
    print_success "Stack deployado"
    print_info "Aguardando serviços iniciarem..."
    
    # Mostra status dos serviços
    sleep 10
    docker stack services dash-origem-viva
}

# Exibe resumo final
show_summary() {
    print_header "Instalação Concluída!"
    
    echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}                    INSTALAÇÃO CONCLUÍDA COM SUCESSO!              ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════════${NC}\n"
    
    echo -e "${CYAN}📍 URLs de Acesso:${NC}"
    echo -e "   Dashboard:     ${GREEN}https://${DOMAIN}${NC}"
    echo -e "   Supabase API:  ${GREEN}https://${DOMAIN}${NC}"
    echo -e "   Studio:        ${GREEN}http://<IP_DO_SERVIDOR>:3000${NC}"
    echo ""
    
    echo -e "${CYAN}👤 Credenciais do Administrador:${NC}"
    echo -e "   Email:    ${GREEN}${ADMIN_EMAIL}${NC}"
    echo -e "   Senha:    ${GREEN}${ADMIN_PASSWORD}${NC}"
    echo ""
    
    echo -e "${CYAN}🔑 Chaves Supabase:${NC}"
    echo -e "   Anon Key:         ${YELLOW}${ANON_KEY:0:50}...${NC}"
    echo -e "   Service Role Key: ${YELLOW}${SERVICE_ROLE_KEY:0:50}...${NC}"
    echo ""
    
    echo -e "${CYAN}📝 Comandos Úteis:${NC}"
    echo -e "   Ver serviços:     ${BLUE}docker stack services dash-origem-viva${NC}"
    echo -e "   Ver logs:         ${BLUE}docker service logs dash-origem-viva_<service>${NC}"
    echo -e "   Reiniciar:        ${BLUE}docker stack deploy -c docker-compose.yml dash-origem-viva${NC}"
    echo -e "   Parar:            ${BLUE}docker stack rm dash-origem-viva${NC}"
    echo ""
    
    # Salva credenciais em arquivo
    cat > CREDENCIAIS.txt << EOF
╔════════════════════════════════════════════════════════════════════════════╗
║                    DASH ORIGEM VIVA - CREDENCIAIS                          ║
║                    Gerado em: $(date)                      
╚════════════════════════════════════════════════════════════════════════════╝

DOMÍNIO: ${DOMAIN}

═══════════════════════════════════════════════════════════════════════════════
 ADMINISTRADOR
═══════════════════════════════════════════════════════════════════════════════
Email: ${ADMIN_EMAIL}
Senha: ${ADMIN_PASSWORD}

═══════════════════════════════════════════════════════════════════════════════
 BANCO DE DADOS
═══════════════════════════════════════════════════════════════════════════════
Host: localhost:5432
Database: postgres
User: postgres
Password: ${POSTGRES_PASSWORD}

═══════════════════════════════════════════════════════════════════════════════
 CHAVES SUPABASE
═══════════════════════════════════════════════════════════════════════════════
JWT Secret: ${JWT_SECRET}
Anon Key: ${ANON_KEY}
Service Role Key: ${SERVICE_ROLE_KEY}

═══════════════════════════════════════════════════════════════════════════════
 VAPID KEYS (Push Notifications)
═══════════════════════════════════════════════════════════════════════════════
Public Key: ${VAPID_PUBLIC_KEY}
Private Key: ${VAPID_PRIVATE_KEY}

═══════════════════════════════════════════════════════════════════════════════
 DASHBOARD / STUDIO
═══════════════════════════════════════════════════════════════════════════════
Password: ${DASHBOARD_PASSWORD}
Logflare API Key: ${LOGFLARE_API_KEY}

═══════════════════════════════════════════════════════════════════════════════
 IMPORTANTE
═══════════════════════════════════════════════════════════════════════════════
- Guarde este arquivo em local seguro
- Após anotar as credenciais, recomenda-se deletar este arquivo
- As chaves JWT e service role são sensíveis - não compartilhe!
EOF

    chmod 600 CREDENCIAIS.txt
    
    print_warning "Credenciais salvas em CREDENCIAIS.txt (chmod 600)"
    print_warning "Após anotar as credenciais, delete este arquivo por segurança!"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                            ║"
    echo "║                      DASH ORIGEM VIVA - INSTALADOR                         ║"
    echo "║                                                                            ║"
    echo "║         Supabase Self-Hosted + Aplicação (Docker Swarm/Portainer)          ║"
    echo "║                                                                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Etapas de instalação
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
    
    # Aguarda serviços estabilizarem (PostgreSQL precisa de mais tempo)
    print_header "Aguardando Serviços Estabilizarem"
    print_info "Aguardando containers subirem (90 segundos)..."
    
    for i in $(seq 1 9); do
        sleep 10
        print_info "$((i * 10)) segundos... Verificando serviços:"
        docker stack services dash-origem-viva --format "{{.Name}}: {{.Replicas}}" 2>/dev/null || true
    done
    
    # Mostra status atual
    print_info "Status dos serviços:"
    docker stack services dash-origem-viva
    
    # Inicialização do banco e usuário
    init_database
    run_migrations
    create_admin_user
    
    # Resumo final
    show_summary
}

# Executa
main "$@"
