#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  SCRIPT DE RESTORE
#  Restaura backup do banco de dados
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BACKUP_DIR="./backups"

echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  RESTORE - DASH ORIGEM VIVA${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"

# Lista backups disponíveis
echo -e "\n${GREEN}Backups disponíveis:${NC}\n"
ls -1t "$BACKUP_DIR"/db_*.sql.gz 2>/dev/null | head -10 | nl

if [[ ! -f "$BACKUP_DIR"/db_*.sql.gz ]]; then
    echo -e "${RED}Nenhum backup encontrado em $BACKUP_DIR${NC}"
    exit 1
fi

# Solicita seleção
echo ""
read -p "Digite o número do backup para restaurar (ou caminho completo): " SELECTION

if [[ "$SELECTION" =~ ^[0-9]+$ ]]; then
    BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/db_*.sql.gz | sed -n "${SELECTION}p")
else
    BACKUP_FILE="$SELECTION"
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo -e "${RED}Arquivo não encontrado: $BACKUP_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠ ATENÇÃO: Isso irá SUBSTITUIR todos os dados atuais!${NC}"
read -p "Tem certeza que deseja continuar? (digite 'sim' para confirmar): " CONFIRM

if [[ "$CONFIRM" != "sim" ]]; then
    echo "Operação cancelada."
    exit 0
fi

# Restaura
echo -e "\n${GREEN}Restaurando backup...${NC}"

# Descompacta se necessário
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker compose exec -T db psql -U postgres -d postgres
else
    cat "$BACKUP_FILE" | docker compose exec -T db psql -U postgres -d postgres
fi

echo -e "\n${GREEN}✓ Backup restaurado com sucesso!${NC}"
echo -e "\nReiniciando serviços..."
docker compose restart

echo -e "\n${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  RESTORE CONCLUÍDO${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
