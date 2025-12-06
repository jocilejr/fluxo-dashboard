#!/bin/bash

# ╔════════════════════════════════════════════════════════════════════════════╗
# ║              DASH ORIGEM VIVA - INSTALADOR PORTAINER/SWARM                 ║
# ║                     Instalação 100% Automatizada                           ║
# ╚════════════════════════════════════════════════════════════════════════════╝

set -e

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURAÇÕES
# ═══════════════════════════════════════════════════════════════════════════════
INSTALL_DIR="/opt/dash-origem-viva"
STACK_NAME="dash-origem-viva"
NETWORK_NAME="PrincipalNet"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════════
#  FUNÇÕES DE OUTPUT
# ═══════════════════════════════════════════════════════════════════════════════
print_header() {
    echo -e "\n${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# ═══════════════════════════════════════════════════════════════════════════════
#  BANNER
# ═══════════════════════════════════════════════════════════════════════════════
show_banner() {
    clear
    echo -e "${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                       ║"
    echo "║     ██████╗  █████╗ ███████╗██╗  ██╗                                  ║"
    echo "║     ██╔══██╗██╔══██╗██╔════╝██║  ██║                                  ║"
    echo "║     ██║  ██║███████║███████╗███████║                                  ║"
    echo "║     ██║  ██║██╔══██║╚════██║██╔══██║                                  ║"
    echo "║     ██████╔╝██║  ██║███████║██║  ██║                                  ║"
    echo "║     ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝                                  ║"
    echo "║                                                                       ║"
    echo "║            ██████╗ ██████╗ ██╗ ██████╗ ███████╗███╗   ███╗            ║"
    echo "║           ██╔═══██╗██╔══██╗██║██╔════╝ ██╔════╝████╗ ████║            ║"
    echo "║           ██║   ██║██████╔╝██║██║  ███╗█████╗  ██╔████╔██║            ║"
    echo "║           ██║   ██║██╔══██╗██║██║   ██║██╔══╝  ██║╚██╔╝██║            ║"
    echo "║           ╚██████╔╝██║  ██║██║╚██████╔╝███████╗██║ ╚═╝ ██║            ║"
    echo "║            ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝            ║"
    echo "║                                                                       ║"
    echo "║                    ██╗   ██╗██╗██╗   ██╗ █████╗                        ║"
    echo "║                    ██║   ██║██║██║   ██║██╔══██╗                       ║"
    echo "║                    ██║   ██║██║██║   ██║███████║                       ║"
    echo "║                    ╚██╗ ██╔╝██║╚██╗ ██╔╝██╔══██║                       ║"
    echo "║                     ╚████╔╝ ██║ ╚████╔╝ ██║  ██║                       ║"
    echo "║                      ╚═══╝  ╚═╝  ╚═══╝  ╚═╝  ╚═╝                       ║"
    echo "║                                                                       ║"
    echo "║              INSTALADOR PORTAINER/SWARM - v2.0                        ║"
    echo "║                                                                       ║"
    echo "╚═══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  VERIFICAÇÕES
# ═══════════════════════════════════════════════════════════════════════════════
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "Execute como root: sudo ./install-portainer.sh"
        exit 1
    fi
}

check_requirements() {
    print_header "Verificando Requisitos"
    
    # Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker não instalado!"
        exit 1
    fi
    print_success "Docker instalado"
    
    # Docker Swarm
    if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
        print_warning "Docker Swarm não está ativo"
        print_info "Inicializando Swarm..."
        docker swarm init --advertise-addr $(hostname -I | awk '{print $1}') || true
    fi
    print_success "Docker Swarm ativo"
    
    # Network PrincipalNet
    if ! docker network ls | grep -q "$NETWORK_NAME"; then
        print_warning "Network $NETWORK_NAME não existe"
        print_info "Criando network..."
        docker network create --driver overlay --attachable "$NETWORK_NAME"
    fi
    print_success "Network $NETWORK_NAME existe"
    
    # jq
    if ! command -v jq &> /dev/null; then
        apt-get update && apt-get install -y jq
    fi
    print_success "jq instalado"
    
    # openssl
    if ! command -v openssl &> /dev/null; then
        apt-get install -y openssl
    fi
    print_success "openssl instalado"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  GERAÇÃO DE CREDENCIAIS
# ═══════════════════════════════════════════════════════════════════════════════
generate_random_string() {
    openssl rand -base64 $1 | tr -dc 'a-zA-Z0-9' | head -c $1
}

generate_jwt() {
    local role=$1
    local jwt_secret=$2
    local iat=$(date +%s)
    local exp=$((iat + 315360000)) # 10 anos
    
    local header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    local payload=$(echo -n "{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}" | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    local signature=$(echo -n "$header.$payload" | openssl dgst -sha256 -hmac "$jwt_secret" -binary | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    
    echo "$header.$payload.$signature"
}

generate_vapid_keys() {
    openssl ecparam -genkey -name prime256v1 -out /tmp/vapid_private.pem 2>/dev/null
    VAPID_PRIVATE=$(openssl ec -in /tmp/vapid_private.pem -outform DER 2>/dev/null | tail -c +8 | head -c 32 | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    VAPID_PUBLIC=$(openssl ec -in /tmp/vapid_private.pem -pubout -outform DER 2>/dev/null | tail -c 65 | base64 -w 0 | tr '+/' '-_' | tr -d '=')
    rm -f /tmp/vapid_private.pem
    echo "$VAPID_PUBLIC|$VAPID_PRIVATE"
}

generate_credentials() {
    print_header "Gerando Credenciais de Segurança"
    
    POSTGRES_PASSWORD=$(generate_random_string 32)
    print_success "Senha PostgreSQL gerada"
    
    JWT_SECRET=$(generate_random_string 64)
    print_success "JWT Secret gerado"
    
    ANON_KEY=$(generate_jwt "anon" "$JWT_SECRET")
    print_success "Anon Key gerada"
    
    SERVICE_ROLE_KEY=$(generate_jwt "service_role" "$JWT_SECRET")
    print_success "Service Role Key gerada"
    
    VAPID_KEYS=$(generate_vapid_keys)
    VAPID_PUBLIC_KEY=$(echo "$VAPID_KEYS" | cut -d'|' -f1)
    VAPID_PRIVATE_KEY=$(echo "$VAPID_KEYS" | cut -d'|' -f2)
    print_success "VAPID Keys geradas"
    
    DASHBOARD_PASSWORD=$(generate_random_string 24)
    print_success "Senha do Studio gerada"
    
    LOGFLARE_API_KEY=$(generate_random_string 32)
    print_success "Logflare API Key gerada"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  COLETA DE INFORMAÇÕES
# ═══════════════════════════════════════════════════════════════════════════════
collect_user_input() {
    print_header "Configuração"
    
    # Domínio
    while true; do
        read -p "$(echo -e ${CYAN}📌 Domínio do Dashboard${NC} [ex: dashboard.origemviva.cloud]: )" DOMAIN
        if [[ -n "$DOMAIN" ]]; then break; fi
        print_warning "Domínio é obrigatório"
    done
    
    # Email admin
    while true; do
        read -p "$(echo -e ${CYAN}📧 Email do administrador${NC}: )" ADMIN_EMAIL
        if [[ "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then break; fi
        print_warning "Email inválido"
    done
    
    # Senha admin
    while true; do
        read -s -p "$(echo -e ${CYAN}🔐 Senha do administrador${NC} [mínimo 8 caracteres]: )" ADMIN_PASSWORD
        echo
        if [[ ${#ADMIN_PASSWORD} -ge 8 ]]; then
            read -s -p "$(echo -e ${CYAN}🔐 Confirme a senha${NC}: )" ADMIN_PASSWORD_CONFIRM
            echo
            if [[ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]]; then break; fi
            print_warning "Senhas não conferem"
        else
            print_warning "Senha deve ter no mínimo 8 caracteres"
        fi
    done
}

# ═══════════════════════════════════════════════════════════════════════════════
#  CRIAÇÃO DE ARQUIVOS DE CONFIGURAÇÃO
# ═══════════════════════════════════════════════════════════════════════════════
create_install_directory() {
    print_header "Criando Diretório de Instalação"
    
    mkdir -p "$INSTALL_DIR"/{config,volumes/db/data,volumes/storage,functions}
    print_success "Diretórios criados em $INSTALL_DIR"
}

create_kong_config() {
    print_info "Criando kong.yml..."
    
    cat > "$INSTALL_DIR/config/kong.yml" << EOF
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
    url: http://auth:9999/
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

  - name: realtime-v1-ws
    url: http://realtime:4000/socket/
    routes:
      - name: realtime-v1-ws
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  - name: realtime-v1
    url: http://realtime:4000/api/
    routes:
      - name: realtime-v1
        strip_path: true
        paths:
          - /realtime/v1/api/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false

  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors

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
    print_success "kong.yml criado"
}

create_db_init_script() {
    print_info "Criando script de inicialização do banco..."
    
    cat > "$INSTALL_DIR/config/99-create-roles.sh" << 'INITEOF'
#!/bin/bash
set -e

echo "═══════════════════════════════════════════════════════════════════"
echo "  Criando usuários do Supabase..."
echo "═══════════════════════════════════════════════════════════════════"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
            CREATE ROLE supabase_admin LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END \$\$;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
            CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END \$\$;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
            CREATE ROLE supabase_auth_admin NOINHERIT CREATEROLE LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END \$\$;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
            CREATE ROLE supabase_storage_admin NOINHERIT CREATEROLE LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END \$\$;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_functions_admin') THEN
            CREATE ROLE supabase_functions_admin NOINHERIT CREATEROLE LOGIN PASSWORD '$POSTGRES_PASSWORD';
        ELSE
            ALTER ROLE supabase_functions_admin WITH PASSWORD '$POSTGRES_PASSWORD';
        END IF;
    END \$\$;

    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
            CREATE ROLE anon NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
            CREATE ROLE authenticated NOLOGIN NOINHERIT;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
            CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
        END IF;
    END \$\$;

    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
    GRANT supabase_admin TO authenticator;

    CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
    CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;
    CREATE SCHEMA IF NOT EXISTS extensions;

    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA public TO supabase_admin;
    GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    GRANT ALL ON SCHEMA storage TO supabase_storage_admin;
    GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
EOSQL

echo "═══════════════════════════════════════════════════════════════════"
echo "  ✓ Usuários configurados!"
echo "═══════════════════════════════════════════════════════════════════"
INITEOF
    chmod +x "$INSTALL_DIR/config/99-create-roles.sh"
    print_success "Script de inicialização criado"
}

create_nginx_config() {
    print_info "Criando nginx.conf..."
    
    cat > "$INSTALL_DIR/config/nginx.conf" << 'NGINXEOF'
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    upstream kong {
        server kong:8000;
    }

    upstream realtime {
        server realtime:4000;
    }

    server {
        listen 80;
        server_name _;

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location /rest/ {
            proxy_pass http://kong/rest/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /auth/ {
            proxy_pass http://kong/auth/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /storage/ {
            proxy_pass http://kong/storage/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            client_max_body_size 50M;
        }

        location /functions/ {
            proxy_pass http://kong/functions/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /realtime/ {
            proxy_pass http://realtime/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400;
        }

        location /api/ {
            rewrite ^/api/(.*)$ /$1 break;
            proxy_pass http://kong;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
NGINXEOF
    print_success "nginx.conf criado"
}

copy_edge_functions() {
    print_info "Copiando Edge Functions..."
    
    if [[ -d "supabase/functions" ]]; then
        cp -r supabase/functions/* "$INSTALL_DIR/functions/"
        print_success "Edge Functions copiadas"
    else
        print_warning "Pasta supabase/functions não encontrada"
    fi
}

create_docker_compose() {
    print_header "Criando docker-compose-swarm.yml"
    
    cat > "$INSTALL_DIR/docker-compose-swarm.yml" << EOF
version: "3.8"

# ═══════════════════════════════════════════════════════════════════════════════
#  DASH ORIGEM VIVA - DOCKER SWARM
# ═══════════════════════════════════════════════════════════════════════════════

services:
  # ─────────────────────────────────────────────────────────────────────────────
  #  PostgreSQL Database
  # ─────────────────────────────────────────────────────────────────────────────
  db:
    image: supabase/postgres:15.1.1.78
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXP: 3600
    volumes:
      - db_data:/var/lib/postgresql/data
      - ${INSTALL_DIR}/config/99-create-roles.sh:/docker-entrypoint-initdb.d/99-create-roles.sh:ro
    networks:
      - internal
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      placement:
        constraints:
          - node.role == manager

  # ─────────────────────────────────────────────────────────────────────────────
  #  Kong API Gateway
  # ─────────────────────────────────────────────────────────────────────────────
  kong:
    image: kong:2.8.1
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /var/lib/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
      KONG_LOG_LEVEL: warn
    volumes:
      - ${INSTALL_DIR}/config/kong.yml:/var/lib/kong/kong.yml:ro
    networks:
      - internal
    depends_on:
      - db
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  GoTrue (Auth)
  # ─────────────────────────────────────────────────────────────────────────────
  auth:
    image: supabase/gotrue:v2.143.0
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: https://${DOMAIN}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: https://${DOMAIN}
      GOTRUE_URI_ALLOW_LIST: "*"
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMTP_ADMIN_EMAIL: ${ADMIN_EMAIL}
      GOTRUE_MAILER_URLPATHS_INVITE: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_RECOVERY: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: /auth/v1/verify
    networks:
      - internal
    depends_on:
      - db
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  PostgREST (REST API)
  # ─────────────────────────────────────────────────────────────────────────────
  rest:
    image: postgrest/postgrest:v12.0.1
    environment:
      PGRST_DB_URI: postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_JWT_EXP: 3600
    networks:
      - internal
    depends_on:
      - db
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  Realtime
  # ─────────────────────────────────────────────────────────────────────────────
  realtime:
    image: supabase/realtime:v2.28.32
    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaserealtime
      API_JWT_SECRET: ${JWT_SECRET}
      FLY_ALLOC_ID: fly123
      FLY_APP_NAME: realtime
      SECRET_KEY_BASE: ${JWT_SECRET}
      ERL_AFLAGS: -proto_dist inet_tcp
      ENABLE_TAILSCALE: "false"
      DNS_NODES: "''"
    networks:
      - internal
    depends_on:
      - db
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  Storage
  # ─────────────────────────────────────────────────────────────────────────────
  storage:
    image: supabase/storage-api:v0.46.4
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgres://supabase_storage_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
      ENABLE_IMAGE_TRANSFORMATION: "true"
      IMGPROXY_URL: http://imgproxy:8080
    volumes:
      - storage_data:/var/lib/storage
    networks:
      - internal
    depends_on:
      - db
      - rest
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  ImgProxy
  # ─────────────────────────────────────────────────────────────────────────────
  imgproxy:
    image: darthsim/imgproxy:v3.18
    environment:
      IMGPROXY_BIND: ":8080"
      IMGPROXY_LOCAL_FILESYSTEM_ROOT: /
      IMGPROXY_USE_ETAG: "true"
      IMGPROXY_ENABLE_WEBP_DETECTION: "true"
    volumes:
      - storage_data:/var/lib/storage:ro
    networks:
      - internal
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  Postgres Meta
  # ─────────────────────────────────────────────────────────────────────────────
  meta:
    image: supabase/postgres-meta:v0.80.0
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    networks:
      - internal
    depends_on:
      - db
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  Edge Functions (Imagem customizada com functions embutidas)
  # ─────────────────────────────────────────────────────────────────────────────
  functions:
    image: dash-origem-viva-functions:latest
    environment:
      JWT_SECRET: \${JWT_SECRET}
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: \${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: \${SERVICE_ROLE_KEY}
      SUPABASE_DB_URL: postgresql://postgres:\${POSTGRES_PASSWORD}@db:5432/postgres
      VERIFY_JWT: "false"
      VAPID_PUBLIC_KEY: \${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: \${VAPID_PRIVATE_KEY}
      TYPEBOT_API_TOKEN: \${TYPEBOT_API_TOKEN:-}
      RESEND_API_KEY: \${RESEND_API_KEY:-}
    networks:
      - internal
    depends_on:
      - kong
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure

  # ─────────────────────────────────────────────────────────────────────────────
  #  App (Frontend + Nginx)
  # ─────────────────────────────────────────────────────────────────────────────
  app:
    image: dash-origem-viva:latest
    volumes:
      - ${INSTALL_DIR}/config/nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - internal
      - ${NETWORK_NAME}
    depends_on:
      - kong
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      labels:
        - "traefik.enable=true"
        - "traefik.docker.network=${NETWORK_NAME}"
        - "traefik.http.routers.dash-origem-viva.rule=Host(\`${DOMAIN}\`)"
        - "traefik.http.routers.dash-origem-viva.entrypoints=web"
        - "traefik.http.routers.dash-origem-viva-secure.rule=Host(\`${DOMAIN}\`)"
        - "traefik.http.routers.dash-origem-viva-secure.entrypoints=websecure"
        - "traefik.http.routers.dash-origem-viva-secure.tls=true"
        - "traefik.http.routers.dash-origem-viva-secure.tls.certresolver=letsencryptresolver"
        - "traefik.http.services.dash-origem-viva.loadbalancer.server.port=80"

networks:
  internal:
    driver: overlay
  ${NETWORK_NAME}:
    external: true

volumes:
  db_data:
  storage_data:
EOF
    print_success "docker-compose-swarm.yml criado"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  BUILD DAS IMAGENS
# ═══════════════════════════════════════════════════════════════════════════════
build_docker_image() {
    print_header "Construindo Imagens Docker"
    
    # Cria .env temporário para o build
    cat > .env.build << EOF
VITE_SUPABASE_URL=https://${DOMAIN}/api
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=self-hosted
VITE_VAPID_PUBLIC_KEY=${VAPID_PUBLIC_KEY}
EOF
    
    # Build da imagem do frontend
    print_info "Construindo imagem do frontend..."
    docker build \
        --build-arg VITE_SUPABASE_URL="https://${DOMAIN}/api" \
        --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="${ANON_KEY}" \
        --build-arg VITE_SUPABASE_PROJECT_ID="self-hosted" \
        --build-arg VITE_VAPID_PUBLIC_KEY="${VAPID_PUBLIC_KEY}" \
        -t dash-origem-viva:latest \
        .
    
    rm -f .env.build
    print_success "Imagem construída: dash-origem-viva:latest"
    
    # Build da imagem das Edge Functions
    print_info "Construindo imagem das Edge Functions..."
    docker build \
        -t dash-origem-viva-functions:latest \
        -f docker/functions/Dockerfile \
        .
    
    print_success "Imagem construída: dash-origem-viva-functions:latest"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  DEPLOY
# ═══════════════════════════════════════════════════════════════════════════════
deploy_stack() {
    print_header "Fazendo Deploy do Stack"
    
    # Remove stack anterior se existir
    docker stack rm "$STACK_NAME" 2>/dev/null || true
    sleep 5
    
    # Deploy
    docker stack deploy -c "$INSTALL_DIR/docker-compose-swarm.yml" "$STACK_NAME"
    
    print_success "Stack deployado: $STACK_NAME"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  AGUARDAR SERVIÇOS
# ═══════════════════════════════════════════════════════════════════════════════
wait_for_services() {
    print_header "Aguardando Serviços Iniciarem"
    
    print_info "Aguardando PostgreSQL..."
    sleep 30
    
    local max_attempts=60
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if docker service ls | grep -q "${STACK_NAME}_db" && \
           docker service ps "${STACK_NAME}_db" 2>/dev/null | grep -q "Running"; then
            print_success "PostgreSQL pronto"
            break
        fi
        ((attempt++))
        sleep 5
    done
    
    print_info "Aguardando Kong..."
    sleep 10
    
    print_info "Aguardando Auth..."
    sleep 10
    
    print_success "Serviços iniciados"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  CRIAR USUÁRIO ADMIN
# ═══════════════════════════════════════════════════════════════════════════════
create_admin_user() {
    print_header "Criando Usuário Administrador"
    
    # Aguarda o Auth estar pronto
    sleep 15
    
    # Encontra o container do Auth
    local auth_container=$(docker ps --filter "name=${STACK_NAME}_auth" --format "{{.ID}}" | head -1)
    
    if [[ -z "$auth_container" ]]; then
        print_warning "Container do Auth não encontrado. Tentando via API..."
        
        # Tenta criar via API diretamente
        sleep 30
        
        local response=$(curl -s -X POST "https://${DOMAIN}/auth/v1/admin/users" \
            -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
            -H "apikey: ${SERVICE_ROLE_KEY}" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"${ADMIN_EMAIL}\",
                \"password\": \"${ADMIN_PASSWORD}\",
                \"email_confirm\": true,
                \"user_metadata\": {
                    \"name\": \"Administrador\"
                }
            }" 2>/dev/null)
        
        if echo "$response" | grep -q '"id"'; then
            local user_id=$(echo "$response" | jq -r '.id')
            print_success "Usuário admin criado: $ADMIN_EMAIL"
            
            # Adiciona role admin
            curl -s -X POST "https://${DOMAIN}/rest/v1/user_roles" \
                -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
                -H "apikey: ${SERVICE_ROLE_KEY}" \
                -H "Content-Type: application/json" \
                -H "Prefer: return=minimal" \
                -d "{\"user_id\": \"${user_id}\", \"role\": \"admin\"}" 2>/dev/null
            
            print_success "Role admin atribuído"
        else
            print_warning "Não foi possível criar usuário automaticamente"
            print_info "Crie manualmente após a instalação"
        fi
    else
        print_success "Auth container encontrado: $auth_container"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
#  SALVAR CREDENCIAIS
# ═══════════════════════════════════════════════════════════════════════════════
save_credentials() {
    print_header "Salvando Credenciais"
    
    local creds_file="$INSTALL_DIR/CREDENCIAIS.txt"
    
    cat > "$creds_file" << EOF
╔════════════════════════════════════════════════════════════════════════════╗
║                    DASH ORIGEM VIVA - CREDENCIAIS                          ║
║                    Gerado em: $(date '+%Y-%m-%d %H:%M:%S')                            ║
╚════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
  ACESSO AO DASHBOARD
═══════════════════════════════════════════════════════════════════════════════
  URL:      https://${DOMAIN}
  Email:    ${ADMIN_EMAIL}
  Senha:    ${ADMIN_PASSWORD}

═══════════════════════════════════════════════════════════════════════════════
  CREDENCIAIS TÉCNICAS (NÃO COMPARTILHAR!)
═══════════════════════════════════════════════════════════════════════════════
  PostgreSQL Password: ${POSTGRES_PASSWORD}
  JWT Secret:          ${JWT_SECRET}
  Anon Key:            ${ANON_KEY}
  Service Role Key:    ${SERVICE_ROLE_KEY}
  VAPID Public:        ${VAPID_PUBLIC_KEY}
  VAPID Private:       ${VAPID_PRIVATE_KEY}
  Dashboard Password:  ${DASHBOARD_PASSWORD}

═══════════════════════════════════════════════════════════════════════════════
  COMANDOS ÚTEIS
═══════════════════════════════════════════════════════════════════════════════
  Ver logs:            docker service logs ${STACK_NAME}_app
  Ver serviços:        docker stack services ${STACK_NAME}
  Remover stack:       docker stack rm ${STACK_NAME}
  Rebuild & deploy:    docker build -t dash-origem-viva:latest . && docker stack deploy -c ${INSTALL_DIR}/docker-compose-swarm.yml ${STACK_NAME}

═══════════════════════════════════════════════════════════════════════════════
EOF
    
    chmod 600 "$creds_file"
    cp "$creds_file" ~/CREDENCIAIS.txt
    
    print_success "Credenciais salvas em:"
    print_info "  - $creds_file"
    print_info "  - ~/CREDENCIAIS.txt"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  RESUMO FINAL
# ═══════════════════════════════════════════════════════════════════════════════
show_summary() {
    echo -e "\n${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                            ║"
    echo "║                    ✓ INSTALAÇÃO CONCLUÍDA COM SUCESSO!                     ║"
    echo "║                                                                            ║"
    echo "╠════════════════════════════════════════════════════════════════════════════╣"
    echo "║                                                                            ║"
    echo "║  Dashboard:  https://${DOMAIN}                                "
    echo "║  Email:      ${ADMIN_EMAIL}                                   "
    echo "║  Senha:      (salva em ~/CREDENCIAIS.txt)                                  ║"
    echo "║                                                                            ║"
    echo "╠════════════════════════════════════════════════════════════════════════════╣"
    echo "║                                                                            ║"
    echo "║  Comandos úteis:                                                           ║"
    echo "║    docker stack services ${STACK_NAME}                                "
    echo "║    docker service logs ${STACK_NAME}_app                              "
    echo "║                                                                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════════
main() {
    show_banner
    check_root
    check_requirements
    collect_user_input
    generate_credentials
    create_install_directory
    create_kong_config
    create_db_init_script
    create_nginx_config
    copy_edge_functions
    create_docker_compose
    build_docker_image
    deploy_stack
    wait_for_services
    create_admin_user
    save_credentials
    show_summary
}

main "$@"
