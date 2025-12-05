#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURAÇÃO SSL - LET'S ENCRYPT (WEBROOT MODE)
#  Obtém certificado SSL gratuito via Certbot sem parar serviços
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${CYAN}ℹ${NC} $1"; }

# Carrega variáveis de ambiente
if [[ -f .env ]]; then
    source .env
else
    print_error "Arquivo .env não encontrado. Execute o install.sh primeiro."
    exit 1
fi

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║      CONFIGURAÇÃO SSL - LET'S ENCRYPT (WEBROOT)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verifica se Certbot está instalado
if ! command -v certbot &> /dev/null; then
    print_info "Instalando Certbot..."
    apt-get update
    apt-get install -y certbot
    print_success "Certbot instalado"
fi

# Cria diretório para webroot challenge
WEBROOT_PATH="/var/www/certbot"
mkdir -p "$WEBROOT_PATH/.well-known/acme-challenge"
chmod -R 755 /var/www/certbot

print_info "Diretório webroot criado em $WEBROOT_PATH"

# Verifica se o nginx está configurado para servir o webroot
# Tenta criar um arquivo de teste
echo "test" > "$WEBROOT_PATH/.well-known/acme-challenge/test.txt"

# Obtém certificado usando webroot
print_info "Obtendo certificado para ${DOMAIN}..."

# Primeiro tenta apenas o domínio principal (sem www se for subdomínio)
if [[ "$DOMAIN" == *"."*"."* ]]; then
    # É um subdomínio (ex: dashboard.origemviva.cloud)
    certbot certonly \
        --webroot \
        --webroot-path "$WEBROOT_PATH" \
        -d "${DOMAIN}" \
        --agree-tos \
        --email "${ADMIN_EMAIL}" \
        --non-interactive \
        --expand \
        --force-renewal 2>/dev/null || \
    certbot certonly \
        --standalone \
        --preferred-challenges http \
        -d "${DOMAIN}" \
        --agree-tos \
        --email "${ADMIN_EMAIL}" \
        --non-interactive \
        --expand \
        --force-renewal --dry-run 2>/dev/null || \
    # Fallback: usar DNS challenge manual
    print_warning "Webroot falhou. Tentando com método alternativo..."
fi

# Se webroot falhou, tenta com nginx plugin
if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    print_info "Tentando com certbot nginx plugin..."
    apt-get install -y python3-certbot-nginx 2>/dev/null || true
    
    certbot certonly \
        --nginx \
        -d "${DOMAIN}" \
        --agree-tos \
        --email "${ADMIN_EMAIL}" \
        --non-interactive \
        --expand 2>/dev/null || true
fi

# Última tentativa: standalone com parada temporária do que usa porta 80
if [[ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    print_warning "Métodos automáticos falharam."
    print_info "Tentando identificar e parar temporariamente o serviço na porta 80..."
    
    # Identifica o processo
    PORT_80_PID=$(lsof -t -i:80 2>/dev/null | head -1)
    
    if [[ -n "$PORT_80_PID" ]]; then
        PORT_80_SERVICE=$(ps -p $PORT_80_PID -o comm= 2>/dev/null)
        print_info "Serviço na porta 80: $PORT_80_SERVICE (PID: $PORT_80_PID)"
        
        read -p "Deseja parar temporariamente este serviço para obter o certificado? (s/n): " CONFIRM
        if [[ "$CONFIRM" == "s" || "$CONFIRM" == "S" ]]; then
            kill $PORT_80_PID 2>/dev/null || true
            sleep 2
            
            certbot certonly \
                --standalone \
                --preferred-challenges http \
                -d "${DOMAIN}" \
                --agree-tos \
                --email "${ADMIN_EMAIL}" \
                --non-interactive \
                --expand
            
            print_info "Reiniciando serviço..."
            # Tenta reiniciar nginx ou o serviço que estava rodando
            systemctl start nginx 2>/dev/null || systemctl start $PORT_80_SERVICE 2>/dev/null || true
        fi
    fi
fi

# Verifica se o certificado foi obtido
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
    print_success "Certificado obtido com sucesso!"
    
    # Cria diretório SSL se não existir
    mkdir -p ./docker/nginx/ssl
    
    # Copia certificados para o diretório do nginx
    print_info "Copiando certificados..."
    cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ./docker/nginx/ssl/cert.pem
    cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ./docker/nginx/ssl/key.pem
    chmod 644 ./docker/nginx/ssl/cert.pem
    chmod 600 ./docker/nginx/ssl/key.pem
    
    print_success "Certificados copiados para docker/nginx/ssl/"
    
    # Reinicia a aplicação
    print_info "Reiniciando aplicação..."
    docker compose up -d app
    
    # Configura renovação automática
    print_info "Configurando renovação automática..."
    CRON_CMD="0 0 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem $(pwd)/docker/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem $(pwd)/docker/nginx/ssl/key.pem && docker compose restart app"
    
    # Remove cron anterior se existir
    crontab -l 2>/dev/null | grep -v "certbot renew" | crontab -
    
    # Adiciona novo cron
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    
    print_success "Renovação automática configurada (1º dia de cada mês)"
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}              SSL CONFIGURADO COM SUCESSO!                  ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Acesse: ${CYAN}https://${DOMAIN}${NC}"
    echo ""
else
    print_error "Não foi possível obter o certificado automaticamente."
    echo ""
    echo -e "${YELLOW}Opções alternativas:${NC}"
    echo ""
    echo "1. Configure seu proxy reverso existente (nginx/apache) para servir:"
    echo "   location /.well-known/acme-challenge/ {"
    echo "       root /var/www/certbot;"
    echo "   }"
    echo ""
    echo "2. Ou obtenha o certificado manualmente:"
    echo "   certbot certonly --manual -d ${DOMAIN}"
    echo ""
    echo "3. Depois copie os certificados:"
    echo "   cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ./docker/nginx/ssl/cert.pem"
    echo "   cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem ./docker/nginx/ssl/key.pem"
    echo "   docker compose restart app"
fi
