#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  SCRIPT DE BACKUP
#  Faz backup do banco de dados e arquivos de storage
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Cores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

# Diretório de backups
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Carrega variáveis
if [[ -f .env ]]; then
    source .env
fi

mkdir -p "$BACKUP_DIR"

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  BACKUP - $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"

# ─────────────────────────────────────────────────────────────────────────────
#  BACKUP DO BANCO DE DADOS
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}[1/3]${NC} Fazendo backup do banco de dados..."
docker compose exec -T db pg_dump -U postgres postgres > "$BACKUP_DIR/db_$DATE.sql"
gzip "$BACKUP_DIR/db_$DATE.sql"
echo -e "      ✓ Banco: $BACKUP_DIR/db_$DATE.sql.gz"

# ─────────────────────────────────────────────────────────────────────────────
#  BACKUP DO STORAGE
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}[2/3]${NC} Fazendo backup do storage..."
if [[ -d "./docker/supabase/volumes/storage" ]]; then
    tar -czf "$BACKUP_DIR/storage_$DATE.tar.gz" -C ./docker/supabase/volumes storage
    echo -e "      ✓ Storage: $BACKUP_DIR/storage_$DATE.tar.gz"
else
    echo -e "      ⚠ Storage vazio ou não encontrado"
fi

# ─────────────────────────────────────────────────────────────────────────────
#  BACKUP DAS CONFIGURAÇÕES
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}[3/3]${NC} Fazendo backup das configurações..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" .env docker/nginx/ssl/ 2>/dev/null || true
echo -e "      ✓ Config: $BACKUP_DIR/config_$DATE.tar.gz"

# ─────────────────────────────────────────────────────────────────────────────
#  LIMPEZA DE BACKUPS ANTIGOS (mantém últimos 7 dias)
# ─────────────────────────────────────────────────────────────────────────────
echo -e "\n${GREEN}[+]${NC} Limpando backups antigos (>7 dias)..."
find "$BACKUP_DIR" -type f -mtime +7 -delete 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
#  RESUMO
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  BACKUP CONCLUÍDO${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Arquivos criados:"
ls -lh "$BACKUP_DIR"/*_$DATE* 2>/dev/null || echo "  Nenhum arquivo criado"
echo ""
echo "Tamanho total dos backups:"
du -sh "$BACKUP_DIR"
echo ""
