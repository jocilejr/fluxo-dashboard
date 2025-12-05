#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║                    DASH ORIGEM VIVA - INSTALADOR                           ║
# ║              Supabase Self-Hosted + Aplicação Automatizado                 ║
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
    
    # Docker Compose
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        print_success "Docker Compose instalado"
    else
        print_info "Docker Compose não encontrado. Instalando..."
        apt-get update
        apt-get install -y docker-compose-plugin
        print_success "Docker Compose instalado com sucesso"
    fi
    
    # OpenSSL
    if command -v openssl &> /dev/null; then
        print_success "OpenSSL instalado"
    else
        apt-get install -y openssl
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
    read -p "$(echo -e ${CYAN}📱 Telefone do administrador${NC} [opcional, pressione Enter para pular]: )" ADMIN_PHONE
    
    # Porta HTTP (opcional)
    read -p "$(echo -e ${CYAN}🌐 Porta HTTP${NC} [padrão: 80]: )" HTTP_PORT
    HTTP_PORT=${HTTP_PORT:-80}
    
    # Porta HTTPS (opcional)
    read -p "$(echo -e ${CYAN}🔒 Porta HTTPS${NC} [padrão: 443]: )" HTTPS_PORT
    HTTPS_PORT=${HTTPS_PORT:-443}
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

# Configura kong.yml com as chaves JWT reais
configure_kong_yml() {
    print_header "Configurando Kong API Gateway"
    
    # Verifica se o arquivo existe
    if [[ -f "docker/supabase/kong.yml" ]]; then
        # Substitui variáveis pelas chaves JWT reais
        sed -i "s|\${ANON_KEY}|${ANON_KEY}|g" docker/supabase/kong.yml
        sed -i "s|\${SERVICE_ROLE_KEY}|${SERVICE_ROLE_KEY}|g" docker/supabase/kong.yml
        print_success "Kong configurado com chaves JWT"
    else
        print_warning "Arquivo kong.yml não encontrado, será usado valores do .env"
    fi
}

# Cria estrutura de diretórios
create_directories() {
    print_header "Criando Estrutura de Diretórios"
    
    mkdir -p docker/nginx/ssl
    mkdir -p docker/supabase/volumes/db/data
    mkdir -p docker/supabase/volumes/storage
    mkdir -p docker/supabase/volumes/functions
    mkdir -p docker/supabase/init
    mkdir -p backups
    mkdir -p logs
    mkdir -p supabase/functions/main
    
    print_success "Diretórios criados"
}

