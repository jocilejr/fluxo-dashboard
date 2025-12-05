#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURAÇÃO SSL - LET'S ENCRYPT
#  Obtém certificado SSL gratuito via Certbot
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
echo "║          CONFIGURAÇÃO SSL - LET'S ENCRYPT                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verifica se Certbot está instalado
if ! command -v certbot &> /dev/null; then
    print_info "Instalando Certbot..."
    apt-get update
    apt-get install -y certbot
    print_success "Certbot instalado"
fi

# Para o container da aplicação temporariamente para liberar porta 80
print_info "Parando container da aplicação temporariamente..."
docker compose stop app

# Cria diretório para webroot
mkdir -p /var/www/certbot

# Obtém certificado
print_info "Obtendo certificado para ${DOMAIN}..."
certbot certonly \
    --standalone \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --agree-tos \
    --email "${ADMIN_EMAIL}" \
    --non-interactive \
    --expand

if [[ $? -eq 0 ]]; then
    print_success "Certificado obtido com sucesso!"
    
    # Copia certificados para o diretório do nginx
    print_info "Copiando certificados..."
    cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ./docker/nginx/ssl/cert.pem
    cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ./docker/nginx/ssl/key.pem
    chmod 644 ./docker/nginx/ssl/cert.pem
    chmod 600 ./docker/nginx/ssl/key.pem
    
    print_success "Certificados copiados para docker/nginx/ssl/"
else
    print_error "Falha ao obter certificado"
    print_warning "Verifique se o domínio ${DOMAIN} está apontando para este servidor"
fi

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