# Cria arquivo .env
create_env_file() {
    print_header "Criando Arquivo de Configuração"
    
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
HTTP_PORT=${HTTP_PORT}
HTTPS_PORT=${HTTPS_PORT}
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

# Cria arquivo main/index.ts para Edge Functions
create_main_function() {
    print_header "Criando Main Function para Edge Runtime"
    
    # Verifica se já existe
    if [[ ! -f "supabase/functions/main/index.ts" ]]; then
        cat > supabase/functions/main/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const functionName = url.pathname.split('/')[1];

  // Lista de funções disponíveis
  const availableFunctions = [
    'webhook-receiver',
    'webhook-groups', 
    'webhook-abandoned',
    'typebot-stats',
    'admin-create-user',
    'admin-delete-user',
    'admin-reset-password',
    'setup-totp',
    'verify-totp',
    'delivery-access',
    'pdf-proxy'
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
    // Dynamic import da função
    const functionModule = await import(`../${functionName}/index.ts`);
    
    if (typeof functionModule.default === 'function') {
      return await functionModule.default(req);
    }
    
    // Se não tiver default export, tenta chamar serve
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
        print_success "Main function criada"
    else
        print_info "Main function já existe"
    fi
}

# Cria certificado SSL autoassinado temporário
create_temp_ssl() {
    print_header "Criando Certificado SSL Temporário"
    
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/nginx/ssl/key.pem \
        -out docker/nginx/ssl/cert.pem \
        -subj "/CN=${DOMAIN}" 2>/dev/null
    
    print_success "Certificado temporário criado"
    print_warning "Execute './scripts/setup-ssl.sh' depois para obter certificado Let's Encrypt"
}

# Cria script de inicialização de roles do PostgreSQL
create_db_init_script() {
    print_header "Criando Script de Inicialização do Banco"
    
    cat > docker/supabase/init/99-create-roles.sh << 'EOF'
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Cria roles necessárias para o Supabase
    DO \$\$
    BEGIN
        -- Role anon (acesso anônimo)
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN NOINHERIT;
        END IF;
        
        -- Role authenticated (usuários autenticados)
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN NOINHERIT;
        END IF;
        
        -- Role service_role (acesso total)
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
        END IF;
        
        -- Role authenticator (usado pelo PostgREST)
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
            CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';
        END IF;
        
        -- Role supabase_admin
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
            CREATE ROLE supabase_admin LOGIN PASSWORD '$POSTGRES_PASSWORD' SUPERUSER;
        END IF;
        
        -- Role supabase_auth_admin
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
            CREATE ROLE supabase_auth_admin LOGIN PASSWORD '$POSTGRES_PASSWORD' NOINHERIT;
        END IF;
        
        -- Role supabase_storage_admin
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
            CREATE ROLE supabase_storage_admin LOGIN PASSWORD '$POSTGRES_PASSWORD' NOINHERIT;
        END IF;
    END
    \$\$;
    
    -- Grants
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    GRANT supabase_admin TO authenticator;
    
    -- Schema auth
    CREATE SCHEMA IF NOT EXISTS auth;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    
    -- Schema storage
    CREATE SCHEMA IF NOT EXISTS storage;
    GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    
    -- Schema realtime
    CREATE SCHEMA IF NOT EXISTS _realtime;
    
    -- Schema analytics
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
EOSQL
EOF
    
    chmod +x docker/supabase/init/99-create-roles.sh
    print_success "Script de inicialização do banco criado"
}

# Inicia os containers
start_containers() {
    print_header "Iniciando Containers"
    
    print_info "Baixando imagens Docker (pode demorar alguns minutos)..."
    docker compose pull
    
    print_info "Iniciando serviços..."
    docker compose up -d
    
    print_success "Containers iniciados"
}

# Aguarda serviços ficarem prontos
wait_for_services() {
    print_header "Aguardando Serviços Ficarem Prontos"
    
    # Aguarda PostgreSQL
    print_info "Aguardando PostgreSQL..."
    for i in {1..60}; do
        if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
            print_success "PostgreSQL pronto"
            break
        fi
        if [[ $i -eq 60 ]]; then
            print_error "Timeout aguardando PostgreSQL"
            print_info "Verificando logs: docker compose logs db --tail=50"
        fi
        sleep 2
    done
    
    # Aguarda Kong (API Gateway)
    print_info "Aguardando API Gateway..."
    for i in {1..60}; do
        if curl -sf http://localhost:8000/health &>/dev/null || curl -sf http://localhost:8000 &>/dev/null; then
            print_success "API Gateway pronto"
            break
        fi
        if [[ $i -eq 60 ]]; then
            print_warning "API Gateway pode não estar totalmente pronto"
        fi
        sleep 2
    done
    
    # Aguarda GoTrue (Auth)
    print_info "Aguardando Auth Service..."
    for i in {1..60}; do
        if curl -sf http://localhost:9999/health &>/dev/null; then
            print_success "Auth Service pronto"
            break
        fi
        if [[ $i -eq 60 ]]; then
            print_warning "Auth Service pode não estar totalmente pronto"
        fi
        sleep 2
    done
    
    # Aguarda Edge Functions
    print_info "Aguardando Edge Functions..."
    for i in {1..30}; do
        if docker compose ps functions | grep -q "Up"; then
            print_success "Edge Functions rodando"
            break
        fi
        sleep 2
    done
    
    sleep 10
    print_info "Aguardando estabilização dos serviços..."
}

# Executa migrações
run_migrations() {
    print_header "Executando Migrações do Banco de Dados"
    
    if [[ -d "supabase/migrations" ]] && [[ -n "$(ls -A supabase/migrations/*.sql 2>/dev/null)" ]]; then
        for file in $(ls supabase/migrations/*.sql 2>/dev/null | sort); do
            filename=$(basename "$file")
            print_info "Executando: $filename"
            docker compose exec -T db psql -U postgres -d postgres -f "/docker-entrypoint-initdb.d/migrations/$filename" 2>/dev/null || true
        done
        print_success "Migrações executadas"
    else
        print_warning "Nenhuma migração encontrada"
    fi
}

# Cria usuário administrador
create_admin_user() {
    print_header "Criando Usuário Administrador"
    
    # Verifica se auth está realmente acessível
    print_info "Verificando serviço de autenticação..."
    local auth_ready=false
    for i in {1..30}; do
        if curl -sf http://localhost:9999/health > /dev/null 2>&1; then
            auth_ready=true
            break
        fi
        sleep 2
    done
    
    if [[ "$auth_ready" != "true" ]]; then
        print_error "Serviço de autenticação não está respondendo"
        print_info "Verifique: docker compose logs auth --tail=50"
        print_warning "Você pode criar o admin manualmente depois"
        return 1
    fi
    print_success "Serviço de autenticação disponível"
    
    # Cria usuário via API do GoTrue
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
    
    # Debug da resposta
    if [[ -z "$RESPONSE" ]]; then
        print_error "Sem resposta do servidor de autenticação"
        return 1
    fi
    
    USER_ID=$(echo "$RESPONSE" | jq -r '.id // empty' 2>/dev/null)
    
    if [[ -n "$USER_ID" && "$USER_ID" != "null" ]]; then
        print_success "Usuário criado: ${ADMIN_EMAIL}"
        
        # Adiciona role admin
        docker compose exec -T db psql -U postgres -d postgres << EOF
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
        print_warning "Não foi possível criar usuário: $ERROR_MSG"
        print_info "Você pode criar o admin manualmente via Supabase Studio"
    fi
}

# Configura secrets nas Edge Functions
configure_edge_functions() {
    print_header "Configurando Edge Functions"
    
    # Cria arquivo de secrets para as functions (opcional, as envs já estão no docker-compose)
    cat > docker/supabase/functions.env << EOF
SUPABASE_URL=http://kong:8000
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
SUPABASE_DB_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE_KEY}
TYPEBOT_API_TOKEN=${TYPEBOT_API_TOKEN:-}
RESEND_API_KEY=${RESEND_API_KEY:-}
EOF

    print_success "Secrets das Edge Functions configurados"
}

# Verifica status dos containers
check_containers_status() {
    print_header "Verificando Status dos Containers"
    
    local all_running=true
    local containers=("supabase-db" "supabase-kong" "supabase-auth" "supabase-rest" "supabase-realtime" "supabase-storage" "supabase-functions" "supabase-studio" "dash-origem-viva")
    
    for container in "${containers[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            print_success "$container: Rodando"
        else
            print_error "$container: Não está rodando"
            all_running=false
        fi
    done
    
    if [[ "$all_running" != "true" ]]; then
        print_warning "Alguns containers não estão rodando. Verifique os logs."
    fi
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
    echo -e "  2. ${CYAN}Configure SSL:${NC} Execute './scripts/setup-ssl.sh'"
    echo
    echo -e "  3. ${CYAN}Configure integrações:${NC} Edite o arquivo .env e adicione:"
    echo -e "     - TYPEBOT_API_TOKEN (para analytics de Typebots)"
    echo -e "     - RESEND_API_KEY (para envio de emails)"
    echo
    echo -e "  4. ${CYAN}Reinicie após configurar:${NC} docker compose restart"
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
Host: localhost
Porta: 5433
Database: postgres
Usuário: postgres
Senha: ${POSTGRES_PASSWORD}

JWT SECRET
----------
${JWT_SECRET}

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
    echo "║              Supabase Self-Hosted + Aplicação                             ║"
    echo "║                                                                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    
    check_root
    check_requirements
    collect_user_input
    generate_credentials
    configure_kong_yml
    create_directories
    create_env_file
    create_main_function
    create_db_init_script
    create_temp_ssl
    start_containers
    wait_for_services
    run_migrations
    create_admin_user
    configure_edge_functions
    check_containers_status
    show_summary
}

# Executa
main "$@"
